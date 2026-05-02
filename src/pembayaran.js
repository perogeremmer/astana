// Pembayaran - Payment Management JavaScript
// Integrates with Tauri backend - Updated version with multi-year payment

// Global state
let currentPayments = [];
let currentBlocks = [];
let currentYear = new Date().getFullYear();
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;
let currentGraveData = null;
let currentUserFullName = '';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Set current year display
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) {
        currentYearEl.textContent = currentYear;
    }
    
    // Initialize year picker
    initYearPicker();
    
    // Load current user info
    await loadCurrentUser();
    
    await loadBlocks();
    await loadPayments();
    setupEventListeners();
    updateActiveYearDisplay();
});

// Load current user info for default received_by
async function loadCurrentUser() {
    try {
        const token = window.astanaApp.getSessionToken();
        const user = await window.__TAURI__?.core?.invoke('get_current_user', { token });
        if (user) {
            currentUserFullName = user.full_name || user.username;
        }
    } catch (error) {
        console.error('Failed to load current user:', error);
        currentUserFullName = 'Admin';
    }
}

// ==================== YEAR PICKER ====================

let yearPickerBaseYear = new Date().getFullYear();

function initYearPicker() {
    const yearPickerInput = document.getElementById('yearPickerInput');
    const yearPickerDropdown = document.getElementById('yearPickerDropdown');
    const yearPickerPrev = document.getElementById('yearPickerPrev');
    const yearPickerNext = document.getElementById('yearPickerNext');
    
    if (!yearPickerInput || !yearPickerDropdown) return;
    
    // Set initial value
    yearPickerInput.value = currentYear;
    yearPickerBaseYear = currentYear;
    renderYearPickerGrid();
    
    // Prevent typing in input
    yearPickerInput.addEventListener('keydown', (e) => {
        e.preventDefault();
    });
    
    yearPickerInput.addEventListener('input', (e) => {
        e.preventDefault();
        yearPickerInput.value = currentYear;
    });
    
    // Toggle dropdown on input click
    yearPickerInput.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Toggle visibility
        const isHidden = yearPickerDropdown.classList.contains('hidden');
        
        // Close all other dropdowns first
        document.querySelectorAll('.year-picker-dropdown').forEach(el => {
            el.classList.add('hidden');
        });
        
        if (isHidden) {
            yearPickerDropdown.classList.remove('hidden');
            positionDropdown();
        } else {
            yearPickerDropdown.classList.add('hidden');
        }
    });
    
    // Position dropdown correctly
    function positionDropdown() {
        const rect = yearPickerInput.getBoundingClientRect();
        const dropdownRect = yearPickerDropdown.getBoundingClientRect();
        
        // Check if dropdown would go off screen
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // Adjust if too close to right edge
        if (left + dropdownRect.width > window.innerWidth) {
            left = window.innerWidth - dropdownRect.width - 16;
        }
        
        // Adjust if too close to bottom
        if (top + dropdownRect.height > window.innerHeight) {
            top = rect.top - dropdownRect.height - 8;
        }
        
        yearPickerDropdown.style.position = 'fixed';
        yearPickerDropdown.style.left = `${Math.max(8, left)}px`;
        yearPickerDropdown.style.top = `${Math.max(8, top)}px`;
        yearPickerDropdown.style.zIndex = '9999';
    }
    
    // Previous button
    if (yearPickerPrev) {
        yearPickerPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            yearPickerBaseYear -= 9;
            renderYearPickerGrid();
        });
    }
    
    // Next button
    if (yearPickerNext) {
        yearPickerNext.addEventListener('click', (e) => {
            e.stopPropagation();
            yearPickerBaseYear += 9;
            renderYearPickerGrid();
        });
    }
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!yearPickerDropdown.contains(e.target) && e.target !== yearPickerInput) {
            yearPickerDropdown.classList.add('hidden');
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            yearPickerDropdown.classList.add('hidden');
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    yearPickerDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function renderYearPickerGrid() {
    const yearPickerGrid = document.getElementById('yearPickerGrid');
    const yearPickerRange = document.getElementById('yearPickerRange');
    
    if (!yearPickerGrid) return;
    
    // Calculate range (show 9 years in 3x3 grid)
    const startYear = yearPickerBaseYear - 4;
    const endYear = yearPickerBaseYear + 4;
    
    if (yearPickerRange) {
        yearPickerRange.textContent = `${startYear} - ${endYear}`;
    }
    
    yearPickerGrid.innerHTML = '';
    
    for (let year = startYear; year <= endYear; year++) {
        const yearBtn = document.createElement('button');
        yearBtn.type = 'button';
        yearBtn.textContent = year;
        yearBtn.className = `px-2 py-2 text-sm rounded-lg transition-colors font-medium ${
            year === currentYear 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'hover:bg-emerald-50 text-gray-700'
        }`;
        
        yearBtn.addEventListener('click', async () => {
            currentYear = year;
            
            // Update input value
            const yearPickerInput = document.getElementById('yearPickerInput');
            if (yearPickerInput) {
                yearPickerInput.value = year;
            }
            
            // Close dropdown
            const yearPickerDropdown = document.getElementById('yearPickerDropdown');
            if (yearPickerDropdown) {
                yearPickerDropdown.classList.add('hidden');
            }
            
            // Reload data
            currentPage = 1;
            await loadPayments();
            renderYearPickerGrid();
            renderTableHeader();
        });
        
        yearPickerGrid.appendChild(yearBtn);
    }
}

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
    const blockSelect = document.getElementById('blockFilter');
    if (blockSelect) {
        blockSelect.addEventListener('change', async () => {
            currentPage = 1;
            await loadPayments();
        });
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', async () => {
            currentPage = 1;
            await loadPayments();
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
    
    // Detail modal - close buttons
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', closeDetailModal);
    }
    
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeDetailModal);
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
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.astanaApp && window.astanaApp.logout) {
                window.astanaApp.logout();
            }
        });
    }
    
    // Process payment button
    const btnProcessPayment = document.getElementById('btnProcessPayment');
    if (btnProcessPayment) {
        btnProcessPayment.addEventListener('click', processMultiYearPayment);
    }
    
    // Annual fee input - recalculate total when changed
    const annualFeeInput = document.getElementById('infoAnnualFee');
    if (annualFeeInput) {
        annualFeeInput.addEventListener('input', updateTotalToPay);
    }
    
    // Combined receipt button
    const btnCombinedReceipt = document.getElementById('btnCombinedReceipt');
    if (btnCombinedReceipt) {
        btnCombinedReceipt.addEventListener('click', downloadCombinedReceipt);
    }
    
    // Setup event delegation for table row clicks and receipt buttons
    setupTableEventDelegation();
}

