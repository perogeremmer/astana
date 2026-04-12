// Data Makam - CRUD JavaScript for Graves and Heirs
// Integrates with Tauri backend



// Global state
let currentGraves = [];
let currentBlocks = [];
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 30;
let currentEditingId = null;
let currentDeletingId = null;
let currentDeletingName = '';

// Variables for Add Modal
let jumlahAhliWaris = 1;
const maxAhliWaris = 3;

// Variables for Edit Modal
let jumlahAhliWarisEdit = 1;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing...');
    await loadBlocks();
    await loadGraves();
    setupEventListeners();
    setupTableActionListeners();
});

function setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            currentPage = 1;
            await loadGraves(e.target.value);
        }, 300));
    }

    // Block filter
    const blockSelect = document.querySelector('aside + main select');
    if (blockSelect) {
        blockSelect.addEventListener('change', async () => {
            currentPage = 1;
            await loadGraves();
        });
    }
    
    // Export modal year selectors
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    
    if (startYearSelect) {
        startYearSelect.addEventListener('change', updateYearPreview);
    }
    
    if (endYearSelect) {
        endYearSelect.addEventListener('change', updateYearPreview);
    }
    
    // Sort field and order dropdowns
    const sortField = document.getElementById('sortField');
    const sortOrder = document.getElementById('sortOrder');
    
    if (sortField) {
        sortField.addEventListener('change', () => {
            currentPage = 1;
            loadGraves();
        });
    }
    
    if (sortOrder) {
        sortOrder.addEventListener('change', () => {
            currentPage = 1;
            loadGraves();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', openExportExcelModal);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', handleImport);
    }
    
    // Modal backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                const modalId = backdrop.dataset.modal;
                if (modalId) {
                    closeModalById(modalId);
                }
            }
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) {
                closeModalById(modalId);
            }
        });
    });
    
    // Quick select buttons for export range
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const range = btn.dataset.range;
            setExportRange(range);
        });
    });
    
    // Confirm export button
    const btnConfirmExport = document.getElementById('btnConfirmExportExcel');
    if (btnConfirmExport) {
        btnConfirmExport.addEventListener('click', confirmExportExcel);
    }
    
    // Close success modal
    const btnCloseSukses = document.getElementById('btnCloseSuksesModal');
    if (btnCloseSukses) {
        btnCloseSukses.addEventListener('click', closeSuksesModal);
    }
}

function closeModalById(modalId) {
    console.log('Closing modal:', modalId);
    switch(modalId) {
        case 'inputModal':
            closeModal();
            break;
        case 'editModal':
            closeEditModal();
            break;
        case 'deleteModal':
            closeDeleteModal();
            break;
        case 'detailModal':
            closeDetailModal();
            break;
        case 'exportExcelModal':
            closeExportExcelModal();
            break;
        case 'modalSukses':
            closeSuksesModal();
            break;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== DATA LOADING ====================

async function handleLogout() {
    try {
        if (window.__TAURI__) {
            await window.__TAURI__.core.invoke('logout');
        }
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/login.html';
    }
}

async function loadBlocks() {
    try {
        console.log('Loading blocks...');
        currentBlocks = await window.__TAURI__?.core?.invoke('get_blocks');
        console.log('Blocks loaded:', currentBlocks.length);
        populateBlockFilter();
        populateTambahBlockSelect();
        populateEditBlockSelect();
    } catch (error) {
        console.error('Failed to load blocks:', error);
        showToast('Gagal memuat data blok', 'error');
    }
}

function populateBlockFilter() {
    const blockSelect = document.querySelector('aside + main select');
    if (!blockSelect) return;
    
    // Save current selection
    const currentValue = blockSelect.value;
    
    // Clear existing options except first
    while (blockSelect.options.length > 1) {
        blockSelect.remove(1);
    }
    
    // Add block options
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        blockSelect.appendChild(option);
    });
    
    blockSelect.value = currentValue;
}

function populateTambahBlockSelect() {
    const blockSelect = document.getElementById('tambahBlockSelect');
    if (!blockSelect) return;
    
    blockSelect.innerHTML = '<option value="">Pilih Blok</option>';
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        blockSelect.appendChild(option);
    });
}

function populateEditBlockSelect(selectedBlockId = null) {
    const blockSelect = document.getElementById('editBlockSelect');
    if (!blockSelect) return;
    
    blockSelect.innerHTML = '<option value="">Pilih Blok</option>';
    currentBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block.id;
        option.textContent = `Blok ${block.code}`;
        if (selectedBlockId && block.id === selectedBlockId) {
            option.selected = true;
        }
        blockSelect.appendChild(option);
    });
}

