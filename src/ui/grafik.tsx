/**
 * Grafik sederhana yang dibuat dari SVG langsung (tanpa pustaka grafik).
 *
 * Semua grafik menerima data numerik yang sudah dihitung dari state, bukan
 * angka dummy. Bentuknya sengaja minimal: batang, garis area, cincin, dan
 * sparkline batang — cukup untuk membaca pola, tidak mendekorasi.
 */

const WARNA = {
  aksen: 'var(--accent)',
  tinta: 'var(--ink)',
  redup: 'var(--garis-kuat)',
  lembut: 'var(--garis)',
};

/* ------------------------------------------------------------------ */
/* Batang kecil untuk kartu KPI                                        */
/* ------------------------------------------------------------------ */

export function SparkBatang({
  nilai,
  tinggi = 30,
  lebar = 60,
  warna = 'var(--accent)',
  label,
}: {
  nilai: readonly number[];
  tinggi?: number;
  lebar?: number;
  warna?: string;
  label: string;
}) {
  if (nilai.length === 0) {
    return <div style={{ height: tinggi }} aria-hidden="true" />;
  }
  const maks = Math.max(...nilai, 1);
  const jarak = 2;
  const lebarBatang = Math.max(3, (lebar - jarak * (nilai.length - 1)) / nilai.length);
  // Tinggi minimum supaya nilai kecil tetap terlihat sebagai penanda.
  const tinggiMinimum = 6;

  return (
    <svg
      width={lebar}
      height={tinggi}
      viewBox={`0 0 ${lebar} ${tinggi}`}
      role="img"
      aria-label={label}
      style={{ flex: 'none' }}
    >
      {nilai.map((n, i) => {
        const h = Math.max(tinggiMinimum, (n / maks) * tinggi);
        const terakhir = i === nilai.length - 1;
        return (
          <rect
            key={i}
            x={i * (lebarBatang + jarak)}
            y={tinggi - h}
            width={lebarBatang}
            height={h}
            rx={Math.min(lebarBatang / 2, 2.5)}
            fill={terakhir ? warna : WARNA.redup}
          />
        );
      })}
    </svg>
  );
}
/* ------------------------------------------------------------------ */
/* Garis area untuk tren                                               */
/* ------------------------------------------------------------------ */

export interface TitikGrafik {
  label: string;
  nilai: number;
  sorot?: string;
}

