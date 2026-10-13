import { describe, expect, it } from 'vitest';
import {
  adaGalat,
  analitik,
  buatId,
  formatTanggal,
  hapusGalat,
  gudangKosong,
  gudangValid,
  hariIni,
  hitungPerubahan,
  kuantitasDari,
  muatGudangAman,
  normalisasiSku,
  parseTanggal,
  produkPerluPerhatian,
  rekapBulan,
  ringkasan,
  saringPergerakan,
  saringProduk,
  selisihHari,
  skuBentrok,
  statusStok,
  terapkanPergerakan,
  tambahHari,
  uraiTanggal,
  usulkanReferensi,
  usulkanSku,
  validasiPergerakan,
  validasiProduk,
  nilaiPersediaan,
  normalisasiSatuan,
  normalisasiTipe,
  type MasukanPergerakan,
  type MasukanProduk,
} from '../aturan';
import type { Gudang, Pergerakan, Produk, TipePergerakan } from '../types';
import { VERSI_SKEMA } from '../types';

/* ------------------------------------------------------------------ */
/* Fixture                                                            */
/* ------------------------------------------------------------------ */

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

function gerak(
  produkId: string,
  tipe: TipePergerakan,
  jumlah: number,
  tanggal: string,
  partial: Partial<Pergerakan> = {},
): Pergerakan {
  return {
    id: buatId('mv'),
    produkId,
    tipe,
    jumlah,
    tanggal,
    referensi: '',
    catatan: '',
    dibuatPada: `${tanggal}T08:00:00.000Z`,
    ...partial,
  };
}

function gudang(partial: Partial<Gudang> = {}): Gudang {
  return { versi: VERSI_SKEMA, produk: [produk()], pergerakan: [], ...partial };
}

/* ================================================================== */
/* SKU                                                                */
/* ================================================================== */

describe('normalisasi SKU', () => {
  it('memangkas spasi dan menormalkan huruf besar', () => {
    expect(normalisasiSku('  min-001  ')).toBe('MIN-001');
    expect(normalisasiSku('min   001')).toBe('MIN 001');
  });

  it('menyatakan bentrok tanpa memeka huruf besar', () => {
    expect(skuBentrok([produk({ sku: 'min-001' })], '  MIN-001 ')).toBe(true);
  });

  it('mengabaikan produk yang sedang diedit', () => {
    expect(skuBentrok([produk({ id: 'prd_1' })], 'MIN-001', 'prd_1')).toBe(false);
  });

  it('SKU kosong tidak dianggap bentrok', () => {
    expect(skuBentrok([produk()], '  ')).toBe(false);
  });

  it('SKU berbeda dianggap unik', () => {
    expect(skuBentrok([produk({ sku: 'MIN-002' })], 'min-001')).toBe(false);
  });
});

describe('usulkan SKU otomatis', () => {
  it('meneruskan penomoran dari awalan yang sudah dipakai', () => {
    const daftar = [
      produk({ id: 'a', sku: 'MIN-001', kategori: 'Minuman' }),
      produk({ id: 'b', sku: 'MIN-002', kategori: 'Minuman' }),
    ];
    expect(usulkanSku(daftar, 'Minuman')).toBe('MIN-003');
  });

  it('memakai awalan tiga huruf bila belum ada pola', () => {
    expect(usulkanSku([], 'Sambako')).toBe('SAM-001');
  });

  it('membuang karakter bukan alfanumerik dari awalan', () => {
    expect(usulkanSku([], 'Perawatan Diri')).toBe('PER-001');
  });

  it('memilih awalan terpanjang yang tersedia', () => {
    const daftar = [produk({ sku: 'SNK-001', kategori: 'Snack' })];
    expect(usulkanSku(daftar, 'Snack')).toBe('SNK-002');
  });

  it('tidak bentrok dengan SKU di luar kategori', () => {
    const daftar = [produk({ id: 'a', sku: 'MIN-009', kategori: 'Minuman' })];
    expect(usulkanSku(daftar, 'Minuman')).toBe('MIN-010');
  });
});

