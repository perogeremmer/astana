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
        
        if (result.success) {
            users = result.data;
            renderUsersTable();
        } else {
            alert(result.message || 'Gagal memuat data pengguna');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Terjadi kesalahan saat memuat data pengguna');
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
                        <button onclick="openResetPasswordModal(${user.id})" class="text-yellow-600 hover:text-yellow-900 p-1" title="Reset Password">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                            </svg>
                        </button>
                    ` : '<span class="w-7"></span>'}
                    ${canEdit ? `
                        <button onclick="openEditUserModal(${user.id})" class="text-indigo-600 hover:text-indigo-900 p-1" title="Edit">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                    ` : '<span class="w-7"></span>'}
                    ${canDelete ? `
                        <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900 p-1" title="Hapus">
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
        const result = await invoke('create_user', { token, user });
        
        if (result.success) {
            alert('Pengguna berhasil ditambahkan!');
            closeAddUserModal();
            await loadUsers();
        } else {
            alert(result.message || 'Gagal menambahkan pengguna');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Terjadi kesalahan saat menambahkan pengguna');
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
        const result = await invoke('update_user', { token, user_id: userId, user: userData });
        
        if (result.success) {
            alert('Pengguna berhasil diperbarui!');
            closeEditUserModal();
            await loadUsers();
        } else {
            alert(result.message || 'Gagal memperbarui pengguna');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Terjadi kesalahan saat memperbarui pengguna');
    }
});

// Handle reset password form submission
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = window.astanaApp.getSessionToken();
    const userId = parseInt(document.getElementById('resetUserId').value);
    const newPassword = generatePassword();
    
    try {
        const result = await invoke('reset_user_password', { token, user_id: userId, new_password: newPassword });
        
        if (result.success) {
            document.getElementById('generatedPassword').value = newPassword;
            document.getElementById('newPasswordDisplay').classList.remove('hidden');
            document.getElementById('resetPasswordBtn').classList.add('hidden');
        } else {
            alert(result.message || 'Gagal mereset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Terjadi kesalahan saat mereset password');
    }
});

// Delete user
async function deleteUser(userId) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;
    
    const token = window.astanaApp.getSessionToken();
    
    try {
        const result = await invoke('delete_user', { token, user_id: userId });
        
        if (result.success) {
            alert('Pengguna berhasil dihapus!');
            await loadUsers();
        } else {
            alert(result.message || 'Gagal menghapus pengguna');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Terjadi kesalahan saat menghapus pengguna');
    }
}
