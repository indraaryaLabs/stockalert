/**
 * Penyimpanan gudang di tingkat aplikasi.
 *
 * Menyediakan: state, riwayat undo/redo, penyimpanan otomatis, notifikasi,
 * dan produk terpilih (untuk panel kontekstual).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SEJARAH_AWAL,
  dorongSejarah,
  redo,
  terapkanPeristiwa,
  undo,
  type Langkah,
  type Peristiwa,
  type Sejarah,
} from '../domain/mesin';
import { gudangValid, muatGudangAman } from '../domain/aturan';
import { VERSI_SKEMA, type Gudang, type Produk } from '../domain/types';
import {
  bacaGudang,
  bersihkanKunciLegacy,
  hapusGudang,
  tulisGudang,
  ukuranGudang,
} from './penyimpanan';
import { buatSeed } from './seed';

export type SumberData = 'penyimpanan' | 'seed' | 'pulih';

export interface Notifikasi {
  id: number;
  jenis: 'sukses' | 'galat' | 'info';
  judul: string;
  pesan?: string;
  /** Label tombol pembatal, mis. "Batalkan". */
  aksi?: string;
  /** Dipanggil saat tombol pembatal ditekan. */
  batal?: () => void;
}

export interface KonteksGudang {
  gudang: Gudang;
  sumber: SumberData;
  galatSimpan: string | null;
  ukuran: number;
  bisaUndo: boolean;
  bisaRedo: boolean;
  kirim: (peristiwa: Peristiwa, label?: string) => boolean;
  undo: () => void;
  redo: () => void;
  notif: (n: Omit<Notifikasi, 'id'>) => void;
  resetDemo: () => void;
  kosongkan: () => void;
  impor: (teks: string) => Gudang | null;
  produkTerpilih: Produk | null;
  setProdukTerpilih: (p: Produk | null) => void;
}

const Konteks = createContext<KonteksGudang | null>(null);

/* ------------------------------------------------------------------ */
/* Reducer internal: undo/redo ikut dalam state                        */
/* ------------------------------------------------------------------ */

interface Internal {
  gudang: Gudang;
  sejarah: Sejarah;
  sumber: SumberData;
}

type AksiInternal =
  | { jenis: 'peristiwa'; peristiwa: Peristiwa; label: string }
  | { jenis: 'undo' }
  | { jenis: 'redo' }
  | { jenis: 'ganti'; gudang: Gudang };

function inisialisasi(): Internal {
  bersihkanKunciLegacy();
  const hasil = bacaGudang(VERSION_KEY, buatSeed);
  return { gudang: hasil.gudang, sejarah: SEJARAH_AWAL, sumber: hasil.sumber };
}

const VERSION_KEY = 'stockalert.gudang.v2';

