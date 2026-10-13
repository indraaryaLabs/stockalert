/**
 * Palet perintah (⌘K) — akses cepat ke setiap tindakan aplikasi.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Search } from 'lucide-react';

export interface Perintah {
  id: string;
  judul: string;
  kelompok: string;
  ikon?: React.ReactNode;
  pintasan?: string;
  jalankan: () => void;
  cari?: string[];
}

/** Pencocokan sederhana: semua kata kunci harus muncul (urutan bebas). */
export function saringPerintah(
  perintah: readonly Perintah[],
  kueri: string,
): Perintah[] {
  const q = kueri.trim().toLowerCase();
  if (!q) return [...perintah];

  const kata = q.split(/\s+/).filter(Boolean);
  return perintah
    .map((p) => {
      const teks = [p.judul, p.kelompok, ...(p.cari ?? [])].join(' ').toLowerCase();
      const skor = kata.reduce((s, k) => {
        if (teks.includes(k)) return s + k.length;
        return s - 1000;
      }, 0);
      return { p, skor };
    })
    .filter(({ skor }) => skor >= 0)
    .sort((a, b) => b.skor - a.skor)
    .map(({ p }) => p);
}

export interface PaletProps {
  perintah: readonly Perintah[];
  onTutup: () => void;
}

export function PaletPerintah({ perintah, onTutup }: PaletProps) {
  const [kueri, setKueri] = useState('');
  const [aktif, setAktif] = useState(0);
  const kotak = useRef<HTMLDivElement>(null);
  const daftar = useRef<HTMLDivElement>(null);
  const sebelumnya = useRef<Element | null>(null);

  const hasil = useMemo(() => saringPerintah(perintah, kueri), [perintah, kueri]);

  useEffect(() => {
    sebelumnya.current = document.activeElement;
    const fokusPertama = kotak.current?.querySelector<HTMLElement>('input');
    fokusPertama?.focus();
    const sebelumnyaOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = sebelumnyaOverflow;
      (sebelumnya.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    setAktif(0);
  }, [kueri]);

  // Jaga item aktif tetap terlihat saat memakai keyboard.
  useEffect(() => {
    const item = daftar.current?.querySelector<HTMLElement>('[data-aktif="true"]');
    item?.scrollIntoView({ block: 'nearest' });
  }, [aktif]);

  const jalankan = (p: Perintah | undefined) => {
    if (!p) return;
    onTutup();
    // Beri jeda agar animasi keluar selesai sebelum aksi dijalankan.
    window.requestAnimationFrame(() => p.jalankan());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onTutup();
      return;
    }
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      setAktif((a) => (hasil.length === 0 ? 0 : (a + 1) % hasil.length));
      return;
    }
    if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      setAktif((a) => (hasil.length === 0 ? 0 : (a - 1 + hasil.length) % hasil.length));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      jalankan(hasil[aktif]);
    }
  };

  let kelompokTerakhir = '';

  return createPortal(
    <div
      className="palet"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div
        ref={kotak}
        className="palet__kotak"
        role="dialog"
        aria-modal="true"
        aria-label="Palet perintah"
        onKeyDown={onKeyDown}
      >
        <div className="palet__cari">
          <Search size={15} className="palet__item__ikon" aria-hidden="true" />
          <input
            value={kueri}
            onChange={(e) => setKueri(e.target.value)}
            placeholder="Cari perintah atau barang..."
            aria-label="Cari perintah"
            aria-activedescendant={hasil[aktif] ? `palet-${hasil[aktif].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>ESC</kbd>
        </div>

        <div className="palet__daftar" ref={daftar} role="listbox" aria-label="Hasil perintah">
          {hasil.length === 0 ? (
            <p className="palet__grup">Tidak ada perintah yang cocok.</p>
          ) : (
            hasil.map((p, i) => {
              const baruKelompok = p.kelompok !== kelompokTerakhir;
              kelompokTerakhir = p.kelompok;
              return (
                <div key={p.id}>
                  {baruKelompok ? (
                    <p className="palet__grup">{p.kelompok}</p>
                  ) : null}
                  <button
                    type="button"
                    id={`palet-${p.id}`}
                    role="option"
                    aria-selected={i === aktif}
                    data-aktif={i === aktif}
                    className="palet__item"
                    onMouseMove={() => setAktif(i)}
                    onClick={() => jalankan(p)}
                  >
                    {p.ikon ? (
                      <span className="palet__item__ikon">{p.ikon}</span>
                    ) : (
                      <span className="palet__item__ikon" aria-hidden="true">
                        <ArrowRight size={14} />
                      </span>
                    )}
                    <span className="palet__item__teks">{p.judul}</span>
                    {p.pintasan ? (
                      <span className="palet__item__kbd">{p.pintasan}</span>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="palet__kaki">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigasi
          </span>
          <span>
            <kbd>↵</kbd> buka
          </span>
          <span>
            <kbd>esc</kbd> tutup
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}