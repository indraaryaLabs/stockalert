/**
 * Formulir barang: tambah dan ubah.
 *
 * Catatan penting: kuantitas hanya bisa diisi saat menambah. Saat ubah,
 * kuantitas terkunci karena stok harus berubah lewat pergerakan.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Wand2 } from 'lucide-react';
import { SATUAN, type Satuan } from '../domain/types';
import type { Produk } from '../domain/types';
import {
  adaGalat,
  hapusGalat,
  usulkanSku,
  validasiProduk,
  type MasukanProduk,
  type PetaGalat,
} from '../domain/aturan';
import { Modal, Medan } from '../ui/primitif';
import { rupiah } from '../platform/format';

interface Draf {
  sku: string;
  nama: string;
  kategori: string;
  satuan: Satuan;
  biaya: string;
  stokMinimum: string;
  kuantitasAwal: string;
}

function keAngka(teks: string): number | null {
  const bersih = teks.replace(/[^\d]/g, '');
  if (bersih === '') return null;
  const n = Number(bersih);
  return Number.isFinite(n) ? n : null;
}

function drafDari(produk: Produk | null): Draf {
  if (produk) {
    return {
      sku: produk.sku,
      nama: produk.nama,
      kategori: produk.kategori,
      satuan: produk.satuan,
      biaya: produk.biaya === null ? '' : String(produk.biaya),
      stokMinimum: String(produk.stokMinimum),
      kuantitasAwal: String(produk.kuantitas),
    };
  }
  return {
    sku: '',
    nama: '',
    kategori: '',
    satuan: 'pcs',
    biaya: '',
    stokMinimum: '0',
    kuantitasAwal: '0',
  };
}

export function FormBarang({
  produk,
  semuaProduk,
  kategoriTersedia,
  onTutup,
  onSimpan,
}: {
  produk: Produk | null;
  semuaProduk: readonly Produk[];
  kategoriTersedia: readonly string[];
  onTutup: () => void;
  onSimpan: (masukan: MasukanProduk) => boolean;
}) {
  const modeUbah = produk !== null;
  const [draf, setDraf] = useState<Draf>(() => drafDari(produk));
  const [galat, setGalat] = useState<PetaGalat>({});
  const [terkirim, setTerkirim] = useState(false);

  const ubah = <K extends keyof Draf>(kunci: K, nilai: Draf[K]) => {
    setDraf((d) => ({ ...d, [kunci]: nilai }));
    if (terkirim) setGalat((g) => hapusGalat(g, kunci as string));
  };

  /** Mengisi SKU otomatis dari kategori bila kolom masih kosong. */
  const isiSkuOtomatis = () => {
    const sku = usulkanSku(semuaProduk, draf.kategori);
    ubah('sku', sku);
    if (terkirim) setGalat((g) => hapusGalat(g, 'sku'));
  };

  const masukan = useMemo<MasukanProduk>(
    () => ({
      sku: draf.sku,
      nama: draf.nama,
      kategori: draf.kategori,
      satuan: draf.satuan,
      biaya: keAngka(draf.biaya),
      stokMinimum: keAngka(draf.stokMinimum) ?? -1,
      kuantitasAwal: keAngka(draf.kuantitasAwal) ?? -1,
    }),
    [draf],
  );

  const nilaiPerkiraan = (keAngka(draf.kuantitasAwal) ?? 0) * (keAngka(draf.biaya) ?? 0);
  const akanRendah =
    !galat.stokMinimum &&
    (keAngka(draf.stokMinimum) ?? 0) > (keAngka(draf.kuantitasAwal) ?? 0);

  const kirim = () => {
    setTerkirim(true);
    const hasil = validasiProduk(masukan, semuaProduk, produk?.id);
    if (adaGalat(hasil)) {
      setGalat(hasil);
      return;
    }
    if (onSimpan(masukan)) onTutup();
  };

  return (
    <Modal
      judul={modeUbah ? 'Ubah barang' : 'Tambah barang'}
      subjudul={
        modeUbah
          ? 'Kuantitas tidak bisa diubah di sini — catat pergerakan masuk agar riwayat tetap akurat.'
          : 'Kuantitas awal akan otomatis tercatat sebagai pergerakan masuk pertama.'
      }
      onTutup={onTutup}
      kaki={
        <>
          <span className="modal__kaki-info">
            {nilaiPerkiraan > 0
              ? `Perkiraan nilai ${rupiah(nilaiPerkiraan)}`
              : 'Kolom bertanda * wajib diisi'}
          </span>
          <button type="button" className="tbl" onClick={onTutup}>
            Batal
          </button>
          <button
            type="button"
            className="tbl tbl--utama"
            onClick={kirim}
            disabled={terkirim && adaGalat(galat)}
          >
            {modeUbah ? 'Simpan perubahan' : 'Tambah barang'}
          </button>
        </>
      }
    >
      <div className="tata">
        <Medan
          label="Kode SKU"
          wajib
          galat={galat.sku}
          bantuan="Kode unik barang. Dipakai saat memindai atau mencari cepat."
        >
          {(p) => (
            <div className="medan__grup">
              <input
                {...p}
                className="medan__kontrol"
                value={draf.sku}
                onChange={(e) => ubah('sku', e.target.value.toUpperCase())}
                placeholder="MIN-001"
                autoComplete="off"
                spellCheck={false}
              />
              {!modeUbah ? (
                <button
                  type="button"
                  className="medan__prefix"
                  onClick={isiSkuOtomatis}
                  title="Buat SKU dari kategori"
                  aria-label="Buat SKU otomatis"
                >
                  <Wand2 size={13} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          )}
        </Medan>

        <Medan label="Nama barang" wajib galat={galat.nama} bantuan="Tulis nama yang mudah diingat kasir.">
          {(p) => (
            <input
              {...p}
              className="medan__kontrol"
              value={draf.nama}
              onChange={(e) => ubah('nama', e.target.value)}
              placeholder="Air Mineral Botol 600 ml"
              autoComplete="off"
            />
          )}
        </Medan>

        <Medan label="Kategori" wajib galat={galat.kategori} bantuan="Pilih dari daftar atau tulis kategori baru.">
          {(p) => (
            <input
              {...p}
              className="medan__kontrol"
              value={draf.kategori}
              onChange={(e) => ubah('kategori', e.target.value)}
              placeholder="Minuman"
              list="kategori-teredia"
              autoComplete="off"
            />
          )}
        </Medan>

        <Medan label="Satuan" wajib>
          {(p) => (
            <select
              {...p}
              className="medan__kontrol"
              value={draf.satuan}
              onChange={(e) => ubah('satuan', e.target.value as Satuan)}
            >
              {SATUAN.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Medan>

        <Medan
          label="Biaya per satuan"
          opsional
          galat={galat.biaya}
          bantuan="Untuk menghitung nilai persediaan indikatif."
        >
          {(p) => (
            <div className="medan__grup">
              <span className="medan__prefix">Rp</span>
              <input
                {...p}
                className="medan__kontrol"
                value={draf.biaya}
                onChange={(e) => ubah('biaya', e.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
          )}
        </Medan>

        <Medan
          label="Stok minimum"
          wajib
          galat={galat.stokMinimum}
          bantuan="Barang masuk daftar peringatan saat kuantitas menyentuh batas ini."
        >
          {(p) => (
            <input
              {...p}
              className="medan__kontrol"
              value={draf.stokMinimum}
              onChange={(e) => ubah('stokMinimum', e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
            />
          )}
        </Medan>

        <Medan
          label={modeUbah ? 'Kuantitas saat ini' : 'Kuantitas awal'}
          wajib
          lebar
          galat={galat.kuantitasAwal}
          bantuan={
            modeUbah
              ? 'Hanya berubah lewat pergerakan masuk atau keluar.'
              : 'Isi 0 bila barang belum ada di gudang.'
          }
        >
          {(p) => (
            <input
              {...p}
              className={`medan__kontrol${modeUbah ? ' medan__kontrol--readonly' : ''}`}
              value={draf.kuantitasAwal}
              onChange={(e) => ubah('kuantitasAwal', e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              disabled={modeUbah}
            />
          )}
        </Medan>
      </div>

      <datalist id="kategori-teredia">
        {kategoriTersedia.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      {akanRendah ? (
        <div className="pita pita--info">
          <span className="pita__ikon" aria-hidden="true">
            <AlertTriangle size={14} />
          </span>
          <div className="pita__isi">
            <strong>Barang ini akan langsung berstatus rendah</strong>
            <p>
              Stok minimum ({draf.stokMinimum || '0'}) lebih besar dari kuantitas saat ini
              ({draf.kuantitasAwal || '0'}). Itu wajar untuk barang yang baru mulai diisi,
              tapi perlu diingat saat mengatur pemesanan.
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}