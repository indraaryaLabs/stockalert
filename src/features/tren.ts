/**
 * Tren 12 minggu terakhir, dihitung langsung dari riwayat pergerakan.
 *
 * Dipisah dari komponen agar mudah diuji dan tidak menghitung ulang di dalam
 * render. Empat belas hari pertama data contoh memang belum ada catatan,
 * jadi ember mingguan dipilih agar seluruh titik punya data nyata.
 */

import type { Gudang } from '../domain/types';
import type { TitikGrafik } from '../ui/grafik';

export interface Tren {
  /** Seri untuk grafik area (unit keluar per minggu). */
  seri: TitikGrafik[];
  /** Total stok di akhir tiap minggu (untuk sparkline). */
  unit: number[];
  /** Unit keluar per minggu (untuk sparkline). */
  keluar: number[];
  /** Unit masuk per minggu (untuk sparkline). */
  masuk: number[];
  /** Jumlah barang yang perlu restock pada tiap minggu. */
  restock: number[];
  totalMasuk: number;
  totalKeluar: number;
  /** Nilai maksimum seri, dipakai untuk sumbu. */
  maksimum: number;
}

const JUMLAH_MINGGU = 12;
const HARI_PER_MINGGU = 7;

function akhirMinggu(d: Date, mundurMinggu: number): Date {
  const akhirHariIni = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  akhirHariIni.setDate(akhirHariIni.getDate() - mundurMinggu * HARI_PER_MINGGU);
  return akhirHariIni;
}

export function hitungTren(gudang: Gudang): Tren {
  const skrg = new Date();
  const seri: TitikGrafik[] = [];
  const unit: number[] = [];
  const keluar: number[] = [];
  const masuk: number[] = [];
  const restock: number[] = [];
  let totalMasuk = 0;
  let totalKeluar = 0;

  for (let i = JUMLAH_MINGGU - 1; i >= 0; i--) {
    // Minggu berakhir pada `selesai` dan mulai 7 hari sebelumnya.
    const selesai = akhirMinggu(skrg, i);
    const mulai = new Date(selesai);
    mulai.setDate(mulai.getDate() - HARI_PER_MINGGU);

    const mulaiWaktu = new Date(
      mulai.getFullYear(),
      mulai.getMonth(),
      mulai.getDate(),
    ).getTime();
    const selesaiWaktu = new Date(
      selesai.getFullYear(),
      selesai.getMonth(),
      selesai.getDate(),
      23,
      59,
      59,
    ).getTime();

    let unitIn = 0;
    let unitOut = 0;
    for (const p of gudang.pergerakan) {
      const t = new Date(`${p.tanggal}T00:00:00`).getTime();
      if (t < mulaiWaktu || t > selesaiWaktu) continue;
      if (p.tipe === 'masuk') unitIn += p.jumlah;
      else unitOut += p.jumlah;
    }

    // Stok dan status pada akhir minggu tersebut.
    let stokAkhir = 0;
    let perluAkhir = 0;
    for (const p of gudang.produk) {
      let hitung = 0;
      for (const m of gudang.pergerakan) {
        if (m.produkId !== p.id) continue;
        const t = new Date(`${m.tanggal}T00:00:00`).getTime();
        if (t > selesaiWaktu) continue;
        hitung += m.tipe === 'masuk' ? m.jumlah : -m.jumlah;
      }
      hitung = Math.max(0, hitung);
      stokAkhir += hitung;
      if (hitung > 0 && hitung <= p.stokMinimum) perluAkhir += 1;
    }

    const label = mulai.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    seri.push({ label, nilai: unitOut });
    unit.push(stokAkhir);
    keluar.push(unitOut);
    masuk.push(unitIn);
    restock.push(perluAkhir);
    totalMasuk += unitIn;
    totalKeluar += unitOut;
  }

  return {
    seri,
    unit,
    restock,
    masuk,
    keluar,
    totalMasuk,
    totalKeluar,
    maksimum: Math.max(...seri.map((s) => s.nilai), 1),
  };
}
