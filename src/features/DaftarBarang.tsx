/**
 * Halaman Daftar Barang — tabel padat dengan pencarian, filter, pengurutan,
 * dan aksi baris.
 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Trash2,
} from 'lucide-react';
import {
  analitik,
  produkPerluPerhatian,
  saringProduk,
  selisihMinimum,
  statusStok,
  type Urutan,
} from '../domain/aturan';
import type { Gudang, Produk, StatusStok } from '../domain/types';
import { angka, rupiah } from '../platform/format';
import { Cari, Kosong, LencanaStatus } from '../ui/primitif';

export function DaftarBarang({
  gudang,
  onTambah,
  onUbah,
  onHapus,
  onCatat,
  onReset,
  onEkspor,
}: {
  gudang: Gudang;
  onTambah: () => void;
  onUbah: (p: Produk) => void;
  onHapus: (p: Produk) => void;
  onCatat: (p: Produk) => void;
  onReset: () => void;
  onEkspor: () => void;
}) {
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('');
  const [status, setStatus] = useState<StatusStok | 'semua'>('semua');
  const [urut, setUrut] = useState<Urutan>('nama');
  const [naik, setNaik] = useState(true);

  const kategoriList = useMemo(
    () => [...new Set(gudang.produk.map((p) => p.kategori))].sort((a, b) => a.localeCompare(b, 'id')),
    [gudang.produk],
  );

  // dependensi ditulis eksplisit (bukan objek `saring`) supaya useMemo tidak
  // melihat objek baru pada tiap render.
  const hasil = useMemo(
    () => saringProduk(gudang.produk, { kueri: cari, kategori, status, urut, naik }),
    [gudang.produk, cari, kategori, status, urut, naik],
  );
  const perlu = useMemo(() => produkPerluPerhatian(gudang.produk).length, [gudang.produk]);

  const analisisMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof analitik>[number]>();
    for (const a of analitik(gudang.produk, gudang.pergerakan)) m.set(a.produk.id, a);
    return m;
  }, [gudang.produk, gudang.pergerakan]);

  const adaFilter = cari !== '' || kategori !== '' || status !== 'semua';

  const aturUrut = (nilai: Urutan) => {
    if (nilai === urut) setNaik((n) => !n);
    else {
      setUrut(nilai);
      setNaik(true);
    }
  };

  const kosongkanFilter = () => {
    setCari('');
    setKategori('');
    setStatus('semua');
  };

  if (gudang.produk.length === 0) {
    return (
      <>
        <Kepala
          sub={`${gudang.produk.length} SKU tercatat${perlu > 0 ? `, ${perlu} perlu restock` : ''}.`}
          onTambah={onTambah}
          onEkspor={onEkspor}
          bisaEkspor={false}
        />
        <section className="kartu">
          <div className="kartu__isi">
            <Kosong
              judul="Belum ada barang"
              teks="Tambahkan barang pertama Anda, atau muat data contoh dari halaman Data & Cadangan."
              nada="accent"
              ikon={<PackagePlus size={18} />}
              aksi={
                <>
                  <button type="button" className="tbl tbl--utama" onClick={onTambah}>
                    <Plus size={14} aria-hidden="true" />
                    Tambah barang
                  </button>
                  <button type="button" className="tbl" onClick={onReset}>
                    Muat data contoh
                  </button>
                </>
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
        sub={`${gudang.produk.length} SKU tercatat${perlu > 0 ? `, ${perlu} perlu restock` : ''}. Ubah kuantitas lewat pencatatan pergerakan.`}
        onTambah={onTambah}
        onEkspor={onEkspor}
        bisaEkspor
      />

      <section className="kartu">
        <div className="bilah">
          <Cari nilai={cari} onUbah={setCari} placeholder="Cari nama, SKU, atau kategori" id="cari-barang" />
          <div className="bilah__pisah" aria-hidden="true" />
          <select
            className="saring"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            aria-label="Saring kategori"
          >
            <option value="">Semua kategori</option>
            {kategoriList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className="saring"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusStok | 'semua')}
            aria-label="Saring status stok"
          >
            <option value="semua">Semua status</option>
            <option value="aman">Stok aman</option>
            <option value="rendah">Stok rendah</option>
            <option value="habis">Stok habis</option>
          </select>
          {adaFilter ? (
            <button type="button" className="tbl tbl--kecil" onClick={kosongkanFilter}>
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          ) : null}
          <div className="bilah__kanan">
            <button
              type="button"
              className="tbl tbl--kecil"
              onClick={() => aturUrut('nama')}
              data-aktif={urut === 'nama'}
              aria-pressed={urut === 'nama'}
            >
              {urut === 'nama' && naik ? (
                <ArrowDownAZ size={13} aria-hidden="true" />
              ) : (
                <ArrowUpAZ size={13} aria-hidden="true" />
              )}
              Nama
            </button>
            <button
              type="button"
              className="tbl tbl--kecil"
              onClick={() => aturUrut('status')}
              data-aktif={urut === 'status'}
              aria-pressed={urut === 'status'}
              title="Urutkan dari yang paling perlu restock"
            >
              Prioritas
            </button>
          </div>
        </div>

        {hasil.length === 0 ? (
          <div className="kartu__isi">
            <Kosong
              judul="Tidak ada barang yang cocok"
              teks="Coba ubah kata kunci atau atur ulang filter yang dipakai."
              ikon={<SearchX size={18} />}
              aksi={
                <button type="button" className="tbl" onClick={kosongkanFilter}>
                  <RotateCcw size={13} aria-hidden="true" />
                  Atur ulang filter
                </button>
              }
            />
          </div>
        ) : (
          <div className="tabel-bungkus">
            <table className="tabel">
              <caption className="sr-only">
                Daftar barang beserta kuantitas, batas minimum, dan status stok
              </caption>
              <thead>
                <tr>
                  <th scope="col">Barang</th>
                  <th scope="col">Kategori</th>
                  <th scope="col" className="tabel__akhir">
                    <button
                      type="button"
                      className="tabel__susun"
                      onClick={() => aturUrut('stok')}
                      data-aktif={urut === 'stok'}
                    >
                      Stok
                      {urut === 'stok' ? (
                        naik ? (
                          <ArrowDownAZ size={12} aria-hidden="true" />
                        ) : (
                          <ArrowUpAZ size={12} aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="tabel__akhir">
                    Min
                  </th>
                  <th scope="col" className="tabel__akhir">Masa</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="tabel__akhir">
                    <button
                      type="button"
                      className="tabel__susun"
                      onClick={() => aturUrut('nilai')}
                      data-aktif={urut === 'nilai'}
                    >
                      Nilai
                    </button>
                  </th>
                  <th scope="col" className="tabel__aksi">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((p) => {
                  const s = statusStok(p);
                  const a = analisisMap.get(p.id);
                  const nilai = typeof p.biaya === 'number' ? p.kuantitas * p.biaya : null;
                  return (
                    <tr key={p.id} data-perlu={s === 'aman' ? undefined : s}>
                      <td data-label="Barang">
                        <div className="penombol">
                          <span
                            className="penombol__garis"
                            aria-hidden="true"
                            style={{
                              background:
                                s === 'habis'
                                  ? 'var(--bad-500)'
                                  : s === 'rendah'
                                    ? 'var(--warn-500)'
                                    : 'var(--ok-500)',
                            }}
                          />
                          <span style={{ minWidth: 0 }}>
                            <span className="sel-utama">{p.nama}</span>
                            <span className="sku">{p.sku}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Kategori">{p.kategori}</td>
                      <td data-label="Stok" className="tabel__akhir">
                        <strong>{angka(p.kuantitas)}</strong> {p.satuan}
                      </td>
                      <td data-label="Min" className="tabel__akhir">
                        {angka(p.stokMinimum)}
                      </td>
                      <td
                        data-label="Masa stok"
                        className="tabel__akhir"
                        title={
                          a?.lajuKeluar
                            ? `Laju jual ${a.lajuKeluar.toFixed(1)} ${p.satuan} per hari. ${
                                selisihMinimum(p) < 0
                                  ? `Kurang ${Math.abs(selisihMinimum(p))} dari minimum.`
                                  : 'Di atas stok minimum.'
                              }`
                            : 'Tidak ada penjualan 30 hari terakhir'
                        }
                      >
                        {a?.hariMenipis !== null && a?.hariMenipis !== undefined
                          ? `${a.hariMenipis} hr`
                          : '—'}
                      </td>
                      <td data-label="Status">
                        <LencanaStatus status={s} />
                      </td>
                      <td data-label="Nilai" className="tabel__akhir">
                        {nilai === null ? (
                          <span className="teks-lembut" title="Biaya belum diisi">—</span>
                        ) : (
                          rupiah(nilai)
                        )}
                      </td>
                      <td data-label="" className="tabel__aksi">
                        <div className="baris-alat" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button
                            type="button"
                            className="tbl tbl--kecil"
                            onClick={() => onCatat(p)}
                            title={`Catat pergerakan untuk ${p.nama}`}
                          >
                            Catat
                          </button>
                          <button
                            type="button"
                            className="tbl tbl--ikon"
                            onClick={() => onUbah(p)}
                            aria-label={`Ubah ${p.nama}`}
                            title="Ubah barang"
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="tbl tbl--ikon"
                            onClick={() => onHapus(p)}
                            aria-label={`Hapus ${p.nama}`}
                            title="Hapus barang"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </div>
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
            Menampilkan {angka(hasil.length)} dari {angka(gudang.produk.length)} barang
            {perlu > 0 ? (
              <span style={{ color: 'var(--warn-700)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={12} aria-hidden="true" />
                {perlu} di bawah stok minimum
              </span>
            ) : null}
            {adaFilter ? <span className="teks-lembut">filter aktif</span> : null}
          </p>
        ) : null}
      </section>
    </>
  );
}

function Kepala({
  sub,
  onTambah,
  onEkspor,
  bisaEkspor,
}: {
  sub: string;
  onTambah: () => void;
  onEkspor: () => void;
  bisaEkspor: boolean;
}) {
  return (
    <header className="halaman__kepala">
      <div className="halaman__tajuk">
        <h2>Daftar barang</h2>
        <p>{sub}</p>
      </div>
      <div className="halaman__aksi">
        <button
          type="button"
          className="tbl"
          onClick={onEkspor}
          disabled={!bisaEkspor}
          title={!bisaEkspor ? 'Belum ada barang untuk diekspor.' : 'Ekspor daftar barang sebagai CSV'}
        >
          <Download size={14} aria-hidden="true" />
          Ekspor CSV
        </button>
        <button type="button" className="tbl tbl--utama" onClick={onTambah}>
          <Plus size={14} aria-hidden="true" />
          Tambah barang
        </button>
      </div>
    </header>
  );
}