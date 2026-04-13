// pengaturan.js - Settings functionality for Astana

// Get invoke function from Tauri
const invoke = window.__TAURI__?.core?.invoke;

// Global settings data
let currentSettings = null;
let selectedLogoFile = null;
let selectedLogoData = null;

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing settings page...');
    console.log('Tauri available:', !!invoke);
    
    // Setup logo file input listener
    const logoInput = document.getElementById('logoInput');
    if (logoInput) {
        logoInput.addEventListener('change', handleLogoSelect);
    }
    
    // Check if Tauri is available
    if (!invoke) {
        console.warn('Tauri not available, using dummy data');
        loadDummyData();
        // Set dummy DB path
        const dbPathInput = document.getElementById('dbPathInput');
        if (dbPathInput) dbPathInput.value = 'C:\\Users\\Admin\\AppData\\Local\\com.perogeremmer.astana\\astana.db';
        return;
    }
    
    try {
        await loadSettings();
        await loadDatabaseStats();
        await loadDatabasePath();
        await loadCurrentLogo();
    } catch (error) {
        console.error('Error initializing settings:', error);
    }
});

// Handle logo file selection
async function handleLogoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showNotification('File harus berupa gambar (JPG/PNG)', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Ukuran file maksimal 2MB', 'error');
        return;
    }
    
    selectedLogoFile = file;
    
    // Read file as array buffer for upload
    const reader = new FileReader();
    reader.onload = async function(e) {
        selectedLogoData = new Uint8Array(e.target.result);
        
        // Show preview
        const preview = document.getElementById('logoPreview');
        if (preview) {
            const dataUrl = await fileToDataUrl(file);
            preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover rounded-xl" alt="Logo Preview">`;
        }
        
        showNotification('Logo berhasil dipilih. Klik "Simpan Perubahan" untuk menyimpan.', 'success');
    };
    reader.readAsArrayBuffer(file);
}

// Convert file to data URL
function fileToDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Load current logo
async function loadCurrentLogo() {
    try {
        if (!invoke) return;
        
        const logoDataUrl = await window.__TAURI__?.core?.invoke('get_logo_data');
        if (logoDataUrl) {
            const preview = document.getElementById('logoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${logoDataUrl}" class="w-full h-full object-cover rounded-xl" alt="Logo">`;
            }
        }
    } catch (error) {
        console.error('Error loading logo:', error);
    }
}

// Load settings from database
async function loadSettings() {
    try {
        showLoading(true);
        const settings = await window.__TAURI__?.core?.invoke('get_settings');
        currentSettings = settings;
        
        // Update form fields
        const foundationName = document.getElementById('foundationName');
        const foundationAddress = document.getElementById('foundationAddress');
        const foundationPhone = document.getElementById('foundationPhone');
        const foundationEmail = document.getElementById('foundationEmail');
        const autoBackup = document.getElementById('autoBackup');
        
        if (foundationName) foundationName.value = settings.foundation_name || '';
        if (foundationAddress) foundationAddress.value = settings.address || '';
        if (foundationPhone) foundationPhone.value = settings.phone || '';
        if (foundationEmail) foundationEmail.value = settings.email || '';
        if (autoBackup) autoBackup.checked = settings.auto_backup || false;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Gagal memuat pengaturan', 'error');
        loadDummyData();
    } finally {
        showLoading(false);
    }
}

// Load dummy data for development/testing
function loadDummyData() {
    currentSettings = {
        foundation_name: 'Yayasan Wakaf Makam Al-Ikhlas',
        address: 'Jl. Raya Cipaku No. 123, Kel. Bahagia, Kec. Sejahtera, Kota Bandung',
        phone: '(022) 1234567',
        email: 'admin@yayasan.com',
        logo_path: null,
        auto_backup: true,
        last_backup: '2026-02-15 03:00:00'
    };
    
    // Update form fields with dummy data
    const foundationName = document.getElementById('foundationName');
    const foundationAddress = document.getElementById('foundationAddress');
    const foundationPhone = document.getElementById('foundationPhone');
    const foundationEmail = document.getElementById('foundationEmail');
    
    if (foundationName) foundationName.value = currentSettings.foundation_name;
    if (foundationAddress) foundationAddress.value = currentSettings.address;
    if (foundationPhone) foundationPhone.value = currentSettings.phone;
    if (foundationEmail) foundationEmail.value = currentSettings.email;
}

