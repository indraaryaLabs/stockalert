/**
 * Mesin perubahan (reducer) untuk gudang.
 *
 * Semua mutasi melewati `peristiwa` (event) sehingga:
 *  - riwayat dapat dibalik dan diulang (undo/redo) tanpa menyimpan salinan state;
 *  - perubahan bisa diberi label(shortcut/deskripsi) untuk pesan "Dibatalkan";
 *  - aturan stok ditegakkan di satu titik yang dapat diuji.
 *
 * Reducer ini murni: tidak menyentuh localStorage, Date.now, atau DOM.
 */

import { buatId, terapkanPergerakan } from './aturan';
import { VERSI_SKEMA } from './types';
import type { Gudang, Pergerakan, Produk, Satuan, TipePergerakan } from './types';

/* ------------------------------------------------------------------ */
/* Peristiwa                                                          */
/* ------------------------------------------------------------------ */

export type Peristiwa =
  | { jenis: 'produk.ditambah'; produk: Produk; pergerakanAwal?: Pergerakan }
  | { jenis: 'produk.diubah'; produkId: string; perubahan: Partial<Produk> }
  | { jenis: 'produk.dihapus'; produkId: string }
  | {
      jenis: 'pergerakan.dicatat';
      pergerakan: Pergerakan;
    }
  | { jenis: 'pergerakan.dibatalkan'; pergerakanId: string }
  | { jenis: 'gudang.diganti'; gudang: Gudang };

/** Peristiwa yang mengubah isi gudang (dipakai untuk undo/redo). */
export interface Langkah {
  peristiwa: Peristiwa;
  /** Label singkat untuk pesan undo, mis. "Tambah Barang". */
  label: string;
  /** Identitas undo, mis. "undo:produk.ditambah:prd_1". */
  kunci: string;
  waktu: number;
}

/* ------------------------------------------------------------------ */
/* Reducer                                                            */
/* ------------------------------------------------------------------ */

export function terapkanPeristiwa(gudang: Gudang, peristiwa: Peristiwa): Gudang {
  switch (peristiwa.jenis) {
    case 'produk.ditambah': {
      if (gudang.produk.some((p) => p.id === peristiwa.produk.id)) return gudang;
      return {
        versi: VERSI_SKEMA,
        produk: [...gudang.produk, peristiwa.produk],
        pergerakan: peristiwa.pergerakanAwal ? [peristiwa.pergerakanAwal, ...gudang.pergerakan] : [...gudang.pergerakan],
      };
    }

    case 'produk.diubah': {
      const ada = gudang.produk.some((p) => p.id === peristiwa.produkId);
      if (!ada) return gudang;
      // `kuantitas` sengaja dikecualikan: stok hanya berubah lewat peristiwa
      // pergerakan, tidak pernah lewat pengeditan metadata.
      const perubahan = perubahanTanpaKuantitas(peristiwa.perubahan);
      return {
        versi: VERSI_SKEMA,
        produk: gudang.produk.map((p) =>
          p.id === peristiwa.produkId
            ? { ...p, ...perubahan, diperbaruiPada: new Date().toISOString() }
            : p,
        ),
        pergerakan: gudang.pergerakan,
      };
    }

    case 'produk.dihapus':
      return {
        versi: VERSI_SKEMA,
        produk: gudang.produk.filter((p) => p.id !== peristiwa.produkId),
        pergerakan: gudang.pergerakan.filter((m) => m.produkId !== peristiwa.produkId),
      };

    case 'pergerakan.dicatat': {
      const target = gudang.produk.find((p) => p.id === peristiwa.pergerakan.produkId);
      if (!target) return gudang;
      const hasil = terapkanPergerakan(
        target.kuantitas,
        peristiwa.pergerakan.tipe,
        peristiwa.pergerakan.jumlah,
      );
      if (!hasil.ok) return gudang;
      return {
        versi: VERSI_SKEMA,
        produk: gudang.produk.map((p) =>
          p.id === target.id ? { ...p, kuantitas: hasil.kuantitas } : p,
        ),
        pergerakan: [peristiwa.pergerakan, ...gudang.pergerakan],
      };
    }

    case 'pergerakan.dibatalkan': {
      const m = gudang.pergerakan.find((x) => x.id === peristiwa.pergerakanId);
      if (!m) return gudang;
      const target = gudang.produk.find((p) => p.id === m.produkId);
      if (!target) return gudang;
      // Membalik arah: hapus efek dari kuantitas.
      const hasil = terapkanPergerakan(
        target.kuantitas,
        m.tipe === 'masuk' ? 'keluar' : 'masuk',
        m.jumlah,
      );
      if (!hasil.ok) return gudang;
      return {
        versi: VERSI_SKEMA,
        produk: gudang.produk.map((p) =>
          p.id === target.id ? { ...p, kuantitas: hasil.kuantitas } : p,
        ),
        pergerakan: gudang.pergerakan.filter((x) => x.id !== m.id),
      };
    }

    case 'gudang.diganti':
      return { ...peristiwa.gudang, versi: VERSI_SKEMA };

    default:
      return gudang;
  }
}

function perubahanTanpaKuantitas(p: Partial<Produk>): Partial<Produk> {
  const { kuantitas: _abaikan, ...sisa } = p as Partial<Produk> & { kuantitas?: number };
  void _abaikan;
  return sisa;
}

/* ------------------------------------------------------------------ */
/* Riwayat undo/redo                                                  */
/* ------------------------------------------------------------------ */

export interface Sejarah {
  /** Langkah yang sudah diterapkan, dari lama ke baru. */
  langkah: Langkah[];
  /** Langkah yang sudah dibatalkan, siap diulang. */
  dapatDiulang: Langkah[];
}

