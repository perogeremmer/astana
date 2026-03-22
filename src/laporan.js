// laporan.js - Report functionality for Astana

// Get invoke function from Tauri
const invoke = window.__TAURI__.core?.invoke;

// Global state for year picker
let currentYear = new Date().getFullYear();
let yearPickerBaseYear = currentYear;

// Format currency to Rupiah with full format (e.g., 75.000 instead of 75rb)
function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Format number with thousand separator
function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

// Initialize year picker
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
        
        const isHidden = yearPickerDropdown.classList.contains('hidden');
        
        if (isHidden) {
            yearPickerDropdown.classList.remove('hidden');
            positionDropdown();
        } else {
            yearPickerDropdown.classList.add('hidden');
        }
    });
    
    // Position dropdown
    function positionDropdown() {
        const rect = yearPickerInput.getBoundingClientRect();
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        if (left + 180 > window.innerWidth) {
            left = window.innerWidth - 180 - 16;
        }
        
        if (top + 200 > window.innerHeight) {
            top = rect.top - 200 - 8;
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
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            yearPickerDropdown.classList.add('hidden');
        }
    });
    
    // Prevent dropdown close on inside click
    yearPickerDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Render year picker grid
function renderYearPickerGrid() {
    const yearPickerGrid = document.getElementById('yearPickerGrid');
    const yearPickerRange = document.getElementById('yearPickerRange');
    
    if (!yearPickerGrid) return;
    
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
            
            const yearPickerInput = document.getElementById('yearPickerInput');
            if (yearPickerInput) {
                yearPickerInput.value = year;
            }
            
            const yearPickerDropdown = document.getElementById('yearPickerDropdown');
            if (yearPickerDropdown) {
                yearPickerDropdown.classList.add('hidden');
            }
            
            renderYearPickerGrid();
            await updateLaporan();
        });
        
        yearPickerGrid.appendChild(yearBtn);
    }
}

// Initialize reports page
document.addEventListener('DOMContentLoaded', async () => {
    // Check if Tauri is available
    if (!invoke) {
        console.warn('Tauri not available, using dummy data');
        loadDummyData();
        return;
    }
    
    // Initialize year picker
    initYearPicker();
    
    await updateLaporan();
});

// Load dummy data for development/testing
function loadDummyData() {
    const dataLaporan = {
        year: currentYear,
        active_year: currentYear,
        total_graves: 1247,
        total_paid: 892,
        total_unpaid: 355,
        total_revenue: 89200000,
        total_expected_revenue: 124700000,
        overall_collection_rate: 71.5,
        new_graves_count: 45,
        block_reports: [
            {
                block_id: 1,
                block_code: 'A',
                total_graves: 320,
                paid_count: 280,
                unpaid_count: 40,
                annual_fee: 100000,
                total_revenue: 28000000,
                expected_revenue: 32000000,
                collection_rate: 87.5
            },
            {
                block_id: 2,
                block_code: 'B',
                total_graves: 450,
                paid_count: 320,
                unpaid_count: 130,
                annual_fee: 150000,
                total_revenue: 48000000,
                expected_revenue: 67500000,
                collection_rate: 71.1
            },
            {
                block_id: 3,
                block_code: 'C',
                total_graves: 280,
                paid_count: 180,
                unpaid_count: 100,
                annual_fee: 100000,
                total_revenue: 18000000,
                expected_revenue: 28000000,
                collection_rate: 64.3
            },
            {
                block_id: 4,
                block_code: 'D',
                total_graves: 197,
                paid_count: 112,
                unpaid_count: 85,
                annual_fee: 200000,
                total_revenue: 22400000,
                expected_revenue: 39400000,
                collection_rate: 56.9
            }
        ],
        new_graves_per_block: {
            '1': 12,
            '2': 18,
            '3': 10,
            '4': 5
        }
    };
    
    updateUIWithReport(dataLaporan);
}

