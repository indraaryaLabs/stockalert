/**
 * Dasbor — sapa, empat metrik berilmu akhirzx, dan panel tindakan.
 *
 * Semua angka berasal dari state saat ini; tidak ada angka dummy.
 */

import { useMemo, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleCheck,
  Download,
  PackagePlus,
  Sparkles,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  analitik,
  produkPerluPerhatian,
  ringkasan,
  selisihMinimum,
  statusStok,
} from '../domain/aturan';
import type { Gudang } from '../domain/types';
import { angka, jarakMinimum, namaBulan, rupiah } from '../platform/format';
import { eksporProdukCsv } from '../platform/ekspor';
import { Kosong, LencanaStatus } from '../ui/primitif';
import { GrafikArea, GrafikCincin, SparkBatang } from '../ui/grafik';
import { hitungTren } from './tren';

/** Warna kategori yang bergilir; konsisten berdasarkan urutan kategori. */
const WARNA_KATEGORI = [
  'var(--accent)',
  '#2f6fd0',
  '#7a5af0',
  '#0f9d8f',
  '#d9a400',
  '#d0432c',
  '#5b8c3a',
  '#8a6bd0',
];

function warnaKategori(i: number): string {
  return WARNA_KATEGORI[i % WARNA_KATEGORI.length];
}