// Load database statistics
async function loadDatabaseStats() {
    try {
        if (!invoke) {
            // Dummy data
            updateDatabaseStats({
                size_bytes: 2400000,
                graves_count: 1247,
                heirs_count: 892,
                payments_count: 3560
            }, '2026-02-15 03:00:00');
            return;
        }
        
        const stats = await window.__TAURI__?.core?.invoke('get_database_stats');
        const settings = await window.__TAURI__?.core?.invoke('get_settings');
        updateDatabaseStats(stats, settings.last_backup);
        
    } catch (error) {
        console.error('Error loading database stats:', error);
    }
}

// Load database path
async function loadDatabasePath() {
    try {
        if (!invoke) return;
        
        const dbPath = await window.__TAURI__?.core?.invoke('get_database_path');
        const dbPathInput = document.getElementById('dbPathInput');
        if (dbPathInput) {
            dbPathInput.value = dbPath;
        }
    } catch (error) {
        console.error('Error loading database path:', error);
    }
}

// Update database stats display
function updateDatabaseStats(stats, lastBackup) {
    // Format size
    const sizeFormatted = formatFileSize(stats.size_bytes);
    
    // Total records
    const totalRecords = stats.graves_count + stats.heirs_count + stats.payments_count;
    
    // Format last update date
    let lastUpdateText = 'Belum pernah';
    if (lastBackup) {
        const date = new Date(lastBackup);
        lastUpdateText = date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        });
    }
    
    // Update display (find the stat boxes)
    const statBoxes = document.querySelectorAll('.grid.grid-cols-3 .rounded-lg');
    if (statBoxes.length >= 3) {
        const sizeEl = statBoxes[0].querySelector('.text-lg');
        const recordsEl = statBoxes[1].querySelector('.text-lg');
        const updateEl = statBoxes[2].querySelector('.text-lg');
        
        if (sizeEl) sizeEl.textContent = sizeFormatted;
        if (recordsEl) recordsEl.textContent = totalRecords.toLocaleString('id-ID');
        if (updateEl) updateEl.textContent = lastUpdateText;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Save settings
async function saveSettings() {
    try {
        showLoading(true);
        
        const foundationNameEl = document.getElementById('foundationName');
        const foundationAddressEl = document.getElementById('foundationAddress');
        const foundationPhoneEl = document.getElementById('foundationPhone');
        const foundationEmailEl = document.getElementById('foundationEmail');
        const autoBackupEl = document.getElementById('autoBackup');
        
        let logoPath = null;
        
        // Upload logo if selected
        if (selectedLogoData && selectedLogoFile) {
            if (!invoke) {
                showNotification('Logo upload memerlukan Tauri runtime', 'error');
            } else {
                try {
                    logoPath = await window.__TAURI__?.core?.invoke('upload_logo', { 
                        fileData: Array.from(selectedLogoData),
                        fileName: selectedLogoFile.name 
                    });
                    showNotification('Logo berhasil diupload!', 'success');
                } catch (logoError) {
                    console.error('Error uploading logo:', logoError);
                    showNotification('Gagal upload logo: ' + logoError, 'error');
                }
            }
        }
        
        // Get current year from computer
        const currentYear = new Date().getFullYear();
        
        const settings = {
            foundation_name: foundationNameEl?.value || null,
            address: foundationAddressEl?.value || null,
            phone: foundationPhoneEl?.value || null,
            email: foundationEmailEl?.value || null,
            logo_path: logoPath,
            active_year: currentYear,  // Use current year from computer
            auto_backup: autoBackupEl?.checked || false
        };
        
        if (!invoke) {
            console.log('Settings saved (dummy):', settings);
            showNotification('Pengaturan berhasil disimpan!', 'success');
            return;
        }
        
        const token = window.astanaApp.getSessionToken();
        await window.__TAURI__?.core?.invoke('update_settings', { token, settings });
        showNotification('Pengaturan berhasil disimpan!', 'success');
        
        // Get the foundation name for sidebar update
        const foundationName = foundationNameEl?.value || 'Wakaf Makam';
        
        // If we have a new logo file, create data URL for immediate sidebar update
        let logoDataUrl = null;
        if (selectedLogoFile) {
            logoDataUrl = await fileToDataUrl(selectedLogoFile);
        }
        
        // Clear selected logo after successful save
        selectedLogoFile = null;
        selectedLogoData = null;
        
        // Reload logo preview in settings page
        await loadCurrentLogo();
        
        // Immediately refresh sidebar on current page with new data
        if (window.updateSidebar) {
            window.updateSidebar(foundationName, 'Yayasan', logoDataUrl);
        }
        
        // Notify other pages to refresh
        updateSidebarOnAllPages();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Gagal menyimpan pengaturan: ' + error, 'error');
    } finally {
        showLoading(false);
    }
}

// Update sidebar on all pages (trigger reload)
function updateSidebarOnAllPages() {
    // Store a flag in localStorage to notify other pages to reload settings
    localStorage.setItem('settingsUpdated', Date.now().toString());
}

// Copy database path to clipboard
function copyPath() {
    const pathInput = document.getElementById('dbPathInput');
    if (!pathInput) return;
    
    pathInput.select();
    pathInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(pathInput.value).then(() => {
        showNotification('Path database disalin ke clipboard!', 'success');
    }).catch(() => {
        alert('Path database disalin ke clipboard!');
    });
}

// Backup database now - Using save dialog
async function backupNow() {
    try {
        showLoading(true);
        
        if (!invoke) {
            setTimeout(() => {
                showLoading(false);
                const modal = document.getElementById('modalBackupSuccess');
                if (modal) modal.classList.remove('hidden');
            }, 1000);
            return;
        }
        
        const token = window.astanaApp.getSessionToken();
        
        // Use backend command that handles dialog + backup
        const result = await window.__TAURI__?.core?.invoke('backup_database_with_dialog', { token });
        
        console.log('Backup result:', result);
        await window.__TAURI__?.core?.invoke('update_last_backup');
        const modal = document.getElementById('modalBackupSuccess');
        if (modal) modal.classList.remove('hidden');
        await loadDatabaseStats(); // Refresh stats
        
    } catch (error) {
        console.error('Error backing up:', error);
        if (error !== 'Dialog dibatalkan') {
            showNotification('Gagal backup database: ' + error, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Export database to file
async function exportDatabase() {
    try {
        showLoading(true);
        
        if (!invoke) {
            showNotification('Fitur ini memerlukan Tauri runtime', 'error');
            return;
        }
        
        console.log('Opening save dialog...');
        
        const token = window.astanaApp.getSessionToken();
        
        // Use backend command that handles dialog + backup
        const result = await window.__TAURI__?.core?.invoke('backup_database_with_dialog', { token });
        
        console.log('Export result:', result);
        showNotification(result, 'success');
        
    } catch (error) {
        console.error('Error exporting:', error);
        if (error !== 'Dialog dibatalkan') {
            showNotification('Gagal export database: ' + error, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Restore database from file - Using open dialog
async function restoreDatabase() {
    try {
        if (!invoke) {
            showNotification('Fitur ini memerlukan Tauri runtime', 'error');
            return;
        }
        
        const confirmed = confirm('PERINGATAN: Restore akan mengganti seluruh data saat ini dengan data dari file backup. Pastikan Anda sudah melakukan backup terlebih dahulu.\n\nLanjutkan?');
        if (!confirmed) return;
        
        showLoading(true);
        
        // Use backend command that handles dialog + restore
        const result = await window.__TAURI__?.core?.invoke('restore_database_with_dialog');
        
        console.log('Restore result:', result);
        showNotification(result, 'success');
        showNotification('Aplikasi akan di-refresh...', 'info');
        
        // Refresh page after 2 seconds to reload data
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error restoring:', error);
        if (error !== 'Dialog dibatalkan') {
            showNotification('Gagal restore database: ' + error, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Close backup success modal
function closeBackupModal() {
    const modal = document.getElementById('modalBackupSuccess');
    if (modal) modal.classList.add('hidden');
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

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
    
    const colors = {
        success: 'bg-emerald-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-amber-500 text-white'
    };
    
    notification.classList.add(...colors[type].split(' '));
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Open database folder
async function openDatabaseFolder() {
    try {
        if (!invoke) {
            showNotification('Fitur ini memerlukan Tauri runtime', 'error');
            return;
        }
        
        console.log('Opening database folder...');
        await window.__TAURI__?.core?.invoke('open_database_folder');
        console.log('Folder opened successfully');
        
    } catch (error) {
        console.error('Error opening folder:', error);
        showNotification('Gagal membuka folder: ' + error, 'error');
    }
}

// Clear cache and reload
function clearCacheAndReload() {
    console.log('=== CLEAR CACHE & RELOAD ===');
    
    // Show confirmation
    const confirmed = confirm('Aplikasi akan dimuat ulang tanpa cache. Lanjutkan?');
    if (!confirmed) return;
    
    // Clear localStorage (except settingsUpdated)
    const settingsUpdated = localStorage.getItem('settingsUpdated');
    localStorage.clear();
    if (settingsUpdated) {
        localStorage.setItem('settingsUpdated', settingsUpdated);
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Show notification
    showNotification('Membersihkan cache dan memuat ulang...', 'info');
    
    // Reload page with cache-busting
    setTimeout(() => {
        // Add timestamp to force reload without cache
        const currentUrl = window.location.href;
        const separator = currentUrl.indexOf('?') > -1 ? '&' : '?';
        window.location.href = currentUrl + separator + '_reload=' + Date.now();
    }, 500);
}

// Make functions available globally
window.saveSettings = saveSettings;
window.copyPath = copyPath;
window.backupNow = backupNow;
window.exportDatabase = exportDatabase;
window.restoreDatabase = restoreDatabase;
window.closeBackupModal = closeBackupModal;
window.openDatabaseFolder = openDatabaseFolder;
window.clearCacheAndReload = clearCacheAndReload;

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

    // Trigger logo input click
    const btnTriggerLogoInput = document.getElementById('btnTriggerLogoInput');
    if (btnTriggerLogoInput) {
        btnTriggerLogoInput.addEventListener('click', () => {
            const logoInput = document.getElementById('logoInput');
            if (logoInput) logoInput.click();
        });
    }

    // Save settings
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', saveSettings);
    }

    // Copy path
    const btnCopyPath = document.getElementById('btnCopyPath');
    if (btnCopyPath) {
        btnCopyPath.addEventListener('click', copyPath);
    }

    // Open database folder
    const btnOpenDatabaseFolder = document.getElementById('btnOpenDatabaseFolder');
    if (btnOpenDatabaseFolder) {
        btnOpenDatabaseFolder.addEventListener('click', openDatabaseFolder);
    }

    // Backup now
    const btnBackupNow = document.getElementById('btnBackupNow');
    if (btnBackupNow) {
        btnBackupNow.addEventListener('click', backupNow);
    }

    // Export database
    const btnExportDatabase = document.getElementById('btnExportDatabase');
    if (btnExportDatabase) {
        btnExportDatabase.addEventListener('click', exportDatabase);
    }

    // Restore database
    const btnRestoreDatabase = document.getElementById('btnRestoreDatabase');
    if (btnRestoreDatabase) {
        btnRestoreDatabase.addEventListener('click', restoreDatabase);
    }

    // Clear cache button
    const btnClearCache = document.getElementById('btnClearCache');
    if (btnClearCache) {
        btnClearCache.addEventListener('click', clearCacheAndReload);
    }

    // Close backup modal
    const btnCloseBackupModal = document.getElementById('btnCloseBackupModal');
    if (btnCloseBackupModal) {
        btnCloseBackupModal.addEventListener('click', closeBackupModal);
    }

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            if (modalId === 'modalBackupSuccess') {
                closeBackupModal();
            }
        });
    });
}

// Setup event listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}
window.handleLogoSelect = handleLogoSelect;
