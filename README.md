# StockAlert

Aplikasi demo **pencatatan persediaan toko kecil**: catat barang masuk dan keluar, pantau barang yang stoknya menipis, dan telusuri riwayat perubahan kuantitas — lengkap dengan saran pemesanan otomatis.

StockAlert bagian dari portofolio **SatuArah Labs**. Berjalan sepenuhnya di browser: tanpa server, tanpa akun, tanpa biaya layanan.

---

## Menjalankan

```bash
npm install
npm run dev # http://localhost:5173
```

Perintah lain:

```bash
npm run build # build produksi ke dist/
npm run preview # hasil build dilayani lokal
npm run typecheck # tsc -b
npm run lint # ESLint
npm test # 110 unit test (Vitest)
npm run test:watch # mode interaktif
```

Butuh Node.js 20+.

---

## Bahasa desain

Arah visual mengikuti dashboard premium 2025/2026 — kanvas kertas hangat, kartu beradius besar, sparkline di setiap KPI, dan angka sebagai elemen desain utama. Bukan template abu-abu generik.

| Elemen | Karakteristik |
|---|---|
| Kanvas | `#f1efe9` kertas hangat, gradien halus di atasnya |
| Kartu | Radius 24px, border tipis `#e5e1d6`, elevation berlapis |
| Aksen | Koral `#e4572e` — khusus tren, saran, dan elemen bantu |
| Tombol utama | Hampir hitam `#1b1b1f`, bukan biru/ungu |
| Angka | 34px, tabular-nums, tracking rapat |
| Status | Pil bulat bertitik — hijau/amber/merah hanya untuk status |

Setiap kartu KPI membawa **grafik kecil asli** (SVG buatan sendiri, tanpa pustaka grafik): total unit, perlu restock, dan unit keluar enam minggu terakhir.

Dasbor dibuka dengan **"Selamat datang kembali"**, lalu baris **Saran pemesanan** yang otomatis menghitung berapa unit yang harus dipesan agar stok bertahan 30 hari ke depan.

---

## Fitur

### Dasbor
Empat metrik dari state nyata: total SKU + kategori, nilai persediaan indikatif, jumlah barang perlu restock, dan unit keluar bulan ini. Plus tren 12 minggu (grafik area berporos), komposisi nilai (donut + legenda berwarna), barang paling kritis, dan barang lambat bergerak.

### Analitik & saran otomatis
- **Laju jual** 30 hari terakhir dihitung dari riwayat nyata per barang.
- **Masa stok** (`stok ÷ laju jual`) sebagai kolom tabel — "14 hr", "180 hr".
- **Saran pemesanan**: untuk barang menipis dengan laju jual nyata, sistem menghitung jumlah yang dibutuhkan agar stok bertahan 30 hari, dibulatkan ke kelipatan wajar (pack kelipatan 5, box kelipatan 6).
- **Barang lambat bergerak**: stok >= 180 hari atau tanpa penjualan dalam 30 hari.

### CRUD barang
SKU unik (tidak peka huruf besar/kecil), nama, kategori, satuan, biaya opsional, stok minimum, kuantitas awal. Pencarian pill, filter kategori/status, pengurutan nama/stok/nilai/prioritas. **SKU dibuat otomatis** dari awalan kategori yang sudah dipakai (`MIN-004`). Kuantitas terkunci saat ubah — stok hanya berubah lewat pergerakan.

### Pergerakan stok
Formulir Masuk/Keluar dengan jumlah, tanggal, referensi, catatan. **Pratinjau langsung** dampaknya (`Air Mineral: 66 -> 56 pack`) sebelum disimpan. **Nomor referensi terisi otomatis** (`POS-8999`). Tombol isi cepat berbentuk pil (1/5/10/25, minimum, habiskan).

### Riwayat
Buku besar dengan pencarian (nama/SKU/referensi/catatan), filter tipe, dan rentang tanggal. Peringatan bila tanggal awal lebih besar dari tanggal akhir.

### Undo/redo
Setiap perubahan dicatat sebagai peristiwa. `Ctrl+Z` membatalkan, `Ctrl+Shift+Z` mengulang. Notifikasi hasil setiap aksi memiliki tombol **Batalkan**.

### Palet perintah `Ctrl+K`
Grup Navigasi / Tindakan / Data, lengkap dengan label pintasan, dan pencarian barang berdasarkan nama atau SKU.

### Pintasan keyboard

| Pintasan | Aksi |
|---|---|
| `Ctrl+K` | Buka palet perintah |
| `Ctrl+N` | Tambah barang baru |
| `Ctrl+C` | Catat pergerakan stok |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Batalkan / ulangi |
| `G` lalu `D`/`B`/`P` | Pindah halaman |
| `Esc` | Tutup dialog atau palet |

