import { describe, expect, it } from 'vitest';
import { namaBerkas, pergerakanKeCsv, produkKeCsv } from '../ekspor';
import { statusStok } from '../../domain/aturan';
import type { Pergerakan, Produk } from '../../domain/types';

const produk: Produk[] = [
  {
    id: 'prd_1',
    sku: 'MIN-001',
    nama: 'Air Mineral; Botol 600 ml',
    kategori: 'Minuman',
    satuan: 'pack',
    biaya: 3800,
    stokMinimum: 12,
    kuantitas: 20,
    dibuatPada: '2026-01-01T00:00:00.000Z',
    diperbaruiPada: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prd_2',
    sku: 'SMB-001',
    nama: 'Beras "Pandan" Wangi',
    kategori: 'Sembako',
    satuan: 'pcs',
    biaya: null,
    stokMinimum: 10,
    kuantitas: 4,
    dibuatPada: '2026-01-01T00:00:00.000Z',
    diperbaruiPada: '2026-01-01T00:00:00.000Z',
  },
];

const pergerakan: Pergerakan[] = [
  {
    id: 'mv_1',
    produkId: 'prd_1',
    tipe: 'masuk',
    jumlah: 20,
    tanggal: '2026-10-01',
    referensi: 'PB-1',
    catatan: 'Restock',
    dibuatPada: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'mv_2',
    produkId: 'prd_tidak_ada',
    tipe: 'keluar',
    jumlah: 3,
    tanggal: '2026-10-02',
    referensi: '',
    catatan: '',
    dibuatPada: '2026-10-02T08:00:00.000Z',
  },
];

describe('ekspor CSV produk', () => {
  const baris = produkKeCsv(produk).split('\r\n');

  it('memuat baris header dan satu baris per barang', () => {
    expect(baris).toHaveLength(3);
    expect(baris[0]).toContain('SKU');
    expect(baris[0]).toContain('Nilai Stok (Rp)');
  });

  it('mengapit nilai yang mengandung titik koma dan kutip', () => {
    expect(baris[1]).toContain('"Air Mineral; Botol 600 ml"');
    expect(baris[2]).toContain('"Beras ""Pandan"" Wangi"');
  });

  it('menghitung nilai stok dan menandai barang tanpa biaya', () => {
    expect(baris[1]).toContain('76000');
    expect(baris[1]).toContain(statusStok(produk[0]) === 'aman' ? 'Aman' : 'Rendah');
    // Biaya kosong -> nilai kosong, bukan nol palsu.
    expect(baris[2].endsWith(';')).toBe(true);
  });
});

describe('ekspor CSV pergerakan', () => {
  const baris = pergerakanKeCsv(pergerakan, produk).split('\r\n');

  it('satu baris per pergerakan', () => {
    expect(baris).toHaveLength(3);
    expect(baris[0]).toContain('Tipe');
  });

  it('menerjemahkan tipe ke Bahasa Indonesia', () => {
    expect(baris[1]).toContain(';Masuk;');
    expect(baris[2]).toContain(';Keluar;');
  });

  it('menandai pergerakan yang produknya tidak lagi ada', () => {
    expect(baris[2]).toContain('(barang dihapus)');
  });
});

describe('nama berkas unduhan', () => {
  it('memuat prefiks, tanggal, dan ekstensi', () => {
    expect(namaBerkas('stockalert-produk', 'csv')).toMatch(/^stockalert-produk-\d{8}\.csv$/);
  });
});