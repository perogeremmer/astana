// Main JavaScript for Astana - Sistem Manajemen Iuran Makam
// Aplikasi multi-page dengan Tailwind CSS

// ==================== SECURITY WARNING ====================
// Peringatan Keamanan - Mencegah Penipuan
console.log('%c⚠️ PERINGATAN KEAMANAN ⚠️', 'font-size: 24px; font-weight: bold; color: #dc2626; background: #fef2f2; padding: 10px; border: 3px solid #dc2626; border-radius: 8px;');
console.log('%cJika ada yang meminta Anda membuka bagian ini (Console/Developer Tools),\nitu adalah PENIPUAN! Jangan pernah dengarkan mereka.', 'font-size: 16px; color: #dc2626; font-weight: bold;');
console.log('%cAplikasi ini tidak pernah meminta pengguna untuk membuka bagian ini.\nTutup segera jika ada yang meminta Anda melakukan hal tersebut.', 'font-size: 14px; color: #ea580c;');
console.log('%c🛡️ Lindungi data dan akun Anda dari penipuan!', 'font-size: 14px; color: #16a34a; font-weight: bold;');

// Initialize Tauri API
const { invoke } = window.__TAURI__?.core || {};

// ==================== AUTHENTICATION SYSTEM ====================

// Session management
const SESSION_TOKEN_KEY = 'astana_session_token';
const SESSION_USER_KEY = 'astana_session_user';

