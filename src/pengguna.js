// User Management JavaScript for Astana
// Handles CRUD operations for users

const { invoke } = window.__TAURI__?.core || {};

// Current user list
let users = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and role
    const hasAccess = await window.astanaApp.requireRole('superadmin_or_superadmin_0');
    if (!hasAccess) return;
    
    // Load users
    await loadUsers();
});

// Load users from database
async function loadUsers() {
    const token = window.astanaApp.getSessionToken();
    
    try {
        const result = await invoke('get_users', { token });
        
        console.log('get_users result:', result);
        console.log('Result type:', typeof result);
        console.log('Is array:', Array.isArray(result));
        
        // Handle different response formats
        if (Array.isArray(result)) {
            // Direct array response
            users = result;
            renderUsersTable();
        } else if (result && typeof result === 'object') {
            // Result<Result<T, String>, String> structure
            if (result.Ok !== undefined) {
                // Inner Result
                if (Array.isArray(result.Ok)) {
                    users = result.Ok;
                    renderUsersTable();
                } else if (typeof result.Ok === 'string') {
                    alert(result.Ok);
                } else {
                    console.error('Unexpected Ok value:', result.Ok);
                    alert('Format data tidak valid');
                }
            } else if (result.Err !== undefined) {
                alert(result.Err || 'Gagal memuat data pengguna');
            } else {
                console.error('Unknown object structure:', result);
                alert('Format data tidak valid');
            }
        } else if (typeof result === 'string') {
            alert(result);
        } else {
            console.error('Unexpected result format:', result);
            alert('Format data tidak valid');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Terjadi kesalahan saat memuat data pengguna: ' + error);
    }
}

// Render users table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">Belum ada pengguna</td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const roleLabels = {
            'superadmin_0': 'Superadmin Utama',
            'superadmin': 'Superadmin',
            'admin': 'Admin'
        };
        
        const statusBadge = user.is_active 
            ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>'
            : '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Nonaktif</span>';
        
        const passwordBadge = user.is_password_changed
            ? '<span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Sudah Diganti</span>'
            : '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Default</span>';
        
        // Get current user to check permissions
        const currentUser = window.astanaApp.getCurrentUser();
        const isCurrentUser = currentUser && currentUser.id === user.id;
        const isSuperadmin0 = user.role === 'superadmin_0';
        
        // Disable actions for superadmin_0 and self
        const canEdit = !isSuperadmin0 && !isCurrentUser;
        const canDelete = !isSuperadmin0 && !isCurrentUser;
        const canResetPassword = !isSuperadmin0;
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.username}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${roleLabels[user.role] || user.role}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap">${passwordBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDate(user.created_at)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                    ${canResetPassword ? `
                        <button data-reset-password-id="${user.id}" class="btn-reset-password text-yellow-600 hover:text-yellow-900 p-1" title="Reset Password">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                            </svg>
                        </button>
                    ` : '<span class="w-7"></span>'}
                    ${canEdit ? `
                        <button data-edit-user-id="${user.id}" class="btn-edit-user text-indigo-600 hover:text-indigo-900 p-1" title="Edit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                    ` : '<span class="w-7"></span>'}
                    ${canDelete ? `
                        <button class="delete-user-btn text-red-600 hover:text-red-900 p-1" data-user-id="${user.id}" title="Hapus">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    ` : '<span class="w-7"></span>'}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Attach event listeners to delete buttons
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const userId = parseInt(this.getAttribute('data-user-id'));
            console.log('Delete button clicked for userId:', userId);
            deleteUser(userId);
        });
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generate random password
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Add User Modal
function openAddUserModal() {
    document.getElementById('addUserForm').reset();
    // Generate random password
    document.getElementById('newPassword').value = generatePassword();
    document.getElementById('addUserModal').classList.remove('hidden');
}

function closeAddUserModal() {
    document.getElementById('addUserModal').classList.add('hidden');
}

// Edit User Modal
function openEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editRole').value = user.role === 'superadmin_0' ? 'superadmin' : user.role;
    document.getElementById('editIsActive').checked = user.is_active;
    
    document.getElementById('editUserModal').classList.remove('hidden');
}

function closeEditUserModal() {
    document.getElementById('editUserModal').classList.add('hidden');
}

// Reset Password Modal
function openResetPasswordModal(userId) {
    document.getElementById('resetUserId').value = userId;
    document.getElementById('newPasswordDisplay').classList.add('hidden');
    document.getElementById('generatedPassword').value = '';
    document.getElementById('resetPasswordBtn').classList.remove('hidden');
    document.getElementById('resetPasswordModal').classList.remove('hidden');
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').classList.add('hidden');
}