export function Dasbor({
  gudang,
  onPindah,
  onCatat,
  onTambah,
}: {
  gudang: Gudang;
  onPindah: (halaman: string) => void;
  onCatat: (produkId?: string) => void;
  onTambah: () => void;
}) {
  const ringkas = useMemo(() => ringkasan(gudang), [gudang]);
  const perlu = useMemo(() => produkPerluPerhatian(gudang.produk), [gudang.produk]);
  const analisis = useMemo(() => analitik(gudang.produk, gudang.pergerakan), [gudang]);

  // Saran pemesaran: barang menipis yang laju jualnya nyata.
  const saran = useMemo(
    () =>
      analisis
        .filter((a) => a.saranPesan !== null && a.saranPesan > 0 && a.produk.kuantitas <= a.produk.stokMinimum)
        .sort((a, b) => (b.saranPesan ?? 0) - (a.saranPesan ?? 0))
        .slice(0, 5),
    [analisis],
  );

  const lambat = useMemo(
    () => analisis.filter((a) => a.lambat || (a.motionless && a.produk.kuantitas > 0)),
    [analisis],
  );

  const tren = useMemo(() => hitungTren(gudang), [gudang]);
  const totalKategori = ringkas.perKategori.length;

  const ekspor = () => {
    try {
      eksporProdukCsv(gudang);
    } catch {
      /* ditangani caller */
    }
  };

  if (gudang.produk.length === 0) {
    return (
      <>
        <Sapaan sub="Belum ada barang tercatat. Mulai dengan menambah barang pertama, lalu catat stok masuk dan keluar." />
        <section className="kartu">
          <div className="kartu__isi">
            <Kosong
              judul="Belum ada barang tercatat"
              teks="Tambahkan barang pertama Anda, atau muat data contoh dari halaman Data & Cadangan."
              nada="accent"
              ikon={<Boxes size={18} />}
              aksi={
                <>
                  <button type="button" className="tbl tbl--primer" onClick={onTambah}>
                    <PackagePlus size={14} aria-hidden="true" />
                    Tambah barang pertama
                  </button>
                  <button type="button" className="tbl" onClick={() => onPindah('data')}>
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
      <Sapaan
        sub="Ringkasan persediaan, saran pemesanan, dan komposisi nilai toko Anda hari ini."
        aksi={
          <>
            <button type="button" className="tbl" onClick={ekspor}>
              <Download size={14} aria-hidden="true" />
              Ekspor CSV
            </button>
            <button type="button" className="tbl tbl--primer" onClick={onTambah}>
              <PackagePlus size={14} aria-hidden="true" />
              Tambah barang
            </button>
          </>
        }
      />

      {/* Empat metrik, tiap kartu punya grafik kecil */}
      <section className="metrik" aria-label="Angka utama">
        <article className="metrik__sel">
          <div className="metrik__kepala">
            <span className="metrik__label">Total SKU aktif</span>
            <span className="metrik__ikon" aria-hidden="true">
              <Boxes size={14} />
            </span>
          </div>
          <p className="metrik__nilai">
            {angka(ringkas.totalProduk)}
            <span className="metrik__satuan">/ {totalKategori} kategori</span>
          </p>
          <div className="metrik__kaki">
            <span className="metrik__catatan">{angka(ringkas.totalUnit)} unit di gudang</span>
            <SparkBatang
              nilai={tren.unit}
              label={`Total unit enam bulan terakhir: ${tren.unit.join(', ')}`}
            />
          </div>
        </article>

        <article className="metrik__sel">
          <div className="metrik__kepala">
            <span className="metrik__label">Nilai persediaan</span>
            <span className="metrik__ikon" aria-hidden="true">
              <Wallet size={14} />
            </span>
          </div>
          <p className="metrik__nilai">{rupiah(ringkas.nilai.total)}</p>
          <div className="metrik__kaki">
            <span className="metrik__catatan">
              Angka indikatif (kuantitas × biaya), bukan pembukuan resmi.
            </span>
          </div>
        </article>

        <article className={`metrik__sel${perlu.length > 0 ? ' metrik__sel--perhatian' : ''}`}>
          <div className="metrik__kepala">
            <span className="metrik__label">Perlu restock</span>
            <span
              className={`metrik__ikon ${ringkas.stokHabis > 0 ? 'metrik__ikon--bad' : 'metrik__ikon--warn'}`}
              aria-hidden="true"
            >
              <AlertTriangle size={14} />
            </span>
          </div>
          <p className="metrik__nilai">{angka(perlu.length)}</p>
          <div className="metrik__kaki">
            <span className="metrik__catatan">
              {ringkas.stokHabis} habis · {perlu.length - ringkas.stokHabis} menipis
            </span>
            <SparkBatang
              nilai={tren.restock}
              warna="var(--warn)"
              label={`Barang perlu restock enam bulan terakhir: ${tren.restock.join(', ')}`}
            />
          </div>
        </article>

        <article className="metrik__sel">
          <div className="metrik__kepala">
            <span className="metrik__label">Transaksi {namaBulan()}</span>
            <span className="metrik__ikon" aria-hidden="true">
              <TrendingDown size={14} />
            </span>
          </div>
          <p className="metrik__nilai">
            {angka(ringkas.bulanIni.keluar)}
            <span className="metrik__satuan">unit keluar</span>
          </p>
          <div className="metrik__kaki">
            <span className="metrik__catatan">
              Masuk {angka(ringkas.bulanIni.masuk)} · {angka(ringkas.bulanIni.catatan)} catatan
            </span>
            <SparkBatang
              nilai={tren.keluar}
              label={`Unit keluar enam bulan terakhir: ${tren.keluar.join(', ')}`}
            />
          </div>
        </article>
      </section>

      {/* Saran pemesaran otomatis */}
      {saran.length > 0 ? (
        <section className="pita pita--aksen" aria-label="Saran pemesanan">
          <span className="pita__ikon" aria-hidden="true">
            <Sparkles size={14} />
          </span>
          <div className="pita__isi">
            <strong>Saran pemesanan dari laju jual 30 hari terakhir</strong>
            <p>
              {saran
                .map(
                  (a) =>
                    `${a.produk.nama} ±${a.saranPesan} ${a.produk.satuan} (stok ${angka(a.produk.kuantitas)})`,
                )
                .join(' · ')}{' '}
              — agar stok bertahan 30 hari ke depan.
            </p>
          </div>
          <div className="pita__aksi">
            <button type="button" className="tbl tbl--kecil" onClick={() => onPindah('barang')}>
              Lihat barang
            </button>
            <button
              type="button"
              className="tbl tbl--kecil tbl--primer"
              onClick={() => onCatat(saran[0]?.produk.id)}
            >
              <PackagePlus size={13} aria-hidden="true" />
              Catat stok masuk
            </button>
          </div>
        </section>
      ) : null}

      <div className="g2">
        {/* Tren stok */}
        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Tren pergerakan stok</h3>
              <p>Unit masuk dan keluar per minggu, 12 minggu terakhir</p>
            </div>
          </div>
          <div className="kartu__isi pilha-6">
            <div className="baris-alat">
              <div className="metrik__tren metrik__tren--naik">
                <ArrowRight size={13} aria-hidden="true" />
                Masuk {angka(tren.totalMasuk)}
              </div>
              <div className="metrik__tren metrik__tren--turun">
                Keluar {angka(tren.totalKeluar)}
              </div>
            </div>

            <div style={{ height: 200 }}>
              <GrafikArea data={tren.seri} formatNilai={angka} />
            </div>
            <div className="sumbu" aria-hidden="true">
              {tren.seri.map((t, i) => (
                <span key={i}>{t.label}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Komposisi nilai */}
        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Komposisi nilai</h3>
              <p>Berdasarkan nilai persediaan indikatif</p>
            </div>
            <button
              type="button"
              className="tbl tbl--ikon"
              onClick={ekspor}
              aria-label="Ekspor produk ke CSV"
              title="Ekspor CSV"
            >
              <Download size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="kartu__isi pilha-7">
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <GrafikCincin
                segmen={ringkas.perKategori.map((k, i) => ({
                  label: k.kategori,
                  nilai: k.nilai,
                  warna: warnaKategori(i),
                }))}
              />
            </div>

            <div className="pilha-5">
              {ringkas.perKategori.map((k, i) => {
                const persen =
                  ringkas.nilai.total > 0 ? (k.nilai / ringkas.nilai.total) * 100 : 0;
                return (
                  <div className="pilha-3" key={k.kategori}>
                    <div className="batang-baris__atas">
                      <span className="baris-alat" style={{ gap: 8 }}>
                        <span
                          className="titik-kategori"
                          style={{ background: warnaKategori(i) }}
                          aria-hidden="true"
                        />
                        <span>{k.kategori}</span>
                        <span className="teks-redup teks-kecil">{k.jumlah} SKU</span>
                      </span>
                      <span className="batang-baris__nilai">{rupiah(k.nilai)}</span>
                    </div>
                    <div className="progres" style={{ height: 5 }}>
                      <div
                        className="progres__isi"
                        style={{ width: `${Math.max(persen, 1.5)}%`, background: warnaKategori(i) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="g2">
        {/* Barang paling kritis */}
        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Barang perlu restock</h3>
              <p>Diurutkan dari yang paling kritis.</p>
            </div>
            <button type="button" className="tbl tbl--kecil" onClick={() => onPindah('barang')}>
              Semua barang
            </button>
          </div>
          <div className="kartu__isi">
            {perlu.length === 0 ? (
              <Kosong
                judul="Semua stok aman"
                teks="Tidak ada barang yang kuantitasnya menyentuh stok minimum."
                nada="accent"
                ikon={<CircleCheck size={18} />}
              />
            ) : (
              <div className="daftar">
                {perlu.slice(0, 6).map((p) => (
                  <div className="daftar__baris" key={p.id}>
                    <span className="daftar__ikon" aria-hidden="true">
                      <Boxes size={14} />
                    </span>
                    <div className="daftar__isi">
                      <p className="daftar__judul">{p.nama}</p>
                      <p className="daftar__meta">
                        {p.sku} · {jarakMinimum(selisihMinimum(p), p.satuan)}
                      </p>
                    </div>
                    <div className="daftar__kanan">
                      {angka(p.kuantitas)} {p.satuan}
                      <div style={{ marginTop: 5 }}>
                        <LencanaStatus status={statusStok(p)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tbl tbl--kecil"
                      onClick={() => onCatat(p.id)}
                      aria-label={`Catat stok masuk untuk ${p.nama}`}
                    >
                      <PackagePlus size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {perlu.length > 6 ? (
            <p className="kartu__kaki">
              Menampilkan 6 dari {perlu.length} barang.
              <button
                type="button"
                className="tbl tbl--halus tbl--kecil"
                onClick={() => onPindah('barang')}
              >
                Buka daftar <ArrowRight size={12} aria-hidden="true" />
              </button>
            </p>
          ) : null}
        </section>

        {/* Barang lambat */}
        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Barang lambat bergerak</h3>
              <p>Stok melimpah bila dibanding laju jual.</p>
            </div>
          </div>
          <div className="kartu__isi">
            {lambat.length === 0 ? (
              <Kosong
                judul="Tidak ada barang lambat"
                teks="Semua barang bergerak sesuai laju jual saat ini."
                                ikon={<CircleCheck size={18} />}
              />
            ) : (
              <div className="daftar">
                {lambat.slice(0, 5).map((a) => (
                  <div className="daftar__baris" key={a.produk.id}>
                    <div className="daftar__isi">
                      <p className="daftar__judul">{a.produk.nama}</p>
                      <p className="daftar__meta">
                        {a.lajuKeluar > 0
                          ? `Stok untuk ${Math.floor(a.produk.kuantitas / a.lajuKeluar)} hari`
                          : 'Tidak ada penjualan 30 hari terakhir'}
                      </p>
                    </div>
                    <div className="daftar__kanan">
                      {a.nilai === null ? '—' : rupiah(a.nilai)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
    );
}

export function Sapaan({ sub, aksi }: { sub: string; aksi?: ReactNode }) {
  return (
    <div className="sapaan">
      <div className="sapaan__teks">
        <h2>Selamat datang kembali</h2>
        <p>{sub}</p>
      </div>
      {aksi ? <div className="sapaan__aksi">{aksi}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