async function loadGraves(search = '') {
    try {
        console.log('Loading graves... Search:', search);
        showLoading(true);
        
        const blockSelect = document.querySelector('aside + main select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const offset = (currentPage - 1) * itemsPerPage;
        
        // Get sort parameters
        const sortField = document.getElementById('sortField')?.value || 'nama';
        const sortOrder = document.getElementById('sortOrder')?.value || 'asc';
        
        console.log('Fetching graves with params:', { search, blockId, limit: itemsPerPage, offset, sortField, sortOrder });
        
        const graves = await window.__TAURI__?.core?.invoke('get_graves', {
            search: search || null,
            blockId: blockId,
            limit: itemsPerPage,
            offset: offset,
            sortField: sortField,
            sortOrder: sortOrder
        });
        
        console.log('Graves loaded:', graves.length, graves);
        
        const totalCount = await window.__TAURI__?.core?.invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        console.log('Total count:', totalCount);
        
        currentGraves = graves;
        totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
        
        console.log('Rendering table with', currentGraves.length, 'graves');
        renderGravesTable();
        updatePagination(totalCount);
    } catch (error) {
        console.error('Failed to load graves:', error);
        showToast('Gagal memuat data makam', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadHeirsForGrave(graveId) {
    try {
        console.log('Loading heirs for grave:', graveId);
        const heirs = await window.__TAURI__?.core?.invoke('get_heirs_by_grave', { graveId });
        console.log('Heirs loaded:', heirs.length);
        return heirs;
    } catch (error) {
        console.error('Failed to load heirs:', error);
        return [];
    }
}

// ==================== RENDER TABLE ====================

function renderGravesTable() {
    console.log('renderGravesTable called. Current graves:', currentGraves.length);
    
    // Use specific ID selector
    const tbody = document.getElementById('gravesTableBody');
    if (!tbody) {
        console.error('tbody with id gravesTableBody not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (currentGraves.length === 0) {
        console.log('No graves to render, showing empty message');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-4 py-8 text-center text-gray-500">
                    Tidak ada data makam
                </td>
            </tr>
        `;
        return;
    }
    
    currentGraves.forEach((grave, index) => {
        console.log('Rendering grave:', grave.id, grave.deceased_name);
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
        row.dataset.graveId = grave.id;
        
        // Format dates
        const burialDate = grave.burial_date ? formatDate(grave.burial_date) : '-';
        const birthDate = grave.birth_date ? formatDate(grave.birth_date) : '-';
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600 border-r">${escapeHtml(grave.code)}-${grave.number}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-800 border-r">${escapeHtml(grave.deceased_name)}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${escapeHtml(grave.birth_place || '-')}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${birthDate}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${burialDate}</td>
            <td class="px-4 py-3 text-sm text-gray-800 border-r">
                <span class="heir-name-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">
                <span class="heir-phone-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">
                <span class="heir-address-${grave.id}">Memuat...</span>
            </td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button data-edit-id="${grave.id}" class="btn-edit-grave p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button data-delete-id="${grave.id}" data-delete-name="${escapeHtml(grave.deceased_name)}" class="btn-delete-grave p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        // Add click handler for row (not on action buttons)
        row.addEventListener('click', (e) => {
            // Don't open detail if clicking on action buttons
            if (e.target.closest('.btn-edit-grave') || e.target.closest('.btn-delete-grave')) {
                return;
            }
            showDetailModal(grave.id);
        });
        
        tbody.appendChild(row);
        
        // Load heirs for this row
        loadAndRenderHeirsForRow(grave.id, row);
    });
    
    console.log('Table rendering complete');
}

async function loadAndRenderHeirsForRow(graveId, row) {
    console.log('Loading heirs for row:', graveId);
    const heirs = await loadHeirsForGrave(graveId);
    const nameCell = row.querySelector(`.heir-name-${graveId}`);
    const phoneCell = row.querySelector(`.heir-phone-${graveId}`);
    const addressCell = row.querySelector(`.heir-address-${graveId}`);
    
    if (heirs && heirs.length > 0) {
        const firstHeir = heirs[0];
        if (nameCell) nameCell.textContent = escapeHtml(firstHeir.full_name);
        if (phoneCell) phoneCell.textContent = escapeHtml(firstHeir.phone_number || '-');
        if (addressCell) addressCell.textContent = truncateText(firstHeir.address || '-', 30);
    } else {
        if (nameCell) nameCell.textContent = '-';
        if (phoneCell) phoneCell.textContent = '-';
        if (addressCell) addressCell.textContent = '-';
    }
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '-';
    return text.substring(0, maxLength) + '...';
}

function updatePagination(totalCount) {
    const paginationInfo = document.querySelector('.border-t.border-gray-200 p.text-gray-500');
    
    if (paginationInfo) {
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, totalCount);
        paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${totalCount} data`;
    }
    
    // Update pagination buttons
    const paginationContainer = document.querySelector('.border-t.border-gray-200 .flex.gap-2');
    if (paginationContainer) {
        renderPaginationButtons(paginationContainer);
    }
}

function renderPaginationButtons(container) {
    let html = '';
    
    // Previous button
    html += `<button data-page="${currentPage - 1}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>`;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button data-page="1" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button data-page="${i}" class="pagination-btn px-3 py-1.5 text-sm ${isActive ? 'bg-emerald-600 text-white' : 'border border-gray-300 hover:bg-gray-50'} rounded-lg">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
        html += `<button data-page="${totalPages}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button data-page="${currentPage + 1}" class="pagination-btn px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>Selanjutnya</button>`;
    
    container.innerHTML = html;
}

async function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    await loadGraves(searchInput ? searchInput.value : '');
}

// ==================== DETAIL MODAL ====================

function openDetailModal() {
    const modal = document.getElementById('detailModal');
    if (!modal) {
        console.error('detailModal not found!');
        return;
    }
    modal.classList.remove('hidden');
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function showDetailModal(graveId) {
    console.log('Showing detail for grave:', graveId);
    try {
        showLoading(true);
        
        const detail = await window.__TAURI__?.core?.invoke('get_grave_detail', { id: graveId });
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        console.log('Detail loaded:', detail);
        
        // Populate detail modal
        const namaEl = document.getElementById('detailNamaAlmarhum');
        const blokEl = document.getElementById('detailBlokNomor');
        const tipeEl = document.getElementById('detailTipeMakam');
        const tempatLahirEl = document.getElementById('detailTempatLahir');
        const tanggalLahirEl = document.getElementById('detailTanggalLahir');
        const tanggalDimakamkanEl = document.getElementById('detailTanggalDimakamkan');
        const catatanEl = document.getElementById('detailCatatan');
        
        if (namaEl) namaEl.textContent = detail.grave.deceased_name || '-';
        if (blokEl) blokEl.textContent = (detail.grave.code || '-') + ' - ' + (detail.grave.number || '-');
        if (tipeEl) tipeEl.textContent = detail.grave.grave_type === 'new' ? 'Makam Baru' : (detail.grave.grave_type === 'stacked' ? 'Makam Tumpuk' : '-');
        if (tempatLahirEl) tempatLahirEl.textContent = detail.grave.birth_place || '-';
        if (tanggalLahirEl) tanggalLahirEl.textContent = detail.grave.birth_date ? formatDate(detail.grave.birth_date) : '-';
        if (tanggalDimakamkanEl) tanggalDimakamkanEl.textContent = detail.grave.burial_date ? formatDate(detail.grave.burial_date) : '-';
        if (catatanEl) catatanEl.textContent = detail.grave.notes || '-';
        
        // Populate heirs list
        const heirsContainer = document.getElementById('detailAhliWarisContainer');
        if (heirsContainer) {
            heirsContainer.innerHTML = '';
            
            if (detail.heirs && detail.heirs.length > 0) {
                detail.heirs.forEach((heir, index) => {
                    const heirCard = document.createElement('div');
                    heirCard.className = 'p-4 bg-gray-50 rounded-lg border border-gray-200';
                    heirCard.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-gray-800">Ahli Waris #${index + 1}</span>
                            <span class="text-xs ${index === 0 ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded">${index === 0 ? 'Utama' : 'Opsional'}</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div>
                                <span class="text-gray-500">Nama:</span>
                                <span class="font-medium text-gray-800">${escapeHtml(heir.full_name)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Telepon:</span>
                                <span class="text-gray-800">${escapeHtml(heir.phone_number || '-')}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Hubungan:</span>
                                <span class="text-gray-800">${formatRelationship(heir.relationship)}</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Alamat:</span>
                                <span class="text-gray-800">${escapeHtml(heir.address || '-')}</span>
                            </div>
                        </div>
                    `;
                    heirsContainer.appendChild(heirCard);
                });
            } else {
                heirsContainer.innerHTML = '<p class="text-gray-500 text-sm">Tidak ada data ahli waris</p>';
            }
        }
        
        // Set up action buttons
        const btnEdit = document.getElementById('btnEditFromDetail');
        const btnDelete = document.getElementById('btnDeleteFromDetail');
        
        if (btnEdit) {
            btnEdit.onclick = () => {
                closeDetailModal();
                openEditModal(graveId);
            };
        }
        
        if (btnDelete) {
            btnDelete.onclick = () => {
                closeDetailModal();
                openDeleteModal(graveId, detail.grave.deceased_name);
            };
        }
        
        openDetailModal();
    } catch (error) {
        console.error('Failed to load grave detail:', error);
        showToast('Gagal memuat detail makam: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== ADD MODAL ====================

function openModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
    if (!modal || !panel) return;
    
    modal.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    
    // Reset form
    const namaInput = document.getElementById('tambahNama');
    const blockSelect = document.getElementById('tambahBlockSelect');
    const nomorInput = document.getElementById('tambahNomor');
    const tanggalInput = document.getElementById('tambahTanggal');
    const tempatLahirInput = document.getElementById('tambahTempatLahir');
    const tanggalLahirInput = document.getElementById('tambahTanggalLahir');
    
    if (namaInput) namaInput.value = '';
    if (blockSelect) blockSelect.value = '';
    if (nomorInput) nomorInput.value = '';
    if (tanggalInput) tanggalInput.value = '';
    if (tempatLahirInput) tempatLahirInput.value = '';
    if (tanggalLahirInput) tanggalLahirInput.value = '';
    
    resetAhliWaris();
}

function closeModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
    if (!modal || !panel) return;
    
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function resetAhliWaris() {
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    container.innerHTML = createHeirHTML(1, true);
    jumlahAhliWaris = 1;
    updateTombolWaris();
}

function createHeirHTML(index, isRequired, heir = null) {
    return `
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100" data-heir-index="${index}">
            <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-blue-800">Ahli Waris #${index}</span>
                <span class="text-xs ${isRequired ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded">${isRequired ? 'Wajib' : 'Opsional'}</span>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                    <input type="text" class="heir-nama w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nama ahli waris" value="${heir ? escapeHtml(heir.full_name) : ''}">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Nomor Telepon</label>
                        <input type="tel" class="heir-telp w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="08xxxxxxxx" value="${heir ? escapeHtml(heir.phone_number || '') : ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600 mb-1">Hubungan</label>
                        <select class="heir-hubungan w-full h-9 px-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs">
                            <option value="">Pilih</option>
                            <option value="anak" ${heir && heir.relationship === 'anak' ? 'selected' : ''}>Anak</option>
                            <option value="istri" ${heir && heir.relationship === 'istri' ? 'selected' : ''}>Istri</option>
                            <option value="suami" ${heir && heir.relationship === 'suami' ? 'selected' : ''}>Suami</option>
                            <option value="cucu" ${heir && heir.relationship === 'cucu' ? 'selected' : ''}>Cucu</option>
                            <option value="saudara" ${heir && heir.relationship === 'saudara' ? 'selected' : ''}>Saudara</option>
                            <option value="lainnya" ${heir && heir.relationship === 'lainnya' ? 'selected' : ''}>Lainnya</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Alamat Lengkap</label>
                    <textarea class="heir-alamat w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="2" placeholder="Alamat lengkap ahli waris">${heir ? escapeHtml(heir.address || '') : ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function tambahAhliWaris() {
    if (jumlahAhliWaris >= maxAhliWaris) return;
    
    jumlahAhliWaris++;
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWaris, false);
    container.appendChild(div.firstElementChild);
    updateTombolWaris();
}

function hapusAhliWarisTerakhir() {
    if (jumlahAhliWaris <= 1) return;
    
    const container = document.getElementById('ahliWarisContainer');
    if (!container) return;
    
    container.removeChild(container.lastElementChild);
    jumlahAhliWaris--;
    updateTombolWaris();
}

function updateTombolWaris() {
    const btnTambah = document.getElementById('btnTambahWaris');
    const btnHapus = document.getElementById('btnHapusWaris');
    
    if (btnTambah) {
        if (jumlahAhliWaris >= maxAhliWaris) {
            btnTambah.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnTambah.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (btnHapus) {
        if (jumlahAhliWaris > 1) {
            btnHapus.classList.remove('hidden');
        } else {
            btnHapus.classList.add('hidden');
        }
    }
}

async function simpanData() {
    try {
        // Validate required fields
        const nama = document.getElementById('tambahNama')?.value?.trim();
        const blockId = parseInt(document.getElementById('tambahBlockSelect')?.value);
        const nomor = document.getElementById('tambahNomor')?.value?.trim();
        const tanggalWafat = document.getElementById('tambahTanggal')?.value;
        const tipeMakam = document.getElementById('tambahTipeMakam')?.value;
        
        // Get new fields
        const tempatLahir = document.getElementById('tambahTempatLahir')?.value?.trim() || null;
        const tanggalLahir = document.getElementById('tambahTanggalLahir')?.value || null;
        
        if (!nama) {
            showToast('Nama almarhum wajib diisi', 'error');
            return;
        }
        if (!blockId) {
            showToast('Blok makam wajib dipilih', 'error');
            return;
        }
        if (!nomor) {
            showToast('Nomor makam wajib diisi', 'error');
            return;
        }
        if (!tanggalWafat) {
            showToast('Tanggal wafat wajib diisi', 'error');
            return;
        }
        if (!tipeMakam) {
            showToast('Tipe makam wajib dipilih', 'error');
            return;
        }
        
        // Collect heirs data
        const heirs = [];
        const heirElements = document.querySelectorAll('#ahliWarisContainer > div');
        
        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama')?.value?.trim();
            
            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }
            
            if (namaWaris) {
                heirs.push({
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp')?.value?.trim() || null,
                    relationship: el.querySelector('.heir-hubungan')?.value || null,
                    address: el.querySelector('.heir-alamat')?.value?.trim() || null,
                    is_primary: i === 0
                });
            }
        }
        
        if (heirs.length === 0) {
            showToast('Minimal 1 ahli waris wajib diisi', 'error');
            return;
        }
        
        // Create request
        const request = {
            deceased_name: nama,
            block_id: blockId,
            number: nomor,
            date_of_death: tanggalWafat,
            birth_place: tempatLahir,
            birth_date: tanggalLahir,
            burial_date: null, // Not collected in form
            notes: null, // Not collected in form
            grave_type: tipeMakam,
            heirs: heirs
        };
        
        console.log('Saving grave:', request);
        
        showLoading(true);
        
        await window.__TAURI__?.core?.invoke('create_grave', { grave: request });
        
        // Create heirs
        // Note: We need to get the grave ID first, then create heirs
        
        closeModal();
        showToast('Data makam berhasil disimpan', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to save grave:', error);
        showToast('Gagal menyimpan data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== EDIT MODAL ====================

async function openEditModal(graveId) {
    currentEditingId = graveId;
    
    try {
        showLoading(true);
        
        const detail = await window.__TAURI__?.core?.invoke('get_grave_by_id', { id: graveId });
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        console.log('Editing grave:', detail);
        
        // Populate form
        const namaInput = document.getElementById('editNama');
        const tanggalInput = document.getElementById('editTanggal');
        const nomorInput = document.getElementById('editNomor');
        const tipeSelect = document.getElementById('editTipeMakam');
        const tempatLahirInput = document.getElementById('editTempatLahir');
        const tanggalLahirInput = document.getElementById('editTanggalLahir');
        
        if (namaInput) namaInput.value = detail.deceased_name || '';
        if (tanggalInput) tanggalInput.value = detail.date_of_death || '';
        if (nomorInput) nomorInput.value = detail.number || '';
        if (tipeSelect) tipeSelect.value = detail.grave_type || '';
        if (tempatLahirInput) tempatLahirInput.value = detail.birth_place || '';
        if (tanggalLahirInput) tanggalLahirInput.value = detail.birth_date || '';
        
        // Populate block select
        populateEditBlockSelect(detail.block_id);
        
        // Load and populate heirs
        const heirs = await loadHeirsForGrave(graveId);
        const container = document.getElementById('editAhliWarisContainer');
        if (container) {
            container.innerHTML = '';
            jumlahAhliWarisEdit = heirs.length || 1;
            
            if (heirs.length === 0) {
                container.innerHTML = createHeirHTML(1, true, null);
            } else {
                heirs.forEach((heir, index) => {
                    container.innerHTML += createHeirHTML(index + 1, index === 0, heir);
                });
            }
        }
        
        updateTombolWarisEdit();
        
        const modal = document.getElementById('editModal');
        const panel = document.getElementById('editModalPanel');
        if (modal && panel) {
            modal.classList.remove('hidden');
            setTimeout(() => panel.classList.remove('translate-x-full'), 10);
        }
    } catch (error) {
        console.error('Failed to load grave detail:', error);
        showToast('Gagal memuat detail makam: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    const panel = document.getElementById('editModalPanel');
    if (!modal || !panel) return;
    
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentEditingId = null;
}

function tambahAhliWarisEdit() {
    if (jumlahAhliWarisEdit >= maxAhliWaris) return;
    
    jumlahAhliWarisEdit++;
    const container = document.getElementById('editAhliWarisContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWarisEdit, false, null);
    container.appendChild(div.firstElementChild);
    updateTombolWarisEdit();
}

function hapusAhliWarisTerakhirEdit() {
    if (jumlahAhliWarisEdit <= 1) return;
    
    const container = document.getElementById('editAhliWarisContainer');
    if (!container) return;
    
    container.removeChild(container.lastElementChild);
    jumlahAhliWarisEdit--;
    updateTombolWarisEdit();
}

function updateTombolWarisEdit() {
    const btnTambah = document.getElementById('btnTambahWarisEdit');
    const btnHapus = document.getElementById('btnHapusWarisEdit');
    
    if (btnTambah) {
        if (jumlahAhliWarisEdit >= maxAhliWaris) {
            btnTambah.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btnTambah.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    if (btnHapus) {
        if (jumlahAhliWarisEdit > 1) {
            btnHapus.classList.remove('hidden');
        } else {
            btnHapus.classList.add('hidden');
        }
    }
}

async function simpanEdit() {
    if (!currentEditingId) return;
    
    try {
        // Validate required fields
        const nama = document.getElementById('editNama')?.value?.trim();
        const blockId = parseInt(document.getElementById('editBlockSelect')?.value);
        const nomor = document.getElementById('editNomor')?.value?.trim();
        const tanggalWafat = document.getElementById('editTanggal')?.value;
        const tipeMakam = document.getElementById('editTipeMakam')?.value;
        
        // Get new fields
        const tempatLahir = document.getElementById('editTempatLahir')?.value?.trim() || null;
        const tanggalLahir = document.getElementById('editTanggalLahir')?.value || null;
        
        if (!nama) {
            showToast('Nama almarhum wajib diisi', 'error');
            return;
        }
        if (!blockId) {
            showToast('Blok makam wajib dipilih', 'error');
            return;
        }
        if (!nomor) {
            showToast('Nomor makam wajib diisi', 'error');
            return;
        }
        if (!tanggalWafat) {
            showToast('Tanggal wafat wajib diisi', 'error');
            return;
        }
        if (!tipeMakam) {
            showToast('Tipe makam wajib dipilih', 'error');
            return;
        }
        
        // Collect heirs data
        const heirs = [];
        const heirElements = document.querySelectorAll('#editAhliWarisContainer > div');
        
        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama')?.value?.trim();
            
            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }
            
            if (namaWaris) {
                heirs.push({
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp')?.value?.trim() || null,
                    relationship: el.querySelector('.heir-hubungan')?.value || null,
                    address: el.querySelector('.heir-alamat')?.value?.trim() || null,
                    is_primary: i === 0
                });
            }
        }
        
        if (heirs.length === 0) {
            showToast('Minimal 1 ahli waris wajib diisi', 'error');
            return;
        }
        
        showLoading(true);
        
        // Update grave
        const graveUpdate = {
            deceased_name: nama,
            block_id: blockId,
            number: nomor,
            date_of_death: tanggalWafat,
            birth_place: tempatLahir,
            birth_date: tanggalLahir,
            burial_date: null,
            notes: null,
            grave_type: tipeMakam
        };
        
        console.log('Updating grave:', currentEditingId, graveUpdate);
        
        await window.__TAURI__?.core?.invoke('update_grave', {
            id: currentEditingId,
            grave: graveUpdate
        });
        
        // Delete existing heirs and create new ones
        await window.__TAURI__?.core?.invoke('delete_heirs_by_grave', { graveId: currentEditingId });
        
        // Create new heirs
        for (const heir of heirs) {
            await window.__TAURI__?.core?.invoke('create_heir', {
                heir: {
                    ...heir,
                    grave_id: currentEditingId
                }
            });
        }
        
        closeEditModal();
        showToast('Data makam berhasil diperbarui', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to update grave:', error);
        showToast('Gagal memperbarui data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== DELETE MODAL ====================

function openDeleteModal(graveId, nama) {
    currentDeletingId = graveId;
    currentDeletingName = nama;
    const deleteNamaEl = document.getElementById('deleteNama');
    if (deleteNamaEl) deleteNamaEl.textContent = nama;
    
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('hidden');
    
    currentDeletingId = null;
    currentDeletingName = '';
}

async function confirmDelete() {
    if (!currentDeletingId) return;
    
    try {
        showLoading(true);
        await window.__TAURI__?.core?.invoke('delete_grave', { id: currentDeletingId });
        
        closeDeleteModal();
        showToast('Data makam berhasil dihapus', 'success');
        await loadGraves();
    } catch (error) {
        console.error('Failed to delete grave:', error);
        showToast('Gagal menghapus data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== IMPORT ====================

async function handleImport() {
    try {
        showLoading(true);
        const result = await window.__TAURI__?.core?.invoke('import_database');
        
        if (result.success) {
            showToast(result.message || 'Database berhasil diimport', 'success');
            await loadGraves();
        } else {
            showToast(result.error || 'Gagal mengimport database', 'error');
        }
    } catch (error) {
        console.error('Import failed:', error);
        showToast('Gagal mengimport database: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== UTILITIES ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (show) {
        document.body.style.cursor = 'wait';
    } else {
        document.body.style.cursor = 'default';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EXPORT EXCEL ====================

// Global variable for export range
let exportStartYear = null;
let exportEndYear = null;

function openExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateYearOptions();
        setExportRange(5);
        updateExportDataCount();
    }
}

function closeExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    if (modal) modal.classList.add('hidden');
}

function populateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startSelect = document.getElementById('exportStartYear');
    const endSelect = document.getElementById('exportEndYear');
    
    if (!startSelect || !endSelect) return;
    
    // Clear existing options
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    
    // Generate years from 2000 to current year + 5
    for (let year = 2000; year <= currentYear + 5; year++) {
        const startOption = document.createElement('option');
        startOption.value = year;
        startOption.textContent = year;
        startSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = year;
        endOption.textContent = year;
        endSelect.appendChild(endOption);
    }
}

function setExportRange(range) {
    const currentYear = new Date().getFullYear();
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    
    if (!startYearSelect || !endYearSelect) return;
    
    const yearSelectorsDiv = startYearSelect.closest('.grid');
    
    if (range === 'all') {
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'none';
        }
        exportStartYear = null;
        exportEndYear = null;
    } else {
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'grid';
        }
        exportEndYear = currentYear;
        exportStartYear = currentYear - range + 1;
        
        startYearSelect.value = exportStartYear;
        endYearSelect.value = exportEndYear;
    }
    
    // Update active button state
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-100', 'text-emerald-700', 'active');
        btn.classList.add('bg-gray-100');
    });
    
    const activeBtn = document.querySelector(`button[data-range="${range}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100');
        activeBtn.classList.add('bg-emerald-100', 'text-emerald-700', 'active');
    }
    
    updateYearPreview();
}

function updateYearPreview() {
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    const previewElement = document.getElementById('previewYears');
    
    if (!startYearSelect || !endYearSelect || !previewElement) return;
    
    // Check if "Semua" is selected
    const allBtn = document.querySelector('button[data-range="all"]');
    if (allBtn && allBtn.classList.contains('active')) {
        previewElement.textContent = 'Semua Data (Otomatis berdasarkan data di database)';
        return;
    }
    
    exportStartYear = parseInt(startYearSelect.value);
    exportEndYear = parseInt(endYearSelect.value);
    
    // Validate
    if (exportStartYear > exportEndYear) {
        exportEndYear = exportStartYear;
        endYearSelect.value = exportEndYear;
    }
    
    const yearCount = exportEndYear - exportStartYear + 1;
    previewElement.textContent = `${exportStartYear} - ${exportEndYear} (${yearCount} tahun)`;
}

async function updateExportDataCount() {
    try {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
        const search = searchInput ? searchInput.value : '';
        
        const blockSelect = document.querySelector('aside + main select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const count = await window.__TAURI__?.core?.invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        const exportDataCountEl = document.getElementById('exportDataCount');
        if (exportDataCountEl) {
            exportDataCountEl.textContent = `${count} data makam`;
        }
    } catch (error) {
        const exportDataCountEl = document.getElementById('exportDataCount');
        if (exportDataCountEl) exportDataCountEl.textContent = '-';
    }
}

async function confirmExportExcel() {
    closeExportExcelModal();
    await exportToExcel(exportStartYear, exportEndYear);
}

async function exportToExcel(startYear, endYear) {
    try {
        showLoading(true);
        
        // Get current filter values
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
        const search = searchInput ? searchInput.value : '';
        
        const blockSelect = document.querySelector('aside + main select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        // Check if "Semua" is selected
        const allBtn = document.querySelector('button[data-range="all"]');
        const isAll = allBtn && allBtn.classList.contains('active');
        
        // Fetch all graves with heirs for export
        const exportData = await window.__TAURI__?.core?.invoke('get_all_graves_with_heirs', {
            search: search || null,
            blockId: blockId
        });
        
        if (!exportData || exportData.length === 0) {
            showToast('Tidak ada data untuk diexport', 'error');
            showLoading(false);
            return;
        }
        
        // Prepare data for Excel
        const excelData = exportData.map((item, index) => {
            const row = {
                'No': index + 1,
                'Nama Almarhum': item.deceased_name,
                'Blok': item.block_code,
                'Nomor Makam': item.number,
                'Tempat Lahir': item.birth_place || '-',
                'Tanggal Lahir': item.birth_date ? formatDate(item.birth_date) : '-',
                'Tanggal Dimakamkan': item.burial_date ? formatDate(item.burial_date) : '-',
                'Catatan': item.notes || '-',
            };
            
            // Add heir data (up to 3)
            for (let i = 0; i < 3; i++) {
                const heir = item.heirs[i];
                const num = i + 1;
                if (heir) {
                    row[`Ahli Waris ${num}`] = heir.full_name;
                    row[`No. HP ${num}`] = heir.phone_number || '-';
                    row[`Hubungan ${num}`] = formatRelationship(heir.relationship);
                    row[`Alamat ${num}`] = heir.address || '-';
                } else {
                    row[`Ahli Waris ${num}`] = '-';
                    row[`No. HP ${num}`] = '-';
                    row[`Hubungan ${num}`] = '-';
                    row[`Alamat ${num}`] = '-';
                }
            }
            
            return row;
        });
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const colWidths = [
            { wch: 5 },   // No
            { wch: 25 },  // Nama Almarhum
            { wch: 8 },   // Blok
            { wch: 12 },  // Nomor Makam
            { wch: 15 },  // Tempat Lahir
            { wch: 15 },  // Tanggal Lahir
            { wch: 18 },  // Tanggal Dimakamkan
            { wch: 20 },  // Catatan
            { wch: 20 },  // Ahli Waris 1
            { wch: 15 },  // No. HP 1
            { wch: 12 },  // Hubungan 1
            { wch: 25 },  // Alamat 1
            { wch: 20 },  // Ahli Waris 2
            { wch: 15 },  // No. HP 2
            { wch: 12 },  // Hubungan 2
            { wch: 25 },  // Alamat 2
            { wch: 20 },  // Ahli Waris 3
            { wch: 15 },  // No. HP 3
            { wch: 12 },  // Hubungan 3
            { wch: 25 },  // Alamat 3
        ];
        ws['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data Makam');
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const defaultFilename = `Data_Makam_${timestamp}.xlsx`;
        
        // Write to array buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Check if running in Tauri
        if (window.__TAURI__) {
            try {
                // Convert blob to array
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Convert to regular array for Tauri
                const fileData = Array.from(uint8Array);
                
                // Use Tauri command to save with dialog
                const savedPath = await window.__TAURI__?.core?.invoke('save_excel_file', {
                    fileData: fileData,
                    defaultName: defaultFilename
                });
                
                if (savedPath) {
                    showToast(`Berhasil export ${exportData.length} data ke:\n${savedPath}`, 'success');
                } else {
                    showToast('Export dibatalkan', 'info');
                }
            } catch (tauriError) {
                console.error('Tauri save failed:', tauriError);
                fallbackDownload(blob, defaultFilename, exportData.length);
            }
        } else {
            fallbackDownload(blob, defaultFilename, exportData.length);
        }
        
    } catch (error) {
        console.error('Failed to export:', error);
        showToast('Gagal mengexport data: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function fallbackDownload(blob, filename, dataCount) {
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Berhasil export ${dataCount} data ke folder Downloads`, 'success');
}

function formatRelationship(relationship) {
    if (!relationship) return '-';
    const map = {
        'anak': 'Anak',
        'istri': 'Istri',
        'suami': 'Suami',
        'cucu': 'Cucu',
        'saudara': 'Saudara',
        'lainnya': 'Lainnya'
    };
    return map[relationship] || relationship;
}

// ==================== TABLE ACTION LISTENERS ====================

function setupTableActionListeners() {
    console.log('Setting up table action listeners...');
    
    // Use event delegation for dynamically generated table rows
    const tbody = document.getElementById('gravesTableBody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            console.log('Table clicked:', e.target);
            
            // Handle dynamic grave edit buttons
            const editGraveBtn = e.target.closest('.btn-edit-grave');
            if (editGraveBtn) {
                e.stopPropagation();
                const graveId = parseInt(editGraveBtn.dataset.editId);
                console.log('Edit button clicked for grave:', graveId);
                openEditModal(graveId);
                return;
            }
            
            // Handle dynamic grave delete buttons
            const deleteGraveBtn = e.target.closest('.btn-delete-grave');
            if (deleteGraveBtn) {
                e.stopPropagation();
                const graveId = parseInt(deleteGraveBtn.dataset.deleteId);
                const graveName = deleteGraveBtn.dataset.deleteName;
                console.log('Delete button clicked for grave:', graveId, graveName);
                openDeleteModal(graveId, graveName);
                return;
            }
            
            // Handle row click for detail view
            const row = e.target.closest('tr');
            if (row && row.dataset.graveId) {
                const graveId = parseInt(row.dataset.graveId);
                console.log('Row clicked for detail:', graveId);
                showDetailModal(graveId);
            }
        });
    }
    
    // Event delegation for pagination buttons
    const paginationContainer = document.querySelector('.border-t.border-gray-200 .flex.gap-2');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-page]');
            if (btn) {
                const page = parseInt(btn.dataset.page);
                goToPage(page);
            }
        });
    }
}

function closeSuksesModal() {
    const modal = document.getElementById('modalSukses');
    if (modal) modal.classList.add('hidden');
}

// Expose functions to global scope for onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.tambahAhliWaris = tambahAhliWaris;
window.hapusAhliWarisTerakhir = hapusAhliWarisTerakhir;
window.simpanData = simpanData;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.tambahAhliWarisEdit = tambahAhliWarisEdit;
window.hapusAhliWarisTerakhirEdit = hapusAhliWarisTerakhirEdit;
window.simpanEdit = simpanEdit;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.goToPage = goToPage;
window.exportToExcel = exportToExcel;
window.openExportExcelModal = openExportExcelModal;
window.closeExportExcelModal = closeExportExcelModal;
window.setExportRange = setExportRange;
window.confirmExportExcel = confirmExportExcel;
window.updateYearPreview = updateYearPreview;
window.closeSuksesModal = closeSuksesModal;
window.showDetailModal = showDetailModal;
window.closeDetailModal = closeDetailModal;
window.openDetailModal = openDetailModal;
window.loadGraves = loadGraves;
