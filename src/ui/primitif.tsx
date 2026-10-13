/**
 * Primitif antarmuka yang dipakai ulang di seluruh aplikasi.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import type { StatusStok } from '../domain/types';

/* ------------------------------------------------------------------ */
/* Lencana                                                            */
/* ------------------------------------------------------------------ */

const KELAS_STATUS: Record<StatusStok, string> = {
  aman: 'len len--aman',
  rendah: 'len len--rendah',
  habis: 'len len--habis',
};

const TEKS_STATUS: Record<StatusStok, string> = {
  aman: 'Aman',
  rendah: 'Rendah',
  habis: 'Habis',
};

export function LencanaStatus({ status }: { status: StatusStok }) {
  return (
    <span className={KELAS_STATUS[status]}>
      <span className="len__titik" aria-hidden="true" />
      {TEKS_STATUS[status]}
    </span>
  );
}

export function Lencana({
  warna = 'netral',
  children,
}: {
  warna?: 'netral' | 'accent' | 'masuk' | 'keluar';
  children: ReactNode;
}) {
  return <span className={`len len--${warna}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Medan formulir                                                      */
/* ------------------------------------------------------------------ */

export interface MedanProps {
  label: string;
  children: (prop: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => ReactNode;
  galat?: string | null;
  bantuan?: string;
  wajib?: boolean;
  opsional?: boolean;
  lebar?: boolean;
}

export function Medan({
  label,
  children,
  galat,
  bantuan,
  wajib,
  opsional,
  lebar,
}: MedanProps) {
  const id = useId();
  const deskripsiId = galat ? `${id}-galat` : bantuan ? `${id}-bantuan` : undefined;

  return (
    <div className={`medan${lebar ? ' tata__lebar' : ''}`}>
      <label className="medan__label" htmlFor={id}>
        {label}
        {wajib ? (
          <span className="medan__wajib" aria-hidden="true">
            *
          </span>
        ) : null}
        {opsional ? <span className="medan__opsional">(opsional)</span> : null}
      </label>
      {children({
        id,
        'aria-describedby': deskripsiId,
        'aria-invalid': Boolean(galat),
      })}
      {galat ? (
        <p className="medan__galat" id={deskripsiId} role="alert">
          <AlertTriangle size={12} aria-hidden="true" />
          {galat}
        </p>
      ) : bantuan ? (
        <p className="medan__bantuan" id={deskripsiId}>
          {bantuan}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

export interface ModalProps {
  judul: string;
  subjudul?: string;
  ukuran?: 'sempit' | 'sedang' | 'lebar';
  onTutup: () => void;
  children: ReactNode;
  kaki?: ReactNode;
}

/**
 * Dialog aksesibel yang dirender lewat portal ke <body>.
 *
 * Portal itu penting: elemen halaman memakai animasi transform, dan
 * transform membuat elemen tersebut menjadi containing block bagi
 * `position: fixed`. Tanpa portal, dialog terukur relatif area konten dan
 * kakinya bisa jatuh di luar layar.
 */
export function Modal({
  judul,
  subjudul,
  ukuran = 'sedang',
  onTutup,
  children,
  kaki,
}: ModalProps) {
  const kartu = useRef<HTMLDivElement>(null);
  const sebelumnya = useRef<Element | null>(null);
  const judulId = useId();

  useEffect(() => {
    sebelumnya.current = document.activeElement;
    const fokus = kartu.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    fokus?.focus();

    const overflowSebelum = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onTutup();
        return;
      }
      if (e.key !== 'Tab' || !kartu.current) return;
      const bisa = [
        ...kartu.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (bisa.length === 0) return;
      const pertama = bisa[0];
      const terakhir = bisa[bisa.length - 1];
      if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      } else if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflowSebelum;
      (sebelumnya.current as HTMLElement | null)?.focus?.();
    };
  }, [onTutup]);

  return createPortal(
    <div
      className="tirai"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div
        ref={kartu}
        className={`modal${ukuran === 'sempit' ? ' modal--sempit' : ''}${ukuran === 'lebar' ? ' modal--lebar' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={judulId}
      >
        <div className="modal__kepala">
          <div>
            <h2 id={judulId}>{judul}</h2>
            {subjudul ? <p>{subjudul}</p> : null}
          </div>
          <button
            type="button"
            className="modal__tutup"
            onClick={onTutup}
            aria-label="Tutup dialog"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__isi">{children}</div>
        {kaki ? <div className="modal__kaki">{kaki}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Konfirmasi                                                         */
/* ------------------------------------------------------------------ */

export function Konfirmasi({
  judul,
  children,
  labelKonfirmasi = 'Ya, lanjutkan',
  labelBatal = 'Batal',
  nada = 'bahaya',
  onKonfirmasi,
  onBatal,
}: {
  judul: string;
  children: ReactNode;
  labelKonfirmasi?: string;
  labelBatal?: string;
  nada?: 'bahaya' | 'peringatan';
  onKonfirmasi: () => void;
  onBatal: () => void;
}) {
  return (
    <Modal
      judul={judul}
      ukuran="sempit"
      onTutup={onBatal}
      kaki={
        <>
          <button type="button" className="tbl" onClick={onBatal}>
            {labelBatal}
          </button>
          <button
            type="button"
            className={`tbl ${nada === 'bahaya' ? 'tbl--bahaya' : 'tbl--utama'}`}
            onClick={onKonfirmasi}
          >
            {labelKonfirmasi}
          </button>
        </>
      }
    >
      <div className="konfirmasi__isi">
        <span
          className={`konfirmasi__ikon${nada === 'peringatan' ? ' konfirmasi__ikon--warn' : ''}`}
          aria-hidden="true"
        >
          <AlertTriangle size={16} />
        </span>
        <div className="konfirmasi__teks">{children}</div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Keadaan kosong                                                     */
/* ------------------------------------------------------------------ */

export function Kosong({
  judul,
  teks,
  nada = 'netral',
  ikon,
  aksi,
}: {
  judul: string;
  teks: string;
  nada?: 'netral' | 'warn' | 'bad' | 'accent';
  ikon?: ReactNode;
  aksi?: ReactNode;
}) {
  const kelasIkon =
    nada === 'warn'
      ? 'kosong__ikon kosong__ikon--warn'
      : nada === 'bad'
        ? 'kosong__ikon kosong__ikon--bad'
        : nada === 'accent'
          ? 'kosong__ikon kosong__ikon--accent'
          : 'kosong__ikon';

  return (
    <div className="kosong">
      <div className={kelasIkon} aria-hidden="true">
        {ikon}
      </div>
      <div>
        <h4>{judul}</h4>
        <p>{teks}</p>
      </div>
      {aksi ? <div className="kosong__aksi">{aksi}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bilah pencarian                                                     */
/* ------------------------------------------------------------------ */

export function Cari({
  nilai,
  onUbah,
  placeholder,
  id,
}: {
  nilai: string;
  onUbah: (v: string) => void;
  placeholder: string;
  id?: string;
}) {
  return (
    <div className="bilah__cari">
      <svg
        className="bilah__ikon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="search"
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
    </div>
  );
}