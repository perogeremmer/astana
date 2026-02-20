// Blok - CRUD JavaScript for Blocks
// Integrates with Tauri backend

const { invoke } = window.__TAURI__.core || {};

// Global state
let currentBlocks = [];
let currentEditingId = null;
let currentDeletingId = null;
let currentDeletingName = '';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    await loadBlocks();
});

// ==================== LOAD DATA ====================

async function loadBlocks() {
    try {
        showLoading(true);
        currentBlocks = await invoke('get_blocks');
        renderBlockCards();
        renderBlockTable();
    } catch (error) {
        console.error('Failed to load blocks:', error);
        showToast('Gagal memuat data blok', 'error');
    } finally {
        showLoading(false);
    }
}

async function getBlockStats(blockId) {
    try {
        return await invoke('get_block_stats', { blockId });
    } catch (error) {
        console.error('Failed to load block stats:', error);
        return { total_capacity: 0, occupied: 0, available: 0 };
    }
}

// ==================== RENDER CARDS ====================

function renderBlockCards() {
    const container = document.querySelector('.grid.grid-cols-2.lg\\:grid-cols-3');
    if (!container) return;
    
    // Keep the "Tambah Blok Card" button
    const tambahCard = container.lastElementChild;
    
    // Clear existing cards except the tambah button
    container.innerHTML = '';
    
    // Color schemes for blocks
    const colorSchemes = [
        { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
        { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
        { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
        { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
        { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
        { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
        { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
        { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    ];
    
    currentBlocks.forEach((block, index) => {
        const color = colorSchemes[index % colorSchemes.length];
        const isActive = block.status === 'active';
        
        const card = document.createElement('div');
        card.className = `bg-white rounded-xl border ${isActive ? 'border-gray-200' : 'border-red-200 border-dashed'} shadow-sm hover:shadow-md transition-shadow`;
        card.innerHTML = `
            <div class="p-5">
                <div class="flex items-start justify-between mb-4">
                    <div class="w-14 h-14 ${isActive ? color.bg : 'bg-red-100'} rounded-xl flex items-center justify-center">
                        <span class="text-2xl font-bold ${isActive ? color.text : 'text-red-600'}">${escapeHtml(block.code)}</span>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <span class="inline-flex px-2 py-1 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-xs font-medium rounded-full">
                            ${isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <div class="flex gap-2">
                            <button onclick="openEditModal(${block.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                </svg>
                            </button>
                            <button onclick="openDeleteModal(${block.id}, '${escapeHtml(block.code)}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <h3 class="font-semibold text-lg text-gray-800 mb-1">Blok ${escapeHtml(block.code)}</h3>
                <p class="text-sm text-gray-500 mb-4">${escapeHtml(block.description || '-')}</p>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Total Makam</span>
                        <span class="font-semibold text-gray-800">${block.total_capacity}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                        <span class="text-sm text-emerald-700">Iuran per Tahun</span>
                        <span class="font-bold text-emerald-700">Rp ${formatNumber(block.annual_fee)}</span>
                    </div>
                </div>
            </div>
            <div class="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Terisi:</span>
                    <span class="font-medium text-gray-700 block-occupied" data-block-id="${block.id}">- makam</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
        
        // Load occupied count
        loadOccupiedCount(block.id, card);
    });
    
    // Add the tambah button back
    container.appendChild(tambahCard);
}

async function loadOccupiedCount(blockId, card) {
    const stats = await getBlockStats(blockId);
    const occupiedEl = card.querySelector('.block-occupied');
    if (occupiedEl) {
        occupiedEl.textContent = `${stats.occupied} makam`;
    }
}

// ==================== RENDER TABLE ====================

async function renderBlockTable() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (currentBlocks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    Tidak ada data blok
                </td>
            </tr>
        `;
        updateFooterTotals(0, 0);
        return;
    }
    
    let totalCapacity = 0;
    let totalOccupied = 0;
    
    // Load all stats first
    const blockStats = await Promise.all(
        currentBlocks.map(block => getBlockStats(block.id))
    );
    
    currentBlocks.forEach((block, index) => {
        const isActive = block.status === 'active';
        const stats = blockStats[index];
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-800">${escapeHtml(block.code)}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(block.description || '-')}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600">${block.total_capacity}</td>
            <td class="px-4 py-3 text-sm text-center text-emerald-600 font-medium">${stats.occupied}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600">${stats.available}</td>
            <td class="px-4 py-3 text-sm text-right font-semibold text-emerald-600">Rp ${formatNumber(block.annual_fee)}</td>
            <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-1 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'} text-xs font-medium rounded-full">
                    ${isActive ? 'Aktif' : 'Nonaktif'}
                </span>
            </td>
            <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="openEditModal(${block.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button onclick="openDeleteModal(${block.id}, '${escapeHtml(block.code)}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        
        totalCapacity += block.total_capacity;
        totalOccupied += stats.occupied;
    });
    
    // Update footer totals
    updateFooterTotals(totalCapacity, totalOccupied);
}

function updateFooterTotals(totalCapacity, totalOccupied) {
    const totalCapacityEl = document.getElementById('footerTotalCapacity');
    const totalOccupiedEl = document.getElementById('footerTotalOccupied');
    const totalAvailableEl = document.getElementById('footerTotalAvailable');
    
    if (totalCapacityEl) totalCapacityEl.textContent = totalCapacity;
    if (totalOccupiedEl) totalOccupiedEl.textContent = totalOccupied;
    if (totalAvailableEl) totalAvailableEl.textContent = totalCapacity - totalOccupied;
}

// ==================== ADD MODAL ====================

function openModal() {
    const modal = document.getElementById('modalTambah');
    const panel = document.getElementById('panelTambah');
    modal.classList.remove('hidden');
    setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    
    // Reset form
    resetTambahForm();
}

function closeModal() {
    const modal = document.getElementById('modalTambah');
    const panel = document.getElementById('panelTambah');
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function resetTambahForm() {
    document.getElementById('tambahKode').value = '';
    document.getElementById('tambahKeterangan').value = '';
    document.getElementById('tambahKapasitas').value = '';
    document.getElementById('tambahIuran').value = '';
    document.getElementById('tambahStatus').value = 'active';
}

async function simpanBlock() {
    try {
        const code = document.getElementById('tambahKode').value.trim().toUpperCase();
        const description = document.getElementById('tambahKeterangan').value.trim() || null;
        const total_capacity = parseInt(document.getElementById('tambahKapasitas').value);
        const annual_fee = parseInt(document.getElementById('tambahIuran').value);
        const status = document.getElementById('tambahStatus').value;
        
        // Validation
        if (!code) {
            showToast('Kode blok wajib diisi', 'error');
            return;
        }
        if (code.length !== 1 || !/[A-Z]/.test(code)) {
            showToast('Kode blok harus 1 huruf', 'error');
            return;
        }
        if (isNaN(total_capacity) || total_capacity <= 0) {
            showToast('Kapasitas total wajib diisi dan lebih dari 0', 'error');
            return;
        }
        if (isNaN(annual_fee) || annual_fee < 0) {
            showToast('Harga iuran wajib diisi', 'error');
            return;
        }
        
        showLoading(true);
        
        await invoke('create_block', {
            block: {
                code,
                description,
                total_capacity,
                annual_fee,
                status
            }
        });
        
        closeModal();
        showToast('Blok berhasil ditambahkan', 'success');
        await loadBlocks();
    } catch (error) {
        console.error('Failed to create block:', error);
        showToast('Gagal menambahkan blok: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== EDIT MODAL ====================

async function openEditModal(blockId) {
    currentEditingId = blockId;
    
    try {
        showLoading(true);
        
        const block = await invoke('get_block_by_id', { id: blockId });
        if (!block) {
            showToast('Data blok tidak ditemukan', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('editKodeBlok').textContent = block.code;
        document.getElementById('editKodeInput').value = block.code;
        document.getElementById('editKeterangan').value = block.description || '';
        document.getElementById('editKapasitas').value = block.total_capacity;
        document.getElementById('editIuran').value = block.annual_fee;
        document.getElementById('editStatus').value = block.status;
        
        const modal = document.getElementById('modalEdit');
        const panel = document.getElementById('panelEdit');
        modal.classList.remove('hidden');
        setTimeout(() => panel.classList.remove('translate-x-full'), 10);
    } catch (error) {
        console.error('Failed to load block:', error);
        showToast('Gagal memuat data blok', 'error');
    } finally {
        showLoading(false);
    }
}

function closeEditModal() {
    const modal = document.getElementById('modalEdit');
    const panel = document.getElementById('panelEdit');
    panel.classList.add('translate-x-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentEditingId = null;
}

async function updateBlockData() {
    if (!currentEditingId) return;
    
    try {
        const description = document.getElementById('editKeterangan').value.trim() || null;
        const total_capacity = parseInt(document.getElementById('editKapasitas').value);
        const annual_fee = parseInt(document.getElementById('editIuran').value);
        const status = document.getElementById('editStatus').value;
        
        // Validation
        if (isNaN(total_capacity) || total_capacity <= 0) {
            showToast('Kapasitas total wajib diisi dan lebih dari 0', 'error');
            return;
        }
        if (isNaN(annual_fee) || annual_fee < 0) {
            showToast('Harga iuran wajib diisi', 'error');
            return;
        }
        
        showLoading(true);
        
        await invoke('update_block', {
            id: currentEditingId,
            block: {
                code: null,
                description,
                total_capacity,
                annual_fee,
                status
            }
        });
        
        closeEditModal();
        showToast('Blok berhasil diperbarui', 'success');
        await loadBlocks();
    } catch (error) {
        console.error('Failed to update block:', error);
        showToast('Gagal memperbarui blok: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== DELETE MODAL ====================

function openDeleteModal(blockId, code) {
    currentDeletingId = blockId;
    currentDeletingName = code;
    
    // Create delete modal if not exists
    let deleteModal = document.getElementById('modalHapus');
    if (!deleteModal) {
        deleteModal = document.createElement('div');
        deleteModal.id = 'modalHapus';
        deleteModal.className = 'fixed inset-0 z-50 hidden';
        deleteModal.innerHTML = `
            <div class="absolute inset-0 bg-black/50" onclick="closeDeleteModal()"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm transform transition-all" id="panelHapus">
                    <div class="p-6 text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Konfirmasi Hapus</h3>
                        <p class="text-sm text-gray-500 mb-6">Apakah Anda yakin ingin menghapus blok <strong id="hapusNama" class="text-gray-800">-</strong>? Data yang dihapus tidak dapat dikembalikan.</p>
                        
                        <div class="flex gap-3">
                            <button onclick="closeDeleteModal()" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                            <button onclick="confirmDelete()" class="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(deleteModal);
    }
    
    document.getElementById('hapusNama').textContent = `Blok ${code}`;
    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('modalHapus');
    if (deleteModal) {
        deleteModal.classList.add('hidden');
    }
    currentDeletingId = null;
    currentDeletingName = '';
}

async function confirmDelete() {
    if (!currentDeletingId) return;
    
    try {
        showLoading(true);
        await invoke('delete_block', { id: currentDeletingId });
        
        closeDeleteModal();
        showToast('Blok berhasil dihapus', 'success');
        await loadBlocks();
    } catch (error) {
        console.error('Failed to delete block:', error);
        showToast('Gagal menghapus blok: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== UTILITIES ====================

function formatNumber(num) {
    return num.toLocaleString('id-ID');
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

// Expose functions to global scope
window.openModal = openModal;
window.closeModal = closeModal;
window.simpanBlock = simpanBlock;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.updateBlockData = updateBlockData;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