function setupTableEventDelegation() {
    // Event delegation for table rows
    const tbody = document.getElementById('paymentsTableBody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-grave-id]');
            if (row) {
                const graveId = parseInt(row.dataset.graveId);
                openGravePaymentModal(graveId);
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
        currentBlocks = await window.__TAURI__?.core?.invoke('get_blocks');
        populateBlockFilter();
    } catch (error) {
        console.error('Failed to load blocks:', error);
    }
}

function populateBlockFilter() {
    const blockSelect = document.getElementById('blockFilter');
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
        
        const blockSelect = document.getElementById('blockFilter');
        const blockId = blockSelect && blockSelect.value ? parseInt(blockSelect.value) : null;
        
        const statusFilter = document.getElementById('statusFilter');
        const status = statusFilter ? statusFilter.value : '';
        
        const offset = (currentPage - 1) * itemsPerPage;
        
        const payments = await window.__TAURI__?.core?.invoke('get_graves_with_payment_summary', {
            search: search || null,
            blockId: blockId,
            year: currentYear,
            status: status || null,
            limit: itemsPerPage,
            offset: offset
        });
        
        const totalCount = await window.__TAURI__?.core?.invoke('count_graves_with_payment_status', {
            search: search || null,
            blockId: blockId,
            year: currentYear,
            status: status || null
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

function renderTableHeader() {
    const thead = document.getElementById('paymentsTableHead');
    if (!thead) return;
    
    thead.innerHTML = `
        <tr>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">No</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 border-r">NomorBlok</th>
            <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r">Tipe Makam</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r">Nama Almarhum</th>
            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r">Nama Ahli Waris #1</th>
            <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r">Status ${currentYear}</th>
            <th class="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bayar</th>
        </tr>
    `;
}

function renderPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    // Render header first
    renderTableHeader();
    
    tbody.innerHTML = '';
    
    if (currentPayments.length === 0) {
        let emptyMessage = 'Tidak ada data pembayaran';
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-3 py-8 text-center text-gray-500">
                    ${emptyMessage}
                </td>
            </tr>
        `;
        return;
    }
    
    currentPayments.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
        row.dataset.graveId = item.grave_id;
        
        // Status pembayaran badge
        const statusBadge = item.current_year_paid 
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Lunas</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Belum</span>';
        
        // Tipe makam
        const graveType = item.grave_type 
            ? (item.grave_type === 'new' ? 'Baru' : item.grave_type === 'stacked' ? 'Tumpuk' : item.grave_type)
            : '-';
        
        row.innerHTML = `
            <td class="px-3 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-3 py-3 text-sm text-gray-600 sticky left-10 bg-white border-r">${item.block_code}${item.number}</td>
            <td class="px-3 py-3 text-sm text-center text-gray-600 border-r">${graveType}</td>
            <td class="px-3 py-3 text-sm font-medium text-gray-800 border-r">${escapeHtml(item.deceased_name)}</td>
            <td class="px-3 py-3 text-sm text-gray-600 border-r">${escapeHtml(item.primary_heir_name || '-')}</td>
            <td class="px-3 py-3 text-center border-r">${statusBadge}</td>
            <td class="px-3 py-3 text-sm text-right text-emerald-600 font-medium">${formatRupiah(item.total_paid_amount)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function formatRupiahShort(amount) {
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

async function openGravePaymentModal(graveId) {
    try {
        showLoading(true);
        
        // Get grave payment detail
        const detail = await window.__TAURI__?.core?.invoke('get_grave_payment_detail', { graveId });
        
        if (!detail) {
            showToast('Data makam tidak ditemukan', 'error');
            return;
        }
        
        currentGraveData = detail;
        
        // Populate info section
        document.getElementById('infoDeceasedName').textContent = detail.grave.deceased_name;
        document.getElementById('infoGraveType').textContent = detail.grave.grave_type 
            ? (detail.grave.grave_type === 'new' ? 'Baru' : detail.grave.grave_type === 'stacked' ? 'Tumpuk' : detail.grave.grave_type)
            : '-';
        document.getElementById('infoBlockNumber').textContent = `${detail.grave.block_code} - ${detail.grave.grave_number}`;
        
        // Calculate total paid
        const totalPaid = detail.payments.reduce((sum, p) => sum + p.amount, 0);
        document.getElementById('infoTotalPaid').textContent = formatRupiah(totalPaid);
        
        // Heir info
        document.getElementById('infoHeirName').textContent = detail.grave.heir_name || '-';
        document.getElementById('infoHeirAddress').textContent = detail.grave.heir_address || '-';
        
        // Notes/Keterangan
        document.getElementById('infoNotes').textContent = detail.grave.notes || '-';
        
        // Annual fee - set default value from database but allow editing
        const annualFeeInput = document.getElementById('infoAnnualFee');
        if (annualFeeInput) {
            annualFeeInput.value = detail.grave.annual_fee || 75000;
        }
        
        // Set default received_by
        document.getElementById('inputReceivedBy').value = currentUserFullName;
        
        // Render unpaid years checkboxes
        renderUnpaidYears(detail);
        
        // Render payment history
        renderPaymentHistory(detail.payments);
        
        // Verifikasi tombol kwitansi keseluruhan - hanya muncul jika sudah ada pembayaran
        const btnCombinedReceipt = document.getElementById('btnCombinedReceipt');
        if (btnCombinedReceipt) {
            if (detail.payments && detail.payments.length > 0) {
                btnCombinedReceipt.classList.remove('hidden');
            } else {
                btnCombinedReceipt.classList.add('hidden');
            }
        }
        
        // Show modal
        const modal = document.getElementById('modalDetail');
        modal.classList.remove('hidden');
        
        // Scroll to top
        const modalContent = modal.querySelector('.overflow-y-auto');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    } catch (error) {
        console.error('Failed to load grave payment detail:', error);
        showToast('Gagal memuat detail pembayaran', 'error');
    } finally {
        showLoading(false);
    }
}

function renderUnpaidYears(detail) {
    const container = document.getElementById('unpaidYearsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get paid years
    const paidYears = new Set(detail.payments.map(p => p.year));
    
    // Generate years: 10 years ahead + current year + 9 years back
    const years = [];
    
    // 10 years ahead (future)
    for (let y = currentYear + 10; y >= currentYear + 1; y--) {
        years.push({ year: y, type: 'future' });
    }
    
    // Current year + 9 years back
    for (let y = currentYear; y >= currentYear - 9; y--) {
        years.push({ year: y, type: 'current_or_past' });
    }
    
    // Create checkboxes for all years
    years.forEach(item => {
        const year = item.year;
        const isPaid = paidYears.has(year);
        const isFuture = item.type === 'future';
        
        const label = document.createElement('label');
        
        // Determine styling based on status
        if (isPaid) {
            // Already paid - green
            label.className = 'inline-flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-not-allowed transition-colors bg-emerald-50 border-emerald-200 text-emerald-700';
        } else if (isFuture) {
            // Future year - blue (can select)
            label.className = 'inline-flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100';
        } else {
            // Current or past unpaid - white (can select)
            label.className = 'inline-flex items-center px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors bg-white border-gray-300 text-gray-700 hover:bg-gray-50';
        }
        
        if (!isPaid) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = year;
            checkbox.className = 'mr-2 rounded text-emerald-600 focus:ring-emerald-500';
            checkbox.addEventListener('change', updateTotalToPay);
            label.appendChild(checkbox);
        }
        
        const text = document.createElement('span');
        if (isPaid) {
            text.textContent = `${year} (Lunas)`;
        } else if (isFuture) {
            text.textContent = `${year} (Mendatang)`;
        } else {
            text.textContent = year;
        }
        label.appendChild(text);
        
        container.appendChild(label);
    });
    
    // Update total to pay
    updateTotalToPay();
}

function updateTotalToPay() {
    const container = document.getElementById('unpaidYearsContainer');
    const totalDisplay = document.getElementById('infoTotalToPay');
    
    if (!container || !totalDisplay || !currentGraveData) return;
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCount = checkboxes.length;
    const annualFeeInput = document.getElementById('infoAnnualFee');
    const annualFee = annualFeeInput ? parseInt(annualFeeInput.value) || 0 : 0;
    const total = selectedCount * annualFee;
    
    totalDisplay.textContent = formatRupiah(total);
}

function renderPaymentHistory(payments) {
    const tbody = document.getElementById('paymentHistoryBody');
    const emptyDiv = document.getElementById('paymentHistoryEmpty');
    
    if (!tbody || !emptyDiv) return;
    
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        emptyDiv.classList.remove('hidden');
        tbody.parentElement.classList.add('hidden');
        return;
    }
    
    emptyDiv.classList.add('hidden');
    tbody.parentElement.classList.remove('hidden');
    
    // Sort by year descending
    const sortedPayments = [...payments].sort((a, b) => b.year - a.year);
    
    sortedPayments.forEach((payment, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const receiverName = payment.receiver_name || payment.received_by || '-';

        row.innerHTML = `
            <td class="px-3 py-2 text-sm text-gray-500">${index + 1}</td>
            <td class="px-3 py-2 text-sm font-medium text-gray-800">${payment.year}</td>
            <td class="px-3 py-2 text-sm text-gray-600">${formatDate(payment.payment_date)}</td>
            <td class="px-3 py-2 text-sm text-right font-medium text-gray-800">${formatRupiah(payment.amount)}</td>
            <td class="px-3 py-2 text-sm text-gray-600">${escapeHtml(payment.paid_by || '-')}</td>
            <td class="px-3 py-2 text-sm text-gray-600">${escapeHtml(receiverName)}</td>
            <td class="px-3 py-2 text-center">
                <button class="btn-single-receipt p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" data-payment-id="${payment.id}" title="Download Kwitansi">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                </button>
            </td>
        `;

        // Add click event for receipt button
        const receiptBtn = row.querySelector('.btn-single-receipt');
        if (receiptBtn) {
            receiptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const paymentId = parseInt(receiptBtn.dataset.paymentId);
                downloadSingleReceipt(paymentId);
            });
        }

        tbody.appendChild(row);
    });
}

async function processMultiYearPayment() {
    if (!currentGraveData) return;
    
    try {
        // Get selected years
        const container = document.getElementById('unpaidYearsContainer');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const years = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        if (years.length === 0) {
            showToast('Pilih minimal satu tahun untuk dibayar', 'error');
            return;
        }
        
        const paidBy = document.getElementById('inputPaidBy').value.trim();
        const receivedBy = document.getElementById('inputReceivedBy').value.trim();
        
        if (!receivedBy) {
            showToast('Nama penerima wajib diisi', 'error');
            return;
        }
        
        showLoading(true);
        
        const token = window.astanaApp.getSessionToken();
        
        await window.__TAURI__?.core?.invoke('create_multi_year_payments', {
            token,
            request: {
                grave_id: currentGraveData.grave.grave_id,
                years,
                payment_date: new Date().toISOString().split('T')[0],
                amount_per_year: parseInt(document.getElementById('infoAnnualFee').value) || currentGraveData.grave.annual_fee,
                paid_by: paidBy || null,
                received_by: receivedBy
            }
        });
        
        closeDetailModal();
        showToast(`Pembayaran ${years.length} tahun berhasil dicatat`, 'success');
        await loadPayments();
    } catch (error) {
        console.error('Failed to process payment:', error);
        showToast('Gagal mencatat pembayaran: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

function closeDetailModal() {
    const modal = document.getElementById('modalDetail');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentGraveData = null;
    document.body.style.overflow = '';
}

// Store payment ID to delete
let paymentIdToDelete = null;

// Open delete confirmation modal
function openDeletePaymentModal() {
    if (!currentGraveData) return;
    
    // For now, disable delete from modal
    // You can add this functionality later
    showToast('Fitur hapus dari modal belum tersedia', 'info');
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
        
        const token = window.astanaApp.getSessionToken();
        await window.__TAURI__?.core?.invoke('delete_payment', {
            token,
            id: paymentIdToDelete
        });
        
        showToast('Pembayaran berhasil dihapus', 'success');
        await loadPayments();
    } catch (error) {
        console.error('Failed to delete payment:', error);
        showToast('Gagal menghapus pembayaran: ' + error, 'error');
    } finally {
        showLoading(false);
    }
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
        
        const count = await window.__TAURI__?.core?.invoke('count_graves', {
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
        
        const token = window.astanaApp.getSessionToken();
        
        // Fetch all graves with payment data for export
        const result = await window.__TAURI__?.core?.invoke('export_graves', {
            token,
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
        
        // Safety check: ensure XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            showToast('Gagal mengexport data: Library Excel tidak tersedia. Silakan restart aplikasi.', 'error');
            showLoading(false);
            return;
        }
        
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
                const savedPath = await window.__TAURI__?.core?.invoke('save_excel_file', {
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

async function downloadSingleReceipt(paymentId) {
    try {
        showLoading(true);
        const token = window.astanaApp.getSessionToken();
        
        const pdfBytes = await window.__TAURI__?.core?.invoke('generate_single_receipt', {
            token,
            paymentId
        });
        
        if (!pdfBytes) {
            showToast('Gagal generate kwitansi', 'error');
            return;
        }
        
        // Get payment info for filename
        const payment = currentGraveData?.payments?.find(p => p.id === paymentId);
        const year = payment ? payment.year : '';
        const deceasedName = currentGraveData?.grave?.deceased_name || 'Almarhum';
        const filename = `Kwitansi_${deceasedName.replace(/\s+/g, '_')}_${year}.pdf`;
        
        await downloadPdfBytes(pdfBytes, filename);
        showToast('Kwitansi berhasil diunduh', 'success');
    } catch (error) {
        console.error('Failed to download single receipt:', error);
        showToast('Gagal mengunduh kwitansi: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

async function downloadCombinedReceipt() {
    if (!currentGraveData) return;
    
    try {
        showLoading(true);
        const token = window.astanaApp.getSessionToken();
        
        const pdfBytes = await window.__TAURI__?.core?.invoke('generate_combined_receipt', {
            token,
            graveId: currentGraveData.grave.grave_id
        });
        
        if (!pdfBytes) {
            showToast('Gagal generate kwitansi', 'error');
            return;
        }
        
        const deceasedName = currentGraveData?.grave?.deceased_name || 'Almarhum';
        const filename = `Kwitansi_All_${deceasedName.replace(/\s+/g, '_')}.pdf`;
        
        await downloadPdfBytes(pdfBytes, filename);
        showToast('Kwitansi keseluruhan berhasil diunduh', 'success');
    } catch (error) {
        console.error('Failed to download combined receipt:', error);
        showToast('Gagal mengunduh kwitansi: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

async function downloadPdfBytes(pdfBytes, filename) {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    
    if (window.__TAURI__) {
        try {
            // Convert blob to array for Tauri
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const fileData = Array.from(uint8Array);
            
            const savedPath = await window.__TAURI__?.core?.invoke('save_excel_file', {
                fileData,
                defaultName: filename
            });
            
            if (!savedPath) {
                // User cancelled, do nothing
            }
        } catch (tauriError) {
            console.error('Tauri save failed:', tauriError);
            fallbackPdfDownload(blob, filename);
        }
    } else {
        fallbackPdfDownload(blob, filename);
    }
}

function fallbackPdfDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

// ==================== SUCCESS MODAL ====================

function closeSuksesModal() {
    const modalSukses = document.getElementById('modalSukses');
    if (modalSukses) {
        modalSukses.classList.add('hidden');
    }
}