export function GrafikArea({
  data,
  tinggi = 220,
  warna = 'var(--accent)',
  formatNilai,
}: {
  data: readonly TitikGrafik[];
  tinggi?: number;
  warna?: string;
  formatNilai?: (n: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="grafik__kosong" style={{ height: tinggi }}>
        <span className="teks-redup">Belum ada data untuk ditampilkan.</span>
      </div>
    );
  }

  const lebar = 720;
  const padY = 18;
  const maks = Math.max(...data.map((d) => d.nilai), 1);
  const jarak = data.length > 1 ? lebar / (data.length - 1) : lebar;

  const titik = data.map((d, i) => ({
    x: data.length > 1 ? i * jarak : lebar / 2,
    y: padY + (1 - d.nilai / maks) * (tinggi - padY * 2),
    ...d,
  }));

  // Kurva sederhana berbasis garis lurus; cukup untuk membaca arah.
  const garis = titik.map((t, i) => `${i === 0 ? 'M' : 'L'}${t.x} ${t.y}`).join(' ');
  const area = `${garis} L${titik[titik.length - 1].x} ${tinggi} L${titik[0].x} ${tinggi} Z`;

  return (
    <svg
      viewBox={`0 0 ${lebar} ${tinggi}`}
      preserveAspectRatio="none"
      className="grafik"
      role="img"
      aria-label={data.map((d) => `${d.label}: ${formatNilai ? formatNilai(d.nilai) : d.nilai}`).join(', ')}
    >
      <defs>
        <linearGradient id="isi-gradien" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={warna} stopOpacity="0.22" />
          <stop offset="100%" stopColor={warna} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Garis bantu titik-titik */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <line
          key={p}
          x1="0"
          x2={lebar}
          y1={padY + p * (tinggi - padY * 2)}
          y2={padY + p * (tinggi - padY)}
          stroke={WARNA.lembut}
          strokeWidth="1"
          strokeDasharray="3 5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill="url(#isi-gradien)" />
      <path
        d={garis}
        fill="none"
        stroke={warna}
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {titik.map((t, i) => (
        <g key={i}>
          {i === titik.length - 1 ? (
            <circle cx={t.x} cy={t.y} r="4.5" fill={warna} stroke="#fff" strokeWidth="2" />
          ) : (
            <circle cx={t.x} cy={t.y} r="2.5" fill={warna} opacity="0.55" />
          )}
          {t.sorot ? (
            <text x={t.x} y={t.y - 12} textAnchor="middle" className="grafik__label">
              {t.sorot}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Batang untuk tren harian/bulanan                                   */
/* ------------------------------------------------------------------ */

export function GrafikBatang({
  data,
  tinggi = 200,
  warna = 'var(--accent)',
}: {
  data: readonly TitikGrafik[];
  tinggi?: number;
  warna?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="grafik__kosong" style={{ height: tinggi }}>
        <span className="teks-redup">Belum ada data untuk ditampilkan.</span>
      </div>
    );
  }

  const maks = Math.max(...data.map((d) => d.nilai), 1);
  const lebar = 640;
  const jarakBatang = 14;
  const lebarBatang = Math.max(
    4,
    (lebar - jarakBatang * (data.length - 1)) / data.length,
  );

  return (
    <svg
      viewBox={`0 0 ${lebar} ${tinggi}`}
      preserveAspectRatio="none"
      className="grafik"
      role="img"
      aria-label={data.map((d) => `${d.label}: ${d.nilai}`).join(', ')}
    >
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <line
          key={p}
          x1="0"
          x2={lebar}
          y1={tinggi - p * tinggi}
          y2={tinggi - p * tinggi}
          stroke={WARNA.lembut}
          strokeWidth="1"
          strokeDasharray="3 5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {data.map((d, i) => {
        const h = Math.max(2, (d.nilai / maks) * (tinggi - 8));
        const x = i * (lebarBatang + jarakBatang);
        return (
          <g key={i}>
            <rect
              x={x}
              y={tinggi - h}
              width={lebarBatang}
              height={h}
              rx={Math.min(lebarBatang / 2, 5)}
              fill={warna}
            />
            {/* Batang "pencacah" kecil di bawah sebagai dudukan */}
            <rect
              x={x}
              y={tinggi - Math.min(6, h)}
              width={lebarBatang}
              height={Math.min(6, h)}
              rx={2}
              fill={WARNA.tinta}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Cincin untuk komposisi                                              */
/* ------------------------------------------------------------------ */

export function GrafikCincin({
  segmen,
  ukuran = 148,
}: {
  segmen: readonly { label: string; nilai: number; warna: string }[];
  ukuran?: number;
}) {
  const total = segmen.reduce((t, s) => t + s.nilai, 0);
  if (total === 0) {
    return (
      <div className="grafik__kosong" style={{ height: ukuran }}>
        <span className="teks-redup">Belum ada nilai.</span>
      </div>
    );
  }

  const tebal = 16;
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  let akumulasi = 0;

  return (
    <svg width={ukuran} height={ukuran} role="img" aria-label="Komposisi nilai persediaan">
      <g transform={`translate(${ukuran / 2}, ${ukuran / 2}) rotate(-90)`}>
        <circle
          r={r}
          fill="none"
          stroke={WARNA.lembut}
          strokeWidth={tebal}
        />
        {segmen.map((s, i) => {
          const fraksi = s.nilai / total;
          const panjangSisi = fraksi * keliling;
          const el = (
            <circle
              key={i}
              r={r}
              fill="none"
              stroke={s.warna}
              strokeWidth={tebal}
              strokeDasharray={`${Math.max(0, panjangSisi - 2)} ${keliling}`}
              strokeDashoffset={-akumulasi}
              strokeLinecap="butt"
            />
          );
          akumulasi += fraksi * keliling;
          return el;
        })}
      </g>
      <text
        x={ukuran / 2}
        y={ukuran / 2 - 4}
        textAnchor="middle"
        className="grafik__nilai-tengah"
      >
        {segmen.length}
      </text>
      <text
        x={ukuran / 2}
        y={ukuran / 2 + 14}
        textAnchor="middle"
        className="grafik__label-tengah"
      >
        kategori
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Baris progres berlabel                                              */
/* ------------------------------------------------------------------ */

export function BarisProgres({
  nilai,
  warna = 'var(--accent)',
  tinggi = 6,
}: {
  nilai: number;
  warna?: string;
  tinggi?: number;
}) {
  const persen = Math.max(0, Math.min(100, nilai));
  return (
    <div className="progres" style={{ height: tinggi }}>
      <div
        className="progres__isi"
        style={{ width: `${persen}%`, background: warna }}
      />
    </div>
  );
}
