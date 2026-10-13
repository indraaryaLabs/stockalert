/**
 * Halaman Data & Cadangan — ekspor, impor, dan pemulihan.
 */

import { useRef, useState } from 'react';
import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  FileJson,
  HardDrive,
  Info,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Gudang } from '../domain/types';
import { ringkasan } from '../domain/aturan';
import { angka, rupiah, ukuranBerkas } from '../platform/format';

export function DataCadangan({
  gudang,
  sumber,
  ukuran,
  galatSimpan,
  onEksporJson,
  onEksporCsv,
  onImpor,
  onResetDemo,
  onKosongkan,
}: {
  gudang: Gudang;
  sumber: 'penyimpanan' | 'seed' | 'pulih';
  ukuran: number;
  galatSimpan: string | null;
  onEksporJson: () => void;
  onEksporCsv: (jenis: 'produk' | 'pergerakan') => void;
  onImpor: (teks: string, nama: string) => void;
  onResetDemo: () => void;
  onKosongkan: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [galatImpor, setGalatImpor] = useState<string | null>(null);
  const [namaBerkas, setNamaBerkas] = useState<string | null>(null);
  const ringkas = ringkasan(gudang);

  const pilihBerkas = async (berkas: File | undefined) => {
    if (!berkas) return;
    setNamaBerkas(berkas.name);
    setGalatImpor(null);
    if (!berkas.name.toLowerCase().endsWith('.json')) {
      setGalatImpor('Format tidak didukung. Pilih berkas cadangan berekstensi .json.');
      return;
    }
    try {
      onImpor(await berkas.text(), berkas.name);
    } catch {
      setGalatImpor('Berkas gagal dibaca. Data saat ini tidak berubah.');
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <header className="halaman__kepala">
        <div className="halaman__tajuk">
          <h2>Data &amp; cadangan</h2>
          <p>
            Semua data hidup di browser perangkat ini. Unduh cadangan secara berkala agar riwayat
            stok tidak hilang saat cache browser dibersihkan.
          </p>
        </div>
      </header>

      {galatSimpan ? (
        <div className="pita pita--bad" role="alert">
          <span className="pita__ikon" aria-hidden="true">
            <AlertTriangle size={14} />
          </span>
          <div className="pita__isi">
            <strong>Gagal menyimpan otomatis</strong>
            <p>{galatSimpan}</p>
          </div>
        </div>
      ) : null}

      {sumber === 'pulih' ? (
        <div className="pita" role="alert">
          <span className="pita__ikon" aria-hidden="true">
            <AlertTriangle size={14} />
          </span>
          <div className="pita__isi">
            <strong>Data sebelumnya tidak terbaca</strong>
            <p>Data contoh dimuat sebagai gantinya. Ekspor cadangan secara berkala untuk menghindari ini.</p>
          </div>
        </div>
      ) : null}

      <section className="kartu">
        <div className="kartu__kepala">
          <div>
            <h3>Ringkasan data tersimpan</h3>
            <p>Diperbarui otomatis setiap ada perubahan.</p>
          </div>
          <span className="len len--accent">
            <HardDrive size={12} aria-hidden="true" />
            {ukuranBerkas(ukuran)} di localStorage
          </span>
        </div>
        <div className="kartu__isi">
          <div className="info-grid">
            <div>
              <p className="info-sel__label">Barang</p>
              <p className="info-sel__nilai">{angka(ringkas.totalProduk)}</p>
            </div>
            <div>
              <p className="info-sel__label">Pergerakan</p>
              <p className="info-sel__nilai">{angka(gudang.pergerakan.length)}</p>
            </div>
            <div>
              <p className="info-sel__label">Kategori</p>
              <p className="info-sel__nilai">{angka(ringkas.perKategori.length)}</p>
            </div>
            <div>
              <p className="info-sel__label">Nilai persediaan</p>
              <p className="info-sel__nilai">{rupiah(ringkas.nilai.total)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="g2">
        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Ekspor data</h3>
              <p>CSV untuk diolah di Excel, JSON untuk cadangan penuh.</p>
            </div>
          </div>
          <div className="kartu__isi pilha-6">
            <div className="penombol" style={{ alignItems: 'flex-start' }}>
              <span className="daftar__ikon" aria-hidden="true">
                <FileJson size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="sel-utama">Cadangan lengkap (JSON)</p>
                <p className="medan__bantuan" style={{ marginBottom: 'var(--sp-5)' }}>
                  Seluruh barang, riwayat pergerakan, dan batas minimum. Berkas inilah yang dipakai
                  saat memilih &ldquo;Impor cadangan&rdquo;.
                </p>
                <button type="button" className="tbl tbl--utama tbl--kecil" onClick={onEksporJson}>
                  <Download size={13} aria-hidden="true" />
                  Unduh cadangan JSON
                </button>
              </div>
            </div>

            <div className="penombol" style={{ alignItems: 'flex-start' }}>
              <span className="daftar__ikon" aria-hidden="true">
                <Download size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="sel-utama">Tabel CSV</p>
                <p className="medan__bantuan" style={{ marginBottom: 'var(--sp-5)' }}>
                  Pemisah titik koma dan BOM UTF-8 agar langsung rapi dibuka di Excel versi Indonesia.
                </p>
                <div className="baris-alat">
                  <button
                    type="button"
                    className="tbl tbl--kecil"
                    onClick={() => onEksporCsv('produk')}
                    disabled={gudang.produk.length === 0}
                    title={gudang.produk.length === 0 ? 'Belum ada barang.' : 'Unduh daftar barang'}
                  >
                    Daftar barang
                  </button>
                  <button
                    type="button"
                    className="tbl tbl--kecil"
                    onClick={() => onEksporCsv('pergerakan')}
                    disabled={gudang.pergerakan.length === 0}
                    title={gudang.pergerakan.length === 0 ? 'Belum ada pergerakan.' : 'Unduh riwayat'}
                  >
                    Riwayat pergerakan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="kartu">
          <div className="kartu__kepala">
            <div>
              <h3>Impor cadangan</h3>
              <p>Berkas JSON hasil ekspor StockAlert.</p>
            </div>
          </div>
          <div className="kartu__isi pilha-6">
            <div className="unggah">
              <span className="kosong__ikon kosong__ikon--accent" aria-hidden="true">
                <Upload size={17} />
              </span>
              <div>
                <p className="sel-utama">Pilih berkas JSON</p>
                <p className="medan__bantuan" style={{ marginTop: 'var(--sp-2)' }}>
                  Isi berkas diperiksa lebih dulu. Berkas yang tidak valid ditolak tanpa mengubah
                  data yang ada.
                </p>
              </div>
              <input
                ref={input}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void pilihBerkas(e.target.files?.[0])}
                aria-label="Pilih berkas cadangan JSON"
              />
              {namaBerkas ? <p className="teks-kecil teks-mlm">Berkas: {namaBerkas}</p> : null}
            </div>
            {galatImpor ? (
              <div className="pita pita--bad" role="alert">
                <span className="pita__ikon" aria-hidden="true">
                  <AlertTriangle size={14} />
                </span>
                <div className="pita__isi">
                  <strong>Impor ditolak</strong>
                  <p>{galatImpor}</p>
                </div>
              </div>
            ) : null}
            <ol className="langkah">
              <li>Unduh cadangan JSON dari perangkat ini secara berkala.</li>
              <li>Pindahkan berkas ke perangkat atau komputer lain bila perlu.</li>
              <li>Pilih berkas tersebut di sini saat ingin memulihkan data.</li>
            </ol>
          </div>
        </section>
      </div>

      <section className="kartu">
        <div className="kartu__kepala">
          <div>
            <h3>Pulihkan &amp; bersihkan</h3>
            <p>Aksi di sini menghapus data dan tidak bisa dibatalkan tanpa cadangan.</p>
          </div>
        </div>
        <div className="kartu__isi pilha-6">
          <div className="penombol" style={{ alignItems: 'flex-start' }}>
            <span className="daftar__ikon" aria-hidden="true" style={{ color: 'var(--accent-600)' }}>
              <DatabaseBackup size={14} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="sel-utama">Reset ke data demo</p>
              <p className="medan__bantuan" style={{ marginBottom: 'var(--sp-5)' }}>
                Mengembalikan {angka(ringkas.totalProduk)} barang contoh beserta riwayat. Semua
                data yang Anda buat sendiri akan hilang.
              </p>
              <button type="button" className="tbl tbl--kecil" onClick={onResetDemo}>
                <RotateCcw size={13} aria-hidden="true" />
                Reset data demo
              </button>
            </div>
          </div>

          <div className="penombol" style={{ alignItems: 'flex-start' }}>
            <span className="daftar__ikon" aria-hidden="true" style={{ color: 'var(--bad-600)' }}>
              <Trash2 size={14} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="sel-utama">Kosongkan semua data</p>
              <p className="medan__bantuan" style={{ marginBottom: 'var(--sp-5)' }}>
                Menghapus seluruh barang dan riwayat, lalu menyisakan aplikasi kosong untuk diisi dari
                nol.
              </p>
              <button
                type="button"
                className="tbl tbl--kecil tbl--bahaya"
                onClick={onKosongkan}
                disabled={gudang.produk.length === 0}
                title={gudang.produk.length === 0 ? 'Data sudah kosong.' : 'Hapus semua data'}
              >
                <Trash2 size={13} aria-hidden="true" />
                Kosongkan semua
              </button>
            </div>
          </div>

          <div className="pita pita--info">
            <span className="pita__ikon" aria-hidden="true">
              <Info size={14} />
            </span>
            <div className="pita__isi">
              <strong>Demo lokal-first, bukan aplikasi multi-pengguna</strong>
              <p>
                Tidak ada akun, tidak ada server, dan tidak ada sinkronisasi antar perangkat.
                Ekspor cadangan sebelum membersihkan cache browser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}