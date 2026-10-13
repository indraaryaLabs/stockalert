import { describe, expect, it } from 'vitest';
import { buatSeed, infoSeed, tanggalSeedValid } from '../seed';
import {
  analitik,
  kuantitasDari,
  produkPerluPerhatian,
  ringkasan,
  statusStok,
} from '../../domain/aturan';
import type { StatusStok } from '../../domain/types';

const ACAUAN = new Date(2026, 9, 12);

describe('data demo bawaan', () => {
  const data = buatSeed(ACAUAN);

  it('memuat jumlah barang dan pergerakan yang konsisten', () => {
    const info = infoSeed();
    expect(data.produk).toHaveLength(info.produk);
    expect(data.pergerakan).toHaveLength(info.pergerakan);
  });

  it('seluruh kuantitas tidak pernah negatif', () => {
    for (const p of data.produk) {
      expect(p.kuantitas, `${p.sku} tidak boleh negatif`).toBeGreaterThanOrEqual(0);
    }
  });

  it('kuantitas selalu sama dengan penjumlahan pergerakan produk', () => {
    for (const p of data.produk) {
      const riwayat = data.pergerakan.filter((m) => m.produkId === p.id);
      expect(p.kuantitas, `${p.sku} harus cocok dengan riwayatnya`).toBe(
        kuantitasDari(0, riwayat),
      );
    }
  });

  it('setiap produk punya tepat satu pergerakan stok awal', () => {
    for (const p of data.produk) {
      const awal = data.pergerakan.filter(
        (m) => m.produkId === p.id && m.referensi === 'STOK-AWAL',
      );
      expect(awal, `${p.sku} harus punya stok awal`).toHaveLength(1);
    }
  });

  it('menghasilkan kombinasi status aman, rendah, dan habis', () => {
    const status = new Set<StatusStok>(data.produk.map(statusStok));
    expect(status.has('aman')).toBe(true);
    expect(status.has('rendah')).toBe(true);
    expect(status.has('habis')).toBe(true);
  });

  it('mengisi transaksi bulan ini dan bulan lalu', () => {
    const r = ringkasan(data, ACAUAN);
    expect(r.bulanIni.masuk).toBeGreaterThan(0);
    expect(r.bulanIni.keluar).toBeGreaterThan(0);
    expect(r.bulanIni.catatan).toBeGreaterThan(0);
    expect(r.bulanLalu.catatan).toBeGreaterThan(0);
  });

  it('menghasilkan barang yang perlu restock', () => {
    expect(produkPerluPerhatian(data.produk).length).toBeGreaterThan(0);
  });

  it('menghasilkan analitik yang masuk akal (tidak NaN)', () => {
    for (const a of analitik(data.produk, data.pergerakan, { sekarang: ACAUAN })) {
      expect(Number.isFinite(a.lajuKeluar), `${a.produk.sku} laju`).toBe(true);
      if (a.hariMenipis !== null) {
        expect(Number.isFinite(a.hariMenipis)).toBe(true);
        expect(a.hariMenipis).toBeGreaterThanOrEqual(0);
      }
      if (a.saranPesan !== null) {
        expect(Number.isFinite(a.saranPesan)).toBe(true);
        expect(a.saranPesan).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('deterministik: dua kali pemuatan menghasilkan data identik', () => {
    const lagi = buatSeed(ACAUAN);
    expect(lagi.produk).toEqual(data.produk);
    expect(lagi.pergerakan).toEqual(data.pergerakan);
  });

  it('tanggal histori selalu bisa diurai kembali', () => {
    expect(tanggalSeedValid(ACAUAN)).toBe(true);
  });

  it('berpindah relatif terhadap tanggal aplikasi dibuka', () => {
    const lain = buatSeed(new Date(2026, 5, 1));
    expect(lain.produk[0].dibuatPada).not.toBe(data.produk[0].dibuatPada);
    for (const p of lain.produk) {
      const riwayat = lain.pergerakan.filter((m) => m.produkId === p.id);
      expect(p.kuantitas).toBe(kuantitasDari(0, riwayat));
    }
  });
});