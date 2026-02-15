// Main JavaScript for Astana - Sistem Wakaf Makam
// Aplikasi multi-page dengan Tailwind CSS

// Initialize Tauri API
const { invoke } = window.__TAURI__.core || {};

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

// Log aplikasi sudah siap
console.log('🕌 Astana - Sistem Wakaf Makam berhasil dimuat');
console.log('📱 Aplikasi siap digunakan');