function reducerInternal(state: Internal, aksi: AksiInternal): Internal {
  switch (aksi.jenis) {
    case 'undo': {
      const hasil = undo(state.gudang, state.sejarah);
      if (hasil.status !== 'ok') return state;
      return { ...state, gudang: hasil.gudang, sejarah: hasil.sejarah };
    }
    case 'redo': {
      const hasil = redo(state.gudang, state.sejarah);
      if (hasil.status !== 'ok') return state;
      return { ...state, gudang: hasil.gudang, sejarah: hasil.sejarah };
    }
    case 'ganti':
      return { gudang: aksi.gudang, sejarah: SEJARAH_AWAL, sumber: 'penyimpanan' };
    case 'peristiwa': {
      const berikut = terapkanPeristiwa(state.gudang, aksi.peristiwa);
      if (berikut === state.gudang) return state;
      const langkah: Langkah = {
        peristiwa: aksi.peristiwa,
        label: aksi.label,
        kunci: `${aksi.peristiwa.jenis}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
        waktu: Date.now(),
      };
      return { ...state, gudang: berikut, sejarah: dorongSejarah(state.sejarah, langkah) };
    }
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */

export function GudangProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducerInternal, undefined, inisialisasi);
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<Notifikasi[]>([]);
  const [produkTerpilih, setProdukTerpilih] = useState<Produk | null>(null);
  const [ukuran, setUkuran] = useState(0);
  const notifId = useRef(0);
  const timer = useRef<Map<number, number>>(new Map());

  // Simpan otomatis setiap perubahan gudang.
  useEffect(() => {
    const hasil = tulisGudang(VERSION_KEY, state.gudang);
    setGalatSimpan(hasil.berhasil ? null : (hasil.pesan ?? 'Gagal menyimpan.'));
    setUkuran(ukuranGudang(state.gudang));
  }, [state.gudang]);

  useEffect(() => {
    const daftar = timer.current;
    return () => {
      daftar.forEach((t) => window.clearTimeout(t));
      daftar.clear();
    };
  }, []);

  const notif = useCallback((n: Omit<Notifikasi, 'id'>) => {
    notifId.current += 1;
    const id = notifId.current;
    setNotifs((sekarang) => [...sekarang.slice(-2), { ...n, id }]);
    // Notifikasi yang punya aksi (undo) bertahan lebih lama.
    const durasi = n.aksi ? 9000 : 4500;
    const handle = window.setTimeout(() => {
      setNotifs((sekarang) => sekarang.filter((x) => x.id !== id));
      timer.current.delete(id);
    }, durasi);
    timer.current.set(id, handle);
  }, []);

  const tutupNotif = useCallback((id: number) => {
    setNotifs((sekarang) => sekarang.filter((x) => x.id !== id));
    const h = timer.current.get(id);
    if (h !== undefined) {
      window.clearTimeout(h);
      timer.current.delete(id);
    }
  }, []);

  // Kembalikan true bila peristiwa benar-benar mengubah state, supaya
  // pemanggil bisa menampilkan notifikasi hanya bila ada perubahan.
  const kirim = useCallback(
    (peristiwa: Peristiwa, label = 'Perubahan') => {
      const berikut = terapkanPeristiwa(state.gudang, peristiwa);
      if (berikut === state.gudang) return false;
      dispatch({ jenis: 'peristiwa', peristiwa, label });
      return true;
    },
    [state.gudang],
  );

  const jalankanUndo = useCallback(() => dispatch({ jenis: 'undo' }), []);
  const jalankanRedo = useCallback(() => dispatch({ jenis: 'redo' }), []);

  const resetDemo = useCallback(() => dispatch({ jenis: 'ganti', gudang: buatSeed() }), []);

  const kosongkan = useCallback(() => {
    hapusGudang(VERSION_KEY);
    dispatch({ jenis: 'ganti', gudang: { versi: VERSI_SKEMA, produk: [], pergerakan: [] } });
  }, []);

  const impor = useCallback((teks: string): Gudang | null => {
    const hasil = muatGudangAman(teks);
    if (!hasil || !gudangValid(hasil)) return null;
    dispatch({ jenis: 'ganti', gudang: hasil });
    return hasil;
  }, []);

  const nilai = useMemo<KonteksGudang>(
    () => ({
      gudang: state.gudang,
      sumber: state.sumber,
      galatSimpan,
      ukuran,
      bisaUndo: state.sejarah.langkah.length > 0,
      bisaRedo: state.sejarah.dapatDiulang.length > 0,
      kirim,
      undo: jalankanUndo,
      redo: jalankanRedo,
      notif,
      resetDemo,
      kosongkan,
      impor,
      produkTerpilih,
      setProdukTerpilih,
    }),
    [
      state, galatSimpan, ukuran, kirim, jalankanUndo, jalankanRedo,
      notif, resetDemo, kosongkan, impor, produkTerpilih,
    ],
  );

  return (
    <Konteks.Provider value={nilai}>
      {children}
      <NotifRuang notifs={notifs} tutup={tutupNotif} />
    </Konteks.Provider>
  );
}

/* ------------------------------------------------------------------ */

function NotifRuang({
  notifs,
  tutup,
}: {
  notifs: Notifikasi[];
  tutup: (id: number) => void;
}) {
  return (
    <div className="toast-tumpukan" role="region" aria-label="Notifikasi">
      {notifs.map((n) => (
        <div key={n.id} className={`toast-kartu toast-kartu--${n.jenis}`} role="status">
          <span className="toast-kartu__ikon" aria-hidden="true">
            {n.jenis === 'sukses' ? '✓' : n.jenis === 'galat' ? '!' : 'i'}
          </span>
          <div className="toast-kartu__isi">
            <strong>{n.judul}</strong>
            {n.pesan ? <p>{n.pesan}</p> : null}
          </div>
          {n.aksi && n.batal ? (
            <button
              type="button"
              className="tbl tbl--kecil"
              onClick={() => {
                n.batal?.();
                tutup(n.id);
              }}
            >
              {n.aksi}
            </button>
          ) : null}
          <button
            type="button"
            className="toast-kartu__tutup"
            onClick={() => tutup(n.id)}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useGudang(): KonteksGudang {
  const ctx = useContext(Konteks);
  if (!ctx) throw new Error('useGudang harus dipakai di dalam GudangProvider.');
  return ctx;
}