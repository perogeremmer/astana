// Data Makam - CRUD JavaScript for Graves and Heirs
// Integrates with Tauri backend

const { invoke } = window.__TAURI__.core || {};

// Global state
let currentGraves = [];
let currentBlocks = [];
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;
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
    await loadBlocks();
    await loadGraves();
    setupEventListeners();
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

// ==================== LOAD DATA ====================

async function loadBlocks() {
    try {
        currentBlocks = await invoke('get_blocks');
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
        showLoading(true);
        
        const blockSelect = document.querySelector('aside + main select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const offset = (currentPage - 1) * itemsPerPage;
        
        const graves = await invoke('get_graves', {
            search: search || null,
            blockId: blockId,
            limit: itemsPerPage,
            offset: offset
        });
        
        const totalCount = await invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        currentGraves = graves;
        totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
        
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
        return await invoke('get_heirs_by_grave', { graveId });
    } catch (error) {
        console.error('Failed to load heirs:', error);
        return [];
    }
}

// ==================== RENDER TABLE ====================

function renderGravesTable() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (currentGraves.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    Tidak ada data makam
                </td>
            </tr>
        `;
        return;
    }
    
    currentGraves.forEach((grave, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Format dates
        const dateOfDeath = formatDate(grave.date_of_death);
        
        // Create heirs cells (3 columns)
        let heirsHtml = '';
        for (let i = 0; i < 3; i++) {
            heirsHtml += `<td class="px-4 py-3 border-r"><span class="text-sm text-gray-400">-</span></td>`;
        }
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-800 sticky left-12 bg-white border-r">${escapeHtml(grave.deceased_name)}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600 border-r">${grave.code}-${grave.number}</td>
            <td class="px-4 py-3 text-sm text-gray-600 border-r">${dateOfDeath}</td>
            ${heirsHtml}
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditModal(${grave.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button onclick="openDeleteModal(${grave.id}, '${escapeHtml(grave.deceased_name)}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Load heirs for this row
        loadAndRenderHeirsForRow(grave.id, row);
    });
}

async function loadAndRenderHeirsForRow(graveId, row) {
    const heirs = await loadHeirsForGrave(graveId);
    const heirCells = row.querySelectorAll('td:nth-child(5), td:nth-child(6), td:nth-child(7)');
    
    heirs.forEach((heir, index) => {
        if (index < 3 && heirCells[index]) {
            heirCells[index].innerHTML = `
                <div class="text-sm">
                    <p class="font-medium text-gray-800">${escapeHtml(heir.full_name)}</p>
                    <p class="text-xs text-gray-500">${heir.phone_number || '-'}</p>
                </div>
            `;
        }
    });
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
    html += `<button onclick="goToPage(${currentPage - 1})" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>`;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="goToPage(${i})" class="px-3 py-1.5 text-sm ${isActive ? 'bg-emerald-600 text-white' : 'border border-gray-300 hover:bg-gray-50'} rounded-lg">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button onclick="goToPage(${currentPage + 1})" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>Selanjutnya</button>`;
    
    container.innerHTML = html;
}

async function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    await loadGraves(searchInput ? searchInput.value : '');
}

// ==================== ADD MODAL ====================

function openModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
    modal.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    
    // Reset form
    document.getElementById('tambahNama').value = '';
    document.getElementById('tambahBlockSelect').value = '';
    document.getElementById('tambahNomor').value = '';
    document.getElementById('tambahTanggal').value = '';
    resetAhliWaris();
}

function closeModal() {
    const modal = document.getElementById('inputModal');
    const panel = document.getElementById('modalPanel');
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
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWaris, false);
    container.appendChild(div.firstElementChild);
    updateTombolWaris();
}

