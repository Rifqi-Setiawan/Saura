# AGENTS.md

Salin seluruh isi blok di bawah ke berkas `AGENTS.md` di root repo. Coding agent (Claude Code, Codex, Cursor, dan sejenisnya) membaca berkas ini setiap sesi.

```markdown
# SAURA: instruksi untuk coding agent

SAURA adalah agen AI perawat PLTS. Operator melapor lewat bot Telegram (foto layar inverter),
backend menghitung produksi perkiraan dan status, agen memandu pemeriksaan dan membuat tiket teknisi,
pengelola menyetujui biaya di web app.

## Dokumen sumber kebenaran
- docs/01-prd.md            fitur, user story, kriteria terima
- docs/02-alur-layar.md     naskah pesan bot, status percakapan, layar web (pakai teks persis)
- docs/03-arsitektur.md     teknologi, struktur repo, variabel lingkungan
- docs/04-mesin-analisis.md rumus dan ambang status
- docs/05-agen-ai.md        tools, prompt, pagar keselamatan
- docs/06-data-api.md       skema database dan endpoint (kontrak)
- docs/07-rencana-kerja.md  daftar tugas T01 sampai T20 dan data contoh
- docs/08-pengujian-demo.md kasus uji dan naskah demo
- docs/mockups/             gambar layar M-01 sampai M-11

## Cara bekerja
1. Kerjakan SATU tugas (Txx) per sesi, sesuai urutan di docs/07-rencana-kerja.md.
2. Sebelum menulis kode, baca bagian dokumen yang relevan.
3. Tulis tes dulu untuk logika (mesin analisis, pagar keselamatan, status tiket), lalu implementasi.
4. Jalankan seluruh tes sebelum selesai. Jangan menandai tugas selesai bila ada tes gagal.
5. Laporkan: berkas yang diubah, tes yang ditambahkan, hasil tes, hal yang belum selesai.

## Perintah
- Nyalakan semua:        docker compose up --build
- Tes backend:           cd backend && pytest -q
- Lint backend:          cd backend && ruff check . && ruff format --check .
- Migrasi:               cd backend && alembic upgrade head
- Isi data demo:         cd backend && python -m app.sim.seed --reset --demo-date 2026-10-26
- Majukan tanggal demo:  cd backend && python -m app.sim.advance --to 2026-10-30
- Web dev:               cd web && npm run dev
- Lint dan tes web:      cd web && npm run lint && npm test

## Konvensi
- Python 3.11, FastAPI, SQLAlchemy 2, pydantic v2, type hints wajib.
- Kode, nama variabel, nama tool: bahasa Inggris. Teks yang dilihat pengguna: bahasa Indonesia,
  diambil dari backend/app/bot/messages.py atau web/lib/copy.ts, bukan ditulis langsung di logika.
- Angka: koma desimal dan titik ribuan di tampilan (20,0 kWh; Rp18.000). Simpan angka mentah di DB.
- Waktu disimpan UTC; tanggal laporan = tanggal lokal lokasi.
- Semua ambang status dibaca dari tabel config, bukan konstanta tersebar.
- Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Recharts, Leaflet.

## Aturan yang tidak boleh dilanggar
- Status lokasi (NORMAL, ACTION, CRITICAL, NO_DATA) hanya dihitung oleh backend/app/engine. LLM tidak pernah menentukan status.
- Agen tidak boleh menyuruh operator naik atap, membuka inverter, menyentuh kabel, terminal, atau baterai.
  Pagar ditegakkan di backend/app/agent/guardrails.py dan wajib punya tes.
- Instruksi tindakan hanya dari backend/app/agent/playbook.yaml.
- Tidak ada tool atau endpoint yang menyetujui biaya selain POST /api/v1/tickets/{code}/approve oleh peran manager.
- Tidak ada pembayaran.
- Semua data demo diberi label "Data simulasi" di layar.
- Jangan mengarang angka produksi, cuaca, atau hasil uji. Bila data tidak ada, tampilkan kosong dan beri tahu.
- Rahasia hanya di .env (tidak di-commit). Perbarui .env.example bila menambah variabel.
- Jangan mengubah skema database atau kontrak API tanpa memperbarui docs/06-data-api.md di commit yang sama.

## Nama dan istilah
- Produk: SAURA. Bot tampil sebagai "SauraAI". Kode tiket: SA-001, SA-002, dst.
- Peran yang menyetujui biaya: "pengelola" (bukan manajer).
- Pakai E-Today dari layar inverter, bukan E-Total.

## Bila ragu
Ikuti dokumen di docs/. Bila dokumen tidak menjawab, pilih opsi paling sederhana yang aman,
tulis asumsinya di docs/keputusan.md, dan sebutkan di laporan akhir.
```

Untuk Claude Code, buat juga `CLAUDE.md` berisi satu baris `Lihat AGENTS.md`.