### Data & cadangan
Ekspor CSV (barang & pergerakan, pemisah `;` + BOM UTF-8 untuk Excel Indonesia) dan JSON (cadangan penuh, tanpa BOM agar aman di parser ketat). Impor JSON divalidasi skema lebih dulu; berkas tidak valid ditolak tanpa merusak data. Reset ke data demo dan kosongkan semua, keduanya dengan konfirmasi.

---

## Aturan bisnis

| Aturan | Perilaku |
|---|---|
| Stok baru | `stok lama + masuk - keluar` |
| kuantitas pergerakan | Bilangan bulat `> 0` |
| Stok negatif | Ditolak; keluar melebihi stok tidak bisa disimpan |
| SKU | Unik setelah `trim`, tidak peka huruf besar/kecil |
| Status rendah | `kuantitas <= stok minimum` |
| Nilai persediaan | Hanya barang berbiaya; dilabeli **indikatif**, bukan pembukuan |

Kuantitas **hanya** berubah melalui peristiwa pergerakan. `reducer` juga secara paksa mempertahankan kuantitas lama bila pengeditan metadata mencoba mengubahnya — invarian ditegakkan di satu titik yang dapat diuji.

Barang baru dengan kuantitas awal `> 0` otomatis membuat satu pergerakan masuk bernotifikasi `STOK-AWAL`, sehingga riwayat selalu konsisten dengan kuantitas.

---

## Arsitektur

```
src/
├── domain/ # tanpa React, tanpa DOM, tanpa jam
│ ├── types.ts # model, satuan, versi skema
│ ├── aturan.ts # seluruh perhitungan & validasi (fungsi murni)
│ ├── mesin.ts # peristiwa, reducer, undo/redo
│ └── __tests__/ # 91 unit test
├── platform/ # hal yang butuh browser
│ ├── GudangProvider.tsx # state + riwayat + penyimpanan otomatis
│ ├── penyimpanan.ts # localStorage, migrasi skema, toleransi file rusak
│ ├── seed.ts # data demo 19 barang + 165 pergerakan
│ ├── ekspor.ts # CSV & JSON
│ ├── format.ts # id-ID: rupiah, angka, tanggal
│ ├── PaletPerintah.tsx # palet Ctrl+K
│ └── pintasan.ts # pintasan keyboard global
├── ui/ # primitif, kerangka, grafik
│ ├── primitif.tsx # Lencana, Medan, Modal, Konfirmasi, Kosong, Cari
│ ├── Rangka.tsx # sidebar, topbar, drawer
│ └── grafik.tsx # SVG: sparkline batang, area, cincin, progres
├── features/ # halaman
│ ├── Dasbor, DaftarBarang, RiwayatPergerakan, DataCadangan
│ ├── FormBarang, FormPergerakan
│ └── tren.ts # tren 12 minggu (terpisah agar mudah diuji)
└── styles/
 ├── dasar.css # token, reset, tipografi
 └── komponen.css # seluruh komponen
```

**Pemisahan tanggung jawab**

- `domain/` adalah lapisan paling penting: tidak mengimpor React, DOM, `localStorage`, atau jam. Semua aturan bisa diuji sebagai fungsi biasa.
- `mesin.ts` mendefinisikan *peristiwa* (`produk.ditambah`, `pergerakan.dicatat`, ...) dan undo/redo memakai **peristiwa kebalikan**, bukan salinan state — riwayat hanya menyimpan event, bukan snapshot.
- `ui/grafik.tsx` menggambar grafik langsung dari SVG. Tanpa pustaka grafik berarti beban bundel kecil dan kontrol penuh atas warna.
- `GudangProvider` menyusun orkestrasi tingkat aplikasi dan menulis ke `localStorage` setiap perubahan.
- Dialog dirender lewat `createPortal` ke `document.body`. Ini wajib: `.halaman` memakai animasi transform, dan transform membuat elemen itu menjadi *containing block* bagi `position: fixed` — tanpa portal, kaki dialog jatuh di luar layar. Ada uji geometri yang menjaga hal ini.

**Skema tersimpan**: `stockalert.gudang.v2`, dengan migrasi otomatis dari versi lama dan pemulihan bila file rusak.

---

## Pengujian

### Unit test — 110 test (`npm test`)

