// Pembayaran - Payment Management JavaScript
// Integrates with Tauri backend

const { invoke } = window.__TAURI__.core || {};

// Global state
let currentPayments = [];
let currentBlocks = [];
let currentGraves = [];
let currentYear = new Date().getFullYear();
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;
let currentPaymentData = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Set current year display
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
    
    await loadBlocks();
    await loadPayments();
    setupEventListeners();
    updateActiveYearDisplay();
});

function setupEventListeners() {
    // Search input
    const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            currentPage = 1;
            await loadPayments();
        }, 300));
    }

    // Block filter
    const blockSelect = document.querySelector('select');
    if (blockSelect) {
        blockSelect.addEventListener('change', async () => {
            currentPage = 1;
            await loadPayments();
        });
    }
    
    // Year filter
    const yearSelect = document.querySelectorAll('select')[2];
    if (yearSelect) {
        yearSelect.addEventListener('change', async (e) => {
            currentYear = parseInt(e.target.value);
            currentPage = 1;
            await loadPayments();
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
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.astanaApp && window.astanaApp.logout) {
                window.astanaApp.logout();
            }
        });
    }
    
    // Export Excel button
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', openExportExcelModal);
    }
    
    // Export Excel modal - close button
    const closeExportExcelBtn = document.getElementById('closeExportExcelBtn');
    if (closeExportExcelBtn) {
        closeExportExcelBtn.addEventListener('click', closeExportExcelModal);
    }
    
    // Export Excel modal - backdrop click
    const exportExcelBackdrop = document.getElementById('exportExcelBackdrop');
    if (exportExcelBackdrop) {
        exportExcelBackdrop.addEventListener('click', closeExportExcelModal);
    }
    
    // Export Excel modal - cancel button
    const cancelExportBtn = document.getElementById('cancelExportBtn');
    if (cancelExportBtn) {
        cancelExportBtn.addEventListener('click', closeExportExcelModal);
    }
    
    // Export Excel modal - confirm button
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', confirmExportExcel);
    }
    
    // Quick select buttons for export range
    document.querySelectorAll('.quick-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = e.target.dataset.range;
            if (range === 'all') {
                setExportRange('all');
            } else {
                setExportRange(parseInt(range));
            }
        });
    });
    
    // Detail modal - close button
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', closeDetailModal);
    }
    
    // Detail modal - backdrop click
    const detailModalBackdrop = document.getElementById('detailModalBackdrop');
    if (detailModalBackdrop) {
        detailModalBackdrop.addEventListener('click', closeDetailModal);
    }
    
    // Success modal - close button
    const closeSuksesModalBtn = document.getElementById('closeSuksesModalBtn');
    if (closeSuksesModalBtn) {
        closeSuksesModalBtn.addEventListener('click', closeSuksesModal);
    }
    
    // Delete payment confirmation - cancel button
    const cancelDeletePaymentBtn = document.getElementById('cancelDeletePaymentBtn');
    if (cancelDeletePaymentBtn) {
        cancelDeletePaymentBtn.addEventListener('click', closeDeletePaymentConfirmModal);
    }
    
    // Delete payment confirmation - confirm button
    const confirmDeletePaymentBtn = document.getElementById('confirmDeletePaymentBtn');
    if (confirmDeletePaymentBtn) {
        confirmDeletePaymentBtn.addEventListener('click', confirmDeletePayment);
    }
    
    // Setup event delegation for dynamically created buttons
    setupDynamicEventListeners();
}

