/**
 * Format nilai untuk tampilan Bahasa Indonesia.
 * Semua angka uang disimpan sebagai bilangan bulat rupiah.
 */

const RUPIAH = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const ANGKA = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

const TANGGAL_PANJANG = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const WAKTU = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const BULAN = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
});

export const rupiah = (n: number): string =>
  Number.isFinite(n) ? RUPIAH.format(n) : '—';

export const angka = (n: number): string =>
  Number.isFinite(n) ? ANGKA.format(n) : '—';

/** Ringkas untuk kartu KPI: 1,2 jt / 850 rb. */
export function rupiahRingkas(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${ANGKA.format(Math.round(n / 100_000_000) / 10)} M`;
  if (abs >= 1_000_000) return `Rp ${ANGKA.format(Math.round(n / 100_000) / 10)} jt`;
  if (abs >= 1_000) return `Rp ${ANGKA.format(Math.round(n / 100) / 10)} rb`;
  return rupiah(n);
}

function keDate(nilai: string | Date): Date | null {
  if (nilai instanceof Date) return Number.isNaN(nilai.getTime()) ? null : nilai;
  const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(nilai);
  if (!cocok) return null;
  return new Date(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3]));
}

export const tanggalPanjang = (nilai: string | Date): string => {
  const d = keDate(nilai);
  return d ? TANGGAL_PANJANG.format(d) : String(nilai);
};

export const tanggalPendek = (nilai: string | Date): string => {
  const d = keDate(nilai);
  return d ? TANGGAL_PENDEK.format(d) : String(nilai);
};

export const waktuPendek = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : WAKTU.format(d);
};

export const namaBulan = (d: Date = new Date()): string => BULAN.format(d);

export const tanggalHariIni = (d: Date = new Date()): string =>
  TANGGAL_PANJANG.format(d);

/** "3 hari lalu", "baru saja". */
export function sejak(iso: string, sekarang: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const detik = Math.max(0, Math.floor((sekarang.getTime() - d.getTime()) / 1000));
  if (detik < 60) return 'baru saja';
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  const bulan = Math.floor(hari / 30);
  if (bulan < 12) return `${bulan} bulan lalu`;
  return `${Math.floor(bulan / 12)} tahun lalu`;
}

export function kuantitasSatuan(jumlah: number, satuan: string): string {
  return `${angka(jumlah)} ${satuan}`;
}

/** Deskripsi jarak terhadap stok minimum dalam bahasa sehari-hari. */
export function jarakMinimum(selisih: number, satuan: string): string {
  if (selisih < 0) return `kurang ${angka(Math.abs(selisih))} ${satuan}`;
  if (selisih === 0) return `tepat di batas minimum`;
  return `${angka(selisih)} ${satuan} di atas minimum`;
}

export function persen(nilai: number | null): string {
  if (nilai === null || !Number.isFinite(nilai)) return '—';
  const bulat = Math.round(nilai);
  return `${bulat > 0 ? '+' : ''}${bulat}%`;
}

/** Ukuran berkas yang mudah dibaca manusia. */
export function ukuranBerkas(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}