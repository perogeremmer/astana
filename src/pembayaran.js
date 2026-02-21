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
            const amount = payment.amount || item.annual_fee;
            const btnClass = isPaid 
                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' 
                : 'bg-red-100 hover:bg-red-200 text-red-700';
            const btnText = isPaid ? formatRupiahShort(amount) : 'Bayar';
            
            yearCells += `
                <td class="px-2 py-2 text-center border-r">
                    <button onclick="openPaymentModal(${item.grave_id}, ${payment.year}, ${isPaid ? 'true' : 'false'})" 
                        class="w-full px-2 py-1.5 ${btnClass} text-xs font-semibold rounded-lg transition-colors">
                        ${btnText}
                    </button>
                </td>
            `;
        });
        
        row.innerHTML = `
            <td class="px-3 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r">${(currentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-3 py-3 text-sm font-medium text-gray-800 sticky left-10 bg-white border-r">${escapeHtml(item.deceased_name)}</td>
            <td class="px-3 py-3 text-sm text-center text-gray-600 border-r">${item.block_code}-${item.number}</td>
            <td class="px-3 py-3 text-sm text-right text-gray-600 border-r">${formatRupiah(item.annual_fee)}</td>
            ${yearCells}
        `;
        
        tbody.appendChild(row);
    });
}

function formatRupiahShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'jt';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'rb';
    }
    return amount.toString();
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
        
        document.getElementById('modalDetail').classList.remove('hidden');
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
    document.getElementById('detailNominal').textContent = formatRupiah(annualFee);
    
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
            <button onclick="closeDetailModal()" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
            <button onclick="processPayment()" class="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Bayar Sekarang</button>
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
                    <span class="font-medium">Pembayaran Lunas - ${formatRupiah(payment?.amount || annualFee)}</span>
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
            <button onclick="closeDetailModal()" class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Tutup</button>
            <button onclick="deleteCurrentPayment()" class="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">Hapus Pembayaran</button>
        `;
    }
}

function closeDetailModal() {
    document.getElementById('modalDetail').classList.add('hidden');
    currentPaymentData = null;
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
        
        await invoke('create_payment', {
            payment: {
                grave_id: currentPaymentData.graveId,
                year: currentPaymentData.year,
                payment_date: tanggal,
                amount: jumlah,
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

async function deleteCurrentPayment() {
    if (!currentPaymentData || !currentPaymentData.existingPayment) return;
    
    if (!confirm('Yakin ingin menghapus pembayaran ini?')) return;
    
    try {
        showLoading(true);
        
        await invoke('delete_payment', {
            id: currentPaymentData.existingPayment.id
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

// ==================== EXPORT EXCEL ====================

// Global variable for export range
let exportStartYear = null;
let exportEndYear = null;

function openExportExcelModal() {
    const modal = document.getElementById('exportExcelModal');
    modal.classList.remove('hidden');
    
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

// Expose functions to global scope
window.openPaymentModal = openPaymentModal;
window.closeDetailModal = closeDetailModal;
window.processPayment = processPayment;
window.deleteCurrentPayment = deleteCurrentPayment;
window.goToPage = goToPage;
window.openExportExcelModal = openExportExcelModal;
window.closeExportExcelModal = closeExportExcelModal;
window.setExportRange = setExportRange;
window.updateYearPreview = updateYearPreview;
window.confirmExportExcel = confirmExportExcel;
window.exportToExcel = exportToExcel;