function setupDynamicEventListeners() {
    // Event delegation for table buttons (payment buttons with openPaymentModal)
    const tbody = document.querySelector('tbody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            // Handle demo buttons
            const demoBtn = e.target.closest('button[data-demo-trigger]');
            if (demoBtn) {
                const args = demoBtn.dataset.demoArgs.split(', ');
                // Parse arguments: name, year, status, hasBukti
                const nama = args[0].replace(/'/g, '');
                const tahun = args[1].replace(/'/g, '');
                const status = args[2].replace(/'/g, '');
                const hasBukti = args[3] === 'true';
                openDetailModal(nama, tahun, status, hasBukti);
                return;
            }
            
            // Handle real data buttons
            const btn = e.target.closest('button[data-grave-id]');
            if (btn) {
                const graveId = parseInt(btn.dataset.graveId);
                const year = parseInt(btn.dataset.year);
                const isPaid = btn.dataset.isPaid === 'true';
                openPaymentModal(graveId, year, isPaid);
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
    
    // Event delegation for modal footer buttons (processPayment, deleteCurrentPayment, etc.)
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) {
        modalFooter.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (btn) {
                const action = btn.dataset.action;
                switch(action) {
                    case 'close':
                        closeDetailModal();
                        break;
                    case 'process':
                        processPayment();
                        break;
                    case 'delete':
                        deleteCurrentPayment();
                        break;
                    case 'switch-to-add-bukti':
                        switchToAddBuktiMode();
                        break;
                    case 'upload-bukti':
                        prosesUploadBukti();
                        break;
                    case 'switch-bukti':
                        switchToAddBuktiMode();
                        break;
                    case 'proses-bayar':
                        prosesBayar();
                        break;
                }
            }
        });
    }
    
    // Event delegation for dynamic content (file upload, etc.)
    const dynamicContent = document.getElementById('dynamicContent');
    if (dynamicContent) {
        dynamicContent.addEventListener('click', (e) => {
            // File upload trigger
            const uploadTrigger = e.target.closest('[data-trigger-upload]');
            if (uploadTrigger) {
                const fileInput = document.getElementById('inputFile');
                if (fileInput) fileInput.click();
            }
            
            // Clear file button
            const clearFileBtn = e.target.closest('[data-clear-file]');
            if (clearFileBtn) {
                clearFile();
            }
        });
        
        dynamicContent.addEventListener('change', (e) => {
            // File input change
            if (e.target.id === 'inputFile') {
                handleFileSelect(e.target);
            }
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

function updateActiveYearDisplay() {
    const yearDisplay = document.querySelector('.bg-emerald-50 p.text-xl');
    if (yearDisplay) {
        yearDisplay.textContent = currentYear;
    }
}

// ==================== LOAD DATA ====================

async function loadBlocks() {
    try {
        currentBlocks = await invoke('get_blocks');
        populateBlockFilter();
    } catch (error) {
        console.error('Failed to load blocks:', error);
    }
}

function populateBlockFilter() {
    const blockSelect = document.querySelector('select');
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

async function loadPayments() {
    try {
        showLoading(true);
        
        const searchInput = document.querySelector('input[type="text"][placeholder*="Cari"]');
        const search = searchInput ? searchInput.value : '';
        
        const blockSelect = document.querySelector('select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const offset = (currentPage - 1) * itemsPerPage;
        
        const payments = await invoke('get_graves_with_payment_summary', {
            search: search || null,
            blockId: blockId,
            year: currentYear,
            limit: itemsPerPage,
            offset: offset
        });
        
        const totalCount = await invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        currentPayments = payments;
        totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
        
        renderPaymentsTable();
        updatePagination(totalCount);
    } catch (error) {
        console.error('Failed to load payments:', error);
        showToast('Gagal memuat data pembayaran', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== RENDER TABLE ====================

function renderPaymentsTable() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (currentPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-3 py-8 text-center text-gray-500">
                    Tidak ada data pembayaran
                </td>
            </tr>
        `;
        return;
    }
    
    currentPayments.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Generate year columns (5 years)
        let yearCells = '';
        item.recent_payments.forEach(payment => {
            const isPaid = payment.is_paid;
            // Convert amount to number and handle null/undefined
            const amount = parseInt(payment.amount) || 0;
            const btnClass = isPaid 
                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' 
                : 'bg-red-100 hover:bg-red-200 text-red-700';
            // Debug: log untuk melihat nilai sebenarnya
            console.log('Payment debug:', { isPaid, amount, rawAmount: payment.amount, year: payment.year });
            // Jika lunas tapi amount 0/null, tampilkan "Lunas"
            // Jika lunas dan ada amount, tampilkan angka
            const btnText = isPaid 
                ? (amount > 0 ? formatRupiahShort(amount) : 'Lunas')
                : 'Bayar';
            
            yearCells += `
                <td class="px-2 py-2 text-center border-r">
                    <button data-grave-id="${item.grave_id}" data-year="${payment.year}" data-is-paid="${isPaid ? 'true' : 'false'}"
                        class="w-full px-2 py-1.5 ${btnClass} text-xs font-semibold rounded-lg transition-colors">
                        ${btnText}
                    </button>
                </td>
            `;
        });
        
        // Cari nominal pembayaran yang sudah dibayar untuk ditampilkan di kolom Nominal Iuran
        // Jika annual_fee 0, gunakan amount dari pembayaran yang sudah ada
        const paidPayment = item.recent_payments.find(p => p.is_paid && (parseInt(p.amount) > 0));
        const displayFee = item.annual_fee > 0 ? item.annual_fee : (paidPayment ? parseInt(paidPayment.amount) : 0);
        
        row.innerHTML = `
            <td class="px-3 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-3 py-3 text-sm font-medium text-gray-800 sticky left-10 bg-white border-r">${escapeHtml(item.deceased_name)}</td>
            <td class="px-3 py-3 text-sm text-center text-gray-600 border-r">${item.block_code}-${item.number}</td>
            <td class="px-3 py-3 text-sm text-right text-gray-600 border-r">${displayFee > 0 ? formatRupiah(displayFee) : '-'}</td>
            ${yearCells}
        `;
        
        tbody.appendChild(row);
    });
}

function formatRupiahShort(amount) {
    // Format with dots as thousand separators
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
    html += `<button data-page="${currentPage - 1}" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>Sebelumnya</button>`;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button data-page="1" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button data-page="${i}" class="px-3 py-1.5 text-sm ${isActive ? 'bg-emerald-600 text-white' : 'border border-gray-300 hover:bg-gray-50'} rounded-lg">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 py-1.5 text-sm text-gray-500">...</span>`;
        }
        html += `<button data-page="${totalPages}" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button data-page="${currentPage + 1}" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" ${currentPage === totalPages ? 'disabled' : ''}>Selanjutnya</button>`;
    
    container.innerHTML = html;
}

async function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    await loadPayments();
}

// ==================== PAYMENT MODAL ====================

async function openPaymentModal(graveId, year, isPaid) {
    try {
        showLoading(true);
        
        // Get grave detail
        const graveDetail = await invoke('get_grave_detail', { id: graveId });
        if (!graveDetail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        // Get existing payment for this year
        const existingPayment = await invoke('get_payment_by_grave_and_year', { 
            graveId: graveId, 
            year: year 
        });
        
        currentPaymentData = {
            graveId: graveId,
            year: year,
            grave: graveDetail.grave,
            heirs: graveDetail.heirs,
            existingPayment: existingPayment
        };
        
        renderPaymentModal(isPaid);
        
        const modal = document.getElementById('modalDetail');
        modal.classList.remove('hidden');
        
        // Scroll to top of modal content
        const modalContent = modal.querySelector('.overflow-y-auto');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    } catch (error) {
        console.error('Failed to load payment data:', error);
        showToast('Gagal memuat data pembayaran', 'error');
    } finally {
        showLoading(false);
    }
}

function renderPaymentModal(isPaid) {
    const data = currentPaymentData;
    const grave = data.grave;
    const year = data.year;
    const annualFee = grave.annual_fee;
    
    document.getElementById('detailNama').textContent = grave.deceased_name;
    document.getElementById('detailTahun').textContent = year;
    // Jika sudah bayar dan ada amount pembayaran, tampilkan amount tersebut
    // Jika belum bayar, tampilkan annual_fee dari blok
    const displayNominal = (isPaid && data.existingPayment && data.existingPayment.amount > 0) 
        ? data.existingPayment.amount 
        : annualFee;
    document.getElementById('detailNominal').textContent = formatRupiah(displayNominal);
    
    const dynamicContent = document.getElementById('dynamicContent');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    if (!isPaid) {
        // Mode: Input Pembayaran Baru
        modalTitle.textContent = 'Pembayaran Iuran';
        dynamicContent.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Pembayaran</label>
                    <input type="date" id="inputTanggal" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Bayar</label>
                    <input type="number" id="inputJumlah" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value="${annualFee}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Metode Pembayaran</label>
                    <select id="inputMetode" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" style="background-color: white !important; color: #1f2937 !important;">
                        <option value="cash">Tunai</option>
                        <option value="transfer">Transfer Bank</option>
                        <option value="qris">QRIS</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Dibayar Oleh</label>
                    <input type="text" id="inputPaidBy" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nama pembayar">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Keterangan (Opsional)</label>
                    <textarea id="inputKeterangan" rows="2" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Pembayaran iuran tahun ${year}"></textarea>
                </div>
            </div>
        `;
        modalFooter.innerHTML = `
            <button data-action="close" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
            <button data-action="process" class="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Bayar Sekarang</button>
        `;
    } else {
        // Mode: Lihat Detail Pembayaran
        const payment = data.existingPayment;
        modalTitle.textContent = 'Detail Pembayaran';
        dynamicContent.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg p-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="font-medium">${payment?.amount > 0 ? 'Pembayaran Lunas - ' + formatRupiah(payment.amount) : 'Pembayaran Lunas'}</span>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-2">
                    <p><strong>Tanggal Bayar:</strong> ${payment ? formatDate(payment.payment_date) : '-'}</p>
                    <p><strong>Metode:</strong> ${payment?.payment_method || 'Tunai'}</p>
                    <p><strong>Dibayar Oleh:</strong> ${payment?.paid_by || '-'}</p>
                    <p><strong>Keterangan:</strong> ${payment?.notes || '-'}</p>
                </div>
            </div>
        `;
        modalFooter.innerHTML = `
            <button data-action="close" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Tutup</button>
            <button data-action="delete" class="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">Hapus Pembayaran</button>
        `;
    }
}

function closeDetailModal() {
    const modal = document.getElementById('modalDetail');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentPaymentData = null;
    
    // Re-enable body scroll
    document.body.style.overflow = '';
}

async function processPayment() {
    if (!currentPaymentData) return;
    
    try {
        const tanggal = document.getElementById('inputTanggal').value;
        const jumlah = parseInt(document.getElementById('inputJumlah').value);
        const metode = document.getElementById('inputMetode').value;
        const paidBy = document.getElementById('inputPaidBy').value;
        const keterangan = document.getElementById('inputKeterangan').value;
        
        if (!tanggal) {
            showToast('Tanggal pembayaran wajib diisi', 'error');
            return;
        }
        
        if (!jumlah || jumlah <= 0) {
            showToast('Jumlah pembayaran tidak valid', 'error');
            return;
        }
        
        showLoading(true);
        
        // Get expected_fee from block's annual_fee (snapshot at time of payment)
        const expectedFee = currentPaymentData.grave?.annual_fee || jumlah;
        
        await invoke('create_payment', {
            payment: {
                grave_id: currentPaymentData.graveId,
                year: currentPaymentData.year,
                payment_date: tanggal,
                amount: jumlah,
                expected_fee: expectedFee,
                payment_method: metode,
                payment_proof: null,
                paid_by: paidBy || null,
                notes: keterangan || null
            }
        });
        
        closeDetailModal();
        showToast('Pembayaran berhasil dicatat', 'success');
        await loadPayments();
    } catch (error) {
        console.error('Failed to process payment:', error);
        showToast('Gagal mencatat pembayaran: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// Store payment ID to delete
let paymentIdToDelete = null;

// Open delete confirmation modal
function openDeletePaymentModal() {
    if (!currentPaymentData || !currentPaymentData.existingPayment) return;
    
    paymentIdToDelete = currentPaymentData.existingPayment.id;
    document.getElementById('deletePaymentConfirmModal').classList.remove('hidden');
}

// Close delete confirmation modal
function closeDeletePaymentConfirmModal() {
    paymentIdToDelete = null;
    document.getElementById('deletePaymentConfirmModal').classList.add('hidden');
}

// Confirm and execute delete
async function confirmDeletePayment() {
    if (!paymentIdToDelete) return;
    
    closeDeletePaymentConfirmModal();
    
    try {
        showLoading(true);
        
        await invoke('delete_payment', {
            id: paymentIdToDelete
        });
        
        closeDetailModal();
        showToast('Pembayaran berhasil dihapus', 'success');
        await loadPayments();
    } catch (error) {
        console.error('Failed to delete payment:', error);
        showToast('Gagal menghapus pembayaran: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteCurrentPayment() {
    openDeletePaymentModal();
}

// ==================== EXPORT EXCEL ====================

// Global variable for export range
let exportStartYear = null;
let exportEndYear = null;

function openExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    modal.classList.remove('hidden');
    
    // Scroll to top of modal content
    const modalContent = modal.querySelector('.overflow-y-auto');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
    
    // Populate year options
    populateYearOptions();
    
    // Set default range (5 years back)
    setExportRange(5);
    
    // Update data count
    updateExportDataCount();
}

function closeExportExcelModal() {
    document.getElementById('exportExcelModal').classList.add('hidden');
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
    const yearSelectorsDiv = startYearSelect.closest('.grid');
    
    if (range === 'all') {
        // Hide year selectors when "All" is selected
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'none';
        }
        exportStartYear = null;
        exportEndYear = null;
    } else {
        // Show year selectors
        if (yearSelectorsDiv) {
            yearSelectorsDiv.style.display = 'grid';
        }
        exportEndYear = currentYear;
        exportStartYear = currentYear - range + 1;
        
        // Update select elements
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
    
    // Update preview
    updateYearPreview();
}

function updateYearPreview() {
    const startYearSelect = document.getElementById('exportStartYear');
    const endYearSelect = document.getElementById('exportEndYear');
    const previewElement = document.getElementById('previewYears');
    
    // Check if "Semua" is selected (all button has active class)
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
        
        const blockSelect = document.querySelector('select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const count = await invoke('count_graves', {
            search: search || null,
            blockId: blockId
        });
        
        document.getElementById('exportDataCount').textContent = `${count} data makam`;
    } catch (error) {
        document.getElementById('exportDataCount').textContent = '-';
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
        
        const blockSelect = document.querySelector('select');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        // Check if "Semua" is selected
        const allBtn = document.querySelector('button[data-range="all"]');
        const isAll = allBtn && allBtn.classList.contains('active');
        
        // Fetch all graves with payment data for export
        const result = await invoke('export_graves', {
            search: search || null,
            blockId: blockId,
            startYear: isAll ? null : startYear,
            endYear: isAll ? null : endYear
        });
        
        const exportData = result.graves;
        const actualStartYear = result.start_year;
        const actualEndYear = result.end_year;
        
        if (exportData.length === 0) {
            showToast('Tidak ada data untuk diexport', 'error');
            showLoading(false);
            return;
        }
        
        // Determine years to show - use actual years from database if "all"
        const yearsToShow = [];
        const displayStartYear = isAll ? actualStartYear : startYear;
        const displayEndYear = isAll ? actualEndYear : endYear;
        
        for (let year = displayStartYear; year <= displayEndYear; year++) {
            yearsToShow.push(year);
        }
        
        // Prepare data for Excel
        const excelData = exportData.map((item, index) => {
            const row = {
                'No': index + 1,
                'Nama Almarhum': item.deceased_name,
                'Blok': item.block_code,
                'Nomor Makam': item.number,
                'Iuran Tahunan': item.annual_fee ? formatRupiah(item.annual_fee) : '-',
            };
            
            // Add payment status for each year
            let totalPaid = 0;
            let yearsPaid = 0;
            
            yearsToShow.forEach(year => {
                const payment = item.payments.find(p => p.year === year);
                if (payment) {
                    row[`Status ${year}`] = `Lunas (${formatRupiah(payment.amount)})`;
                    totalPaid += payment.amount;
                    yearsPaid++;
                } else {
                    row[`Status ${year}`] = 'Belum Bayar';
                }
            });
            
            // Summary columns
            row['Total Dibayar'] = formatRupiah(totalPaid);
            row['Jumlah Tahun Lunas'] = yearsPaid;
            
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
            { wch: 15 },  // Iuran Tahunan
        ];
        
        // Add width for each year column
        yearsToShow.forEach(() => {
            colWidths.push({ wch: 20 });  // Status tahun
        });
        
        colWidths.push({ wch: 15 });  // Total Dibayar
        colWidths.push({ wch: 10 });  // Jumlah Tahun Lunas
        
        ws['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data Pembayaran');
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const defaultFilename = `Data_Pembayaran_${timestamp}.xlsx`;
        
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
                const savedPath = await invoke('save_excel_file', {
                    fileData: fileData,
                    defaultName: defaultFilename
                });
                
                if (savedPath) {
                    showToast(`Berhasil export ${exportData.length} data ke:\n${savedPath}`, 'success');
                } else {
                    // User cancelled
                    showToast('Export dibatalkan', 'info');
                }
            } catch (tauriError) {
                console.error('Tauri save failed:', tauriError);
                // Fallback to browser download
                fallbackDownload(blob, defaultFilename, exportData.length);
            }
        } else {
            // Browser mode - fallback download
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

// ==================== UTILITIES ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

// ==================== FILE HANDLING ====================

function handleFileSelect(input) {
    if (input.files && input.files.length > 0) {
        const fileName = input.files[0].name;
        const previewFile = document.getElementById('previewFile');
        const previewFileName = document.getElementById('previewFileName');
        if (previewFile && previewFileName) {
            previewFileName.textContent = fileName;
            previewFile.classList.remove('hidden');
        }
    }
}

function clearFile() {
    const inputFile = document.getElementById('inputFile');
    const previewFile = document.getElementById('previewFile');
    if (inputFile) inputFile.value = '';
    if (previewFile) previewFile.classList.add('hidden');
}

// ==================== SUCCESS MODAL ====================

function closeSuksesModal() {
    const modalSukses = document.getElementById('modalSukses');
    if (modalSukses) {
        modalSukses.classList.add('hidden');
    }
}

// ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

function prosesBayar() {
    // Legacy function for demo mode - calls processPayment for real data
    if (currentPaymentData) {
        processPayment();
    } else {
        // Demo mode fallback
        closeDetailModal();
        setTimeout(() => {
            const suksesMessage = document.getElementById('suksesMessage');
            const modalSukses = document.getElementById('modalSukses');
            if (suksesMessage) suksesMessage.textContent = 'Pembayaran iuran berhasil dicatat.';
            if (modalSukses) modalSukses.classList.remove('hidden');
        }, 300);
    }
}

function prosesUploadBukti() {
    // Demo mode function
    closeDetailModal();
    setTimeout(() => {
        const suksesMessage = document.getElementById('suksesMessage');
        const modalSukses = document.getElementById('modalSukses');
        if (suksesMessage) suksesMessage.textContent = 'Bukti bayar berhasil ditambahkan.';
        if (modalSukses) modalSukses.classList.remove('hidden');
    }, 300);
}

function switchToAddBuktiMode() {
    // Demo mode function
    const { nama, tahun } = currentData || {};
    closeDetailModal();
    setTimeout(() => {
        // Remove bukti from dataBukti so we can add it again
        if (dataBukti[nama] && dataBukti[nama][tahun]) {
            delete dataBukti[nama][tahun];
        }
        // Reopen modal in "lunas tanpa bukti" mode
        openDetailModal(nama, tahun, 'lunas', false);
    }, 300);
}

// ==================== DEMO MODE DATA & FUNCTIONS ====================

// Demo data - for static/demo table
const dataBukti = {
    'Ahmad Sudirman': { '2022': true, '2023': true, '2024': true },
    'Siti Aminah': { '2022': true, '2023': true },
    'H. Muhammad Ridwan': { '2022': true, '2023': true, '2024': true },
    'Dewi Kusuma': { '2022': true, '2023': true, '2024': true, '2025': true },
    'Abdul Rahman': { '2022': true, '2023': true, '2024': true, '2025': true, '2026': true },
    'Bambang Sutrisno': {}
};

const dataNominal = {
    'Ahmad Sudirman': 100000,
    'Siti Aminah': 100000,
    'H. Muhammad Ridwan': 150000,
    'Dewi Kusuma': 100000,
    'Abdul Rahman': 200000,
    'Bambang Sutrisno': 100000
};

let currentData = {};

function formatRupiahLocal(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function formatRupiahNoPrefixLocal(angka) {
    return angka.toLocaleString('id-ID');
}

function openDetailModal(nama, tahun, status, hasBukti) {
    currentData = { nama, tahun, status };
    const nominal = dataNominal[nama] || 100000;
    
    document.getElementById('detailNama').textContent = nama;
    document.getElementById('detailTahun').textContent = tahun;
    document.getElementById('detailNominal').textContent = formatRupiahLocal(nominal);
    
    const dynamicContent = document.getElementById('dynamicContent');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');

    if (status === 'bayar') {
        // Mode: Input Pembayaran Baru
        modalTitle.textContent = 'Pembayaran Iuran';
        dynamicContent.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Pembayaran</label>
                    <input type="date" id="inputTanggal" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Metode Pembayaran</label>
                    <select id="inputMetode" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer" style="background-image: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%236b7280%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22M19 9l-7 7-7-7%22/></svg>'); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem;">
                        <option value="tunai">Tunai</option>
                        <option value="transfer">Transfer Bank</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Upload Bukti Bayar <span class="text-gray-400 font-normal">(Opsional)</span></label>
                    <div class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer" id="uploadTrigger">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <p class="text-xs text-gray-500">Klik untuk upload foto/struk</p>
                        <input type="file" id="inputFile" class="hidden" accept=".jpg,.jpeg,.png,.pdf">
                    </div>
                    <div id="previewFile" class="hidden mt-2 bg-blue-50 rounded-lg p-2 flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span class="text-xs text-gray-700 flex-1 truncate" id="previewFileName"></span>
                        <button class="text-red-500 hover:text-red-700" id="clearFileBtn">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Keterangan (Opsional)</label>
                    <textarea id="inputKeterangan" rows="2" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Dibayar oleh anak pertama"></textarea>
                </div>
            </div>
        `;
        modalFooter.innerHTML = `
            <button data-action="close" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
            <button data-action="proses-bayar" class="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Bayar Sekarang</button>
        `;
        
        // Attach event listeners for dynamically created elements
        setupDemoModalListeners();
    } else {
        // Status lunas - cek apakah sudah ada bukti
        const sudahAdaBukti = dataBukti[nama] && dataBukti[nama][tahun];
        
        if (sudahAdaBukti) {
            // Mode: Lihat Bukti yang Sudah Ada
            modalTitle.textContent = 'Detail Bukti Bayar';
            dynamicContent.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg p-3">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="font-medium">Pembayaran Lunas - Rp ${formatRupiahNoPrefixLocal(nominal)}</span>
                    </div>
                    <div class="bg-gray-100 rounded-xl p-4">
                        <p class="text-xs text-gray-500 mb-2">Bukti Pembayaran:</p>
                        <div class="bg-white rounded-lg p-3 border border-gray-200">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-gray-800">Bukti_Pembayaran_${tahun}.jpg</p>
                                    <p class="text-xs text-gray-500">Diupload: 15 Jan 2024</p>
                                </div>
                                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">Lihat</button>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                        <p><strong>Tanggal Bayar:</strong> 15 Januari 2024</p>
                        <p><strong>Metode:</strong> Transfer Bank</p>
                        <p><strong>Keterangan:</strong> Dibayar oleh anak pertama</p>
                    </div>
                </div>
            `;
            modalFooter.innerHTML = `
                <button data-action="close" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Tutup</button>
                <button data-action="switch-bukti" class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Ganti Bukti</button>
            `;
        } else {
            // Mode: Tambah Bukti Bayar (Lunas tapi belum ada bukti)
            modalTitle.textContent = 'Tambah Bukti Bayar';
            dynamicContent.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <span class="text-sm font-medium">Pembayaran lunas tapi belum ada bukti</span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">Upload Bukti Bayar</label>
                        <div class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer" id="uploadTrigger">
                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <p class="text-xs text-gray-500">Klik untuk upload foto/struk</p>
                            <input type="file" id="inputFile" class="hidden" accept=".jpg,.jpeg,.png,.pdf">
                        </div>
                        <div id="previewFile" class="hidden mt-2 bg-blue-50 rounded-lg p-2 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class="text-xs text-gray-700 flex-1 truncate" id="previewFileName"></span>
                            <button class="text-red-500 hover:text-red-700" id="clearFileBtn">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1.5">Keterangan (Opsional)</label>
                        <textarea id="inputKeterangan" rows="2" class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contoh: Transfer dari BCA"></textarea>
                    </div>
                </div>
            `;
            modalFooter.innerHTML = `
                <button data-action="close" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                <button data-action="upload-bukti" class="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Simpan Bukti</button>
            `;
        }
        
        // Attach event listeners for dynamically created elements
        setupDemoModalListeners();
    }

    const modal = document.getElementById('modalDetail');
    modal.classList.remove('hidden');
    
    // Scroll to top of modal content
    const modalContent = modal.querySelector('.overflow-y-auto');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
    
    // Scroll backdrop to top for mobile
    const backdrop = modal.querySelector('.overflow-y-auto');
    if (backdrop) {
        backdrop.scrollTop = 0;
    }
}

function setupDemoModalListeners() {
    // Upload trigger click
    const uploadTrigger = document.getElementById('uploadTrigger');
    if (uploadTrigger) {
        uploadTrigger.addEventListener('click', () => {
            const fileInput = document.getElementById('inputFile');
            if (fileInput) fileInput.click();
        });
    }
    
    // File input change
    const inputFile = document.getElementById('inputFile');
    if (inputFile) {
        inputFile.addEventListener('change', (e) => {
            handleFileSelect(e.target);
        });
    }
    
    // Clear file button
    const clearFileBtn = document.getElementById('clearFileBtn');
    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', clearFile);
    }
}

// Expose functions to global scope
window.openPaymentModal = openPaymentModal;
window.closeDetailModal = closeDetailModal;
window.processPayment = processPayment;
window.deleteCurrentPayment = deleteCurrentPayment;
window.closeDeletePaymentConfirmModal = closeDeletePaymentConfirmModal;
window.confirmDeletePayment = confirmDeletePayment;
window.goToPage = goToPage;
window.openExportExcelModal = openExportExcelModal;
window.closeExportExcelModal = closeExportExcelModal;
window.setExportRange = setExportRange;
window.updateYearPreview = updateYearPreview;
window.confirmExportExcel = confirmExportExcel;
window.exportToExcel = exportToExcel;
window.closeSuksesModal = closeSuksesModal;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;
window.prosesBayar = prosesBayar;
window.prosesUploadBukti = prosesUploadBukti;
window.switchToAddBuktiMode = switchToAddBuktiMode;