function copyPassword() {
    const passwordInput = document.getElementById('generatedPassword');
    passwordInput.select();
    passwordInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(passwordInput.value);
    alert('Password disalin ke clipboard!');
}

// Handle add user form submission
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = window.astanaApp.getSessionToken();
    const userData = {
        username: document.getElementById('newUsername').value,
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newRole').value
    };
    
    try {
        const result = await invoke('create_user', { token, user: userData });
        
        console.log('create_user result:', result);
        
        // Handle Result<Result<i64, String>, String>
        if (result && typeof result === 'object') {
            if (result.Ok !== undefined) {
                // Inner Result - could be number (success) or string (error)
                if (typeof result.Ok === 'number' && result.Ok > 0) {
                    alert('Pengguna berhasil ditambahkan!');
                    closeAddUserModal();
                    await loadUsers();
                } else if (typeof result.Ok === 'string') {
                    alert(result.Ok);
                } else {
                    alert('Gagal menambahkan pengguna');
                }
            } else if (result.Err !== undefined) {
                alert(result.Err);
            } else {
                alert('Gagal menambahkan pengguna');
            }
        } else if (typeof result === 'number' && result > 0) {
            // Direct number response
            alert('Pengguna berhasil ditambahkan!');
            closeAddUserModal();
            await loadUsers();
        } else if (typeof result === 'string') {
            alert(result);
        } else {
            alert('Gagal menambahkan pengguna');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Terjadi kesalahan saat menambahkan pengguna: ' + error);
    }
});

// Handle edit user form submission
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = window.astanaApp.getSessionToken();
    const userId = parseInt(document.getElementById('editUserId').value);
    const userData = {
        role: document.getElementById('editRole').value,
        is_active: document.getElementById('editIsActive').checked
    };
    
    try {
        const result = await invoke('update_user', { token, userId, user: userData });
        
        console.log('update_user result:', result);
        
        // Handle Result<Result<(), String>, String>
        if (result && typeof result === 'object') {
            if (result.Ok !== undefined) {
                // Inner Result - could be null (success) or string (error)
                if (result.Ok === null || result.Ok === undefined) {
                    alert('Pengguna berhasil diperbarui!');
                    closeEditUserModal();
                    await loadUsers();
                } else if (typeof result.Ok === 'string') {
                    alert(result.Ok);
                } else {
                    alert('Gagal memperbarui pengguna');
                }
            } else if (result.Err !== undefined) {
                alert(result.Err);
            } else {
                alert('Gagal memperbarui pengguna');
            }
        } else if (result === null || result === undefined) {
            // Direct null response
            alert('Pengguna berhasil diperbarui!');
            closeEditUserModal();
            await loadUsers();
        } else if (typeof result === 'string') {
            alert(result);
        } else {
            alert('Gagal memperbarui pengguna');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Terjadi kesalahan saat memperbarui pengguna: ' + error);
    }
});

// Handle reset password form submission
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = window.astanaApp.getSessionToken();
    const userId = parseInt(document.getElementById('resetUserId').value);
    const newPassword = generatePassword();
    
    try {
        const result = await invoke('reset_user_password', { token, userId, newPassword });
        
        console.log('reset_user_password result:', result);
        
        // Handle Result<Result<(), String>, String>
        if (result && typeof result === 'object') {
            if (result.Ok !== undefined) {
                // Inner Result - could be null (success) or string (error)
                if (result.Ok === null || result.Ok === undefined) {
                    document.getElementById('generatedPassword').value = newPassword;
                    document.getElementById('newPasswordDisplay').classList.remove('hidden');
                    document.getElementById('resetPasswordBtn').classList.add('hidden');
                } else if (typeof result.Ok === 'string') {
                    alert(result.Ok);
                } else {
                    alert('Gagal mereset password');
                }
            } else if (result.Err !== undefined) {
                alert(result.Err);
            } else {
                alert('Gagal mereset password');
            }
        } else if (result === null || result === undefined) {
            // Direct null response
            document.getElementById('generatedPassword').value = newPassword;
            document.getElementById('newPasswordDisplay').classList.remove('hidden');
            document.getElementById('resetPasswordBtn').classList.add('hidden');
        } else if (typeof result === 'string') {
            alert(result);
        } else {
            alert('Gagal mereset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Terjadi kesalahan saat mereset password: ' + error);
    }
});