function hapusAhliWarisTerakhir() {
    if (jumlahAhliWaris <= 1) return;
    
    const container = document.getElementById('ahliWarisContainer');
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
        const nama = document.getElementById('tambahNama').value.trim();
        const blockId = parseInt(document.getElementById('tambahBlockSelect').value);
        const nomor = document.getElementById('tambahNomor').value.trim();
        const tanggalWafat = document.getElementById('tambahTanggal').value;
        
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
        
        // Collect heirs data
        const heirs = [];
        const heirElements = document.querySelectorAll('#ahliWarisContainer > div');
        
        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama').value.trim();
            
            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }
            
            if (namaWaris) {
                heirs.push({
                    grave_id: 0,
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp').value.trim() || null,
                    relationship: el.querySelector('.heir-hubungan').value || null,
                    address: el.querySelector('.heir-alamat').value.trim() || null,
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
            grave: {
                deceased_name: nama,
                block_id: blockId,
                number: nomor,
                date_of_death: tanggalWafat,
                burial_date: null,
                notes: null
            },
            heirs: heirs
        };
        
        showLoading(true);
        await invoke('create_grave_with_heirs', { request });
        
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
        
        const detail = await invoke('get_grave_detail', { id: graveId });
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('editNama').value = detail.grave.deceased_name;
        document.getElementById('editTanggal').value = detail.grave.date_of_death;
        document.getElementById('editNomor').value = detail.grave.number;
        
        // Populate block select
        populateEditBlockSelect(detail.grave.block_id);
        
        // Populate heirs
        const container = document.getElementById('editAhliWarisContainer');
        container.innerHTML = '';
        jumlahAhliWarisEdit = detail.heirs.length || 1;
        
        if (detail.heirs.length === 0) {
            container.innerHTML = createHeirHTML(1, true, null);
        } else {
            detail.heirs.forEach((heir, index) => {
                container.innerHTML += createHeirHTML(index + 1, index === 0, heir);
            });
        }
        
        updateTombolWarisEdit();
        
        const modal = document.getElementById('editModal');
        const panel = document.getElementById('editModalPanel');
        modal.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    } catch (error) {
        console.error('Failed to load grave detail:', error);
        showToast('Gagal memuat detail makam', 'error');
    } finally {
        showLoading(false);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    const panel = document.getElementById('editModalPanel');
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentEditingId = null;
}

function tambahAhliWarisEdit() {
    if (jumlahAhliWarisEdit >= maxAhliWaris) return;
    
    jumlahAhliWarisEdit++;
    const container = document.getElementById('editAhliWarisContainer');
    const div = document.createElement('div');
    div.innerHTML = createHeirHTML(jumlahAhliWarisEdit, false, null);
    container.appendChild(div.firstElementChild);
    updateTombolWarisEdit();
}

function hapusAhliWarisTerakhirEdit() {
    if (jumlahAhliWarisEdit <= 1) return;
    
    const container = document.getElementById('editAhliWarisContainer');
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
        const nama = document.getElementById('editNama').value.trim();
        const blockId = parseInt(document.getElementById('editBlockSelect').value);
        const nomor = document.getElementById('editNomor').value.trim();
        const tanggalWafat = document.getElementById('editTanggal').value;
        
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
        
        // Collect heirs data
        const heirs = [];
        const heirElements = document.querySelectorAll('#editAhliWarisContainer > div');
        
        for (let i = 0; i < heirElements.length; i++) {
            const el = heirElements[i];
            const namaWaris = el.querySelector('.heir-nama').value.trim();
            
            if (i === 0 && !namaWaris) {
                showToast('Ahli waris pertama wajib diisi', 'error');
                return;
            }
            
            if (namaWaris) {
                heirs.push({
                    grave_id: currentEditingId,
                    order_number: i + 1,
                    full_name: namaWaris,
                    phone_number: el.querySelector('.heir-telp').value.trim() || null,
                    relationship: el.querySelector('.heir-hubungan').value || null,
                    address: el.querySelector('.heir-alamat').value.trim() || null,
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
        await invoke('update_grave', {
            id: currentEditingId,
            grave: {
                deceased_name: nama,
                block_id: blockId,
                number: nomor,
                date_of_death: tanggalWafat,
                burial_date: null,
                notes: null
            }
        });
        
        // Update heirs
        await invoke('update_grave_heirs', {
            graveId: currentEditingId,
            heirs: heirs
        });
        
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
    document.getElementById('deleteNama').textContent = nama;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    currentDeletingId = null;
    currentDeletingName = '';
}

async function confirmDelete() {
    if (!currentDeletingId) return;
    
    try {
        showLoading(true);
        await invoke('delete_grave', { id: currentDeletingId });
        
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
