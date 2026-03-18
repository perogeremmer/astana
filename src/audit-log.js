// Audit Log JavaScript for Astana
// Handles audit log viewing and filtering

const { invoke } = window.__TAURI__?.core || {};

// State
let logs = [];
let currentOffset = 0;
const limit = 100;
let totalLogs = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and role
    const hasAccess = await window.astanaApp.requireRole('superadmin_or_superadmin_0');
    if (!hasAccess) return;
    
    // Load audit logs
    await loadAuditLogs();
    await loadStats();
});

// Load audit logs from database
async function loadAuditLogs() {
    const token = window.astanaApp.getSessionToken();
    
    try {
        const result = await invoke('get_audit_logs', { 
            token, 
            limit,
            offset: currentOffset 
        });
        
        if (result.success) {
            logs = result.data;
            renderAuditTable();
            updatePagination();
        } else {
            alert(result.message || 'Gagal memuat audit log');
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
        alert('Terjadi kesalahan saat memuat audit log');
    }
}

// Load statistics
async function loadStats() {
    const token = window.astanaApp.getSessionToken();
    
    try {
        // Get total count
        const countResult = await invoke('count_audit_logs', { token });
        if (countResult.success) {
            totalLogs = countResult.data;
            document.getElementById('totalLogs').textContent = totalLogs.toLocaleString('id-ID');
        }
        
        // Calculate stats from loaded logs
        const today = new Date().toISOString().split('T')[0];
        let todayLogins = 0;
        let dataChanges = 0;
        let userChanges = 0;
        
        logs.forEach(log => {
            // Count today's logins
            if (log.action === 'LOGIN' && log.created_at.startsWith(today)) {
                todayLogins++;
            }
            
            // Count data changes (CREATE, UPDATE, DELETE)
            if (['CREATE', 'UPDATE', 'DELETE'].includes(log.action) && 
                ['block', 'grave', 'payment', 'heir'].includes(log.entity_type)) {
                dataChanges++;
            }
            
            // Count user management actions
            if (log.entity_type === 'user' || 
                ['LOGIN', 'LOGOUT', 'RESET_PASSWORD', 'CHANGE_PASSWORD'].includes(log.action)) {
                userChanges++;
            }
        });
        
        document.getElementById('todayLogins').textContent = todayLogins;
        document.getElementById('dataChanges').textContent = dataChanges;
        document.getElementById('userChanges').textContent = userChanges;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render audit table
function renderAuditTable() {
    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '';
    
    const actionFilter = document.getElementById('filterAction').value;
    const entityFilter = document.getElementById('filterEntity').value;
    
    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (actionFilter && log.action !== actionFilter) return false;
        if (entityFilter && log.entity_type !== entityFilter) return false;
        return true;
    });
    
    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">Tidak ada log yang sesuai</td>
            </tr>
        `;
        return;
    }
    
    filteredLogs.forEach(log => {
        const actionColors = {
            'CREATE': 'bg-green-100 text-green-800',
            'UPDATE': 'bg-blue-100 text-blue-800',
            'DELETE': 'bg-red-100 text-red-800',
            'LOGIN': 'bg-emerald-100 text-emerald-800',
            'LOGOUT': 'bg-gray-100 text-gray-800',
            'RESET_PASSWORD': 'bg-yellow-100 text-yellow-800',
            'CHANGE_PASSWORD': 'bg-purple-100 text-purple-800',
            'LOGIN_FAILED': 'bg-red-100 text-red-800'
        };
        
        const entityLabels = {
            'block': 'Blok',
            'grave': 'Makam',
            'payment': 'Pembayaran',
            'heir': 'Ahli Waris',
            'user': 'Pengguna'
        };
        
        const row = document.createElement('tr');
        row.className = 'audit-row';
        row.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${formatDateTime(log.created_at)}</td>
            <td class="px-4 py-3 text-sm text-gray-900 font-medium">${log.username || 'System'}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}">
                    ${log.action}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${entityLabels[log.entity_type] || log.entity_type}</td>
            <td class="px-4 py-3 text-sm text-gray-600">
                <div>${log.details || '-'}</div>
                ${log.entity_id ? `<div class="text-xs text-gray-400 mt-1">ID: ${log.entity_id}</div>` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Update pagination
function updatePagination() {
    const start = currentOffset + 1;
    const end = Math.min(currentOffset + logs.length, totalLogs);
    
    document.getElementById('paginationInfo').textContent = 
        `Menampilkan ${start} - ${end} dari ${totalLogs} log`;
    
    document.getElementById('prevBtn').disabled = currentOffset === 0;
    document.getElementById('nextBtn').disabled = currentOffset + limit >= totalLogs;
}

// Load next page
async function loadNextPage() {
    if (currentOffset + limit < totalLogs) {
        currentOffset += limit;
        await loadAuditLogs();
    }
}

// Load previous page
async function loadPreviousPage() {
    if (currentOffset >= limit) {
        currentOffset -= limit;
        await loadAuditLogs();
    }
}

// Apply filters
function applyFilters() {
    renderAuditTable();
}

// Auto-refresh every 30 seconds
setInterval(async () => {
    const token = window.astanaApp.getSessionToken();
    if (!token) return;
    
    // Only refresh if on first page
    if (currentOffset === 0) {
        await loadAuditLogs();
        await loadStats();
    }
}, 30000);
