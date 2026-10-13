/**
 * Halaman Riwayat Pergerakan — buku besar stok dengan pencarian dan filter.
 */

import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Download, Plus, RotateCcw, SearchX } from 'lucide-react';
import { saringPergerakan, type SaringPergerakan } from '../domain/aturan';
import type { Gudang } from '../domain/types';
import { angka } from '../platform/format';
import { Cari, Kosong, Lencana } from '../ui/primitif';

const AWAL: SaringPergerakan = { kueri: '', tipe: 'semua', dari: '', sampai: '' };

export function RiwayatPergerakan({
  gudang,
  onCatat,
  onEkspor,
}: {
  gudang: Gudang;
  onCatat: () => void;
  onEkspor: () => void;
}) {
  const [saring, setSaring] = useState<SaringPergerakan>(AWAL);
  const indeks = useMemo(() => new Map(gudang.produk.map((p) => [p.id, p])), [gudang.produk]);

  const hasil = useMemo(
    () => saringPergerakan(gudang.pergerakan, gudang.produk, saring),
    [gudang.pergerakan, gudang.produk, saring],
  );

  const set = <K extends keyof SaringPergerakan>(k: K, v: SaringPergerakan[K]) =>
    setSaring((s) => ({ ...s, [k]: v }));

  const adaFilter = saring.kueri !== '' || saring.tipe !== 'semua' || Boolean(saring.dari) || Boolean(saring.sampai);
  const rentangSalah = Boolean(saring.dari) && Boolean(saring.sampai) && (saring.dari ?? '') > (saring.sampai ?? '');

  const totalMasuk = hasil.filter((m) => m.tipe === 'masuk').reduce((t, m) => t + m.jumlah, 0);
  const totalKeluar = hasil.filter((m) => m.tipe === 'keluar').reduce((t, m) => t + m.jumlah, 0);

  if (gudang.produk.length === 0) {
    return (
      <>
        <Kepala sub="Belum ada barang untuk dilacak." onCatat={onCatat} onEkspor={onEkspor} bisa={false} />
        <section className="kartu">
          <div className="kartu__isi">
            <Kosong
              judul="Belum ada barang untuk dilacak"
              teks="Tambahkan barang terlebih dahulu. Setiap barang baru otomatis punya catatan stok awal."
              nada="accent"
              ikon={<CalendarDays size={18} />}
              aksi={
                <button type="button" className="tbl tbl--utama" onClick={onCatat} disabled>
                  <Plus size={14} aria-hidden="true" />
                  Catat pergerakan
                </button>
              }
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Kepala
        sub={`${angka(gudang.pergerakan.length)} catatan stok masuk dan keluar.`}
        onCatat={onCatat}
        onEkspor={onEkspor}
        bisa={gudang.pergerakan.length > 0}
      />

      <section className="kartu">
        <div className="bilah">
          <Cari nilai={saring.kueri ?? ''} onUbah={(v) => set('kueri', v)} placeholder="Cari nama, SKU, referensi, catatan" id="cari-riwayat" />
          <div className="segmen" role="group" aria-label="Saring tipe pergerakan">
            {(['semua', 'masuk', 'keluar'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={saring.tipe === t ? 'segmen__on' : ''}
                onClick={() => set('tipe', t)}
                aria-pressed={saring.tipe === t}
              >
                {t === 'semua' ? 'Semua' : t === 'masuk' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>
          <div className="bilah__pisah" aria-hidden="true" />
          <input
            type="date"
            className="medan__kontrol"
            style={{ width: 'auto' }}
            value={saring.dari ?? ''}
            onChange={(e) => set('dari', e.target.value)}
            aria-label="Dari tanggal"
            title="Dari tanggal"
          />
          <input
            type="date"
            className="medan__kontrol"
            style={{ width: 'auto' }}
            value={saring.sampai ?? ''}
            onChange={(e) => set('sampai', e.target.value)}
            aria-label="Sampai tanggal"
            title="Sampai tanggal"
          />
          {adaFilter ? (
            <button type="button" className="tbl tbl--kecil" onClick={() => setSaring(AWAL)}>
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>

        {rentangSalah ? (
          <div style={{ padding: 'var(--sp-4) var(--sp-7) 0' }}>
            <p className="medan__galat" role="alert">
              <SearchX size={12} aria-hidden="true" />
              Tanggal awal lebih besar dari tanggal akhir. Cek ulang rentang yang dipilih.
            </p>
          </div>
        ) : null}

        {hasil.length === 0 ? (
          <div className="kartu__isi">
            <Kosong
              judul="Tidak ada pergerakan yang cocok"
              teks="Belum ada catatan yang sesuai dengan pencarian atau rentang tanggal ini."
              ikon={<SearchX size={18} />}
              aksi={
                <>
                  <button type="button" className="tbl" onClick={() => setSaring(AWAL)}>
                    <RotateCcw size={13} aria-hidden="true" />
                    Reset filter
                  </button>
                  <button type="button" className="tbl tbl--utama" onClick={onCatat}>
                    <Plus size={13} aria-hidden="true" />
                    Catat pergerakan
                  </button>
                </>
              }
            />
          </div>
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <caption className="sr-only">Riwayat pergerakan stok masuk dan keluar</caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Barang</th>
                  <th scope="col">Tipe</th>
                  <th scope="col" className="tabel__akhir">Jumlah</th>
                  <th scope="col">Referensi</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((m) => {
                  const p = indeks.get(m.produkId);
                  const masuk = m.tipe === 'masuk';
                  return (
                    <tr key={m.id}>
                      <td data-label="Tanggal" className="teks-nowrap">{m.tanggal}</td>
                      <td data-label="Barang">
                        <span className="sel-utama">{p?.nama ?? 'Barang tidak ditemukan'}</span>
                        <span className="sku">{p?.sku ?? '—'}</span>
                      </td>
                      <td data-label="Tipe">
                        <Lencana warna={masuk ? 'masuk' : 'keluar'}>
                          {masuk ? (
                            <ArrowDownToLine size={11} aria-hidden="true" />
                          ) : (
                            <ArrowUpFromLine size={11} aria-hidden="true" />
                          )}
                          {masuk ? 'Masuk' : 'Keluar'}
                        </Lencana>
                      </td>
                      <td
                        data-label="Jumlah"
                        className="tabel__akhir"
                        style={{ fontWeight: 600, color: masuk ? 'var(--ok-600)' : 'var(--ink)' }}
                      >
                        {masuk ? '+' : '−'}
                        {angka(m.jumlah)} {p?.satuan ?? ''}
                      </td>
                      <td data-label="Referensi">
                        {m.referensi ? <span className="sku">{m.referensi}</span> : <span className="teks-lembut">—</span>}
                      </td>
                      <td data-label="Catatan">
                        <span className="teks-nowrap" style={{ display: 'block', maxWidth: 240 }} title={m.catatan}>
                          {m.catatan || <span className="teks-lembut">—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasil.length > 0 ? (
          <p className="kartu__kaki">
            <CalendarDays size={13} aria-hidden="true" />
            Menampilkan {angka(hasil.length)} dari {angka(gudang.pergerakan.length)} catatan · masuk{' '}
            {angka(totalMasuk)}, keluar {angka(totalKeluar)}
          </p>
        ) : null}
      </section>
    </>
  );
}

function Kepala({
  sub,
  onCatat,
  onEkspor,
  bisa,
}: {
  sub: string;
  onCatat: () => void;
  onEkspor: () => void;
  bisa: boolean;
}) {
  return (
    <header className="halaman__kepala">
      <div className="halaman__tajuk">
        <h2>Pergerakan stok</h2>
        <p>{sub}</p>
      </div>
      <div className="halaman__aksi">
        <button
          type="button"
          className="tbl"
          onClick={onEkspor}
          disabled={!bisa}
          title={!bisa ? 'Belum ada pergerakan untuk diekspor.' : 'Ekspor riwayat sebagai CSV'}
        >
          <Download size={14} aria-hidden="true" />
          Ekspor CSV
        </button>
        <button type="button" className="tbl tbl--utama" onClick={onCatat}>
          <Plus size={14} aria-hidden="true" />
          Catat pergerakan
        </button>
      </div>
    </header>
  );
}