| Berkas | Cakupan |
|---|---|
| `domain/__tests__/aturan.test.ts` | SKU & keunikannya, penyusunan SKU otomatis, parsing tanggal (termasuk `2026-02-30` ditolak, 29 Feb), aturan stok, status, rekap bulanan, analitik & saran pemesanan, penyaringan & pengurutan, validasi formulir, impor JSON tidak dipercaya |
| `domain/__tests__/mesin.test.ts` | Setiap peristiwa, invarian kuantitas, penolakan aksi tak valid, undo/redo termasuk pembalikan efek pergerakan |
| `platform/__tests__/ekspor.test.ts` | Pengutipan CSV (titik koma & kutip ganda), nilai stok, pergerakan tanpa produk, nama berkas |
| `platform/__tests__/seed.test.ts` | Kuantitas tidak pernah negatif, kuantitas selalu sama dengan penjumlahannya, tiap produk punya satu stok awal, kombinasi status aman/rendah/habis, analitik tidak NaN, seed deterministik |

### uji antarmuka — 89 pemeriksaan (`python ui_check.py`)

Playwright/Chromium terhadap server dev. Cakupannya:

- Dasbor: KPI dari data nyata, panel perlu restock, barang lambat, saran pemesanan otomatis.
- Palet `Ctrl+K`: terbuka, fokus benar, penyaringan, Escape menutup.
- CRUD: galat inline Bahasa Indonesia, SKU otomatis dari kategori, input bertahan saat gagal.
- Undo/redo: `Ctrl+Z` dan `Ctrl+Shift+Z` benar-benar mengubah data.
- Pergerakan: pratinjau dampak stok, nomor referensi otomatis, prevention stok negatif.
- Hapus: konfirmasi + notifikasi dengan aksi batalkan.
- Ekspor: berkas JSON valid, **tanpa BOM**.
- Persistensi setelah reload; reset demo dan kosongkan data.
- Aksesibilitas: `role=dialog`, `aria-modal`, `aria-labelledby`, focus trap, Escape.
- Responsif 1440 / 768 / 360 px: tanpa overflow horizontal, drawer, tabel menjadi kartu.
- Kaki dialog selalu terjangkau pada 1440/1280/768/360 px.
- **Tanpa error konsol, page error, atau permintaan jaringan gagal.**

Menjalankan:

```bash
npm run dev # terminal 1
python ui_check.py # terminal 2 (butuh pip install playwright && playwright install chromium)
```

---

## Batasan yang diketahui

Aplikasi ini **demo portofolio lokal-first, bukan aplikasi produksi multi-pengguna.**

- **Tanpa sinkronisasi.** Data hanya ada di browser dan perangkat ini.
- **Tanpa multi-user atau hak akses.** Siapa pun yang memakai browser ini melihat data yang sama.
- **Nilai persediaan bukan pembukuan.** Hanya penjumlahan kuantitas x biaya satuan; tidak memperhitungkan HPP, susut, pajak, atau penyesuaian.
- **Saran pemesanan adalah heuristik**, bukan EOQ resmi: memakai laju jual 30 hari dan target cakupan 30 hari, tanpa memperhitungkan lead time supplier, biaya pemesanan, atau safety stock.
- **Tren hanya 12 minggu.** Riwayat demo baru mencakup sekitar 8 minggu, jadi minggu terawal pada grafik masih kosong. Ini jujur terhadap data, bukan cacat tampilan.
- **Tanpa banyak gudang, supplier, atau pelanggan.** Hanya satu gudang dan referensi berupa teks bebas.
- **Riwayat tidak bisa diedit atau dihapus.** Koreksi dilakukan lewat pembalikan atau regenerate.
- **Undo/redo hanya satu sesi** — hilang saat halaman dimuat ulang.
- **Data demo relatif terhadap hari ini.** Tanggal histori ikut bergeser agar ringkasan bulan berjalan selalu terisi.
- **Impor JSON mengganti seluruh data**, bukan menggabungkannya.
- **localStorage terbatas** (sekitar 5-10 MB). Ekspor cadangan berkala untuk data besar.
- **uji otomatis belum mencakup**: browser selain Chromium, perangkat sentuh, pembaca layar sungguhan (yang diuji hanya atribut ARIA dan urutan fokus), serta perilaku saat zoom browser.
- **Tidak ada migrasi lintas versi skema** di masa depan — `v2` punya jalur migrasi dari `v1`, tetapi pola untuk versi berikutnya perlu ditulis saat datanya berubah.

---

## Stack

Vite 7 + React 19 + TypeScript · `lucide-react` untuk ikon · CSS biasa dengan custom properties (tanpa framework CSS) · grafik SVG buatan sendiri (tanpa pustaka grafik) · Vitest + ESLint + `tsc`.

Tanpa dependensi berbayar, tanpa kunci API, tanpa aset eksternal saat runtime. Font memakai stack sistem, tidak diunduh.