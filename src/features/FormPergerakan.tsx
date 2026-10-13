/**
 * Formulir pergerakan stok dengan pratinjau dampaknya secara langsung.
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Trash2 } from 'lucide-react';
import type { Pergerakan, Produk, TipePergerakan } from '../domain/types';
import {
  adaGalat,
  hapusGalat,
  hariIni,
  statusStok,
  terapkanPergerakan,
  usulkanReferensi,
  validasiPergerakan,
  type MasukanPergerakan,
  type PetaGalat,
} from '../domain/aturan';
import { Modal, Medan } from '../ui/primitif';
import { angka, rupiah } from '../platform/format';

export function FormPergerakan({
  produk,
  semuaProduk,
  pergerakan,
  produkAwalId,
  onTutup,
  onSimpan,
}: {
  produk: Produk | null;
  semuaProduk: readonly Produk[];
  pergerakan: readonly Pergerakan[];
  produkAwalId?: string | null;
  onTutup: () => void;
  onSimpan: (m: MasukanPergerakan) => boolean;
}) {
  const [produkId, setProdukId] = useState<string>(produkAwalId ?? produk?.id ?? '');
  const [tipe, setTipe] = useState<TipePergerakan>('keluar');
  const [jumlah, setJumlah] = useState('');
  const [tanggal, setTanggal] = useState(hariIni);
  const [referensi, setReferensi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState<PetaGalat>({});
  const [terkirim, setTerkirim] = useState(false);

  // Nomor nota otomatis hanya saat kolom masih kosong.
  useEffect(() => {
    if (referensi.trim() === '') {
      setReferensi(usulkanReferensi(pergerakan, tipe === 'masuk' ? 'PB' : 'POS'));
    }
    // Hanya saat tipe berubah.
  }, [tipe]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = useMemo(
    () => semuaProduk.find((p) => p.id === produkId) ?? null,
    [semuaProduk, produkId],
  );

  const jumlahAngka = useMemo(() => {
    const bersih = jumlah.replace(/[^\d]/g, '');
    return bersih === '' ? 0 : Number(bersih);
  }, [jumlah]);

  const masukan = useMemo<MasukanPergerakan>(
    () => ({ produkId, tipe, jumlah: jumlahAngka, tanggal, referensi, catatan }),
    [produkId, tipe, jumlahAngka, tanggal, referensi, catatan],
  );

  const simulasi = useMemo(
    () => (target ? terapkanPergerakan(target.kuantitas, tipe, jumlahAngka) : null),
    [target, tipe, jumlahAngka],
  );

  const terurut = useMemo(
    () => [...semuaProduk].sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [semuaProduk],
  );

  const kirim = () => {
    setTerkirim(true);
    const hasil = validasiPergerakan(masukan, semuaProduk);
    if (adaGalat(hasil)) {
      setGalat(hasil);
      return;
    }
    if (onSimpan(masukan)) onTutup();
  };

  // Jumlah yang diklik sekali untuk pengisian cepat.
  const cepat = [1, 5, 10, 25];

  return (
    <Modal
      judul="Catat pergerakan stok"
      subjudul="Setiap pencatatan langsung mengubah kuantitas barang dan masuk ke riwayat."
      onTutup={onTutup}
      kaki={
        <>
          <span className="modal__kaki-info">Stok tidak boleh menjadi negatif.</span>
          <button type="button" className="tbl" onClick={onTutup}>
            Batal
          </button>
          <button
            type="button"
            className="tbl tbl--utama"
            onClick={kirim}
            disabled={terkirim && adaGalat(galat)}
          >
            Simpan pergerakan
          </button>
        </>
      }
    >
      {semuaProduk.length === 0 ? (
        <div className="pita pita--info">
          <span className="pita__ikon" aria-hidden="true">
            <Info size={14} />
          </span>
          <div className="pita__isi">
            <strong>Belum ada barang terdaftar</strong>
            <p>Tambahkan barang terlebih dahulu sebelum mencatat stok masuk atau keluar.</p>
          </div>
        </div>
      ) : null}

      <div className="tata">
        <div className="medan tata__lebar">
          <span className="medan__label" id="label-tipe">
            Tipe pergerakan
          </span>
          <div className="pil-radios" role="radiogroup" aria-labelledby="label-tipe">
            <label className={`pil${tipe === 'keluar' ? ' pil--aktif' : ''}`}>
              <input
                type="radio"
                name="tipe"
                checked={tipe === 'keluar'}
                onChange={() => {
                  setTipe('keluar');
                  setReferensi((r) => (r.trim() === '' ? usulkanReferensi(pergerakan, 'POS') : r));
                }}
              />
              <span>
                <span className="pil__judul">
                  <ArrowUpRight size={14} aria-hidden="true" />
                  Stok keluar
                </span>
                <span className="pil__teks">Barang dijual atau dipakai sendiri.</span>
              </span>
            </label>
            <label className={`pil${tipe === 'masuk' ? ' pil--aktif' : ''}`}>
              <input
                type="radio"
                name="tipe"
                checked={tipe === 'masuk'}
                onChange={() => {
                  setTipe('masuk');
                  setReferensi((r) => (r.trim() === '' ? usulkanReferensi(pergerakan, 'PB') : r));
                }}
              />
              <span>
                <span className="pil__judul">
                  <ArrowDownRight size={14} aria-hidden="true" />
                  Stok masuk
                </span>
                <span className="pil__teks">Barang datang dari supplier.</span>
              </span>
            </label>
          </div>
        </div>

        <Medan label="Barang" wajib galat={galat.produkId} lebar>
          {(p) => (
            <select
              {...p}
              className="medan__kontrol"
              value={produkId}
              onChange={(e) => {
                setProdukId(e.target.value);
                if (terkirim) setGalat((g) => hapusGalat(g, 'produkId'));
              }}
            >
              <option value="">— Pilih barang —</option>
              {terurut.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nama} · sisa {angka(x.kuantitas)} {x.satuan}
                </option>
              ))}
            </select>
          )}
        </Medan>

        <Medan
          label="Jumlah"
          wajib
          galat={galat.jumlah}
          bantuan={target ? `Stok tersedia ${angka(target.kuantitas)} ${target.satuan}.` : undefined}
        >
          {(p) => (
            <div className="medan__grup">
              <input
                {...p}
                className="medan__kontrol"
                value={jumlah}
                onChange={(e) => {
                  setJumlah(e.target.value.replace(/[^\d]/g, ''));
                  if (terkirim) setGalat((g) => hapusGalat(g, 'jumlah'));
                }}
                inputMode="numeric"
                placeholder="0"
                disabled={!target}
              />
              <span className="medan__prefix">{target?.satuan ?? 'unit'}</span>
            </div>
          )}
        </Medan>

        {target ? (
          <div className="medan">
            <span className="medan__label">Isi cepat</span>
            <div className="baris-alat">
              {cepat.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="tbl tbl--kecil"
                  onClick={() => setJumlah(String(n))}
                  disabled={tipe === 'keluar' && n > target.kuantitas}
                >
                  {n}
                </button>
              ))}
              {target.stokMinimum > 0 ? (
                <button
                  type="button"
                  className="tbl tbl--kecil"
                  onClick={() => setJumlah(String(target.stokMinimum))}
                  disabled={tipe === 'keluar' && target.stokMinimum > target.kuantitas}
                  title={`Isi dengan stok minimum (${target.stokMinimum})`}
                >
                  Minimum {target.stokMinimum}
                </button>
              ) : null}
              {tipe === 'keluar' && target.kuantitas > 0 ? (
                <button
                  type="button"
                  className="tbl tbl--kecil"
                  onClick={() => setJumlah(String(target.kuantitas))}
                  title="Habiskan stok yang ada"
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Habiskan
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <Medan label="Tanggal" wajib galat={galat.tanggal}>
          {(p) => (
            <input
              {...p}
              type="date"
              className="medan__kontrol"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                if (terkirim) setGalat((g) => hapusGalat(g, 'tanggal'));
              }}
            />
          )}
        </Medan>

        <Medan label="Referensi" opsional bantuan="Nomor nota supplier atau nomor struk penjualan.">
          {(p) => (
            <input
              {...p}
              className="medan__kontrol"
              value={referensi}
              onChange={(e) => setReferensi(e.target.value.toUpperCase())}
              placeholder="PB-2445"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Medan>

        <Medan label="Catatan" opsional lebar>
          {(p) => (
            <textarea
              {...p}
              className="medan__kontrol"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Pengiriman dari supplier, barang toothpaste tidak lengkap."
              maxLength={180}
            />
          )}
        </Medan>
      </div>

      {target && jumlahAngka > 0 && simulasi ? (
        simulasi.ok ? (
          <div className="pita pita--info">
            <span className="pita__ikon" aria-hidden="true">
              <Info size={14} />
            </span>
            <div className="pita__isi">
              <strong>
                {target.nama}: {angka(target.kuantitas)} → {angka(simulasi.kuantitas)} {target.satuan}
              </strong>
              <p>
                {simulasi.kuantitas <= target.stokMinimum
                  ? `Setelah disimpan, barang ini akan berstatus ${
                      statusStok({ ...target, kuantitas: simulasi.kuantitas }) === 'habis'
                        ? 'habis'
                        : 'rendah'
                    }.`
                  : 'Stok tetap di atas batas minimum.'}
                {typeof target.biaya === 'number'
                  ? ` Nilai berubah sekitar ${rupiah(Math.abs(target.biaya) * jumlahAngka)}.`
                  : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="pita pita--bad">
            <span className="pita__ikon" aria-hidden="true">
              <Info size={14} />
            </span>
            <div className="pita__isi">
              <strong>Perubahan ini tidak bisa disimpan</strong>
              <p>{simulasi.alasan}</p>
            </div>
          </div>
        )
      ) : null}
    </Modal>
  );
}