/* ================================================================== */
/* Tanggal                                                            */
/* ================================================================== */

describe('tanggal', () => {
  it('menerima tanggal kalender yang valid', () => {
    expect(uraiTanggal('2026-02-28')).not.toBeNull();
    expect(uraiTanggal('2024-02-29')).not.toBeNull();
  });

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(uraiTanggal('2026-02-30')).toBeNull();
    expect(uraiTanggal('2023-02-29')).toBeNull();
  });

  it('menolak format lain', () => {
    expect(uraiTanggal('28/02/2026')).toBeNull();
    expect(uraiTanggal('')).toBeNull();
  });

  it('formatTanggal memakai padding nol', () => {
    expect(formatTanggal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(hariIni(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('tambahHari melewati batas bulan dengan benar', () => {
    expect(formatTanggal(tambahHari(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });

  it('selisihHari menghitung selisih kalender', () => {
    expect(selisihHari(new Date(2026, 0, 10), new Date(2026, 0, 1))).toBe(9);
    expect(selisihHari(new Date(2026, 0, 1), new Date(2026, 0, 10))).toBe(-9);
  });
});

/* ================================================================== */
/* Aturan inti kuantitas                                              */
/* ================================================================== */

describe('terapkanPergerakan: stok baru = stok lama + masuk - keluar', () => {
  it('menambah saat masuk', () => {
    expect(terapkanPergerakan(20, 'masuk', 15)).toEqual({ ok: true, kuantitas: 35 });
  });

  it('mengurangi saat keluar', () => {
    expect(terapkanPergerakan(20, 'keluar', 15)).toEqual({ ok: true, kuantitas: 5 });
  });

  it('mengizinkan keluar tepat sama dengan stok (sisa nol)', () => {
    expect(terapkanPergerakan(20, 'keluar', 20)).toEqual({ ok: true, kuantitas: 0 });
  });

  it('menolak keluar melebihi stok tersedia', () => {
    const hasil = terapkanPergerakan(20, 'keluar', 21);
    expect(hasil.ok).toBe(false);
    expect(hasil.ok === false && hasil.alasan).toContain('Stok tidak cukup');
  });

  it('menolak jumlah nol, negatif, dan pecahan', () => {
    expect(terapkanPergerakan(20, 'masuk', 0).ok).toBe(false);
    expect(terapkanPergerakan(20, 'masuk', -5).ok).toBe(false);
    expect(terapkanPergerakan(20, 'masuk', 1.5).ok).toBe(false);
  });

  it('hasil rangkaian sama dengan penjumlahan riwayat', () => {
    const riwayat = [
      gerak('prd_1', 'masuk', 100, '2026-01-10'),
      gerak('prd_1', 'keluar', 30, '2026-01-11'),
      gerak('prd_1', 'keluar', 45, '2026-01-12'),
      gerak('prd_1', 'masuk', 10, '2026-01-13'),
    ];
    let stok = 0;
    for (const m of riwayat) {
      const hasil = terapkanPergerakan(stok, m.tipe, m.jumlah);
      expect(hasil.ok).toBe(true);
      if (hasil.ok) stok = hasil.kuantitas;
    }
    expect(stok).toBe(35);
    expect(kuantitasDari(0, riwayat)).toBe(35);
  });
});

describe('status stok rendah', () => {
  it('habis saat kuantitas nol atau negatif', () => {
    expect(statusStok(produk({ kuantitas: 0 }))).toBe('habis');
    expect(statusStok(produk({ kuantitas: -3 }))).toBe('habis');
  });

  it('rendah saat menyentuh batas minimum', () => {
    expect(statusStok(produk({ kuantitas: 12, stokMinimum: 12 }))).toBe('rendah');
    expect(statusStok(produk({ kuantitas: 11, stokMinimum: 12 }))).toBe('rendah');
  });

  it('aman hanya bila di atas batas minimum', () => {
    expect(statusStok(produk({ kuantitas: 13, stokMinimum: 12 }))).toBe('aman');
  });

  it('produkPerluPerhatian diurutkan dari yang paling kritis', () => {
    const daftar = [
      produk({ id: 'a', nama: 'Aman', kuantitas: 50, stokMinimum: 10 }),
      produk({ id: 'b', nama: 'Habis', kuantitas: 0, stokMinimum: 10 }),
      produk({ id: 'c', nama: 'Rendah', kuantitas: 3, stokMinimum: 10 }),
    ];
    expect(produkPerluPerhatian(daftar).map((p) => p.id)).toEqual(['b', 'c']);
  });
});

describe('nilai persediaan indikatif', () => {
  it('hanya menghitung barang berbiaya', () => {
    const hasil = nilaiPersediaan([
      produk({ id: 'a', kuantitas: 10, biaya: 1500 }),
      produk({ id: 'b', kuantitas: 4, biaya: null }),
    ]);
    expect(hasil.total).toBe(15000);
    expect(hasil.barangDinilai).toBe(1);
    expect(hasil.barangTanpaBiaya).toBe(1);
  });
});

/* ================================================================== */
/* Rekap & analitik                                                   */
/* ================================================================== */

describe('rekap bulanan', () => {
  const pergerakan = [
    gerak('prd_1', 'masuk', 10, '2026-10-01'),
    gerak('prd_1', 'keluar', 3, '2026-10-12'),
    gerak('prd_1', 'keluar', 4, '2026-10-31'),
    gerak('prd_1', 'masuk', 99, '2026-09-30'),
    gerak('prd_1', 'keluar', 88, '2026-11-01'),
  ];

  it('hanya menghitung bulan acuan', () => {
    expect(rekapBulan(pergerakan, new Date(2026, 9, 12))).toEqual({
      masuk: 10,
      keluar: 7,
      catatan: 3,
    });
  });

  it('sebulan penuh menghitung seluruh hari bulan itu', () => {
    expect(rekapBulan(pergerakan, new Date(2026, 9, 20)).keluar).toBe(7);
  });

  it('ringkasan memakai bulan berjalan dan bulan sebelumnya', () => {
    const hasil = ringkasan(gudang({ pergerakan }), new Date(2026, 9, 12));
    expect(hasil.bulanIni).toEqual({ masuk: 10, keluar: 7, catatan: 3 });
    expect(hasil.bulanLalu).toEqual({ masuk: 99, keluar: 0, catatan: 1 });
  });

  it('menghitung total unit dan jumlah perlu restock', () => {
    const hasil = ringkasan(
      gudang({
        produk: [
          produk({ id: 'a', kuantitas: 20, stokMinimum: 10 }),
          produk({ id: 'b', kuantitas: 0, stokMinimum: 5 }),
          produk({ id: 'c', kuantitas: 4, stokMinimum: 5 }),
        ],
      }),
      new Date(2026, 9, 12),
    );
    expect(hasil.totalUnit).toBe(24);
    expect(hasil.stokHabis).toBe(1);
    expect(hasil.perluRestock).toBe(2);
  });
});

describe('analitik dan saran pemesanan', () => {
  const sekarang = new Date(2026, 9, 12);

  it('menghitung laju keluar dari jendela 30 hari', () => {
    const riwayat = [
      gerak('prd_1', 'keluar', 30, '2026-09-25'),
      gerak('prd_1', 'keluar', 30, '2026-10-05'),
    ];
    const hasil = analitik([produk({ kuantitas: 10 })], riwayat, { sekarang });
    expect(hasil[0].lajuKeluar).toBeCloseTo(2, 5);
    expect(hasil[0].hariMenipis).toBe(5);
  });

  it('mengabaikan pergerakan di luar jendela analisis', () => {
    const riwayat = [gerak('prd_1', 'keluar', 500, '2026-01-05')];
    const hasil = analitik([produk()], riwayat, { sekarang });
    expect(hasil[0].lajuKeluar).toBe(0);
    expect(hasil[0].hariMenipis).toBeNull();
  });

  it('memberi saran pesan hanya bila kurang dari target ke depan', () => {
    const riwayat = [gerak('prd_1', 'keluar', 30, '2026-10-05')]; // 1/hari
    const hasil = analitik([produk({ kuantitas: 5, stokMinimum: 5, satuan: 'pcs' })], riwayat, {
      sekarang,
      jendelaHari: 30,
      targetHari: 30,
    });
    // Kebutuhan 30, tersedia 5, kekurangan 25 → pack dibulatkan ke 25.
    expect(hasil[0].saranPesan).toBe(25 as number);
  });

  it('saran pesan nol bila stok sudah cukup', () => {
    const riwayat = [gerak('prd_1', 'keluar', 30, '2026-10-05')];
    const hasil = analitik([produk({ kuantitas: 100, satuan: 'pcs' })], riwayat, {
      sekarang,
      jendelaHari: 30,
      targetHari: 30,
    });
    expect(hasil[0].saranPesan ?? -1).toBe(0);
  });

  it('membulatkan pack ke kelipatan lima', () => {
    const riwayat = [gerak('prd_1', 'keluar', 30, '2026-10-05')];
    const hasil = analitik([produk({ kuantitas: 0, satuan: 'pack' })], riwayat, {
      sekarang,
      jendelaHari: 30,
      targetHari: 30,
    });
    expect((hasil[0].saranPesan ?? 0) % 5).toBe(0);
    expect(hasil[0].saranPesan ?? 0).toBeGreaterThanOrEqual(30);
  });

  it('menandai barang yang tidak bergerak sebagai diam', () => {
    const hasil = analitik([produk()], [], { sekarang });
    expect(hasil[0].motionless).toBe(true);
  });

  it('menandai barang lambat bila stok lebih dari 180 hari', () => {
    const riwayat = [gerak('prd_1', 'keluar', 30, '2026-10-05')]; // 1/hari
    const hasil = analitik([produk({ kuantitas: 1000 })], riwayat, { sekarang, jendelaHari: 30 });
    expect(hasil[0].lambat).toBe(true);
  });
});

describe('perubahan persentase', () => {
  it('menghitung kenaikan dan penurunan', () => {
    expect(hitungPerubahan(120, 100)).toBe(20);
    expect(hitungPerubahan(80, 100)).toBe(-20);
  });

  it('null bila pembanding nol', () => {
    expect(hitungPerubahan(10, 0)).toBeNull();
  });
});

/* ================================================================== */
/* Pencarian & penyaringan                                             */
/* ================================================================== */

describe('saring produk', () => {
  const daftar = [
    produk({ id: 'a', sku: 'MIN-001', nama: 'Air Mineral', kategori: 'Minuman', kuantitas: 20, stokMinimum: 10 }),
    produk({ id: 'b', sku: 'SNK-002', nama: 'Biskuit Marie', kategori: 'Snack', kuantitas: 2, stokMinimum: 10 }),
  ];

  it('pencarian cocok dengan nama, SKU, dan kategori', () => {
    expect(saringProduk(daftar, { kueri: 'mineral' }).map((p) => p.id)).toEqual(['a']);
    expect(saringProduk(daftar, { kueri: 'snk-002' }).map((p) => p.id)).toEqual(['b']);
    expect(saringProduk(daftar, { kueri: 'snack' }).map((p) => p.id)).toEqual(['b']);
    expect(saringProduk(daftar, { kueri: 'tidak ada' })).toEqual([]);
  });

  it('pencarian kosong mengembalikan seluruh daftar', () => {
    expect(saringProduk(daftar, { kueri: '  ' })).toHaveLength(2);
  });

  it('filter kategori dan status bekerja', () => {
    expect(saringProduk(daftar, { kategori: 'Snack' }).map((p) => p.id)).toEqual(['b']);
    expect(saringProduk(daftar, { status: 'rendah' }).map((p) => p.id)).toEqual(['b']);
    expect(saringProduk(daftar, { status: 'semua' })).toHaveLength(2);
  });

  it('mengurutkan nama, stok, dan nilai sesuai arah', () => {
    expect(saringProduk(daftar, { urut: 'nama' }).map((p) => p.id)).toEqual(['a', 'b']);
    expect(saringProduk(daftar, { urut: 'stok', naik: false }).map((p) => p.id)).toEqual(['a', 'b']);
    const byNilai = saringProduk(
      [
        produk({ id: 'x', nama: 'X', biaya: 1, kuantitas: 1 }),
        produk({ id: 'y', nama: 'Y', biaya: 100, kuantitas: 1 }),
      ],
      { urut: 'nilai' },
    );
    expect(byNilai.map((p) => p.id)).toEqual(['x', 'y']);
  });

  it('barang tanpa biaya tidak masuk nilai (diurutkan terakhir)', () => {
    const urut = saringProduk(
      [
        produk({ id: 'x', nama: 'X', biaya: null, kuantitas: 5 }),
        produk({ id: 'y', nama: 'Y', biaya: 10, kuantitas: 1 }),
      ],
      { urut: 'nilai' },
    );
    // Tanpa biaya bernilai -1 sehingga berada di urutan akhir.
    expect(urut.map((p) => p.id)).toEqual(['x', 'y']);
  });
});

describe('saring pergerakan', () => {
  const daftar = [
    gerak('a', 'masuk', 10, '2026-10-01', { referensi: 'PB-1', catatan: 'Restock' }),
    gerak('b', 'keluar', 5, '2026-09-20', { referensi: 'POS-9', catatan: 'Kasir' }),
  ];
  const produkList = [
    produk({ id: 'a', sku: 'MIN-001', nama: 'Air Mineral' }),
    produk({ id: 'b', sku: 'SNK-002', nama: 'Biskuit Marie' }),
  ];

  it('filter tipe membatasi hasil', () => {
    expect(saringPergerakan(daftar, produkList, { tipe: 'masuk' })).toHaveLength(1);
  });

  it('filter tanggal inklusif di kedua ujung', () => {
    expect(
      saringPergerakan(daftar, produkList, { dari: '2026-09-20', sampai: '2026-10-01' }),
    ).toHaveLength(2);
  });

  it('pencarian menelusuri referensi dan catatan', () => {
    expect(saringPergerakan(daftar, produkList, { kueri: 'pb-1' })).toHaveLength(1);
    expect(saringPergerakan(daftar, produkList, { kueri: 'kasir' })).toHaveLength(1);
    expect(saringPergerakan(daftar, produkList, { kueri: 'air mineral' })).toHaveLength(1);
  });

  it('mengurutkan terbaru lebih dulu', () => {
    const urut = saringPergerakan(daftar, produkList, {});
    expect(urut[0].tanggal).toBe('2026-10-01');
  });
});

/* ================================================================== */
/* Validasi                                                           */
/* ================================================================== */

describe('validasi produk', () => {
  const dasar: MasukanProduk = {
    sku: 'MIN-009',
    nama: 'Susu UHT',
    kategori: 'Minuman',
    satuan: 'pcs',
    biaya: 5000,
    stokMinimum: 10,
    kuantitasAwal: 20,
  };

  it('menerima masukan yang benar', () => {
    expect(validasiProduk(dasar, [produk()])).toEqual({});
  });

  it('menolak SKU kosong, pendek, dan duplikat', () => {
    expect(validasiProduk({ ...dasar, sku: '' }, []).sku).toBeTruthy();
    expect(validasiProduk({ ...dasar, sku: 'AB' }, []).sku).toBeTruthy();
    expect(validasiProduk({ ...dasar, sku: ' min-001 ' }, [produk()]).sku).toContain('sudah dipakai');
  });

  it('menolak nama dan kategori kosong', () => {
    expect(validasiProduk({ ...dasar, nama: '  ' }, []).nama).toBeTruthy();
    expect(validasiProduk({ ...dasar, kategori: '' }, []).kategori).toBeTruthy();
  });

  it('menolak angka negatif atau pecahan', () => {
    expect(validasiProduk({ ...dasar, stokMinimum: -1 }, []).stokMinimum).toBeTruthy();
    expect(validasiProduk({ ...dasar, kuantitasAwal: 1.5 }, []).kuantitasAwal).toBeTruthy();
    expect(validasiProduk({ ...dasar, biaya: -100 }, []).biaya).toBeTruthy();
  });

  it('biaya null diizinkan (opsional)', () => {
    expect(validasiProduk({ ...dasar, biaya: null }, []).biaya).toBeUndefined();
  });
});

describe('validasi pergerakan', () => {
  const daftar = [produk({ id: 'a', kuantitas: 10, satuan: 'pack' })];
  const dasar: MasukanPergerakan = {
    produkId: 'a',
    tipe: 'keluar',
    jumlah: 5,
    tanggal: '2026-10-12',
    referensi: '',
    catatan: '',
  };

  it('menerima masukan yang benar', () => {
    expect(validasiPergerakan(dasar, daftar)).toEqual({});
  });

  it('menolak barang tidak terdaftar dan tanggal tidak valid', () => {
    expect(validasiPergerakan({ ...dasar, produkId: 'zzz' }, daftar).produkId).toBeTruthy();
    expect(validasiPergerakan({ ...dasar, tanggal: '2026-02-31' }, daftar).tanggal).toBeTruthy();
  });

  it('menolak jumlah nol, negatif, dan melebihi stok keluar', () => {
    expect(validasiPergerakan({ ...dasar, jumlah: 0 }, daftar).jumlah).toBeTruthy();
    expect(validasiPergerakan({ ...dasar, jumlah: -3 }, daftar).jumlah).toBeTruthy();
    expect(validasiPergerakan({ ...dasar, jumlah: 11 }, daftar).jumlah).toContain('10');
  });

  it('stok masuk boleh melebihi stok tersedia', () => {
    expect(validasiPergerakan({ ...dasar, tipe: 'masuk', jumlah: 999 }, daftar).jumlah).toBeUndefined();
  });
});

describe('pembersihan peta galat', () => {
  it('adaGalat mendeteksi pesan tersisa', () => {
    expect(adaGalat({})).toBe(false);
    expect(adaGalat({ sku: undefined })).toBe(false);
    expect(adaGalat({ sku: 'SKU wajib diisi.' })).toBe(true);
  });

  it('hapusGalat menghapus kunci sepenuhnya, bukan hanya mengosongkan (regresi)', () => {
    let galat = validasiProduk(
      { sku: '', nama: '', kategori: '', satuan: 'pcs', biaya: null, stokMinimum: 0, kuantitasAwal: 0 },
      [],
    );
    expect(adaGalat(galat)).toBe(true);
    galat = hapusGalat(galat, 'sku');
    galat = hapusGalat(galat, 'nama');
    galat = hapusGalat(galat, 'kategori');
    expect(adaGalat(galat)).toBe(false);
  });

  it('hapusGalat tidak mengubah objek asal dan mengulang kunci yang sama', () => {
    const asli = { sku: 'galat' };
    hapusGalat(asli, 'sku');
    expect(asli.sku).toBe('galat');
    expect(hapusGalat(asli, 'kategori')).toBe(asli);
  });
});

/* ================================================================== */
/* Referensi                                                          */
/* ================================================================== */

describe('usulkanReferensi', () => {
  it('meneruskan nomor dari referensi yang ada', () => {
    const riwayat = [
      gerak('a', 'masuk', 1, '2026-10-01', { referensi: 'PB-2444' }),
      gerak('a', 'masuk', 1, '2026-10-02', { referensi: 'PB-2445' }),
    ];
    expect(usulkanReferensi(riwayat, 'PB')).toBe('PB-2446');
  });

  it('memulai dari PB-0001 bila belum ada', () => {
    expect(usulkanReferensi([], 'POS')).toBe('POS-0001');
  });

  it('mengabaikan referensi dengan awalan berbeda', () => {
    const riwayat = [gerak('a', 'masuk', 1, '2026-10-01', { referensi: 'POS-9000' })];
    expect(usulkanReferensi(riwayat, 'PB')).toBe('PB-0001');
  });
});

/* ================================================================== */
/* Skema & impor                                                      */
/* ================================================================== */

describe('validasi gudang (JSON tidak dipercaya)', () => {
  const valid = gudang({ pergerakan: [gerak('prd_1', 'masuk', 5, '2026-10-01')] });

  it('menerima data yang valid', () => {
    expect(gudangValid(valid)).toBe(true);
  });

  it('menolak objek bukan gudang', () => {
    expect(gudangValid(null)).toBe(false);
    expect(gudangValid({})).toBe(false);
    expect(gudangValid({ versi: 1, produk: {}, pergerakan: [] })).toBe(false);
    expect(gudangValid({ versi: 1, produk: [], pergerakan: 'x' })).toBe(false);
  });

  it('menolak produk dengan field tidak valid', () => {
    expect(gudangValid({ ...valid, produk: [{ ...produk(), sku: '' }] })).toBe(false);
    expect(gudangValid({ ...valid, produk: [{ ...produk(), satuan: 'ton' }] })).toBe(false);
    expect(gudangValid({ ...valid, produk: [{ ...produk(), kuantitas: -1 }] })).toBe(false);
    expect(gudangValid({ ...valid, produk: [{ ...produk(), biaya: -5 }] })).toBe(false);
  });

  it('menolak pergerakan dengan jumlah, tipe, atau tanggal tidak valid', () => {
    expect(gudangValid({ ...valid, pergerakan: [gerak('prd_1', 'masuk', 0, '2026-10-01')] })).toBe(false);
    expect(gudangValid({ ...valid, pergerakan: [gerak('prd_1', 'masuk', 5, '2026-13-01')] })).toBe(false);
    const tipeRusak = { ...gerak('prd_1', 'masuk', 5, '2026-10-01'), tipe: 'rusak' };
    expect(gudangValid({ ...valid, pergerakan: [tipeRusak] })).toBe(false);
  });

  it('menolak pergerakan yang menunjuk produk tidak ada', () => {
    expect(gudangValid({ ...valid, pergerakan: [gerak('hilang', 'masuk', 5, '2026-10-01')] })).toBe(false);
  });

  it('muatGudangAman membuang BOM dan mengembalikan null untuk JSON rusak', () => {
    expect(muatGudangAman('{rusak')).toBeNull();
    expect(muatGudangAman('null')).toBeNull();
    const denganBom = `\uFEFF${JSON.stringify(valid)}`;
    expect(muatGudangAman(denganBom)).not.toBeNull();
  });

  it('gudang kosong valid sebagai titik awal aplikasi kosong', () => {
    expect(gudangValid(gudangKosong())).toBe(true);
  });

  it('normalisasi satuan dan tipe', () => {
    expect(normalisasiSatuan('PCS')).toBe('pcs');
    expect(normalisasiSatuan('ton')).toBeNull();
    expect(normalisasiTipe('MASUK')).toBe('masuk');
    expect(normalisasiTipe('rusak')).toBeNull();
  });
});

/* ================================================================== */
/* Alias yang dipakai form                                            */
/* ================================================================== */

describe('alias', () => {
  it('parseTanggal tetap tersedia sebagai alias uraiTanggal', () => {
    expect(parseTanggal('2026-01-05')).not.toBeNull();
  });
});
