/**
 * Ekspor data: CSV (untuk Excel) dan JSON (untuk cadangan penuh).
 *
 * CSV memakai pemisah titik koma + BOM UTF-8 agar langsung rapi di Excel
 * versi Indonesia. JSON sengaja TANPA BOM karena parser ketat akan menolaknya.
 */

import { statusStok } from '../domain/aturan';
import type { Gudang, Pergerakan, Produk } from '../domain/types';

const PEMISAH_CSV = ';';
const BOM = '\uFEFF';

function selCsv(nilai: string | number): string {
  const teks = String(nilai);
  return /[";\r\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

function keCsv(baris: (string | number)[][]): string {
  return baris.map((b) => b.map(selCsv).join(PEMISAH_CSV)).join('\r\n');
}

export function produkKeCsv(produk: readonly Produk[]): string {
  const kepala = [
    'SKU',
    'Nama Barang',
    'Kategori',
    'Satuan',
    'Biaya Satuan (Rp)',
    'Stok Minimum',
    'Kuantitas Saat Ini',
    'Status Stok',
    'Nilai Stok (Rp)',
  ];
  const isi = produk.map((p) => [
    p.sku,
    p.nama,
    p.kategori,
    p.satuan,
    p.biaya ?? '',
    p.stokMinimum,
    p.kuantitas,
    labelStatus(statusStok(p)),
    p.biaya === null ? '' : p.kuantitas * p.biaya,
  ]);
  return keCsv([kepala, ...isi]);
}

export function pergerakanKeCsv(
  pergerakan: readonly Pergerakan[],
  produk: readonly Produk[],
): string {
  const kepala = [
    'Tanggal',
    'SKU',
    'Nama Barang',
    'Tipe',
    'Jumlah',
    'Satuan',
    'Referensi',
    'Catatan',
  ];
  const indeks = new Map(produk.map((p) => [p.id, p]));
  const isi = pergerakan.map((m) => {
    const p = indeks.get(m.produkId);
    return [
      m.tanggal,
      p?.sku ?? '(barang dihapus)',
      p?.nama ?? '(barang dihapus)',
      m.tipe === 'masuk' ? 'Masuk' : 'Keluar',
      m.jumlah,
      p?.satuan ?? '',
      m.referensi,
      m.catatan,
    ];
  });
  return keCsv([kepala, ...isi]);
}

function labelStatus(s: string): string {
  return s === 'aman' ? 'Aman' : s === 'rendah' ? 'Rendah' : 'Habis';
}

/* ------------------------------------------------------------------ */
/* Unduhan                                                           */
/* ------------------------------------------------------------------ */

export function namaBerkas(prefiks: string, ekstensi: string): string {
  const d = new Date();
  const cap = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefiks}-${cap}.${ekstensi}`;
}

export function unduh(berkas: string, isi: string, tipe: string, bom = false): void {
  const blob = new Blob([bom ? BOM + isi : isi], { type: `${tipe};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = berkas;
  tautan.rel = 'noopener';
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function eksporProdukCsv(gudang: Gudang): void {
  unduh(namaBerkas('stockalert-produk', 'csv'), produkKeCsv(gudang.produk), 'text/csv', true);
}

export function eksporPergerakanCsv(gudang: Gudang): void {
  unduh(
    namaBerkas('stockalert-pergerakan', 'csv'),
    pergerakanKeCsv(gudang.pergerakan, gudang.produk),
    'text/csv',
    true,
  );
}

export function eksporCadanganJson(gudang: Gudang): void {
  unduh(namaBerkas('stockalert-cadangan', 'json'), JSON.stringify(gudang, null, 2), 'application/json');
}