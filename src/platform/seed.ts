/**
 * Data demo StockAlert — warung Convenience "Toko Sari Rasa" di Kendari.
 *
 * Seluruh histori dibuat relatif terhadap hari ini sehingga ringkasan
 * "bulan ini" selalu terisi, apa pun tanggal aplikasi dibuka.
 */

import type { Gudang, Pergerakan, Produk, Satuan, TipePergerakan } from '../domain/types';
import { formatTanggal, tambahHari, uraiTanggal } from '../domain/aturan';
import { VERSI_SKEMA } from '../domain/types';

/** [hari ke belakang, tipe, jumlah, referensi, catatan] */
type Riwayat = [number, TipePergerakan, number, string, string];

interface Cetakan {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  satuan: Satuan;
  biaya: number | null;
  stokMinimum: number;
  stokAwal: number;
  awalHari: number;
  riwayat: Riwayat[];
}

const CETAKAN: Cetakan[] = [
  {
    id: 'prd_min001',
    sku: 'MIN-001',
    nama: 'Air Mineral Botol 600 ml',
    kategori: 'Minuman',
    satuan: 'pack',
    biaya: 3800,
    stokMinimum: 24,
    stokAwal: 96,
    awalHari: 56,
    riwayat: [
      [38, 'masuk', 72, 'PB-2418', 'Pengiriman dari Agen Tirta Jaya'],
      [22, 'masuk', 60, 'PB-2431', 'Pesanan ulang, barang cepat habis'],
      [9, 'masuk', 48, 'PB-2442', 'Restock mingguan'],
      [44, 'keluar', 36, 'POS-8821', 'Penjualan kasir'],
      [37, 'keluar', 42, 'POS-8846', 'Penjualan akhir pekan'],
      [30, 'keluar', 40, 'POS-8903', 'Penjualan kasir'],
      [23, 'keluar', 38, 'POS-8944', 'Penjualan kasir'],
      [16, 'keluar', 30, 'POS-8977', 'Pembelian warung sebelah'],
      [10, 'keluar', 24, 'POS-8985', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_min002',
    sku: 'MIN-002',
    nama: 'Kopi Susu Sachet 30 g',
    kategori: 'Minuman',
    satuan: 'pcs',
    biaya: 1800,
    stokMinimum: 60,
    stokAwal: 120,
    awalHari: 52,
    riwayat: [
      [25, 'masuk', 40, 'PB-2427', 'Pengiriman distributor'],
      [41, 'keluar', 26, 'POS-8809', 'Penjualan kasir'],
      [33, 'keluar', 22, 'POS-8836', 'Penjualan pelanggan langganan'],
      [26, 'keluar', 19, 'POS-8858', 'Penjualan kasir'],
      [18, 'keluar', 15, 'POS-8884', 'Penjualan kasir'],
      [11, 'keluar', 12, 'POS-8919', 'Penjualan melonjak'],
      [6, 'keluar', 10, 'POS-8945', 'Penjualan kasir'],
      [3, 'keluar', 8, 'POS-8972', 'Penjualan kasir'],
      [1, 'keluar', 10, 'POS-8990', 'Pesanan warung kopi'],
    ],
  },
  {
    id: 'prd_min003',
    sku: 'MIN-003',
    nama: 'Teh Kotak Jasmine 250 ml',
    kategori: 'Minuman',
    satuan: 'pcs',
    biaya: 3500,
    stokMinimum: 36,
    stokAwal: 60,
    awalHari: 49,
    riwayat: [
      [21, 'masuk', 36, 'PB-2434', 'Pengiriman mingguan'],
      [42, 'keluar', 14, 'POS-8811', 'Penjualan kasir'],
      [35, 'keluar', 12, 'POS-8848', 'Penjualan kasir'],
      [28, 'keluar', 11, 'POS-8872', 'Penjualan kasir'],
      [20, 'keluar', 9, 'POS-8898', 'Penjualan acara sekolah'],
      [12, 'keluar', 8, 'POS-8925', 'Penjualan kasir'],
      [7, 'keluar', 7, 'POS-8954', 'Penjualan kasir'],
      [2, 'keluar', 5, 'POS-8981', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_min004',
    sku: 'MIN-004',
    nama: 'Susu UHT Full Cream 1 L',
    kategori: 'Minuman',
    satuan: 'pcs',
    biaya: 18500,
    stokMinimum: 12,
    stokAwal: 24,
    awalHari: 37,
    riwayat: [
      [20, 'masuk', 12, 'PB-2439', 'Restock susu'],
      [31, 'keluar', 8, 'POS-8835', 'Penjualan kasir'],
      [24, 'keluar', 7, 'POS-8867', 'Penjualan kasir'],
      [17, 'keluar', 5, 'POS-8889', 'Penjualan kasir'],
      [9, 'keluar', 4, 'POS-8923', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_snk001',
    sku: 'SNK-001',
    nama: 'Keripik Singkong Pedas 60 g',
    kategori: 'Snack',
    satuan: 'pack',
    biaya: 6500,
    stokMinimum: 20,
    stokAwal: 48,
    awalHari: 47,
    riwayat: [
      [34, 'masuk', 36, 'PB-2436', 'Pesanan UMKM Klaten'],
      [12, 'masuk', 12, 'PB-2440', 'Tambahan stok'],
      [40, 'keluar', 15, 'POS-8805', 'Penjualan kasir'],
      [31, 'keluar', 12, 'POS-8833', 'Penjualan kasir'],
      [24, 'keluar', 10, 'POS-8860', 'Penjualan kasir'],
      [17, 'keluar', 8, 'POS-8881', 'Penjualan kasir'],
      [9, 'keluar', 7, 'POS-8914', 'Penjualan kasir'],
      [4, 'keluar', 6, 'POS-8964', 'Penjualan libur akhir pekan'],
      [1, 'keluar', 5, 'POS-8991', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_snk002',
    sku: 'SNK-002',
    nama: 'Biskuit Marie Regal 145 g',
    kategori: 'Snack',
    satuan: 'pack',
    biaya: 8200,
    stokMinimum: 15,
    stokAwal: 40,
    awalHari: 45,
    riwayat: [
      [28, 'masuk', 24, 'PB-2429', 'Restock bulanan'],
      [39, 'keluar', 8, 'POS-8802', 'Penjualan kasir'],
      [27, 'keluar', 7, 'POS-8829', 'Penjualan kasir'],
      [15, 'keluar', 6, 'POS-8877', 'Penjualan kasir'],
      [8, 'keluar', 5, 'POS-8907', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_snk003',
    sku: 'SNK-003',
    nama: 'Wafer Tango Cokelat 34 g',
    kategori: 'Snack',
    satuan: 'pcs',
    biaya: 4200,
    stokMinimum: 40,
    stokAwal: 96,
    awalHari: 44,
    riwayat: [
      [19, 'masuk', 48, 'PB-2435', 'Pengiriman snik'],
      [43, 'keluar', 30, 'POS-8815', 'Penjualan anak sekolah'],
      [36, 'keluar', 26, 'POS-8849', 'Penjualan anak sekolah'],
      [29, 'keluar', 21, 'POS-8879', 'Penjualan kasir'],
      [22, 'keluar', 16, 'POS-8891', 'Penjualan kasir'],
      [14, 'keluar', 11, 'POS-8932', 'Penjualan kasir'],
      [8, 'keluar', 7, 'POS-8921', 'Penjualan kasir'],
      [2, 'keluar', 5, 'POS-8984', 'Penjualan kasir'],
      [1, 'keluar', 3, 'POS-8992', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_smb001',
    sku: 'SMB-001',
    nama: 'Beras Pandan Wangi 5 kg',
    kategori: 'Sembako',
    satuan: 'pcs',
    biaya: 68500,
    stokMinimum: 12,
    stokAwal: 30,
    awalHari: 50,
    riwayat: [
      [33, 'masuk', 20, 'PB-2417', 'Pengiriman gabah'],
      [45, 'keluar', 6, 'POS-8813', 'Penjualan pelanggan langganan'],
      [38, 'keluar', 5, 'POS-8851', 'Penjualan kasir'],
      [30, 'keluar', 4, 'POS-8888', 'Penjualan warung makan'],
      [22, 'keluar', 3, 'POS-8894', 'Penjualan kasir'],
      [15, 'keluar', 2, 'POS-8938', 'Penjualan kasir'],
      [7, 'keluar', 2, 'POS-8956', 'Pesanan pelanggan'],
      [2, 'keluar', 1, 'POS-8979', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_smb002',
    sku: 'SMB-002',
    nama: 'Minyak Goreng Bimoli 2 L',
    kategori: 'Sembako',
    satuan: 'pcs',
    biaya: 34500,
    stokMinimum: 18,
    stokAwal: 48,
    awalHari: 48,
    riwayat: [
      [31, 'masuk', 24, 'PB-2425', 'Pengiriman distributor'],
      [44, 'keluar', 9, 'POS-8817', 'Penjualan kasir'],
      [36, 'keluar', 7, 'POS-8850', 'Penjualan warung makan'],
      [28, 'keluar', 6, 'POS-8882', 'Penjualan kasir'],
      [19, 'keluar', 5, 'POS-8893', 'Penjualan kasir'],
      [11, 'keluar', 4, 'POS-8927', 'Penjualan kasir'],
      [5, 'keluar', 3, 'POS-8948', 'Penjualan kasir'],
      [1, 'keluar', 2, 'POS-8988', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_smb003',
    sku: 'SMB-003',
    nama: 'Gula Pasir Gulaku 1 kg',
    kategori: 'Sembako',
    satuan: 'pcs',
    biaya: 16000,
    stokMinimum: 20,
    stokAwal: 48,
    awalHari: 49,
    riwayat: [
      [30, 'masuk', 30, 'PB-2423', 'Pengiriman'],
      [41, 'keluar', 10, 'POS-8810', 'Penjualan kasir'],
      [34, 'keluar', 8, 'POS-8842', 'Penjualan kasir'],
      [26, 'keluar', 7, 'POS-8866', 'Penjualan kasir'],
      [18, 'keluar', 6, 'POS-8885', 'Penjualan kasir'],
      [10, 'keluar', 4, 'POS-8916', 'Penjualan kasir'],
      [3, 'keluar', 3, 'POS-8969', 'Penjualan kasir'],
      [1, 'keluar', 3, 'POS-8989', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_smb004',
    sku: 'SMB-004',
    nama: 'Telur Ayam Negeri 1 kg',
    kategori: 'Sembako',
    satuan: 'kg',
    biaya: 27500,
    stokMinimum: 15,
    stokAwal: 45,
    awalHari: 43,
    riwayat: [
      [29, 'masuk', 30, 'PB-2428', 'Peternakan di luar kota'],
      [40, 'keluar', 9, 'POS-8806', 'Penjualan kasir'],
      [32, 'keluar', 8, 'POS-8837', 'Pesanan warung'],
      [25, 'keluar', 6, 'POS-8863', 'Penjualan kasir'],
      [17, 'keluar', 5, 'POS-8878', 'Penjualan kasir'],
      [9, 'keluar', 4, 'POS-8912', 'Penjualan kasir'],
      [2, 'keluar', 3, 'POS-8980', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_prw001',
    sku: 'PRW-001',
    nama: 'Sabun Lifebuoy Batang 110 g',
    kategori: 'Perawatan Diri',
    satuan: 'pcs',
    biaya: 5200,
    stokMinimum: 36,
    stokAwal: 84,
    awalHari: 42,
    riwayat: [
      [27, 'masuk', 48, 'PB-2430', 'Pengiriman distributor'],
      [39, 'keluar', 20, 'POS-8803', 'Penjualan kasir'],
      [31, 'keluar', 16, 'POS-8835', 'Penjualan kasir'],
      [22, 'keluar', 12, 'POS-8890', 'Penjualan kasir'],
      [14, 'keluar', 10, 'POS-8930', 'Penjualan kasir'],
      [8, 'keluar', 8, 'POS-8918', 'Penjualan kasir'],
      [2, 'keluar', 6, 'POS-8976', 'Penjualan kasir'],
      [1, 'keluar', 5, 'POS-8993', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_prw002',
    sku: 'PRW-002',
    nama: 'Shampo Sachet Sunsilk 12 ml',
    kategori: 'Perawatan Diri',
    satuan: 'pcs',
    biaya: 1300,
    stokMinimum: 100,
    stokAwal: 240,
    awalHari: 46,
    riwayat: [
      [43, 'keluar', 34, 'POS-8814', 'Penjualan sachet laku keras'],
      [36, 'keluar', 30, 'POS-8847', 'Penjualan kasir'],
      [29, 'keluar', 26, 'POS-8871', 'Penjualan kasir'],
      [22, 'keluar', 22, 'POS-8892', 'Penjualan kasir'],
      [16, 'keluar', 18, 'POS-8935', 'Penjualan kasir'],
      [10, 'keluar', 16, 'POS-8921', 'Penjualan kasir'],
      [6, 'keluar', 12, 'POS-8952', 'Penjualan kasir'],
      [2, 'keluar', 10, 'POS-8978', 'Penjualan kasir'],
      [1, 'keluar', 8, 'POS-8987', 'Belum ada restock masuk'],
    ],
  },
  {
    id: 'prd_prw003',
    sku: 'PRW-003',
    nama: 'Pasta Gigi Pepsodent 190 g',
    kategori: 'Perawatan Diri',
    satuan: 'pcs',
    biaya: 21500,
    stokMinimum: 12,
    stokAwal: 36,
    awalHari: 41,
    riwayat: [
      [26, 'masuk', 24, 'PB-2424', 'Pengiriman'],
      [40, 'keluar', 6, 'POS-8807', 'Penjualan kasir'],
      [32, 'keluar', 5, 'POS-8839', 'Penjualan kasir'],
      [23, 'keluar', 4, 'POS-8865', 'Penjualan kasir'],
      [15, 'keluar', 3, 'POS-8874', 'Penjualan kasir'],
      [8, 'keluar', 2, 'POS-8909', 'Penjualan kasir'],
      [1, 'keluar', 1, 'POS-8994', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_rmp001',
    sku: 'RMP-001',
    nama: 'Tisu Paseo 250 lembar',
    kategori: 'Rumah Tangga',
    satuan: 'pack',
    biaya: 14500,
    stokMinimum: 15,
    stokAwal: 36,
    awalHari: 44,
    riwayat: [
      [30, 'masuk', 24, 'PB-2432', 'Restock'],
      [41, 'keluar', 5, 'POS-8812', 'Penjualan kasir'],
      [33, 'keluar', 4, 'POS-8845', 'Penjualan kasir'],
      [25, 'keluar', 3, 'POS-8868', 'Penjualan kasir'],
      [17, 'keluar', 2, 'POS-8880', 'Penjualan kasir'],
      [9, 'keluar', 2, 'POS-8913', 'Penjualan kasir'],
      [2, 'keluar', 1, 'POS-8982', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_rmp002',
    sku: 'RMP-002',
    nama: 'Pengharum Ruangan Stick 15 ml',
    kategori: 'Rumah Tangga',
    satuan: 'pcs',
    biaya: 18900,
    stokMinimum: 10,
    stokAwal: 24,
    awalHari: 38,
    riwayat: [
      [28, 'masuk', 18, 'PB-2426', 'Pengiriman'],
      [38, 'keluar', 4, 'POS-8808', 'Penjualan kasir'],
      [31, 'keluar', 3, 'POS-8841', 'Penjualan kasir'],
      [23, 'keluar', 2, 'POS-8867', 'Penjualan kasir'],
      [16, 'keluar', 2, 'POS-8883', 'Penjualan kasir'],
      [10, 'keluar', 1, 'POS-8924', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_atk001',
    sku: 'ATK-001',
    nama: 'Pulpen Standard AE7 Hitam',
    kategori: 'Alat Tulis',
    satuan: 'pcs',
    biaya: 2500,
    stokMinimum: 48,
    stokAwal: 96,
    awalHari: 40,
    riwayat: [
      [34, 'masuk', 72, 'PB-2437', 'Pesanan grosir ATK'],
      [40, 'keluar', 22, 'POS-8804', 'Penjualan siswa'],
      [32, 'keluar', 18, 'POS-8834', 'Penjualan siswa'],
      [24, 'keluar', 15, 'POS-8862', 'Penjualan kasir'],
      [16, 'keluar', 12, 'POS-8886', 'Penjualan kasir'],
      [9, 'keluar', 10, 'POS-8915', 'Penjualan siswa'],
      [4, 'keluar', 8, 'POS-8962', 'Pesanan sekolah'],
      [1, 'keluar', 6, 'POS-8995', 'Penjualan kasir'],
    ],
  },
  {
    id: 'prd_atk002',
    sku: 'ATK-002',
    nama: 'Buku Tulis Sidu 38 Lembar',
    kategori: 'Alat Tulis',
    satuan: 'pcs',
    biaya: 3800,
    stokMinimum: 30,
    stokAwal: 80,
    awalHari: 39,
    riwayat: [
      [27, 'masuk', 60, 'PB-2421', 'Musim sekolah'],
      [38, 'keluar', 20, 'POS-8818', 'Penjualan siswa'],
      [31, 'keluar', 16, 'POS-8832', 'Penjualan siswa'],
      [23, 'keluar', 13, 'POS-8861', 'Penjualan kasir'],
      [16, 'keluar', 10, 'POS-8876', 'Penjualan kasir'],
      [10, 'keluar', 8, 'POS-8911', 'Penjualan siswa'],
      [4, 'keluar', 6, 'POS-8963', 'Pesanan sekolah'],
      [1, 'keluar', 4, 'POS-8996', 'Penjualan siswa'],
    ],
  },
  {
    id: 'prd_atk003',
    sku: 'ATK-003',
    nama: 'Spidol Snowman Permanent',
    kategori: 'Alat Tulis',
    satuan: 'pcs',
    biaya: 8500,
    stokMinimum: 18,
    stokAwal: 36,
    awalHari: 44,
    riwayat: [
      [44, 'keluar', 8, 'POS-8816', 'Penjualan kasir'],
      [38, 'keluar', 7, 'POS-8853', 'Penjualan siswa'],
      [31, 'keluar', 6, 'POS-8870', 'Penjualan kasir'],
      [24, 'keluar', 5, 'POS-8895', 'Penjualan siswa'],
      [17, 'keluar', 4, 'POS-8933', 'Penjualan kasir'],
      [11, 'keluar', 2, 'POS-8931', 'Penjualan kasir'],
      [7, 'keluar', 2, 'POS-8957', 'Penjualan kasir'],
      [3, 'keluar', 1, 'POS-8973', 'Penjualan kasir'],
      [1, 'keluar', 1, 'POS-8998', 'Stok terakhir terjual'],
    ],
  },
];

/** Builds the demo gudang relative to `acuan` so "bulan ini" is never empty. */
export function buatSeed(acuan: Date = new Date()): Gudang {
  const sekarang = acuan;
  const produk: Produk[] = [];
  const pergerakan: Pergerakan[] = [];

  for (const c of CETAKAN) {
    const dibuat = tambahHari(sekarang, -c.awalHari);
    dibuat.setHours(7, 30, 0, 0);
    const stempel = dibuat.toISOString();

    const awal: Pergerakan = {
      id: `mv_${c.id}_awal`,
      produkId: c.id,
      tipe: 'masuk',
      jumlah: c.stokAwal,
      tanggal: formatTanggal(dibuat),
      referensi: 'STOK-AWAL',
      catatan: 'Stok awal saat mulai memakai StockAlert',
      dibuatPada: stempel,
    };
    pergerakan.push(awal);

    c.riwayat.forEach((t, i) => {
      const [mundur, tipe, jumlah, referensi, catatan] = t;
      const tanggal = tambahHari(sekarang, -mundur);
      pergerakan.push({
        id: `mv_${c.id}_${i}`,
        produkId: c.id,
        tipe,
        jumlah,
        tanggal: formatTanggal(tanggal),
        referensi,
        catatan,
        dibuatPada: tanggal.toISOString(),
      });
    });

    const total = pergerakan
      .filter((p) => p.produkId === c.id)
      .reduce((t, p) => (p.tipe === 'masuk' ? t + p.jumlah : t - p.jumlah), 0);

    produk.push({
      id: c.id,
      sku: c.sku,
      nama: c.nama,
      kategori: c.kategori,
      satuan: c.satuan,
      biaya: c.biaya,
      stokMinimum: c.stokMinimum,
      kuantitas: total,
      dibuatPada: stempel,
      diperbaruiPada: stempel,
    });
  }

  pergerakan.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return b.dibuatPada.localeCompare(a.dibuatPada);
  });

  return { versi: VERSI_SKEMA, produk, pergerakan };
}

/** Hanya untuk pengujian dan tampilanringkasan. */
export function infoSeed(): { produk: number; pergerakan: number } {
  return {
    produk: CETAKAN.length,
    pergerakan: CETAKAN.reduce((t, c) => t + c.riwayat.length + 1, 0),
  };
}

/** Nama toko contoh yang dipakai di beberapa tempat di antarmuka. */
export const NAMA_TOKO_CONTOH = 'Toko Sari Rasa';

/** Guard: tanggal seed harus selalu bisa diurai kembali. */
export function tanggalSeedValid(acuan: Date = new Date()): boolean {
  const g = buatSeed(acuan);
  return g.pergerakan.every((p) => uraiTanggal(p.tanggal) !== null);
}