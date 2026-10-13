/**
 * Lapisan penyimpanan — abstraksi tipis di atas `localStorage`.
 *
 * Menangani: versi skema, migrasi, toleransi file rusak, dan Error quota.
 */

import { gudangValid, muatGudangAman } from '../domain/aturan';
import { VERSI_SKEMA, type Gudang } from '../domain/types';

export interface HasilBaca {
  gudang: Gudang;
  sumber: 'penyimpanan' | 'seed' | 'pulih';
  pesan?: string;
}

type Penyedia = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function penyimpanan(): Penyedia | null {
  try {
    // Akses inside try: mode privat Safari melempar saat properti dibaca.
    const uji = '__stockalert_uji__';
    window.localStorage.setItem(uji, '1');
    window.localStorage.removeItem(uji);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Migrasi skema lama (v1) ke bentuk terkini. */
function migrasi(gudang: Gudang): Gudang {
  let hasil = gudang;
  if (hasil.versi < VERSI_SKEMA) {
    // v1 tidak menyimpan `diperbaruiPada`; isi dengan `dibuatPada` bila ada.
    hasil = {
      ...hasil,
      versi: VERSI_SKEMA,
      produk: hasil.produk.map((p) => ({
        ...p,
        diperbaruiPada: (p as ProdukLama).diperbaruiPada ?? p.dibuatPada,
      })),
    };
  }
  return hasil;
}

interface ProdukLama {
  diperbaruiPada?: string;
}

/**
 * Membaca gudang. Kembalikan data tersimpan bila valid, migrasi bila versi
 * lama, dan seed demo bila belum ada atau rusak.
 */
export function bacaGudang(kunci: string, buatSeed: () => Gudang): HasilBaca {
  const store = penyimpanan();
  if (!store) {
    return {
      gudang: buatSeed(),
      sumber: 'seed',
      pesan: 'Penyimpanan browser tidak tersedia. Data hanya bertahan selama tab terbuka.',
    };
  }

  let mentah: string | null = null;
  try {
    mentah = store.getItem(kunci);
  } catch {
    return { gudang: buatSeed(), sumber: 'seed' };
  }

  if (!mentah) return { gudang: buatSeed(), sumber: 'seed' };

  const hasil = muatGudangAman(mentah);
  if (!hasil) {
    return {
      gudang: buatSeed(),
      sumber: 'pulih',
      pesan: 'Data tersimpan rusak dan tidak dapat dibaca. Data contoh dimuat sebagai gantinya.',
    };
  }

  if (!gudangValid(hasil)) {
    return { gudang: buatSeed(), sumber: 'pulih', pesan: 'Data tidak sesuai skema.' };
  }

  const migrasiHasil = migrasi(hasil);
  if (migrasiHasil.versi !== hasil.versi) {
    tulisGudang(kunci, migrasiHasil);
  }
  return { gudang: migrasiHasil, sumber: 'penyimpanan' };
}

export interface HasilTulis {
  berhasil: boolean;
  pesan?: string;
}

export function tulisGudang(kunci: string, gudang: Gudang): HasilTulis {
  const store = penyimpanan();
  if (!store) {
    return {
      berhasil: false,
      pesan: 'Penyimpanan browser tidak tersedia. Gunakan ekspor cadangan.',
    };
  }
  try {
    store.setItem(kunci, JSON.stringify(gudang));
    return { berhasil: true };
  } catch (error) {
    const nama =
      error instanceof Error && 'name' in error ? String(error.name) : '';
    return {
      berhasil: false,
      pesan:
        nama === 'QuotaExceededError'
          ? 'Penyimpanan browser penuh. Ekspor cadangan lalu kurangi data lama.'
          : 'Gagal menyimpan data di browser.',
    };
  }
}

export function hapusGudang(kunci: string): void {
  try {
    window.localStorage.removeItem(kunci);
  } catch {
    /* diabaikan */
  }
}

export function ukuranGudang(gudang: Gudang): number {
  return new TextEncoder().encode(JSON.stringify(gudang)).length;
}



/** Kunci versi lama, dibersihkan saat aplikasi pertama kali dibuka. */
export const KUNCI_LEGACY = 'stockalert.data.v1';

export function bersihkanKunciLegacy(): void {
  try {
    window.localStorage.removeItem(KUNCI_LEGACY);
  } catch {
    /* diabaikan */
  }
}