// Store user ID to delete
let userIdToDelete = null;

// Open delete confirmation modal
function openDeleteConfirmModal(userId) {
    console.log('Opening delete confirmation modal for userId:', userId);
    userIdToDelete = userId;
    document.getElementById('deleteUserId').value = userId;
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

// Close delete confirmation modal
function closeDeleteConfirmModal() {
    console.log('Closing delete confirmation modal');
    userIdToDelete = null;
    document.getElementById('deleteConfirmModal').classList.add('hidden');
}

// Confirm and execute delete
async function confirmDeleteUser() {
    console.log('Confirm delete clicked');
    
    const userId = userIdToDelete;
    if (!userId) {
        console.error('No userId to delete');
        return;
    }
    
    closeDeleteConfirmModal();
    
    const token = window.astanaApp.getSessionToken();
    console.log('Token retrieved:', token ? 'Yes' : 'No');
    
    // Disable delete buttons during operation
    const deleteButtons = document.querySelectorAll('.delete-user-btn');
    deleteButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    try {
        console.log('Deleting user:', userId);
        const result = await invoke('delete_user', { token, userId });
        
        console.log('delete_user result:', result);
        
        // Handle Result<Result<(), String>, String>
        if (result && typeof result === 'object') {
            if (result.Ok !== undefined) {
                // Inner Result - could be null (success) or string (error)
                if (result.Ok === null || result.Ok === undefined) {
                    alert('Pengguna berhasil dihapus!');
                    await loadUsers();
                } else if (typeof result.Ok === 'string') {
                    alert(result.Ok);
                } else {
                    alert('Gagal menghapus pengguna');
                }
            } else if (result.Err !== undefined) {
                alert(result.Err);
            } else {
                alert('Gagal menghapus pengguna');
            }
        } else if (result === null || result === undefined) {
            // Direct null response
            alert('Pengguna berhasil dihapus!');
            await loadUsers();
        } else if (typeof result === 'string') {
            alert(result);
        } else {
            alert('Gagal menghapus pengguna');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Terjadi kesalahan saat menghapus pengguna: ' + error);
    } finally {
        // Re-enable delete buttons
        deleteButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }
}

// Legacy delete function (kept for backward compatibility)
async function deleteUser(userId) {
    openDeleteConfirmModal(userId);
}

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

    // Open add user modal
    const btnOpenAddUserModal = document.getElementById('btnOpenAddUserModal');
    if (btnOpenAddUserModal) {
        btnOpenAddUserModal.addEventListener('click', openAddUserModal);
    }

    // Close modal buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.btn-close-modal').dataset.modal;
            if (modalId === 'addUserModal') closeAddUserModal();
            if (modalId === 'editUserModal') closeEditUserModal();
            if (modalId === 'deleteConfirmModal') closeDeleteConfirmModal();
            if (modalId === 'resetPasswordModal') closeResetPasswordModal();
        });
    });

    // Confirm delete user
    const btnConfirmDeleteUser = document.getElementById('btnConfirmDeleteUser');
    if (btnConfirmDeleteUser) {
        btnConfirmDeleteUser.addEventListener('click', confirmDeleteUser);
    }

    // Copy password
    const btnCopyPassword = document.getElementById('btnCopyPassword');
    if (btnCopyPassword) {
        btnCopyPassword.addEventListener('click', copyPassword);
    }

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            if (modalId === 'addUserModal') closeAddUserModal();
            if (modalId === 'editUserModal') closeEditUserModal();
            if (modalId === 'deleteConfirmModal') closeDeleteConfirmModal();
            if (modalId === 'resetPasswordModal') closeResetPasswordModal();
        });
    });

    // Setup event delegation for dynamically created buttons
    setupDynamicButtonListeners();
}

function setupDynamicButtonListeners() {
    const container = document.body;

    container.addEventListener('click', (e) => {
        // Handle reset password buttons
        const resetBtn = e.target.closest('.btn-reset-password');
        if (resetBtn) {
            const userId = parseInt(resetBtn.dataset.resetPasswordId);
            openResetPasswordModal(userId);
            return;
        }

        // Handle edit user buttons
        const editBtn = e.target.closest('.btn-edit-user');
        if (editBtn) {
            const userId = parseInt(editBtn.dataset.editUserId);
            openEditUserModal(userId);
            return;
        }
    });
}

// Setup event listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}