// Main function to update report display
async function updateLaporan() {
    try {
        // Show loading state
        showLoading(true);
        
        // Check if Tauri is available
        if (!invoke) {
            console.warn('Tauri not available, using dummy data');
            loadDummyData();
            return;
        }
        
        // Fetch report data from backend using currentYear
        const report = await window.__TAURI__?.core?.invoke('get_yearly_report', { year: currentYear });
        
        updateUIWithReport(report);
        
    } catch (error) {
        console.error('Error loading report:', error);
        alert('Gagal memuat laporan: ' + error);
        // Fallback to dummy data
        loadDummyData();
    } finally {
        showLoading(false);
    }
}

// Update UI with report data
function updateUIWithReport(report) {
    const tahun = report.year;
    
    // Update statistics cards
    document.getElementById('statSudahBayar').textContent = formatNumber(report.total_paid);
    document.getElementById('statBelumBayar').textContent = formatNumber(report.total_unpaid);
    document.getElementById('statMakamBaru').textContent = formatNumber(report.new_graves_count);
    document.getElementById('statPendapatan').textContent = formatRupiah(report.total_revenue);
    document.getElementById('labelTahun').textContent = tahun;
    document.getElementById('makamBaruCount').textContent = formatNumber(report.new_graves_count);
    
    // Update year labels
    document.querySelectorAll('.tahun-label').forEach(el => {
        el.textContent = tahun;
    });
    
    // Update progress bars
    const total = report.total_graves;
    const pctSudah = total > 0 ? ((report.total_paid / total) * 100).toFixed(1) : 0;
    const pctBelum = total > 0 ? ((report.total_unpaid / total) * 100).toFixed(1) : 0;
    
    document.getElementById('pctSudah').textContent = pctSudah + '%';
    document.getElementById('pctBelum').textContent = pctBelum + '%';
    
    // Update progress bar widths
    const progressContainer = document.querySelector('.space-y-4');
    if (progressContainer) {
        const bars = progressContainer.querySelectorAll('.h-full');
        if (bars[0]) bars[0].style.width = pctSudah + '%';
        if (bars[1]) bars[1].style.width = pctBelum + '%';
    }
    
    // Update block details and new graves sections
    updateBlockDetails(report);
    updateNewGravesPerBlock(report);
    
    // Update table
    updateReportTable(report);
}

// Update block details section
function updateBlockDetails(report) {
    // Find the container with block details (space-y-2 inside the first card)
    const cards = document.querySelectorAll('.bg-white.rounded-xl');
    let container = null;
    
    // Find the card with progress bars
    for (const card of cards) {
        if (card.querySelector('.space-y-4')) {
            container = card.querySelector('.space-y-2');
            break;
        }
    }
    
    if (!container || !report.block_reports) return;
    
    container.innerHTML = '';
    
    report.block_reports.forEach(block => {
        const div = document.createElement('div');
        div.className = 'flex justify-between text-sm';
        div.innerHTML = `
            <span class="text-gray-600">Blok ${block.block_code}</span>
            <span class="font-medium">${formatNumber(block.total_graves)} makam (Sudah bayar: ${formatNumber(block.paid_count)})</span>
        `;
        container.appendChild(div);
    });
}

