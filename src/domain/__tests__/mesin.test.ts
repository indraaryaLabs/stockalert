import { describe, expect, it } from 'vitest';
import {
  catatPergerakan,
  dorongSejarah,
  produkBaru,
  redo,
  terapkanPeristiwa,
  undo,
  SEJARAH_AWAL,
  type Langkah,
} from '../mesin';
import { kuantitasDari } from '../aturan';
import type { Gudang, Pergerakan, Produk } from '../types';
import { VERSI_SKEMA } from '../types';

function produk(partial: Partial<Produk> = {}): Produk {
  return {
    id: 'prd_1',
    sku: 'MIN-001',
    nama: 'Air Mineral 600 ml',
    kategori: 'Minuman',
    satuan: 'pack',
    biaya: 3800,
    stokMinimum: 12,
    kuantitas: 20,
    dibuatPada: '2026-01-01T00:00:00.000Z',
    diperbaruiPada: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function gerak(partial: Partial<Pergerakan> = {}): Pergerakan {
  return {
    id: 'mv_1',
    produkId: 'prd_1',
    tipe: 'keluar',
    jumlah: 5,
    tanggal: '2026-10-12',
    referensi: 'POS-1',
    catatan: '',
    dibuatPada: '2026-10-12T08:00:00.000Z',
    ...partial,
  };
}

function kosong(): Gudang {
  return { versi: VERSI_SKEMA, produk: [], pergerakan: [] };
}

function langkahDari(jenis: string, kunci: string): Langkah {
  return {
    peristiwa: { jenis: 'gudang.diganti', gudang: kosong() } as never,
    label: jenis,
    kunci,
    waktu: 0,
  };
}

/** Invarian inti: kuantitas = baseline + Σ pergerakan, tidak pernah negatif. */
function invarian(data: Gudang, baseline: Record<string, number> = {}) {
  for (const p of data.produk) {
    const riwayat = data.pergerakan.filter((m) => m.produkId === p.id);
    expect(
      p.kuantitas,
      `kuantitas ${p.sku} harus sama dengan penjumlahan pergerakan`,
    ).toBe(kuantitasDari(baseline[p.id] ?? 0, riwayat));
    expect(p.kuantitas).toBeGreaterThanOrEqual(0);
  }
}

/* ================================================================== */

describe('produk.ditambah', () => {
  it('menyimpan produk beserta pergerakan stok awal', () => {
    const peristiwa = produkBaru({
      sku: 'MIN-001',
      nama: 'Air Mineral',
      kategori: 'Minuman',
      satuan: 'pack',
      biaya: 3800,
      stokMinimum: 10,
      kuantitasAwal: 30,
    });
    expect(peristiwa.jenis).toBe('produk.ditambah');
    const hasil = terapkanPeristiwa(kosong(), peristiwa);
    expect(hasil.produk).toHaveLength(1);
    expect(hasil.pergerakan).toHaveLength(1);
    if (peristiwa.jenis === 'produk.ditambah') {
      expect(peristiwa.pergerakanAwal?.referensi).toBe('STOK-AWAL');
    }
    invarian(hasil);
  });

  it('tidak membuat pergerakan awal bila kuantitas nol', () => {
    const peristiwa = produkBaru({
      sku: 'X', nama: 'Y', kategori: 'Z', satuan: 'pcs', biaya: null,
      stokMinimum: 0, kuantitasAwal: 0,
    });
    const hasil = terapkanPeristiwa(kosong(), peristiwa);
    expect(hasil.pergerakan).toHaveLength(0);
  });

  it('mengabaikan id ganda agar state tidak rusak', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'produk.ditambah',
      produk: produk({ sku: 'MIN-002' }),
    });
    expect(hasil).toBe(awal);
  });
});

describe('produk.diubah', () => {
  it('memperbarui metadata tanpa mengubah kuantitas', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'produk.diubah',
      produkId: 'prd_1',
      perubahan: { nama: 'Air Mineral 330 ml', stokMinimum: 30, kuantitas: 999 },
    });
    expect(hasil.produk[0].nama).toBe('Air Mineral 330 ml');
    expect(hasil.produk[0].stokMinimum).toBe(30);
    // Kuantitas tidak boleh berubah lewat pengeditan metadata.
    expect(hasil.produk[0].kuantitas).toBe(20);
  });

  it('tidak mengubah data bila produk tidak ada', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'produk.diubah',
      produkId: 'hilang',
      perubahan: { nama: 'X' },
    });
    expect(hasil).toBe(awal);
  });
});

