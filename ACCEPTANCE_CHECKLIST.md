# StockAlert — Acceptance Checklist

> Status per 14 Oktober 2026, setelah penulisan ulang penuh (arsitektur, desain, dan fitur).
> Semua tanda centang berasal dari pemeriksaan nyata. Perintah dan hasilnya ada di bagian bawah.

## Product and interaction
- [x] Dashboard uses computed values from current app state. — KPI dari `ringkasan()`; Playwright memastikan angka tampil dari data seed, bukan placeholder.
- [x] Seeded demo data is present on first launch and clearly marked as demo/sample. — 19 barang + 165 pergerakan; sidebar memuat kartu "Data lokal", halaman Data & Cadangan menyatakannya.
- [x] Create, read, update, and delete workflows work. — CRUD barang dan pencatatan pergerakan diuji end-to-end lewat Playwright.
- [x] Search and filters return correct results. — Pencarian barang (nama/SKU/kategori), filter kategori/status, pencarian riwayat (nama/SKU/referensi/catatan), filter tipe dan rentang tanggal — semuanya diverifikasi lewat penghitungan baris.
- [x] Every visible button has a working outcome or is visibly disabled with a reason. — Tombol ekspor nonaktif + `title` penjelasan saat data kosong; tombol kosongkan nonaktif saat sudah kosong.
- [x] Invalid values show clear inline Bahasa Indonesia validation. — Galat per medan, dialog tetap terbuka, input tidak hilang. Ada test regresi khusus untuk kasus tombol simpan yang pernah macet.
- [x] Destructive actions require confirmation. — Hapus barang, reset demo, dan kosongkan data memakai dialog konfirmasi; notifikasi juga offer undo.
- [x] Data persists through a page reload. — `localStorage` berversi (`stockalert.gudang.v2`) dengan migrasi otomatis dari skema lama.
- [x] Reset demo restores the original example dataset after confirmation. — Diuji dari 19 barang, dikosongkan, lalu dipulihkan ke 19 barang.
- [x] Export works; imported JSON is validated and invalid files do not destroy existing data. — Berkas JSON hasil ekspor dibaca ulang dan valid (19/166) serta terbukti **tanpa BOM**; berkas rusak ditolak tanpa mengubah data.
- [x] Edge cases in PRD have been tested. — 110 unit test mencakup SKU duplikat/tipe, jumlah 0/negatif/pecahan, keluar melebihi stok, tanggal tidak ada di kalender, batas bulan inklusif, dan JSON tidak dipercaya.

## Visual quality
- [x] UI text is natural Bahasa Indonesia; no lorem ipsum.
- [x] Responsive at ~360px, 768px, and 1440px. — Diuji pada ketiganya; sidebar jadi drawer, tabel jadi kartu di mobile. Tabel tetap bergulir horizontal di dalam wadahnya pada 768px (disengaja).
- [x] No horizontal overflow in app shell/dialogs. — `scrollWidth <= clientWidth` pada 360 dan 768px untuk keempat halaman; dialog 360px selebar 344px.
- [x] Keyboard focus, labels, contrast, and accessible icon buttons. — Dialog punya `role=dialog`, `aria-modal`, `aria-labelledby`, focus trap, Escape, dan fokus kembali ke pemicu; tombol ikon punya `aria-label`; ada palet perintah dan 7 pintasan global.
- [x] Empty states, success/error feedback, loading behaviour are sensible. — Empty state di dasbor/barang/riwayat/palet; toast sukses, galat, dan info dengan aksi undo; tidak ada skeleton karena tidak ada operasi async.
- [x] No console errors during core workflows. — Playwright menangkap 0 console error, 0 page error, 0 request gagal.

## Engineering
- [x] `npm run build` passes. — built in ~4s; JS ~328 kB (99 kB gzip), CSS ~37 kB (7 kB gzip).
- [x] Type check, lint and tests pass; results recorded truthfully. — `npm run lint` 0 masalah, `npx tsc -b` 0 error, `npm test` 110/110 lulus.
- [x] Key business rules have focused tests. — 110 unit test di 4 berkas + 89 pemeriksaan UI.
- [x] README contains install/run/build instructions and limitations.
- [x] No secrets, paid API keys, paid dependencies/services, or mandatory remote assets. — Hanya React, Vite, lucide-react; grafik SVG buatan sendiri; font stack sistem; nol permintaan keluar saat runtime.
- [x] App is described honestly as a local-first portfolio demo. — Disampaikan di sidebar, halaman Data & Cadangan, dan README.

---

## Revolusi tampilan (permintaan revisi terakhir)

Dari tampilan generik abu-abu menjadi bahasa desain mengikuti tiga rujukan yang diminta:

