/**
 * Akar aplikasi: merangkai kerangka, halaman, dialog, dan pintasan global.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Boxes,
  DatabaseBackup,
  Download,
  LayoutDashboard,
  PackagePlus,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { GudangProvider, useGudang } from './platform/GudangProvider';
import { PaletPerintah, type Perintah } from './platform/PaletPerintah';
import { usePintasan } from './platform/pintasan';
import { catatPergerakan, produkBaru } from './domain/mesin';
import type { MasukanPergerakan, MasukanProduk } from './domain/aturan';
import type { Produk } from './domain/types';
import {
  eksporCadanganJson,
  eksporPergerakanCsv,
  eksporProdukCsv,
} from './platform/ekspor';
import { angka } from './platform/format';
import { Rangka, type NamaHalaman } from './ui/Rangka';
import { Konfirmasi } from './ui/primitif';
import { Dasbor } from './features/Dasbor';
import { DaftarBarang } from './features/DaftarBarang';
import { RiwayatPergerakan } from './features/RiwayatPergerakan';
import { DataCadangan } from './features/DataCadangan';
import { FormBarang } from './features/FormBarang';
import { FormPergerakan } from './features/FormPergerakan';

type Dialog =
  | { jenis: 'tambah-barang' }
  | { jenis: 'ubah'; produk: Produk }
  | { jenis: 'catat'; produkId?: string }
  | { jenis: 'hapus'; produk: Produk }
  | { jenis: 'reset' }
  | { jenis: 'kosong' };

export function App() {
  return (
    <GudangProvider>
      <Isi />
    </GudangProvider>
  );
}

function Isi() {
  const {
    gudang,
    sumber,
    galatSimpan,
    ukuran,
    kirim,
    undo,
    redo,
    notif,
    resetDemo,
    kosongkan,
    impor,
  } = useGudang();

  const [halaman, setHalaman] = useState<NamaHalaman>('dasbor');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [palet, setPalet] = useState(false);

  /* ---------------- Aksi ---------------- */

  const tambahBarang = useCallback(
    (m: MasukanProduk) => {
      const ok = kirim(produkBaru(m), 'Tambah barang');
      if (ok) {
        notif({
          jenis: 'sukses',
          judul: 'Barang ditambahkan',
          pesan: `${m.nama.trim()} masuk ke daftar barang.`,
          aksi: 'Batalkan',
          batal: undo,
        });
      }
      return ok;
    },
    [kirim, notif, undo],
  );

  const ubahBarang = useCallback(
    (m: MasukanProduk, produk: Produk) => {
      const ok = kirim(
        {
          jenis: 'produk.diubah',
          produkId: produk.id,
          perubahan: {
            sku: m.sku.trim(),
            nama: m.nama.trim(),
            kategori: m.kategori.trim(),
            satuan: m.satuan,
            biaya: m.biaya,
            stokMinimum: m.stokMinimum,
          },
        },
        'Ubah barang',
      );
      if (ok) {
        notif({
          jenis: 'sukses',
          judul: 'Barang diperbarui',
          pesan: `${m.nama.trim()} berhasil disimpan.`,
          aksi: 'Batalkan',
          batal: undo,
        });
      }
      return ok;
    },
    [kirim, notif, undo],
  );

  const catat = useCallback(
    (m: MasukanPergerakan) => {
      const ok = kirim(catatPergerakan(m), 'Catat pergerakan');
      if (ok) {
        const arah = m.tipe === 'masuk' ? 'masuk' : 'keluar';
        notif({
          jenis: 'sukses',
          judul: `Stok ${arah} tercatat`,
          pesan: `${angka(m.jumlah)} unit dicatat.`,
          aksi: 'Batalkan',
          batal: undo,
        });
      }
      return ok;
    },
    [kirim, notif, undo],
  );

  const konfirmasiHapus = () => {
    if (dialog?.jenis !== 'hapus') return;
    const { produk } = dialog;
    const jumlah = gudang.pergerakan.filter((m) => m.produkId === produk.id).length;
    kirim({ jenis: 'produk.dihapus', produkId: produk.id }, 'Hapus barang');
    setDialog(null);
    notif({
      jenis: 'info',
      judul: `${produk.nama} dihapus`,
      pesan: `Beserta ${angka(jumlah)} riwayat pergerakan.`,
      aksi: 'Urungkan',
      batal: undo,
    });
  };

  const konfirmasiReset = () => {
    resetDemo();
    setDialog(null);
    notif({ jenis: 'sukses', judul: 'Data demo dimuat ulang', pesan: 'Contoh barang siap dijelajahi.' });
  };

  const konfirmasiKosong = () => {
    kosongkan();
    setDialog(null);
    notif({ jenis: 'sukses', judul: 'Semua data dikosongkan', pesan: 'Aplikasi siap diisi dari nol.' });
  };

  /* ---------------- Ekspor / impor ---------------- */

  const cobaEkspor = useCallback(
    (aksi: () => void, nama: string) => {
      try {
        aksi();
        notif({ jenis: 'sukses', judul: `${nama} selesai`, pesan: 'Berkas sudah diunduh ke perangkat Anda.' });
      } catch {
        notif({
          jenis: 'galat',
          judul: 'Ekspor gagal',
          pesan: 'Browser memblokir unduhan. Izinkan unduhan untuk situs ini.',
        });
      }
    },
    [notif],
  );

  const csvProduk = useCallback(
    () => cobaEkspor(() => eksporProdukCsv(gudang), 'Ekspor barang'),
    [cobaEkspor, gudang],
  );
  const csvPergerakan = useCallback(
    () => cobaEkspor(() => eksporPergerakanCsv(gudang), 'Ekspor pergerakan'),
    [cobaEkspor, gudang],
  );
  const jsonCadangan = useCallback(
    () => cobaEkspor(() => eksporCadanganJson(gudang), 'Ekspor cadangan'),
    [cobaEkspor, gudang],
  );

  const jalankanImpor = useCallback(
    (teks: string, nama: string) => {
      const hasil = impor(teks);
      if (hasil) {
        notif({
          jenis: 'sukses',
          judul: 'Cadangan berhasil dimuat',
          pesan: `${nama}: ${angka(hasil.produk.length)} barang dan ${angka(hasil.pergerakan.length)} pergerakan dipulihkan.`,
        });
      } else {
        notif({
          jenis: 'galat',
          judul: 'Impor ditolak',
          pesan: 'Struktur berkas tidak sesuai. Data yang tersimpan tidak berubah.',
        });
      }
    },
    [impor, notif],
  );

  /* ---------------- Palet perintah ---------------- */

  const perintah: Perintah[] = useMemo(
    () => [
      { id: 'buka-dasbor', judul: 'Buka Dasbor', kelompok: 'Navigasi', ikon: <LayoutDashboard size={14} />, jalankan: () => setHalaman('dasbor'), cari: ['ringkasan', 'home'] },
      { id: 'buka-barang', judul: 'Buka Daftar Barang', kelompok: 'Navigasi', ikon: <Boxes size={14} />, jalankan: () => setHalaman('barang'), cari: ['stok', 'produk', 'sku'] },
      { id: 'buka-riwayat', judul: 'Buka Pergerakan Stok', kelompok: 'Navigasi', ikon: <ArrowLeftRight size={14} />, jalankan: () => setHalaman('pergerakan'), cari: ['riwayat', 'mutasi'] },
      { id: 'buka-data', judul: 'Buka Data & Cadangan', kelompok: 'Navigasi', ikon: <DatabaseBackup size={14} />, jalankan: () => setHalaman('data'), cari: ['ekspor', 'impor', 'backup', 'reset'] },
      { id: 'catat-stok', judul: 'Catat pergerakan stok', kelompok: 'Tindakan', ikon: <PackagePlus size={14} />, pintasan: 'C', jalankan: () => setDialog({ jenis: 'catat' }), cari: ['tambah', 'masuk', 'keluar', 'jual', 'beli'] },
      { id: 'tambah-barang', judul: 'Tambah barang baru', kelompok: 'Tindakan', ikon: <Plus size={14} />, pintasan: 'N', jalankan: () => setDialog({ jenis: 'tambah-barang' }), cari: ['produk', 'sku'] },
      { id: 'undo', judul: 'Batalkan perubahan terakhir', kelompok: 'Tindakan', ikon: <Undo2 size={14} />, jalankan: undo, cari: ['undo', 'batal'] },
      { id: 'redo', judul: 'Ulangi perubahan', kelompok: 'Tindakan', ikon: <Redo2 size={14} />, jalankan: redo, cari: ['redo', 'ulang'] },
      { id: 'csv-barang', judul: 'Ekspor daftar barang (CSV)', kelompok: 'Data', ikon: <Download size={14} />, jalankan: csvProduk, cari: ['unduh', 'excel'] },
      { id: 'csv-riwayat', judul: 'Ekspor riwayat (CSV)', kelompok: 'Data', ikon: <Download size={14} />, jalankan: csvPergerakan, cari: ['unduh', 'excel'] },
      { id: 'json', judul: 'Ekspor cadangan (JSON)', kelompok: 'Data', ikon: <Download size={14} />, jalankan: jsonCadangan, cari: ['backup', 'unduh'] },
      { id: 'reset-demo', judul: 'Reset ke data demo', kelompok: 'Data', ikon: <RotateCcw size={14} />, jalankan: () => setDialog({ jenis: 'reset' }), cari: ['pulihkan', 'contoh'] },
      { id: 'kosongkan', judul: 'Kosongkan semua data', kelompok: 'Data', ikon: <Trash2 size={14} />, jalankan: () => setDialog({ jenis: 'kosong' }), cari: ['hapus', 'bersihkan'] },
      ...gudang.produk.slice(0, 40).map<Perintah>((p) => ({
        id: `catat-${p.id}`,
        judul: `Catat stok: ${p.nama}`,
        kelompok: 'Barang',
        jalankan: () => setDialog({ jenis: 'catat', produkId: p.id }),
        cari: [p.sku, p.kategori],
      })),
    ],
    [gudang.produk, undo, redo, csvProduk, csvPergerakan, jsonCadangan],
  );

  /* ---------------- Pintasan global ---------------- */

  usePintasan({ ctrl: true, kunci: 'k' }, () => setPalet(true), () => dialog !== null || palet);
  usePintasan({ ctrl: true, kunci: 'z' }, undo, () => dialog !== null);
  usePintasan({ ctrl: true, shift: true, kunci: 'z' }, redo, () => dialog !== null);
  usePintasan({ ctrl: true, kunci: 'n' }, () => setDialog({ jenis: 'tambah-barang' }), () => dialog !== null);
  usePintasan({ ctrl: true, kunci: 'c' }, () => setDialog({ jenis: 'catat' }), () => dialog !== null);

  // Navigasi cepat: tekan g lalu d / b / p.
  useEffect(() => {
    let menunggu = false;
    let timer: number | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'g') {
        menunggu = true;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          menunggu = false;
        }, 900);
        return;
      }
      if (!menunggu) return;
      menunggu = false;
      window.clearTimeout(timer);
      const peta: Record<string, NamaHalaman> = { d: 'dasbor', b: 'barang', p: 'pergerakan' };
      const tujuan = peta[k];
      if (tujuan) {
        e.preventDefault();
        setHalaman(tujuan);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, []);

  /* ---------------- Turunan ---------------- */

  const kategoriTersedia = useMemo(
    () => [...new Set(gudang.produk.map((p) => p.kategori))].sort((a, b) => a.localeCompare(b, 'id')),
    [gudang.produk],
  );

  /* ---------------- Tampilan ---------------- */

  return (
    <>
      <Rangka
        gudang={gudang}
        halaman={halaman}
        onPindah={setHalaman}
        onBukaPalet={() => setPalet(true)}
        onCatat={() => setDialog({ jenis: 'catat' })}
      >
        {halaman === 'dasbor' ? (
          <Dasbor
            gudang={gudang}
            onPindah={(h) => setHalaman(h as NamaHalaman)}
            onCatat={(id) => setDialog({ jenis: 'catat', produkId: id })}
            onTambah={() => setDialog({ jenis: 'tambah-barang' })}
          />
        ) : null}

        {halaman === 'barang' ? (
          <DaftarBarang
            gudang={gudang}
            onTambah={() => setDialog({ jenis: 'tambah-barang' })}
            onUbah={(p) => setDialog({ jenis: 'ubah', produk: p })}
            onHapus={(p) => setDialog({ jenis: 'hapus', produk: p })}
            onCatat={(p) => setDialog({ jenis: 'catat', produkId: p.id })}
            onReset={() => setDialog({ jenis: 'reset' })}
            onEkspor={csvProduk}
          />
        ) : null}

        {halaman === 'pergerakan' ? (
          <RiwayatPergerakan
            gudang={gudang}
            onCatat={() => setDialog({ jenis: 'catat' })}
            onEkspor={csvPergerakan}
          />
        ) : null}

        {halaman === 'data' ? (
          <DataCadangan
            gudang={gudang}
            sumber={sumber}
            ukuran={ukuran}
            galatSimpan={galatSimpan}
            onEksporJson={jsonCadangan}
            onEksporCsv={(jenis) => (jenis === 'produk' ? csvProduk() : csvPergerakan())}
            onImpor={jalankanImpor}
            onResetDemo={() => setDialog({ jenis: 'reset' })}
            onKosongkan={() => setDialog({ jenis: 'kosong' })}
          />
        ) : null}
      </Rangka>

      {dialog?.jenis === 'tambah-barang' ? (
        <FormBarang
          produk={null}
          semuaProduk={gudang.produk}
          kategoriTersedia={kategoriTersedia}
          onTutup={() => setDialog(null)}
          onSimpan={tambahBarang}
        />
      ) : null}

      {dialog?.jenis === 'ubah' ? (
        <FormBarang
          produk={dialog.produk}
          semuaProduk={gudang.produk}
          kategoriTersedia={kategoriTersedia}
          onTutup={() => setDialog(null)}
          onSimpan={(m) => ubahBarang(m, dialog.produk)}
        />
      ) : null}

      {dialog?.jenis === 'catat' ? (
        <FormPergerakan
          produk={null}
          semuaProduk={gudang.produk}
          pergerakan={gudang.pergerakan}
          produkAwalId={dialog.produkId}
          onTutup={() => setDialog(null)}
          onSimpan={catat}
        />
      ) : null}

      {dialog?.jenis === 'hapus' ? (
        <Konfirmasi
          judul="Hapus barang ini?"
          onBatal={() => setDialog(null)}
          onKonfirmasi={konfirmasiHapus}
          labelKonfirmasi="Ya, hapus"
        >
          <p>
            <strong>{dialog.produk.nama}</strong> ({dialog.produk.sku}) akan dihapus beserta{' '}
            {angka(gudang.pergerakan.filter((m) => m.produkId === dialog.produk.id).length)} riwayat
            pergerakan terkait.
          </p>
          <p>Bisa dibatalkan lewat notifikasi setelahnya, atau dengan Ctrl+Z.</p>
        </Konfirmasi>
      ) : null}

      {dialog?.jenis === 'reset' ? (
        <Konfirmasi
          judul="Reset ke data demo?"
          nada="peringatan"
          onBatal={() => setDialog(null)}
          onKonfirmasi={konfirmasiReset}
          labelKonfirmasi="Ya, reset ke demo"
        >
          <p>
            Seluruh {angka(gudang.produk.length)} barang dan {angka(gudang.pergerakan.length)} riwayat
            saat ini akan <strong>diganti</strong> oleh data contoh.
          </p>
          <p>Unduh cadangan JSON terlebih dulu bila data ini masih berguna.</p>
        </Konfirmasi>
      ) : null}

      {dialog?.jenis === 'kosong' ? (
        <Konfirmasi
          judul="Kosongkan semua data?"
          onBatal={() => setDialog(null)}
          onKonfirmasi={konfirmasiKosong}
          labelKonfirmasi="Ya, kosongkan"
        >
          <p>
            Semua barang dan riwayat pergerakan akan dihapus dari browser ini. Tindakan ini{' '}
            <strong>tidak bisa dibatalkan</strong>.
          </p>
          <p>Gunakan &ldquo;Reset ke data demo&rdquo; bila hanya ingin kembali ke data contoh.</p>
        </Konfirmasi>
      ) : null}

      {palet ? <PaletPerintah perintah={perintah} onTutup={() => setPalet(false)} /> : null}
    </>
  );
}