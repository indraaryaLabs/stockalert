/**
 * Aturan bisnis StockAlert — fungsi murni, tanpa efek samping.
 *
 * Ini satu-satunya tempat logika persediaan hidup. Semua lapisan lain
 * (antarmuka, penyimpanan, ekspor) hanya memanggil fungsi di sini.
 */

import { SATUAN, TIPE_PERGERAKAN, VERSI_SKEMA, type Gudang, type Pergerakan, type Produk, type Satuan, type StatusStok, type TipePergerakan } from './types';
export type { Gudang, Pergerakan, Produk, Satuan, StatusStok, TipePergerakan } from './types';

/* ------------------------------------------------------------------ */
/* Identitas & SKU                                                     */
/* ------------------------------------------------------------------ */

export function buatId(prefiks: string): string {
  const acak =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefiks}_${acak}`;
}

/** SKU dinormalkan untuk perbandingan: pangkas, rapatkan spasi, huruf besar. */
export function normalisasiSku(sku: string): string {
  return sku.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function skuBentrok(
  produk: readonly Produk[],
  sku: string,
  abaikanId?: string,
): boolean {
  const target = normalisasiSku(sku);
  if (!target) return false;
  return produk.some(
    (p) => p.id !== abaikanId && normalisasiSku(p.sku) === target,
  );
}

/**
 * Membuat SKU berikutnya yang wajar, misalnya `MIN-007`.
 * Awalan diturunkan dari kategori agar konsisten dengan data yang ada;
 * bila belum ada pola, memakai awalan tiga huruf dari kategori.
 */
export function usulkanSku(
  produk: readonly Produk[],
  kategori: string,
): string {
  const kategoriBersih = kategori.trim() || 'UMUM';
  const awalanKategori = normalisasiSku(kategoriBersih).replace(/[^A-Z0-9]/g, '');

  // Cari awalan yang sudah dipakai kategori ini, atau awalan terpanjang yang
  // cocok di seluruh daftar (mis. "Perawatan Diri" memakai "PRW").
  const milikKategori = produk.filter(
    (p) => normalisasiSku(p.kategori) === normalisasiSku(kategoriBersih),
  );
  const kandidat = milikKategori.length > 0 ? milikKategori : produk;

  const prefiksTerpakai = new Set<string>();
  let panjangAwalan = 0;
  for (const p of kandidat) {
    const bagian = normalisasiSku(p.sku).split('-')[0];
    if (!bagian || !/^[A-Z0-9]+$/.test(bagian)) continue;
    prefiksTerpakai.add(bagian);
    panjangAwalan = Math.max(panjangAwalan, bagian.length);
  }

  const awalan =
    [...prefiksTerpakai]
      .sort((a, b) => b.length - a.length || a.localeCompare(b))[0] ??
    awalanKategori.slice(0, 3).padEnd(3, 'X');

  // Nomor urut berdasarkan prefiks terpilih.
  let terbesar = 0;
  for (const p of produk) {
    const cocok = normalisasiSku(p.sku).match(new RegExp(`^${awalan}-(\\d+)$`));
    if (cocok) terbesar = Math.max(terbesar, Number(cocok[1]));
  }
  return `${awalan}-${String(terbesar + 1).padStart(3, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Tanggal                                                             */
/* ------------------------------------------------------------------ */

export function formatTanggal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const h = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${h}`;
}

/** Tanggal hari ini dalam format "YYYY-MM-DD". */
export function hariIni(acuan: Date = new Date()): string {
  return formatTanggal(acuan);
}



/** Menguraikan "YYYY-MM-DD" sebagai tanggal lokal; menolak tanggal kalender palsu. */
export function uraiTanggal(nilai: string): Date | null {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nilai.trim());
  if (!cocok) return null;
  const [, y, m, d] = cocok;
  const tanggal = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    tanggal.getFullYear() !== Number(y) ||
    tanggal.getMonth() !== Number(m) - 1 ||
    tanggal.getDate() !== Number(d)
  ) {
    return null;
  }
  return tanggal;
}

/** Alias yang lebih pendek, dipakai di lapisan antarmuka. */
export const parseTanggal = uraiTanggal;

export function tambahHari(tanggal: Date, jumlah: number): Date {
  const d = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
  d.setDate(d.getDate() + jumlah);
  return d;
}

export function selisihHari(a: Date, b: Date): number {
  const ms =
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
    new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Kuantitas & aturan inti stok                                        */
/* ------------------------------------------------------------------ */

export type HasilTerapkan =
  | { ok: true; kuantitas: number }
  | { ok: false; alasan: string };

/** Aturan inti: `stok baru = stok lama + masuk − keluar`, tanpa pernah negatif. */
export function terapkanPergerakan(
  stokSekarang: number,
  tipe: TipePergerakan,
  jumlah: number,
): HasilTerapkan {
  if (!Number.isInteger(jumlah) || jumlah <= 0) {
    return { ok: false, alasan: 'Jumlah harus bilangan bulat lebih besar dari 0.' };
  }
  if (!Number.isInteger(stokSekarang) || stokSekarang < 0) {
    return { ok: false, alasan: 'Stok barang saat ini tidak valid.' };
  }
  if (tipe === 'keluar' && jumlah > stokSekarang) {
    return {
      ok: false,
      alasan: `Stok tidak cukup. Tersedia ${stokSekarang} unit.`,
    };
  }
  const kuantitas =
    tipe === 'masuk' ? stokSekarang + jumlah : stokSekarang - jumlah;
  if (kuantitas < 0) {
    return { ok: false, alasan: 'Perubahan ini akan membuat stok menjadi negatif.' };
  }
  return { ok: true, kuantitas };
}

/** Kuantitas turunan dari riwayat; dipakai untuk memverifikasi konsistensi. */
export function kuantitasDari(
  kuantitasAwal: number,
  riwayat: readonly Pergerakan[],
): number {
  return riwayat.reduce(
    (t, p) => (p.tipe === 'masuk' ? t + p.jumlah : t - p.jumlah),
    kuantitasAwal,
  );
}

/* ------------------------------------------------------------------ */
/* Status & analitik                                                   */
/* ------------------------------------------------------------------ */

export function statusStok(p: Produk): StatusStok {
  if (p.kuantitas <= 0) return 'habis';
  if (p.kuantitas <= p.stokMinimum) return 'rendah';
  return 'aman';
}

export function selisihMinimum(p: Produk): number {
  return p.kuantitas - p.stokMinimum;
}

/** Produk perlu perhatian, paling kritis lebih dulu. */
export function produkPerluPerhatian(produk: readonly Produk[]): Produk[] {
  return produk
    .filter((p) => statusStok(p) !== 'aman')
    .sort((a, b) => selisihMinimum(a) - selisihMinimum(b) || a.nama.localeCompare(b.nama, 'id'));
}

/* ------------------------------------------------------------------ */
/* Nilai persediaan                                                    */
/* ------------------------------------------------------------------ */

export interface NilaiPersediaan {
  total: number;
  barangDinilai: number;
  barangTanpaBiaya: number;
}

/**
 * Nilai indikatif = jumlah(kuantitas × biaya) untuk barang yang biayanya ada.
 * Bukan pembukuan: tidak memperhitungkan HPP, susut, pajak, atau penyesuaian.
 */
export function nilaiPersediaan(produk: readonly Produk[]): NilaiPersediaan {
  let total = 0;
  let barangDinilai = 0;
  let barangTanpaBiaya = 0;
  for (const p of produk) {
    if (typeof p.biaya === 'number' && Number.isFinite(p.biaya) && p.biaya >= 0) {
      total += p.kuantitas * p.biaya;
      barangDinilai += 1;
    } else {
      barangTanpaBiaya += 1;
    }
  }
  return { total, barangDinilai, barangTanpaBiaya };
}

/* ------------------------------------------------------------------ */
/* Analitik                                                           */
/* ------------------------------------------------------------------ */

export interface AnalitikProduk {
  produk: Produk;
  /** Rata-rata unit keluar per hari selama jendela analisis. */
  lajuKeluar: number;
  /** Perkiraan hari sampai stok habis pada laju keluar sekarang. */
  hariMenipis: number | null;
  /** Saran jumlah pesan agar stok bertahan `targetHariKeDepan`. */
  saranPesan: number | null;
  motionless: boolean;
  /** Stok terlalu tinggi dibanding laju jual (>= 180 hari cover). */
  lambat: boolean;
  nilai: number | null;
}

export const JENDELA_ANALIS_HARI = 30;
export const TARGET_HARI_KE_DEPAN = 30;

/**
 * Menghitung laju keluar, masa stok, dan saran pemesanan dari riwayat nyata.
 * Barang tanpa riwayat keluar dianggap lajunya nol, bukandata hilang.
 */
export function analitik(
  produk: readonly Produk[],
  pergerakan: readonly Pergerakan[],
  opsi: { sekarang?: Date; jendelaHari?: number; targetHari?: number } = {},
): AnalitikProduk[] {
  const sekarang = opsi.sekarang ?? new Date();
  const jendela = opsi.jendelaHari ?? JENDELA_ANALIS_HARI;
  const target = opsi.targetHari ?? TARGET_HARI_KE_DEPAN;

  const mulaiJendela = tambahHari(sekarang, -jendela);
  const keluarPerProduk = new Map<string, number>();
  const keluarTerakhir = new Map<string, string>();
  for (const p of pergerakan) {
    if (p.tipe !== 'keluar') continue;
    const t = uraiTanggal(p.tanggal);
    if (t && t >= mulaiJendela && t <= sekarang) {
      keluarPerProduk.set(p.produkId, (keluarPerProduk.get(p.produkId) ?? 0) + p.jumlah);
    }
    const sebelumnya = keluarTerakhir.get(p.produkId);
    if (!sebelumnya || p.tanggal > sebelumnya) keluarTerakhir.set(p.produkId, p.tanggal);
  }

  return produk.map((produk) => {
    const keluar = keluarPerProduk.get(produk.id) ?? 0;
    // PembagiDibuat max(1,…) agar hari parsial tidak membuat laju melonjak.
    const lajuKeluar = keluar / Math.max(1, jendela);

    let hariMenipis: number | null = null;
    let saranPesan: number | null = null;
    if (lajuKeluar > 0) {
      hariMenipis = Math.floor(produk.kuantitas / lajuKeluar);
      // Pesan cukup untuk menutup kekurangan sampai target ke depan.
      const kebutuhan = lajuKeluar * target;
      const kekurangan = Math.ceil(kebutuhan - produk.kuantitas);
      saranPesan = kekurangan > 0 ? bulatkanPesanan(kekurangan, produk) : 0;
    }

    const terakhir = keluarTerakhir.get(produk.id) ?? null;
    const motionless =
      keluar === 0 ||
      (terakhir !== null && selisihHari(sekarang, uraiTanggal(terakhir) ?? sekarang) >= 60);

    return {
      produk,
      lajuKeluar,
      hariMenipis,
      saranPesan,
      motionless,
      lambat: lajuKeluar > 0 && produk.kuantitas / lajuKeluar >= 180,
      nilai:
        typeof produk.biaya === 'number' ? produk.kuantitas * produk.biaya : null,
    };
  });
}

/** Bulatkan saran pesanan ke kelipatan yang wajar untuk toko kecil. */
function bulatkanPesanan(kekurangan: number, produk: Produk): number {
  if (kekurangan <= 0) return 0;
  const kelipatan: Partial<Record<Satuan, number>> = {
    pcs: 1,
    pack: 5,
    box: 6,
  };
  const k = kelipatan[produk.satuan];
  return k && k > 1 ? Math.ceil(kekurangan / k) * k : Math.ceil(kekurangan);
}

/* ------------------------------------------------------------------ */
/* Ringkasan                                                           */
/* ------------------------------------------------------------------ */

export interface RekapBulan {
  masuk: number;
  keluar: number;
  catatan: number;
}

export interface Ringkasan {
  totalProduk: number;
  totalUnit: number;
  stokHabis: number;
  perluRestock: number;
  nilai: NilaiPersediaan;
  bulanIni: RekapBulan;
  bulanLalu: RekapBulan;
  perKategori: { kategori: string; jumlah: number; nilai: number }[];
}

export function rekapBulan(
  pergerakan: readonly Pergerakan[],
  acuan: Date,
): RekapBulan {
  const mulai = new Date(acuan.getFullYear(), acuan.getMonth(), 1);
  const selesai = new Date(acuan.getFullYear(), acuan.getMonth() + 1, 1);
  let masuk = 0;
  let keluar = 0;
  let catatan = 0;
  for (const p of pergerakan) {
    const t = uraiTanggal(p.tanggal);
    if (!t || t < mulai || t >= selesai) continue;
    catatan += 1;
    if (p.tipe === 'masuk') masuk += p.jumlah;
    else keluar += p.jumlah;
  }
  return { masuk, keluar, catatan };
}

export function ringkasan(gudang: Gudang, acuan: Date = new Date()): Ringkasan {
  const bulanLalu = new Date(acuan.getFullYear(), acuan.getMonth() - 1, 1);

  const perKategori = new Map<string, { jumlah: number; nilai: number }>();
  let totalUnit = 0;
  let stokHabis = 0;
  let perluRestock = 0;

  for (const p of gudang.produk) {
    totalUnit += p.kuantitas;
    const status = statusStok(p);
    if (status === 'habis') stokHabis += 1;
    if (status !== 'aman') perluRestock += 1;
    const entry = perKategori.get(p.kategori) ?? { jumlah: 0, nilai: 0 };
    entry.jumlah += 1;
    entry.nilai += typeof p.biaya === 'number' ? p.kuantitas * p.biaya : 0;
    perKategori.set(p.kategori, entry);
  }

  return {
    totalProduk: gudang.produk.length,
    totalUnit,
    stokHabis,
    perluRestock,
    nilai: nilaiPersediaan(gudang.produk),
    bulanIni: rekapBulan(gudang.pergerakan, acuan),
    bulanLalu: rekapBulan(gudang.pergerakan, bulanLalu),
    perKategori: [...perKategori.entries()]
      .map(([kategori, v]) => ({ kategori, ...v }))
      .sort((a, b) => b.nilai - a.nilai || b.jumlah - a.jumlah),
  };
}

/* ------------------------------------------------------------------ */
/* Pencarian & penyaringan                                             */
/* ------------------------------------------------------------------ */

export interface SaringProduk {
  kueri?: string;
  kategori?: string;
  status?: StatusStok | 'semua';
  urut?: Urutan;
  naik?: boolean;
}

export type Urutan = 'nama' | 'stok' | 'nilai' | 'status';

export function saringProduk(
  produk: readonly Produk[],
  saring: SaringProduk = {},
): Produk[] {
  const kueri = (saring.kueri ?? '').trim().toLowerCase();
  const arah = saring.naik === false ? -1 : 1;

  const hasil = produk.filter((p) => {
    if (kueri) {
      const haystack = `${p.nama} ${p.sku} ${p.kategori}`.toLowerCase();
      if (!haystack.includes(kueri)) return false;
    }
    if (saring.kategori && p.kategori !== saring.kategori) return false;
    if (saring.status && saring.status !== 'semua' && statusStok(p) !== saring.status) {
      return false;
    }
    return true;
  });

  const urut = saring.urut ?? 'nama';
  return hasil.sort((a, b) => {
    switch (urut) {
      case 'stok':
        return arah * (a.kuantitas - b.kuantitas);
      case 'nilai': {
        const na = typeof a.biaya === 'number' ? a.kuantitas * a.biaya : -1;
        const nb = typeof b.biaya === 'number' ? b.kuantitas * b.biaya : -1;
        return arah * (na - nb);
      }
      case 'status':
        return arah * (selisihMinimum(a) - selisihMinimum(b));
      default:
        return arah * a.nama.localeCompare(b.nama, 'id');
    }
  });
}

export interface SaringPergerakan {
  kueri?: string;
  tipe?: TipePergerakan | 'semua';
  dari?: string;
  sampai?: string;
  produkId?: string;
}

export function saringPergerakan(
  pergerakan: readonly Pergerakan[],
  produk: readonly Produk[],
  saring: SaringPergerakan = {},
): Pergerakan[] {
  const kueri = (saring.kueri ?? '').trim().toLowerCase();
  const tipe = saring.tipe ?? 'semua';
  const dari = saring.dari ? uraiTanggal(saring.dari) : null;
  const sampai = saring.sampai ? uraiTanggal(saring.sampai) : null;
  const indeks = new Map(produk.map((p) => [p.id, p]));

  return pergerakan
    .filter((m) => {
      if (tipe !== 'semua' && m.tipe !== tipe) return false;
      if (saring.produkId && m.produkId !== saring.produkId) return false;

      const t = uraiTanggal(m.tanggal);
      if (dari && (!t || t < dari)) return false;
      if (sampai && (!t || t > sampai)) return false;

      if (kueri) {
        const p = indeks.get(m.produkId);
        const haystack = [p?.nama ?? '', p?.sku ?? '', m.referensi, m.catatan]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(kueri)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.dibuatPada.localeCompare(a.dibuatPada);
    });
}

/* ------------------------------------------------------------------ */
/* Validasi formulir                                                   */
/* ------------------------------------------------------------------ */

export type Galat = string | null;
export type PetaGalat = Partial<Record<string, Galat>>;

export interface MasukanProduk {
  sku: string;
  nama: string;
  kategori: string;
  satuan: Satuan;
  biaya: number | null;
  stokMinimum: number;
  kuantitasAwal: number;
}

export function validasiProduk(
  masukan: MasukanProduk,
  produk: readonly Produk[],
  abaikanId?: string,
): PetaGalat {
  const galat: PetaGalat = {};

  const sku = masukan.sku.trim();
  if (!sku) galat.sku = 'SKU wajib diisi.';
  else if (sku.length < 3) galat.sku = 'SKU minimal 3 karakter.';
  else if (skuBentrok(produk, sku, abaikanId)) {
    galat.sku = `SKU "${normalisasiSku(sku)}" sudah dipakai barang lain.`;
  }

  const nama = masukan.nama.trim();
  if (!nama) galat.nama = 'Nama barang wajib diisi.';
  else if (nama.length < 3) galat.nama = 'Nama barang minimal 3 karakter.';

  if (!masukan.kategori.trim()) galat.kategori = 'Kategori wajib diisi.';
  if (!Number.isInteger(masukan.stokMinimum) || masukan.stokMinimum < 0) {
    galat.stokMinimum = 'Stok minimum harus bilangan bulat 0 atau lebih.';
  }
  if (!Number.isInteger(masukan.kuantitasAwal) || masukan.kuantitasAwal < 0) {
    galat.kuantitasAwal = 'Kuantitas awal harus bilangan bulat 0 atau lebih.';
  }
  if (
    masukan.biaya !== null &&
    (!Number.isFinite(masukan.biaya) || masukan.biaya < 0)
  ) {
    galat.biaya = 'Biaya harus berupa rupiah positif atau dikosongkan.';
  }

  return galat;
}

export interface MasukanPergerakan {
  produkId: string;
  tipe: TipePergerakan;
  jumlah: number;
  tanggal: string;
  referensi: string;
  catatan: string;
}

export function validasiPergerakan(
  masukan: MasukanPergerakan,
  produk: readonly Produk[],
): PetaGalat {
  const galat: PetaGalat = {};
  const target = produk.find((p) => p.id === masukan.produkId);

  if (!target) {
    galat.produkId = 'Pilih barang yang akan dicatat.';
  } else if (!Number.isInteger(masukan.jumlah) || masukan.jumlah <= 0) {
    galat.jumlah = 'Jumlah harus bilangan bulat lebih besar dari 0.';
  } else if (masukan.tipe === 'keluar' && masukan.jumlah > target.kuantitas) {
    galat.jumlah = `Stok tersisa hanya ${target.kuantitas} ${target.satuan}.`;
  }

  if (!uraiTanggal(masukan.tanggal)) {
    galat.tanggal = 'Tanggal tidak valid.';
  }
  return galat;
}

/**
 * Menghapus kunci galat secara bersih. Menyisakan kunci bernilai `undefined`
 * membuat `Object.keys` tetap menghitungnya, sehingga tombol simpan tidak
 * pernah aktif kembali.
 */
export function hapusGalat(galat: PetaGalat, kunci: string): PetaGalat {
  if (!(kunci in galat)) return galat;
  const salinan = { ...galat };
  delete salinan[kunci];
  return salinan;
}

export function adaGalat(galat: PetaGalat): boolean {
  return Object.values(galat).some(Boolean);
}

/* ------------------------------------------------------------------ */
/* Nomor referensi otomatis                                           */
/* ------------------------------------------------------------------ */

/** Nomor nota berikutnya, mis. `PB-2445`, melanjutkan referensi yang ada. */
/** Persentase perubahan; `null` bila basis nol sehingga tren tidak bermakna. */
export function hitungPerubahan(sekarang: number, sebelumnya: number): number | null {
  if (sebelumnya === 0) return null;
  return ((sekarang - sebelumnya) / sebelumnya) * 100;
}

export function usulkanReferensi(
  pergerakan: readonly Pergerakan[],
  awalan = 'PB',
): string {
  const pola = new RegExp(`^${awalan}-(\\d+)$`, 'i');
  let terbesar = 0;
  for (const p of pergerakan) {
    const cocok = pola.exec(p.referensi.trim());
    if (cocok) terbesar = Math.max(terbesar, Number(cocok[1]));
  }
  return `${awalan}-${String(terbesar + 1).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Validasi skema & migrasi                                            */
/* ------------------------------------------------------------------ */

export function normalisasiSatuan(nilai: unknown): Satuan | null {
  if (typeof nilai !== 'string') return null;
  const cari = nilai.trim().toLowerCase() as Satuan;
  return SATUAN.includes(cari) ? cari : null;
}

export function normalisasiTipe(nilai: unknown): TipePergerakan | null {
  if (typeof nilai !== 'string') return null;
  const cari = nilai.trim().toLowerCase() as TipePergerakan;
  return (TIPE_PERGERAKAN as readonly string[]).includes(cari) ? cari : null;
}

export function gudangValid(nilai: unknown): nilai is Gudang {
  if (typeof nilai !== 'object' || nilai === null) return false;
  const kandidat = nilai as Partial<Gudang>;
  if (!Array.isArray(kandidat.produk) || !Array.isArray(kandidat.pergerakan)) return false;
  if (kandidat.versi !== undefined && typeof kandidat.versi !== 'number') return false;

  for (const p of kandidat.produk) {
    if (typeof p !== 'object' || p === null) return false;
    if (typeof p.id !== 'string' || !p.id) return false;
    if (typeof p.sku !== 'string' || !p.sku.trim()) return false;
    if (typeof p.nama !== 'string' || !p.nama.trim()) return false;
    if (typeof p.kategori !== 'string' || !p.kategori.trim()) return false;
    if (!normalisasiSatuan(p.satuan)) return false;
    if (p.biaya !== null && (typeof p.biaya !== 'number' || !Number.isFinite(p.biaya) || p.biaya < 0)) {
      return false;
    }
    if (!Number.isInteger(p.stokMinimum) || p.stokMinimum < 0) return false;
    if (!Number.isInteger(p.kuantitas) || p.kuantitas < 0) return false;
  }

  const idsProduk = new Set(kandidat.produk.map((p) => p.id));
  for (const m of kandidat.pergerakan) {
    if (typeof m !== 'object' || m === null) return false;
    if (typeof m.id !== 'string' || !m.id) return false;
    if (!normalisasiTipe(m.tipe)) return false;
    if (!Number.isInteger(m.jumlah) || (m.jumlah as number) <= 0) return false;
    if (!uraiTanggal(m.tanggal as string)) return false;
    if (!idsProduk.has(m.produkId as string)) return false;
  }
  return true;
}

/**
 * Membaca JSON tidak dipercaya menjadi `Gudang` yang aman.
 * Pergerakan yang menunjuk produk hilang dibuang, bukan menggagalkan seluruh impor.
 */
export function muatGudangAman(teks: string): Gudang | null {
  let mentah: unknown;
  try {
    mentah = JSON.parse(teks.replace(/^\uFEFF/, '').trim());
  } catch {
    return null;
  }
  if (!gudangValid(mentah)) return null;

  const produk: Produk[] = mentah.produk.map((p) => ({
    ...p,
    sku: p.sku.trim(),
    nama: p.nama.trim(),
    kategori: p.kategori.trim(),
    satuan: normalisasiSatuan(p.satuan) ?? 'pcs',
    dibuatPada: p.dibuatPada ?? new Date().toISOString(),
    diperbaruiPada: p.dibuatPada ?? new Date().toISOString(),
  }));

  const pergerakan: Pergerakan[] = mentah.pergerakan.map((m) => ({
    ...m,
    referensi: String(m.referensi ?? '').trim(),
    catatan: String(m.catatan ?? '').trim(),
    dibuatPada: m.dibuatPada ?? new Date().toISOString(),
  }));

  return { versi: VERSI_SKEMA, produk, pergerakan };
}

export function gudangKosong(): Gudang {
  return { versi: VERSI_SKEMA, produk: [], pergerakan: [] };
}