describe('produk.dihapus', () => {
  it('menghapus produk sekaligus seluruh gerakannya', () => {
    const awal: Gudang = {
      versi: VERSI_SKEMA,
      produk: [produk(), produk({ id: 'prd_2', sku: 'SNK-002', kuantitas: 5 })],
      pergerakan: [gerak(), gerak({ id: 'mv_2' }), gerak({ id: 'mv_3', produkId: 'prd_2', jumlah: 2 })],
    };
    const hasil = terapkanPeristiwa(awal, { jenis: 'produk.dihapus', produkId: 'prd_1' });
    expect(hasil.produk.map((p) => p.id)).toEqual(['prd_2']);
    expect(hasil.pergerakan.map((m) => m.id)).toEqual(['mv_3']);
    invarian(hasil, { prd_2: 7 });
  });
});

describe('pergerakan.dicatat', () => {
  const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
  const DASAR = { prd_1: 20 };

  it('stok keluar mengurangi kuantitas dan menambah riwayat', () => {
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'pergerakan.dicatat',
      pergerakan: gerak({ jumlah: 5 }),
    });
    expect(hasil.produk[0].kuantitas).toBe(15);
    expect(hasil.pergerakan).toHaveLength(1);
    invarian(hasil, DASAR);
  });

  it('stok masuk menambah kuantitas', () => {
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'pergerakan.dicatat',
      pergerakan: gerak({ tipe: 'masuk', jumlah: 40 }),
    });
    expect(hasil.produk[0].kuantitas).toBe(60);
    invarian(hasil, DASAR);
  });

  it('menolak keluar melebihi stok tanpa mengubah state', () => {
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'pergerakan.dicatat',
      pergerakan: gerak({ jumlah: 21 }),
    });
    expect(hasil).toBe(awal);
  });

  it('menolak jumlah nol atau negatif tanpa mengubah state', () => {
    expect(
      terapkanPeristiwa(awal, { jenis: 'pergerakan.dicatat', pergerakan: gerak({ jumlah: 0 }) }),
    ).toBe(awal);
    expect(
      terapkanPeristiwa(awal, { jenis: 'pergerakan.dicatat', pergerakan: gerak({ jumlah: -4 }) }),
    ).toBe(awal);
  });

  it('mengabaikan pergerakan untuk produk yang tidak ada', () => {
    const hasil = terapkanPeristiwa(awal, {
      jenis: 'pergerakan.dicatat',
      pergerakan: gerak({ produkId: 'hilang' }),
    });
    expect(hasil).toBe(awal);
  });

  it('menjaga invarian setelah rangkaian panjang dan menolak langkah tak valid', () => {
    let data: Gudang = { versi: VERSI_SKEMA, produk: [produk({ kuantitas: 60, stokMinimum: 10 })], pergerakan: [] };
    // 60 → 40 → 45 → 15 → 10 → 0 → 12
    const langkah: [('masuk' | 'keluar'), number][] = [
      ['keluar', 20], ['masuk', 5], ['keluar', 30], ['keluar', 5], ['keluar', 10], ['masuk', 12],
    ];
    langkah.forEach(([tipe, jumlah], i) => {
      data = terapkanPeristiwa(data, {
        jenis: 'pergerakan.dicatat',
        pergerakan: gerak({ id: `mv_${i}`, tipe, jumlah }),
      });
    });
    invarian(data, { prd_1: 60 });
    expect(data.produk[0].kuantitas).toBe(12);
    expect(data.pergerakan).toHaveLength(6);

    // Melewati stok yang tersedia harus ditolak, bukan membuat stok negatif.
    const ditolak = terapkanPeristiwa(data, {
      jenis: 'pergerakan.dicatat',
      pergerakan: gerak({ id: 'mv_x', jumlah: 13 }),
    });
    expect(ditolak).toBe(data);
  });
});

describe('pergerakan.dibatalkan', () => {
  it('mengembalikan stok dan menghapus catatan', () => {
    const denganGerak = terapkanPeristiwa(
      { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] },
      { jenis: 'pergerakan.dicatat', pergerakan: gerak({ jumlah: 5 }) },
    );
    expect(denganGerak.produk[0].kuantitas).toBe(15);
    const hasil = terapkanPeristiwa(denganGerak, {
      jenis: 'pergerakan.dibatalkan',
      pergerakanId: 'mv_1',
    });
    expect(hasil.produk[0].kuantitas).toBe(20);
    expect(hasil.pergerakan).toHaveLength(0);
  });
});

