"""Verifikasi UI StockAlert (versi(params baru).

Jalankan: python ui_check.py  (server dev harus sudah berjalan di :5173)
"""

import sys

# Paksa keluaran UTF-8 agar tanda panah dan huruf beraksen tidak merusak log.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "C:/Users/Indra/AppData/Local/Temp/opencode/stockalert2"

console_errors: list[str] = []
page_errors: list[str] = []
failed_requests: list[str] = []
failures: list[str] = []


def cek(label: str, kondisi: bool, detail: str = "") -> None:
    print(f"[{'OK  ' if kondisi else 'GAGAL'}] {label}{(' :: ' + detail) if detail else ''}")
    if not kondisi:
        failures.append(label)


def catat(page):
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.on("requestfailed", lambda r: failed_requests.append(f"{r.url} {r.failure}"))


def nav(page, nama: str) -> None:
    """Navigasi lewat sidebar memakai penanda data-nav."""
    if page.locator(".tombol-menu").is_visible():
        page.locator(".tombol-menu").click()
        page.wait_for_timeout(420)
    page.locator(f'[data-nav="{nama}"]').click()
    page.wait_for_timeout(480)


def isi_form(page, sku, nama, kategori, biaya, minimum, awal):
    """Isi formulir barang lewat label yang stabil, bukan indeks medan."""
    d = page.locator("[role=dialog]")
    d.get_by_label("Kode SKU").fill(sku)
    d.get_by_label("Nama barang").fill(nama)
    d.get_by_label("Kategori").fill(kategori)
    d.get_by_label("Biaya per satuan").fill(str(biaya))
    d.get_by_label("Stok minimum").fill(str(minimum))
    d.get_by_label("Kuantitas awal").fill(str(awal))
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = ctx.new_page()
    catat(page)
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(900)

    # ---------- 1. Dasbor ----------
    print("\n=== 1. DASBOR ===")
    cek("KPI total SKU tampil", page.get_by_text("Total SKU Aktif").count() > 0)
    kpi = page.locator(".metrik__sel").filter(has_text="Total SKU Aktif").locator(".metrik__nilai").inner_text()
    cek("KPI SKU terisi", kpi.strip() != "", f"nilai='{kpi.strip()[:20]}'")
    cek("nilai persediaan berformat rupiah",
        "Rp" in page.locator(".metrik__sel").filter(has_text="Nilai persediaan").locator(".metrik__nilai").inner_text())
    cek("panel perlu restock tampil", page.get_by_text("Barang perlu restock").count() > 0)
    cek("panel barang lambat tampil", page.get_by_text("Barang lambat bergerak").count() > 0)
    cek("komposisi kategori tampil", page.get_by_text("Komposisi nilai").count() > 0)
    cek("saran pemesanan otomatis tampil", page.get_by_text("Saran pemesanan").count() > 0)
    cek("pita sidebar menandai jumlah perlu restock", page.locator(".nav-item__pita").count() > 0)
    page.screenshot(path=f"{OUT}/01-dasbor.png", full_page=True)

    # ---------- 2. Palet perintah ----------
    print("\n=== 2. PALET PERINTAH (Ctrl+K) ===")
    page.keyboard.press("Control+k")
    page.wait_for_timeout(500)
    cek("palet terbuka", page.locator(".palet__kotak").count() > 0)
    page.screenshot(path=f"{OUT}/02-palet.png")
    cek("fokus di input palet",
        page.evaluate("() => document.activeElement?.getAttribute('aria-label')") == "Cari perintah")
    page.fill(".palet__cari input", "ekspor")
    page.wait_for_timeout(350)
    cek("pencarian perintah menyaring", page.locator(".palet__item").count() > 0,
        f"hasil={page.locator('.palet__item').count()}")
    page.keyboard.press("Escape")
    page.wait_for_timeout(350)
    cek("Escape menutup palet", page.locator(".palet__kotak").count() == 0)

    # ---------- 3. Tambah barang ----------
    print("\n=== 3. CRUD BARANG ===")
    nav(page, "barang")
    n_awal = page.locator(".tabel tbody tr").count()
    cek("tabel barang tampil", n_awal >= 15, f"baris={n_awal}")
    cek("kolom masa stok tampil", page.get_by_text("Masa", exact=True).count() > 0)

    page.get_by_role("button", name="Tambah barang").first.click()
    page.wait_for_timeout(500)
    cek("dialog tambah terbuka", page.locator("[role=dialog]").count() > 0)
    page.screenshot(path=f"{OUT}/03-form-tambah.png")

    # Validasi kosong
    page.get_by_role("button", name="Tambah barang", exact=True).last.click()
    page.wait_for_timeout(400)
    cek("galat SKU kosong tampil", page.get_by_text("SKU wajib diisi.").count() > 0)
    cek("dialog tetap terbuka", page.locator(".modal").count() > 0)

    # SKU otomatis dari kategori
    page.locator("[role=dialog]").get_by_label("Kategori").fill("Alat Tulis")
    page.wait_for_timeout(280)
    page.get_by_role("button", name="Buat SKU otomatis").click()
    page.wait_for_timeout(320)
    cek("SKU otomatis terisi",
        page.locator("[role=dialog]").get_by_label("Kode SKU").input_value() != "",
        f"sku='{page.locator('[role=dialog]').get_by_label('Kode SKU').input_value()}'")

    isi_form(page, "SNK-900", "Risol-instance 250 g", "Snack", 9500, 15, 40)
    page.get_by_role("button", name="Tambah barang", exact=True).last.click()
    page.wait_for_timeout(700)
    cek("dialog tertutup", page.locator(".modal").count() == 0)
    cek("notifikasi sukses tampil", page.get_by_text("Barang ditambahkan").count() > 0)
    cek("barang baru masuk tabel",
        page.locator(".tabel tbody tr").filter(has_text="SNK-900").count() == 1)
    page.screenshot(path=f"{OUT}/04-setelah-tambah.png")

    # ---------- 4. Undo ----------
    print("\n=== 4. UNDO / REDO ===")
    page.keyboard.press("Control+z")
    page.wait_for_timeout(600)
    cek("undo menghapus barang baru",
        page.locator(".tabel tbody tr").filter(has_text="SNK-900").count() == 0)
    page.keyboard.press("Control+Shift+z")
    page.wait_for_timeout(600)
    cek("redo mengembalikan barang baru",
        page.locator(".tabel tbody tr").filter(has_text="SNK-900").count() == 1)

    # ---------- 5. Catat pergerakan ----------
    print("\n=== 5. PERGERAKAN STOK ===")
    baris = page.locator(".tabel tbody tr").filter(has_text="SNK-900")
    baris.get_by_role("button", name="Catat", exact=True).click()
    page.wait_for_timeout(520)
    cek("dialog pergerakan terbuka", page.locator("[role=dialog]").count() > 0)
    cek("barang terpilih otomatis", page.locator("[role=dialog] select").first.input_value() != "")
    ref = page.locator("[role=dialog]").get_by_label("Referensi").input_value()
    cek("nomor referensi terisi otomatis", ref.strip() != "", f"ref='{ref}'")

    page.locator("[role=dialog]").get_by_label("Jumlah").fill("10")
    page.wait_for_timeout(400)
    cek("pratinjau dampak stok tampil", page.get_by_text("Risol-instance 250 g: 40").count() > 0,
        page.get_by_text("Risol-instance 250 g: 40").first.inner_text() if page.get_by_text("Risol-instance 250 g: 40").count() else "tidak tampil")
    page.screenshot(path=f"{OUT}/05-form-pergerakan.png")

    page.get_by_role("button", name="Simpan pergerakan").click()
    page.wait_for_timeout(700)
    cek("perubahan stok tersimpan",
        "30" in page.locator(".tabel tbody tr").filter(has_text="SNK-900").locator("td").nth(2).inner_text())

    # Cegah stok negatif
    baris = page.locator(".tabel tbody tr").filter(has_text="SNK-900")
    baris.get_by_role("button", name="Catat", exact=True).click()
    page.wait_for_timeout(480)
    page.locator("[role=dialog]").get_by_label("Jumlah").fill("9999")
    page.wait_for_timeout(420)
    cek("peringatan stok tidak cukup", page.get_by_text("Stok tidak cukup").count() > 0)
    page.screenshot(path=f"{OUT}/06-peringatan-stok.png")
    page.get_by_role("button", name="Simpan pergerakan").click()
    page.wait_for_timeout(420)
    cek("simpan ditolak", page.locator(".modal").count() > 0)
    page.keyboard.press("Escape")
    page.wait_for_timeout(350)

    # ---------- 6. Pencarian & filter ----------
    print("\n=== 6. PENCARIAN & FILTER ===")
    page.fill("#cari-barang", "wafer")
    page.wait_for_timeout(420)
    cek("pencarian menyaring", page.locator(".tabel tbody tr").count() == 1,
        f"hasil={page.locator('.tabel tbody tr').count()}")
    page.fill("#cari-barang", "")
    page.wait_for_timeout(350)
    page.select_option("select[aria-label='Saring status stok']", "habis")
    page.wait_for_timeout(420)
    cek("filter status habis", page.locator(".tabel tbody tr").count() == 1,
        f"hasil={page.locator('.tabel tbody tr').count()}")
    page.select_option("select[aria-label='Saring status stok']", "semua")
    page.wait_for_timeout(350)

    # ---------- 7. Hapus + konfirmasi ----------
    print("\n=== 7. HAPUS + KONFIRMASI ===")
    page.locator(".tabel tbody tr").filter(has_text="SNK-900").locator("button[aria-label^='Hapus']").click()
    page.wait_for_timeout(480)
    cek("konfirmasi hapus tampil", page.get_by_text("Hapus barang ini?").count() > 0)
    page.screenshot(path=f"{OUT}/07-konfirmasi.png")
    page.get_by_role("button", name="Ya, hapus").click()
    page.wait_for_timeout(700)
    cek("barang terhapus", page.locator(".tabel tbody tr").filter(has_text="SNK-900").count() == 0)
    cek("notifikasi dengan aksi batalkan tampil", page.get_by_text("Urungkan").count() > 0)

    # ---------- 8. Riwayat ----------
    print("\n=== 8. RIWAYAT ===")
    nav(page, "pergerakan")
    cek("tabel riwayat tampil", page.locator(".tabel tbody tr").count() > 100,
        f"baris={page.locator('.tabel tbody tr').count()}")
    page.screenshot(path=f"{OUT}/08-riwayat.png", full_page=True)
    page.get_by_role("button", name="Keluar", exact=True).click()
    page.wait_for_timeout(420)
    n = page.locator(".tabel tbody tr").count()
    cek("segmen tipe menyaring", 0 < n < 200, f"hasil={n}")

    # ---------- 9. Data & cadangan ----------
    print("\n=== 9. DATA & CADANGAN ===")
    nav(page, "data")
    cek("ringkasan data tampil", page.get_by_text("Ringkasan data tersimpan").count() > 0)
    cek("ukuran localStorage tampil", page.get_by_text("di localStorage").count() > 0)
    page.screenshot(path=f"{OUT}/09-data.png", full_page=True)

    import json
    with page.expect_download() as info:
        page.get_by_role("button", name="Unduh cadangan JSON").click()
    d = info.value
    cek("berkas cadangan terunduh", d.suggested_filename.endswith(".json"), d.suggested_filename)
    path = f"{OUT}/cadangan.json"
    d.save_as(path)
    with open(path, encoding="utf-8") as fh:
        muatan = json.load(fh)
    cek("isi cadangan valid", len(muatan["produk"]) >= 15 and len(muatan["pergerakan"]) > 100,
        f"produk={len(muatan['produk'])} pergerakan={len(muatan['pergerakan'])}")
    cek("cadangan tanpa BOM", not open(path, 'rb').read(3).startswith(b'\xef\xbb\xbf'))

    # ---------- 10. Persistensi ----------
    print("\n=== 10. PERSISTENSI ===")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(900)
    cek("data bertahan setelah reload",
        page.get_by_text("Selamat datang kembali").count() > 0)
    nav(page, "barang")
    cek("jumlah barang tetap", page.locator(".tabel tbody tr").count() == n_awal,
        f"baris={page.locator('.tabel tbody tr').count()} harapan={n_awal}")

    # ---------- 11. Aksesibilitas ----------
    print("\n=== 11. AKSESIBILITAS ===")
    page.get_by_role("button", name="Catat stok").first.click()
    page.wait_for_timeout(520)
    cek("dialog punya role + aria-modal", page.locator("[role=dialog][aria-modal=true]").count() > 0)
    cek("dialog punya aria-labelledby", page.locator("[role=dialog][aria-labelledby]").count() > 0)
    cek("fokus masuk ke dialog",
        page.evaluate("() => document.querySelector('[role=dialog]')?.contains(document.activeElement)") is True)
    page.keyboard.press("Escape")
    page.wait_for_timeout(420)
    cek("Escape menutup dialog", page.locator(".modal").count() == 0)

    # ---------- 12. Responsif 768 ----------
    print("\n=== 12. RESPONSIF 768px ===")
    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(550)
    cek("sidebar jadi drawer", page.locator(".tombol-menu").is_visible())
    page.locator(".tombol-menu").click()
    page.wait_for_timeout(450)
    cek("drawer terbuka", page.locator(".sisi--buka").count() > 0)
    page.screenshot(path=f"{OUT}/10-drawer-768.png")
    page.locator('[data-nav="dasbor"]').click()
    page.wait_for_timeout(480)
    cek("drawer tertutup setelah navigasi", page.locator(".sisi--buka").count() == 0)
    m = page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    cek("tanpa overflow horizontal di 768px", m[0] <= m[1], f"{m[0]}/{m[1]}")
    page.screenshot(path=f"{OUT}/11-dasbor-768.png", full_page=True)

    # ---------- 13. Responsif 360 ----------
    print("\n=== 13. RESPONSIF 360px ===")
    page.set_viewport_size({"width": 360, "height": 740})
    page.wait_for_timeout(550)
    m = page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    cek("tanpa overflow horizontal di 360px", m[0] <= m[1], f"{m[0]}/{m[1]}")
    page.screenshot(path=f"{OUT}/12-dasbor-360.png", full_page=True)

    nav(page, "barang")
    cek("tabel jadi kartu di mobile",
        page.locator(".tabel tbody tr").first.locator("td").first.is_visible())
    page.screenshot(path=f"{OUT}/13-produk-360.png", full_page=True)

    page.get_by_role("button", name="Tambah barang").first.click()
    page.wait_for_timeout(560)
    box = page.locator(".modal").bounding_box()
    cek("dialog muat di viewport 360px", box and box["width"] <= 360 and box["x"] >= 0,
        f"x={box['x']:.0f} w={box['width']:.0f}" if box else "tidak terukur")
    page.screenshot(path=f"{OUT}/14-dialog-360.png")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    # Kaki dialog selalu terjangkau di semua ukuran
    print("\n=== 14. KAKI DIALOG SELALU TERJANGKAU ===")
    for vw, vh in [(1440, 1000), (1280, 720), (768, 1024), (360, 640)]:
        page.set_viewport_size({"width": vw, "height": vh})
        page.wait_for_timeout(400)
        nav(page, "barang")
        page.get_by_role("button", name="Tambah barang").first.click()
        page.wait_for_timeout(560)
        u = page.evaluate("""() => {
          const m = document.querySelector('.modal');
          const b = [...document.querySelectorAll('.modal__kaki button')]
            .find(x => x.textContent.includes('Tambah barang'));
          const r = m.getBoundingClientRect();
          const r2 = b ? b.getBoundingClientRect() : null;
          return { atas: r.top >= -1, bawah: r.bottom <= window.innerHeight + 1,
                   tombol: r2 ? r2.bottom <= window.innerHeight + 1 : false };
        }""")
        cek(f"dialog {vw}x{vh} utuh & tombol terjangkau", u["atas"] and u["bawah"] and u["tombol"])
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

    # ---------- 15. Empty state ----------
    print("\n=== 15. EMPTY STATE ===")
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.wait_for_timeout(450)
    nav(page, "data")
    page.get_by_role("button", name="Kosongkan semua").click()
    page.wait_for_timeout(480)
    page.get_by_role("button", name="Ya, kosongkan").click()
    page.wait_for_timeout(750)
    nav(page, "dasbor")
    cek("empty state dasbor tampil", page.get_by_text("Belum ada barang tercatat").count() > 0)
    page.screenshot(path=f"{OUT}/15-empty-dasbor.png", full_page=True)
    nav(page, "data")
    page.get_by_role("button", name="Reset data demo").click()
    page.wait_for_timeout(450)
    page.get_by_role("button", name="Ya, reset ke demo").click()
    page.wait_for_timeout(750)
    nav(page, "barang")
    cek("data demo pulih", page.locator(".tabel tbody tr").count() == n_awal,
        f"baris={page.locator('.tabel tbody tr').count()}")

    ctx.close()
    browser.close()

    # ---------- 16. Konsol ----------
    print("\n=== 16. KONSOL & JARINGAN ===")
    cek("tanpa error konsol", len(console_errors) == 0, "; ".join(console_errors[:3]))
    cek("tanpa page error", len(page_errors) == 0, "; ".join(page_errors[:3]))
    cek("tanpa permintaan jaringan gagal", len(failed_requests) == 0, "; ".join(failed_requests[:3]))

print("\n" + "=" * 55)
print(f"TOTAL GAGAL: {len(failures)}")
for f in failures:
    print("  - " + f)
print("=" * 55)
sys.exit(1 if failures else 0)