export const SEJARAH_AWAL: Sejarah = { langkah: [], dapatDiulang: [] };

export function dorongSejarah(sejarah: Sejarah, langkah: Langkah): Sejarah {
  return {
    langkah: [...sejarah.langkah, langkah],
    // Setiap perubahan baru membuang rencana redo.
    dapatDiulang: [],
  };
}

export type HasilUndo =
  | { status: 'ok'; gudang: Gudang; sejarah: Sejarah; label: string }
  | { status: 'tidak-ada' };

export function undo(gudang: Gudang, sejarah: Sejarah): HasilUndo {
  const langkah = sejarah.langkah[sejarah.langkah.length - 1];
  if (!langkah) return { status: 'tidak-ada' };

  // Undo memakai peristiwa kebalikan agar tidak perlu menyimpan salinan state.
  const balik: Peristiwa =
    langkah.peristiwa.jenis === 'produk.ditambah'
      ? { jenis: 'produk.dihapus', produkId: langkah.peristiwa.produk.id }
      : langkah.peristiwa.jenis === 'produk.dihapus'
        ? { jenis: 'produk.ditambah', produk: produkLengkap(gudang, langkah.peristiwa.produkId) }
        : langkah.peristiwa.jenis === 'produk.diubah'
          ? { jenis: 'produk.diubah', produkId: langkah.peristiwa.produkId, perubahan: langkah.peristiwa.perubahan }
          : langkah.peristiwa.jenis === 'pergerakan.dicatat'
            ? { jenis: 'pergerakan.dibatalkan', pergerakanId: langkah.peristiwa.pergerakan.id }
            : { jenis: 'gudang.diganti', gudang };

  return {
    status: 'ok',
    gudang: terapkanPeristiwa(gudang, balik),
    sejarah: {
      langkah: sejarah.langkah.slice(0, -1),
      dapatDiulang: [...sejarah.dapatDiulang, langkah],
    },
    label: langkah.label,
  };
}

export type HasilRedo =
  | { status: 'ok'; gudang: Gudang; sejarah: Sejarah; label: string }
  | { status: 'tidak-ada' };

export function redo(gudang: Gudang, sejarah: Sejarah): HasilRedo {
  const langkah = sejarah.dapatDiulang[sejarah.dapatDiulang.length - 1];
  if (!langkah) return { status: 'tidak-ada' };
  return {
    status: 'ok',
    gudang: terapkanPeristiwa(gudang, langkah.peristiwa),
    sejarah: {
      langkah: [...sejarah.langkah, langkah],
      dapatDiulang: sejarah.dapatDiulang.slice(0, -1),
    },
    label: langkah.label,
  };
}

/** Rekonstruksi produk dari pergerakan awal saat undo penambahan. */
function produkLengkap(gudang: Gudang, produkId: string): Produk {
  const movements = gudang.pergerakan.filter((m) => m.produkId === produkId);
  const awal = movements.find((m) => m.referensi === 'STOK-AWAL');
  const totalMasuk = movements
    .filter((m) => m.tipe === 'masuk')
    .reduce((t, m) => t + m.jumlah, 0);
  const totalKeluar = movements
    .filter((m) => m.tipe === 'keluar')
    .reduce((t, m) => t + m.jumlah, 0);
  return {
    id: produkId,
    sku: '(dipulihkan)',
    nama: '(dipulihkan)',
    kategori: 'Lainnya',
    satuan: 'pcs' as Satuan,
    biaya: null,
    stokMinimum: 0,
    kuantitas: totalMasuk - totalKeluar,
    dibuatPada: awal?.dibuatPada ?? new Date().toISOString(),
    diperbaruiPada: baru(),
  };
}

function baru(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Pabrik peristiwa                                                  */
/* ------------------------------------------------------------------ */

export function produkBaru(masukan: {
  sku: string;
  nama: string;
  kategori: string;
  satuan: Satuan;
  biaya: number | null;
  stokMinimum: number;
  kuantitasAwal: number;
}): Peristiwa {
  const waktu = baru();
  const produk: Produk = {
    id: buatId('prd'),
    sku: masukan.sku.trim(),
    nama: masukan.nama.trim(),
    kategori: masukan.kategori.trim(),
    satuan: masukan.satuan,
    biaya: masukan.biaya,
    stokMinimum: masukan.stokMinimum,
    kuantitas: masukan.kuantitasAwal,
    dibuatPada: waktu,
    diperbaruiPada: waktu,
  };
  const pergerakanAwal: Pergerakan | undefined =
    masukan.kuantitasAwal > 0
      ? {
          id: buatId('mv'),
          produkId: produk.id,
          tipe: 'masuk',
          jumlah: masukan.kuantitasAwal,
          tanggal: waktu.slice(0, 10),
          referensi: 'STOK-AWAL',
          catatan: 'Stok awal saat barang didaftarkan',
          dibuatPada: waktu,
        }
      : undefined;

  return {
    jenis: 'produk.ditambah',
    produk,
    pergerakanAwal,
  };
}

export function catatPergerakan(masukan: {
  produkId: string;
  tipe: TipePergerakan;
  jumlah: number;
  tanggal: string;
  referensi: string;
  catatan: string;
}): Peristiwa {
  return {
    jenis: 'pergerakan.dicatat',
    pergerakan: {
      id: buatId('mv'),
      produkId: masukan.produkId,
      tipe: masukan.tipe,
      jumlah: masukan.jumlah,
      tanggal: masukan.tanggal,
      referensi: masukan.referensi.trim(),
      catatan: masukan.catatan.trim(),
      dibuatPada: baru(),
    },
  };
}