describe('gudang.diganti', () => {
  it('mengganti seluruh isi dan menormalkan versi skema', () => {
    const baru: Gudang = { versi: 7, produk: [produk()], pergerakan: [] };
    const hasil = terapkanPeristiwa(kosong(), { jenis: 'gudang.diganti', gudang: baru });
    expect(hasil.produk).toHaveLength(1);
    expect(hasil.versi).toBe(VERSI_SKEMA);
  });
});

/* ================================================================== */
/* Riwayat undo/redo                                                  */
/* ================================================================== */

describe('sejarah undo/redo', () => {
  it('dorongSejarah menambahkan langkah dan membuang rencana redo', () => {
    let sejarah = dorongSejarah(SEJARAH_AWAL, langkahDari('a', '1'));
    sejarah = dorongSejarah(sejarah, langkahDari('b', '2'));
    expect(sejarah.langkah).toHaveLength(2);
    sejarah = { langkah: sejarah.langkah, dapatDiulang: [langkahDari('c', '3')] };
    sejarah = dorongSejarah(sejarah, langkahDari('d', '4'));
    expect(sejarah.dapatDiulang).toHaveLength(0);
  });

  it('undo mengembalikan produk yang baru ditambahkan', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [], pergerakan: [] };
    const peristiwa = produkBaru({
      sku: 'MIN-001', nama: 'Air Mineral', kategori: 'Minuman', satuan: 'pack',
      biaya: 3800, stokMinimum: 10, kuantitasAwal: 30,
    });
    const setelahTambah = terapkanPeristiwa(awal, peristiwa);
    expect(setelahTambah.produk).toHaveLength(1);

    const langkah: Langkah = { peristiwa, label: 'Tambah barang', kunci: 'tambah', waktu: 0 };
    const sejarah = dorongSejarah(SEJARAH_AWAL, langkah);
    const hasil = undo(setelahTambah, sejarah);

    expect(hasil.status).toBe('ok');
    if (hasil.status === 'ok') {
      expect(hasil.gudang.produk).toHaveLength(0);
      expect(hasil.sejarah.langkah).toHaveLength(0);
      expect(hasil.sejarah.dapatDiulang).toHaveLength(1);
    }
  });

  it('undo membalik efek pergerakan stok', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
    const peristiwa = catatPergerakan({
      produkId: 'prd_1', tipe: 'keluar', jumlah: 5,
      tanggal: '2026-10-12', referensi: 'POS-1', catatan: '',
    });
    const sesudah = terapkanPeristiwa(awal, peristiwa);
    const langkah: Langkah = { peristiwa, label: 'Catat', kunci: 'catat', waktu: 0 };
    const hasil = undo(sesudah, dorongSejarah(SEJARAH_AWAL, langkah));
    if (hasil.status === 'ok') {
      expect(hasil.gudang.produk[0].kuantitas).toBe(20);
      expect(hasil.gudang.pergerakan).toHaveLength(0);
    }
  });

  it('redo menerapkan kembali langkah yang dibatalkan', () => {
    const awal: Gudang = { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [] };
    const peristiwa = catatPergerakan({
      produkId: 'prd_1', tipe: 'masuk', jumlah: 10,
      tanggal: '2026-10-12', referensi: 'PB-1', catatan: '',
    });
    const sesudah = terapkanPeristiwa(awal, peristiwa);
    const langkah: Langkah = { peristiwa, label: 'Catat', kunci: 'catat', waktu: 0 };
    const dibatalkan = undo(sesudah, dorongSejarah(SEJARAH_AWAL, langkah));
    if (dibatalkan.status !== 'ok') throw new Error('undo gagal');

    const diulang = redo(dibatalkan.gudang, dibatalkan.sejarah);
    expect(diulang.status).toBe('ok');
    if (diulang.status === 'ok') {
      expect(diulang.gudang.produk[0].kuantitas).toBe(30);
      expect(diulang.gudang.pergerakan).toHaveLength(1);
    }
  });

  it('undo/redo tanpa riwayat mengembalikan status tidak-ada', () => {
    const g = kosong();
    expect(undo(g, SEJARAH_AWAL).status).toBe('tidak-ada');
    expect(redo(g, SEJARAH_AWAL).status).toBe('tidak-ada');
  });
});
