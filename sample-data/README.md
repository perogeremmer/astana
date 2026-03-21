# Sample Data - Astana

Database sample dengan **500 data makam** lengkap dengan ahli waris dan historis pembayaran.

## 📊 Isi Database

| Tabel | Jumlah Data |
|-------|-------------|
| Blok Makam | 5 blok (A, B, C, D, E) |
| Data Makam | 500 makam |
| Ahli Waris | 967 orang |
| Pembayaran | 2,421 transaksi |

## 🏛️ Detail Blok

| Blok | Deskripsi | Kapasitas | Tarif Iuran |
|------|-----------|-----------|-------------|
| A | Area Premium | 100 | Rp 100.000/tahun |
| B | Area Standar | 100 | Rp 75.000/tahun |
| C | Area Standar | 100 | Rp 75.000/tahun |
| D | Area Ekonomis | 100 | Rp 50.000/tahun |
| E | Area Ekonomis | 100 | Rp 50.000/tahun |

## 💾 Cara Menggunakan

### Opsi 1: Import Database Sample

1. **Download file** `astana.db` dari folder ini
2. **Copy ke lokasi aplikasi:**
   - **Windows:** `%LOCALAPPDATA%\com.perogeremmer.astana\astana.db`
   - **macOS:** `~/Library/Application Support/com.perogeremmer.astana/astana.db`
   - **Linux:** `~/.local/share/com.perogeremmer.astana/astana.db`
3. **Jalankan aplikasi Astana**
4. Data sample akan langsung tersedia

### Opsi 2: Restore via Aplikasi

1. Buka aplikasi Astana
2. Masuk ke menu **Pengaturan**
3. Pilih **Restore Database**
4. Pilih file `astana.db` ini
5. Konfirmasi restore

## 📈 Karakteristik Data

- **Periode Makam:** 1980 - 2024
- **Ahli Waris:** 1-3 orang per makam
- **Tingkat Pembayaran:** ~70% telah membayar iuran
- **Periode Pembayaran:** 2020 - 2026
- **Metode Pembayaran:** Tunai, Transfer, QRIS

## 🎯 Penggunaan

Database sample ini cocok untuk:
- Testing fitur aplikasi
- Demo ke stakeholder
- Pelatihan pengguna baru
- Development dan debugging

## 🔄 Generate Ulang

Jika ingin membuat data sample baru dengan jumlah berbeda:

```bash
python3 generate-sample.py
```

Edit file `generate-sample.py` untuk mengubah:
- Jumlah data makam (default: 500)
- Nama yayasan
- Tarif iuran per blok
- Distribusi data

---

**Catatan:** Data ini bersifat fiktif dan dibuat otomatis untuk keperluan testing.
