/**
 * Kerangka aplikasi: sidebar, topbar, dan area konten.
 */

import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeftRight,
  Boxes,
  Command,
  DatabaseBackup,
  LayoutDashboard,
  Menu,
  PackagePlus,
  X,
} from 'lucide-react';
import { produkPerluPerhatian } from '../domain/aturan';
import type { Gudang } from '../domain/types';
import { labelKunci } from '../platform/pintasan';
import { tanggalHariIni } from '../platform/format';

export type NamaHalaman = 'dasbor' | 'barang' | 'pergerakan' | 'data';

export interface RangkaProps {
  gudang: Gudang;
  halaman: NamaHalaman;
  onPindah: (h: NamaHalaman) => void;
  onBukaPalet: () => void;
  onCatat: () => void;
  children: ReactNode;
}

const MENU: { id: NamaHalaman; label: string; ikon: ReactNode }[] = [
  { id: 'dasbor', label: 'Dasbor', ikon: <LayoutDashboard size={15} /> },
  { id: 'barang', label: 'Daftar barang', ikon: <Boxes size={15} /> },
  { id: 'pergerakan', label: 'Pergerakan stok', ikon: <ArrowLeftRight size={15} /> },
  { id: 'data', label: 'Data & cadangan', ikon: <DatabaseBackup size={15} /> },
];

export function Rangka({
  gudang,
  halaman,
  onPindah,
  onBukaPalet,
  onCatat,
  children,
}: RangkaProps) {
  const [drawer, setDrawer] = useState(false);
  const perlu = produkPerluPerhatian(gudang.produk);
  const habis = perlu.filter((p) => p.kuantitas <= 0).length;

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1000) setDrawer(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pindah = (id: NamaHalaman) => {
    onPindah(id);
    setDrawer(false);
  };

  return (
    <div className="rangka">
      {drawer ? (
        <button
          type="button"
          className="latar"
          aria-label="Tutup menu navigasi"
          onClick={() => setDrawer(false)}
        />
      ) : null}

      <aside
        className={`sisi${drawer ? ' sisi--buka' : ''}`}
        id="navigasi-sisi"
        aria-label="Navigasi utama"
      >
        <div className="sisi__merek">
          <span className="sisi__logo" aria-hidden="true">
            <Boxes size={16} strokeWidth={2.2} />
          </span>
          <span className="sisi__nama">
            <strong>StockAlert</strong>
            <span>Pantau stok toko</span>
          </span>
          <button
            type="button"
            className="modal__tutup sisi__tutup"
            onClick={() => setDrawer(false)}
            aria-label="Tutup menu"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <nav className="sisi__nav" aria-label="Menu aplikasi">
          <p className="sisi__grup">Menu utama</p>
          {MENU.map((m) => (
            <button
              key={m.id}
              type="button"
              className="nav-item"
              data-nav={m.id}
              aria-current={halaman === m.id ? 'page' : undefined}
              onClick={() => pindah(m.id)}
            >
              <span className="nav-item__ikon" aria-hidden="true">
                {m.ikon}
              </span>
              <span className="nav-item__teks">{m.label}</span>
              {m.id === 'barang' && perlu.length > 0 ? (
                <>
                  <span
                    className={`nav-item__pita${habis > 0 ? ' nav-item__pita--bad' : ''}`}
                    aria-hidden="true"
                  >
                    {perlu.length}
                  </span>
                  <span className="sr-only">, {perlu.length} barang perlu restock</span>
                </>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="sisi__kaki">
          <div className="sisi__kartu">
            <strong>Data lokal</strong>
            <p>
              Tersimpan di browser perangkat ini. Tidak ada server dan tidak ada
              data yang dikirim ke mana pun.
            </p>
          </div>
        </div>
      </aside>

      <div className="rangka__isi">
        <header className="atas">
          <button
            type="button"
            className="tombol-menu"
            onClick={() => setDrawer(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={drawer}
            aria-controls="navigasi-sisi"
          >
            <Menu size={16} aria-hidden="true" />
          </button>

          <div className="atas__tajuk">
            <h1>{MENU.find((m) => m.id === halaman)?.label}</h1>
            <span className="atas__crumb">Pantau stok toko Anda</span>
          </div>

          <div className="atas__kanan">
            <span className="atas__tgl">{tanggalHariIni()}</span>
            <button type="button" className="tbl tbl--kecil" onClick={onBukaPalet}>
              <Command size={12} aria-hidden="true" />
              Perintah
              <span className="tbl__kbd">{labelKunci('K', { ctrl: true })}</span>
            </button>
            <button type="button" className="tbl tbl--primer tbl--kecil" onClick={onCatat}>
              <PackagePlus size={13} aria-hidden="true" />
              Catat stok
            </button>
          </div>
        </header>

        <main className="halaman">{children}</main>
      </div>
    </div>
  );
}