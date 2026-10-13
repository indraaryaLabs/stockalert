/**
 * Tipe inti domain StockAlert.
 *
 * Layer ini murni: tidak mengimpor React, DOM, maupun API browser apa pun,
 * sehingga seluruh aturan bisnis dapat diuji tanpa lingkungan peramban.
 */

export const SATUAN = [
  'pcs',
  'pack',
  'box',
  'lusin',
  'kg',
  'gram',
  'liter',
  'ml',
  'meter',
] as const;

export type Satuan = (typeof SATUAN)[number];

export const TIPE_PERGERAKAN = ['masuk', 'keluar'] as const;

export type TipePergerakan = (typeof TIPE_PERGERAKAN)[number];

export type StatusStok = 'aman' | 'rendah' | 'habis';

export interface Produk {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  satuan: Satuan;
  /** Biaya per satuan dalam rupiah bulat. `null` berarti belum diisi. */
  biaya: number | null;
  stokMinimum: number;
  /** Stok saat ini. Hanya boleh berubah melalui PeristiwaStokMasuk/Keluar. */
  kuantitas: number;
  dibuatPada: string;
  diperbaruiPada: string;
}

export interface Pergerakan {
  id: string;
  produkId: string;
  tipe: TipePergerakan;
  jumlah: number;
  /** Tanggal lokal "YYYY-MM-DD", bebas dari pergeseran zona waktu. */
  tanggal: string;
  referensi: string;
  catatan: string;
  dibuatPada: string;
}

/** Seluruh data yang disimpan aplikasi. */
export interface Gudang {
  versi: number;
  produk: Produk[];
  pergerakan: Pergerakan[];
}

export const VERSI_SKEMA = 2;

/** Kunci penyimpanan. v2 karena bentuk data berubah dari skema awal. */
export const KUNCI_PENYIMPANAN = 'stockalert.gudang.v2';