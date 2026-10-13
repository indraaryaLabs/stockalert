/**
 * Pintasan keyboard global.
 *
 * Semuanya memakai ⌘ (Ctrl di Windows/Linux). Handler mengabaikan ketikan
 * yang sedang berlangsung di medan isian atau area teks agar pintasan tidak
 * membatalkan pengetikan pengguna.
 */

import { useEffect, useRef } from 'react';

export type Combinasi =
  | { ctrl?: boolean; shift?: boolean; alt?: boolean; kunci: string };

export function platformMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
}

/** Teks yang ditampilkan pada tooltip/legend, mis. "⌘K" atau "Ctrl K". */
export function labelKunci(kunci: string, opsi: Omit<Combinasi, 'kunci'> = {}): string {
  const mac = platformMac();
  const bagian: string[] = [];
  if (opsi.ctrl) bagian.push(mac ? '⌘' : 'Ctrl');
  if (opsi.alt) bagian.push(mac ? '⌥' : 'Alt');
  if (opsi.shift) bagian.push(mac ? '⇧' : 'Shift');
  bagian.push(kunci.toUpperCase());
  return bagian.join(mac ? '' : '+');
}

function adalahBidangTeks(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Mendaftarkan satu pintasan global.
 * `leased` mengembalikan true bila ada dialog yang sedang terbuka sehingga
 * pintasan diabaikan (mis. ⌘K saat modal aktif).
 */
export function usePintasan(
  kombinasi: Combinasi,
  jalankan: () => void,
  leased?: () => boolean,
): void {
  const jalankanRef = useRef(jalankan);
  const leasedRef = useRef(leased);

  useEffect(() => {
    jalankanRef.current = jalankan;
    leasedRef.current = leased;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (leasedRef.current?.()) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl !== Boolean(kombinasi.ctrl)) return;
      if (e.altKey !== Boolean(kombinasi.alt)) return;
      if (e.shiftKey !== Boolean(kombinasi.shift)) return;
      if (e.key.toLowerCase() !== kombinasi.kunci.toLowerCase()) return;
      // Jangan potong jalan ketikan biasa di dalam medan teks.
      if (adalahBidangTeks(e.target) && !(kombinasi.ctrl && kombinasi.shift)) return;
      // Jangan tangkap Tab, yang berfungsi memindahkan fokus.
      if (kombinasi.kunci === 'Tab') return;

      e.preventDefault();
      jalankanRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [kombinasi.kunci, kombinasi.ctrl, kombinasi.alt, kombinasi.shift]);
}