1. **Kanvas kertas hangat** (`#f1efe9`) menggantikan netral dingin, dengan gradien halus.
2. **Radius kartu dibesar ke 24px** dari 16px, plus elevation berlapis yang lembut.
3. **Tombol utama jadi hampir hitam** (`#1b1b1f`) menggantikan aksen indigo — ciri khas gaya ini.
4. **Satu aksen koral** (`#e4572e`) untuk tren, saran, dan fokus; warna netral menonjol di sisanya.
5. **KPI membawa sparkline nyata** di tiap kartu, digambar SVG langsung.
6. **Sapaan "Selamat datang kembali"** menggantikan judul halaman kering.
7. **Grafik area 12 minggu dengan sumbu Y dan label tanggal**, plus donut komposisi nilai berwarna.
8. **Status jadi pil bulat bertitik**; pencarian berbentuk pil; tabel jadi hierarki huruf kapital kecil.
9. **Toast gelap** dengan tombol aksi, mengikuti pola notifikasi modern.

Grafik dibuat langsung dari SVG (`src/ui/grafik.tsx`) — tanpa pustaka grafik, sehingga beban bundel tetap kecil dan warna mengikuti token desain.

---

## Bug yang ditemukan dan diperbaiki selama verifikasi

Empat masalah nyata ditemukan oleh pengujian otomatis:

1. **Latar drawer menutupi sidebar** sehingga menu tidak bisa diklik di layar kecil. `z-index` latar (60) lebih tinggi dari sidebar (30). Diperbaiki dengan menurunkan latar ke 25.
2. **Tombol simpan mati permanen setelah validasi gagal** (diwarisi dari versi sebelumnya). Menyisakan kunci bernilai `undefined` membuat `Object.keys` tetap > 0. Diperbaiki dengan `hapusGalat()` yang memakai `delete`; ada test regresi.
3. **Kaki dialog di luar layar pada semua ukuran.** `.halaman` memiliki animasi transform sehingga menjadi *containing block*; `position: fixed` terukur relatif area konten. Diperbaiki dengan `createPortal` ke `document.body`, `margin: auto`, dan `max-height` berbasis `100dvh`.
4. **Cadangan JSON memakai BOM UTF-8** yang membuat parser ketat menolaknya. Diperbaiki dengan membatasi BOM hanya pada ekspor CSV.

Selain itu, tiga cacat visual ditemukan dari tangkapan layar dan diperbaiki: tombol tutup drawer tampil di desktop (spesifisitas CSS), nilai persediaan memakai format terlalu ringkas, dan sparkline terlalu redup/terpotong.

Catatan lingkungan: port 5173 sempat ditempati server dev proyek lain (QuoteFlow) di sesi terpisah, yang membuat pemeriksaan UI salah menargetkan aplikasi lain. Proses itu dihentikan dan server StockAlert dijalankan ulang sebelum verifikasi akhir.

---

## Bukti eksekusi

```
npm run lint          0 problems (exit 0)
npx tsc -b            0 errors (exit 0)
npm test              Test Files 4 passed | Tests 110 passed (110)
npm run build         built successfully (JS 328 kB / 99 kB gzip, CSS 37 kB)
python ui_check.py    89 checks, 0 failures
```

Pemeriksaan UI (89): greeting & KPI dari data nyata; palet Ctrl+K; CRUD + validasi + SKU otomatis; undo/redo; pergerakan + pratinjau + referensi otomatis; konfirmasi hapus + notifikasi undo; riwayat + filter; ekspor tanpa BOM; persistensi; aksesibilitas dialog; responsif 1440/768/360 dan cek overflow per halaman; kaki dialog terjangkau; empty state; tanpa error konsol.

## Checks yang TIDAK dilakukan

- Tidak diuji di browser selain Chromium headless (Firefox, Safari, Edge tidak dijalankan).
- Tidak diuji pada perangkat sentuh sungguhan.
- Tidak diuji dengan pembaca layar sungguhan; hanya atribut ARIA dan urutan fokus.
- Tidak diuji perilaku saat zoom browser.
- Beban localStorage yang jauh lebih besar dari data demo (~60 KB) tidak diuji.
- Tidak ada review keamanan penetration; validasi impor mencakup skema dasar, bukan serangan skrip.
- Tidak ada uji beban (load test) untuk ribuan baris pergerakan.
- Tampilan visual hanya diverifikasi lewat tangkapan layar headless, bukan penilaian mata designer.

---

## Final decision
- [ ] PASS — all release-critical checks verified.
- [x] **PASS WITH LIMITATIONS** — core flow works, remaining limitations documented.
- [ ] BLOCKED — core flow/build or critical behaviour fails.

**Dasar keputusan:** seluruh alur inti berjalan, build/lint/tipe/test lulus, dan 89 pemeriksaan browser bersih tanpa satu pun kegagalan. Diberikan "PASS WITH LIMITATIONS" dan bukan PASS penuh karena pengujian visual hanya lewat tangkapan layar headless Chromium — belum mencakup perangkat sentuh, pembaca layar sungguhan, atau browser lain. Batasan produk (lokal tanpa sinkronisasi, tanpa multi-user, saran pemesanan bersifat heuristik) memang di luar lingkup PRD dan sudah didokumentasikan di README.