// Update new graves per block section
function updateNewGravesPerBlock(report) {
    // Find the container in the second card
    const cards = document.querySelectorAll('.bg-white.rounded-xl');
    let container = null;
    
    for (const card of cards) {
        const header = card.querySelector('h3');
        if (header && header.textContent.includes('Makam Baru')) {
            container = card.querySelector('.space-y-3');
            break;
        }
    }
    
    if (!container || !report.block_reports) return;
    
    container.innerHTML = '';
    
    const colors = {
        'A': 'bg-emerald-100 text-emerald-600',
        'B': 'bg-blue-100 text-blue-600',
        'C': 'bg-amber-100 text-amber-600',
        'D': 'bg-purple-100 text-purple-600'
    };
    
    report.block_reports.forEach(block => {
        const blockId = block.block_id.toString();
        const newCount = report.new_graves_per_block && report.new_graves_per_block[blockId] ? report.new_graves_per_block[blockId] : 0;
        const colorClass = colors[block.block_code] || 'bg-gray-100 text-gray-600';
        
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 ${colorClass} rounded flex items-center justify-center text-sm font-bold">${block.block_code}</div>
                <span class="text-sm text-gray-700">Blok ${block.block_code}</span>
            </div>
            <span class="font-semibold text-gray-800">${formatNumber(newCount)} makam</span>
        `;
        container.appendChild(div);
    });
}

// Update report table
function updateReportTable(report) {
    const tbody = document.getElementById('tabelRincian');
    if (!tbody || !report.block_reports) return;
    
    tbody.innerHTML = '';
    
    report.block_reports.forEach(block => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-800">Blok ${block.block_code}</td>
            <td class="px-4 py-3 text-sm text-center text-gray-600">${formatNumber(block.total_graves)}</td>
            <td class="px-4 py-3 text-sm text-center text-emerald-600 font-medium">${formatNumber(block.paid_count)}</td>
            <td class="px-4 py-3 text-sm text-center text-red-500 font-medium">${formatNumber(block.unpaid_count)}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-600">${formatRupiah(block.annual_fee)}</td>
            <td class="px-4 py-3 text-sm text-right font-semibold text-gray-800">${formatRupiah(block.total_revenue)}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update footer totals
    const table = tbody.closest('table');
    if (table) {
        const tfoot = table.querySelector('tfoot tr');
        if (tfoot) {
            tfoot.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-800">TOTAL</td>
                <td class="px-4 py-3 text-sm text-center text-gray-800">${formatNumber(report.total_graves)}</td>
                <td class="px-4 py-3 text-sm text-center text-emerald-600">${formatNumber(report.total_paid)}</td>
                <td class="px-4 py-3 text-sm text-center text-red-500">${formatNumber(report.total_unpaid)}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-600">-</td>
                <td class="px-4 py-3 text-sm text-right text-amber-600">${formatRupiah(report.total_revenue)}</td>
            `;
        }
    }
}

// Show/hide loading state
function showLoading(show) {
    const content = document.querySelector('.flex-1.overflow-auto');
    if (content) {
        if (show) {
            content.style.opacity = '0.5';
            content.style.pointerEvents = 'none';
        } else {
            content.style.opacity = '1';
            content.style.pointerEvents = 'auto';
        }
    }
}

// Export to PDF using native backend generation
async function exportToPDF() {
    const btn = document.getElementById('btnExportPDF');
    
    try {
        // Show loading state
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="animate-spin">&#9696;</span> Generating...';
        }
        
        // Generate PDF on backend with save dialog
        const token = window.astanaApp.getSessionToken();
        const result = await window.__TAURI__?.core?.invoke('generate_pdf_report', { 
            token,
            year: currentYear 
        });
        
        // Handle nested Result type from Rust
        if (!result) {
            throw new Error('Gagal generate PDF');
        }
        
        if (result.Err) {
            throw new Error(result.Err);
        }
        
        if (result.Ok) {
            const savedPath = result.Ok;
            // Show success message
            if (window.showToast) {
                window.showToast(`PDF berhasil disimpan di: ${savedPath}`, 'success');
            } else {
                alert(`PDF berhasil disimpan!`);
            }
        }
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        if (error.message !== 'Dialog dibatalkan') {
            alert('Gagal membuat PDF: ' + error.message);
        }
    } finally {
        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Export PDF
            `;
        }
    }
}

// Export to Excel (placeholder)
function exportToExcel() {
    alert('Fitur export Excel akan segera tersedia!');
}

// Make functions available globally for onclick handlers
window.updateLaporan = updateLaporan;
window.exportToPDF = exportToPDF;

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.astanaApp && window.astanaApp.logout) {
                window.astanaApp.logout();
            }
        });
    }

    // Export PDF button
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', exportToPDF);
    }
}

// Setup event listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}
window.exportToExcel = exportToExcel;
