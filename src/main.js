// Main JavaScript for Astana - Sistem Wakaf Makam
// Aplikasi multi-page dengan Tailwind CSS

// Initialize Tauri API
const { invoke } = window.__TAURI__?.core || {};

// Fungsi utilitas yang bisa digunakan di seluruh aplikasi
window.astanaApp = {
  // Fungsi untuk navigasi ke halaman lain
  navigate: (page) => {
    window.location.href = page;
  },
  
  // Fungsi untuk memanggil Rust backend (jika diperlukan nanti)
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
});

// Expose functions globally for cross-page communication
window.loadSidebarInfo = loadSidebarInfo;
window.updateSidebar = updateSidebar;

// Log aplikasi sudah siap
console.log('🕌 Astana - Sistem Wakaf Makam berhasil dimuat');
console.log('📱 Aplikasi siap digunakan');