// Fungsi utilitas yang bisa digunakan di seluruh aplikasi
window.astanaApp = {
  // Fungsi untuk navigasi ke halaman lain
  navigate: (page) => {
    window.location.href = page;
  },
  
  // Fungsi untuk memanggil Rust backend
  callBackend: async (command, args = {}) => {
    if (invoke) {
      return await invoke(command, args);
    }
    console.warn('Tauri invoke not available');
    return null;
  },
  
  // Format tanggal ke format Indonesia
  formatTanggal: (dateString) => {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  },
  
  // Format rupiah
  formatRupiah: (angka) => {
    return 'Rp ' + angka.toLocaleString('id-ID');
  },
  
  // ==================== AUTH FUNCTIONS ====================
  
  // Save session to localStorage
  saveSession: (token, user) => {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  },
  
  // Get session token
  getSessionToken: () => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  },
  
  // Get current user
  getCurrentUser: () => {
    const userJson = localStorage.getItem(SESSION_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },
  
  // Clear session
  clearSession: () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(SESSION_TOKEN_KEY);
  },
  
  // Check if user has specific role
  hasRole: (role) => {
    const user = window.astanaApp.getCurrentUser();
    if (!user) return false;
    if (role === 'superadmin_or_superadmin_0') {
      return user.role === 'superadmin' || user.role === 'superadmin_0';
    }
    return user.role === role;
  },
  
  // Validate session with backend
  validateSession: async () => {
    const token = window.astanaApp.getSessionToken();
    if (!token) return false;
    
    try {
      const session = await invoke('validate_session', { token });
      if (!session) {
        window.astanaApp.clearSession();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      window.astanaApp.clearSession();
      return false;
    }
  },
  
  // Logout user
  logout: async () => {
    const token = window.astanaApp.getSessionToken();
    if (token) {
      try {
        await invoke('logout', { token });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    window.astanaApp.clearSession();
    window.location.href = 'login.html';
  },
  
  // Protect page - redirect to login if not authenticated
  protectPage: async () => {
    const isValid = await window.astanaApp.validateSession();
    if (!isValid) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  
  // Require role - redirect to login if doesn't have role
  requireRole: async (role) => {
    const isValid = await window.astanaApp.validateSession();
    if (!isValid) {
      window.location.href = 'login.html';
      return false;
    }
    
    if (!window.astanaApp.hasRole(role)) {
      alert('Anda tidak memiliki akses ke halaman ini');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};

// Load foundation name and logo for sidebar
async function loadSidebarInfo() {
  try {
    if (!invoke) {
      // Dummy data for non-Tauri environment
      updateSidebar('Wakaf Makam', 'Yayasan', null);
      return;
    }
    
    // Get settings from database
    const settings = await invoke('get_settings');
    
    // Get logo data
    let logoDataUrl = null;
    try {
      logoDataUrl = await invoke('get_logo_data');
    } catch (e) {
      console.log('No logo found');
    }
    
    // Update sidebar
    updateSidebar(
      settings.foundation_name || 'Wakaf Makam',
      'Yayasan',
      logoDataUrl
    );
    
  } catch (error) {
    console.error('Error loading sidebar info:', error);
    // Fallback to default
    updateSidebar('Wakaf Makam', 'Yayasan', null);
  }
}

// Update sidebar with foundation info
function updateSidebar(name, subtitle, logoDataUrl) {
  // Update foundation name
  const nameElements = document.querySelectorAll('aside h1.font-bold');
  nameElements.forEach(el => {
    el.textContent = name;
  });
  
  // Update subtitle
  const subtitleElements = document.querySelectorAll('aside p.text-emerald-200');
  subtitleElements.forEach(el => {
    el.textContent = subtitle;
  });
  
  // Update logo if provided
  const logoContainers = document.querySelectorAll('aside .w-10.h-10');
  logoContainers.forEach(container => {
    if (logoDataUrl) {
      // Replace the SVG with an image
      container.innerHTML = `<img src="${logoDataUrl}" class="w-full h-full object-cover rounded-lg" alt="Logo">`;
      container.classList.remove('bg-emerald-600', 'flex', 'items-center', 'justify-center');
    } else {
      // Reset to default icon if no logo
      container.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
      `;
      container.classList.add('bg-emerald-600', 'flex', 'items-center', 'justify-center');
    }
  });
}

// Listen for settings updates from other pages
window.addEventListener('storage', (e) => {
  if (e.key === 'settingsUpdated') {
    // Reload sidebar info when settings are updated
    loadSidebarInfo();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadSidebarInfo();
  updateSidebarUser();
  setupLogoutButton();
});

// Setup logout button event listener
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.astanaApp && window.astanaApp.logout) {
        window.astanaApp.logout();
      }
    });
  }
}

// Update sidebar user info
function updateSidebarUser() {
    const user = window.astanaApp.getCurrentUser();
    if (!user) return;
    
    // Update user name in sidebar
    const userNameElements = document.querySelectorAll('.sidebar-user-name');
    userNameElements.forEach(el => {
        el.textContent = user.full_name || user.username;
    });
    
    // Update user role in sidebar
    const userRoleElements = document.querySelectorAll('.sidebar-user-role');
    const roleLabels = {
        'superadmin_0': 'Superadmin Utama',
        'superadmin': 'Superadmin',
        'admin': 'Admin'
    };
    userRoleElements.forEach(el => {
        el.textContent = roleLabels[user.role] || user.role;
    });
    
    // Show/hide admin-only menu items
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const isAdmin = user.role === 'superadmin' || user.role === 'superadmin_0';
    adminOnlyElements.forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });
}

// Development mode detection
// Hide test runner link in production builds
function initDevMode() {
  // Check if we're in development mode
  // In Tauri dev mode, the window title usually contains "localhost" or specific dev markers
  const isDevMode = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'http:';
  
  // Also check if test-runner.html exists by trying to fetch it
  if (!isDevMode) {
    // Hide test runner link in production
    const testRunnerLinks = document.querySelectorAll('a[href*="test-runner"]');
    testRunnerLinks.forEach(link => {
      link.style.display = 'none';
    });
    
    // Disable right-click context menu in production to prevent inspect element
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    
    // Disable F12 key (Developer Tools) in production
    document.addEventListener('keydown', (e) => {
      // F12 key
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (Inspect Element)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
    });
  }
}

// Expose functions globally for cross-page communication
window.loadSidebarInfo = loadSidebarInfo;
window.updateSidebar = updateSidebar;
window.updateSidebarUser = updateSidebarUser;
window.initDevMode = initDevMode;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initDevMode();
});

// Log aplikasi sudah siap
console.log('🕌 Astana - Sistem Manajemen Iuran Makam berhasil dimuat');
console.log('📱 Aplikasi siap digunakan');
