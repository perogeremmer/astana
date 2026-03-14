// laporan.js - Report functionality for Astana

// Get invoke function from Tauri
const invoke = window.__TAURI__.core?.invoke;

// Format currency to Rupiah
function formatRupiah(amount) {
    if (amount >= 1000000000) {
        return 'Rp ' + (amount / 1000000000).toFixed(1) + 'M';
    } else if (amount >= 1000000) {
        return 'Rp ' + (amount / 1000000).toFixed(1) + 'jt';
    } else if (amount >= 1000) {
        return 'Rp ' + (amount / 1000).toFixed(0) + 'rb';
    }
    return 'Rp ' + amount.toLocaleString('id-ID');
}

// Format number with thousand separator
function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

// Initialize reports page
document.addEventListener('DOMContentLoaded', async () => {
    // Add change event listener to year selector
    const tahunSelect = document.getElementById('tahunSelect');
    if (tahunSelect) {
        tahunSelect.addEventListener('change', updateLaporan);
    }
    
    // Check if Tauri is available
    if (!invoke) {
        console.warn('Tauri not available, using dummy data');
        loadDummyData();
        return;
    }
    
    await initializeYearSelector();
    await updateLaporan();
});

// Initialize year selector with available years
async function initializeYearSelector() {
    try {
        const years = await invoke('get_available_years');
        const select = document.getElementById('tahunSelect');
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add years from database
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === new Date().getFullYear()) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading years:', error);
        // Fallback to default years if error
        const select = document.getElementById('tahunSelect');
        const currentYear = new Date().getFullYear();
        select.innerHTML = '';
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            select.appendChild(option);
        }
    }
}

// Load dummy data for development/testing
function loadDummyData() {
    const dataLaporan = {
        year: 2025,
        active_year: 2025,
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
    const tahun = parseInt(document.getElementById('tahunSelect').value);
    
    try {
        // Show loading state
        showLoading(true);
        
        // Check if Tauri is available
        if (!invoke) {
            console.warn('Tauri not available, using dummy data');
            loadDummyData();
            return;
        }
        
        // Fetch report data from backend
        const report = await invoke('get_yearly_report', { year: tahun });
        
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

// Export to PDF (placeholder - would need PDF library)
function exportToPDF() {
    alert('Fitur export PDF akan segera tersedia!');
}

// Export to Excel (placeholder)
function exportToExcel() {
    alert('Fitur export Excel akan segera tersedia!');
}

// Make functions available globally for onclick handlers
window.updateLaporan = updateLaporan;
window.exportToPDF = exportToPDF;
window.exportToExcel = exportToExcel;
