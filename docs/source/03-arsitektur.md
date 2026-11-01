# Arsitektur sistem

Satu repo, dua aplikasi: backend Python (FastAPI) yang menjalankan bot, agen, mesin analisis, dan API; serta web app Next.js untuk pengelola dan teknisi. Keduanya berbagi satu database PostgreSQL.

&#91;embedded content: arsitektur SAURA · 2 kanal pengguna, 1 backend, 4 layanan pendukung\]

Keputusan penting: keputusan status (normal, perlu tindakan, kritis) dihitung oleh mesin analisis dengan rumus, bukan oleh LLM, supaya bisa diuji dan dijelaskan. LLM dipakai untuk membaca foto, memahami jawaban bebas operator, menyusun pesan, dan memilih tool berikutnya.

## Teknologi

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Bahasa backend | Python 3.11 | Tipe dengan pydantic |
| Framework API | FastAPI | Juga melayani webhook Telegram |
| Bot | python-telegram-bot v21 | Mode webhook di server, mode polling saat lokal |
| Database | PostgreSQL 16 | SQLite boleh untuk pengembangan lokal |
| ORM dan migrasi | SQLAlchemy 2 + Alembic |  |
| Penjadwal | APScheduler | Pengingat dan laporan mingguan |
| LLM | Penyedia dengan function calling dan input gambar | Dibungkus satu modul `llm.py`; penyedia dan model dari variabel lingkungan |
| Cuaca | Open-Meteo (radiasi harian), NASA POWER (cadangan dan kalibrasi) | Tanpa kunci API |
| Geocoding | Nominatim OpenStreetMap | Batasi 1 permintaan per detik |
| PDF | WeasyPrint | Laporan mingguan |
| Web app | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui | Responsif laptop dan ponsel |
| Grafik dan peta | Recharts, Leaflet + OpenStreetMap |  |
| Deploy | Docker Compose: `api`, `web`, `db` | HTTPS publik untuk webhook lewat Cloudflare Tunnel atau ngrok |

## Struktur repo

```text
saura/
  AGENTS.md            instruksi untuk coding agent (tab 9)
  CLAUDE.md            berisi: Lihat AGENTS.md
  docker-compose.yml
  .env.example
  docs/                tab dokumen ini dalam Markdown + mockups/
  backend/
    app/
      main.py          FastAPI app, router, startup penjadwal
      config.py        baca variabel lingkungan
      db/              session, base, migrasi alembic
      models/          tabel SQLAlchemy
      schemas/         pydantic request dan response
      api/             routes_sites.py, routes_tickets.py, routes_reports.py, routes_dashboard.py, routes_import.py
      bot/             handlers.py, states.py, messages.py, keyboards.py
      agent/           orchestrator.py, tools.py, prompts.py, guardrails.py
      engine/          weather.py, expected.py, status.py, money.py, recovery.py, triage.py
      vision/          ocr.py
      scheduler/       jobs.py
      reports/         weekly.py, templates/
      sim/             seed.py, generator.py
      llm.py           pembungkus penyedia LLM
    tests/             pytest, satu berkas per modul
  web/
    app/(dashboard)/   ringkasan, lokasi, tiket/[kode], tiket/[kode]/persetujuan, laporan, pengaturan
    components/
    lib/api.ts         klien REST bertipe
```

## Alur data laporan harian

1. Penjadwal mengirim pengingat pukul 16.00 waktu lokasi.
2. Operator mengirim foto; webhook menyimpan foto ke penyimpanan dan membuat baris `photo`.
3. `vision/ocr.py` meminta model visi membaca E-Today dan mengembalikan JSON `{kwh, confidence, label_seen}`.
4. Bot menampilkan kartu konfirmasi; status percakapan `REPORT_WAIT_CONFIRM`.
5. Setelah konfirmasi, baris `daily_report` disimpan dengan sumber `ocr` atau `manual`.
6. `engine/weather.py` mengambil radiasi harian lokasi (cache per lokasi per tanggal).
7. `engine/expected.py` menghitung produksi perkiraan; `engine/status.py` menghitung kinerja dan status; `engine/money.py` menghitung rupiah.
8. Hasil disimpan di `daily_assessment`; agen menerima event `assessment_ready` dan memilih pesan dan tindakan berikutnya.
9. Dasbor membaca data yang sama lewat REST API.

## Variabel lingkungan

```text
DATABASE_URL=postgresql+psycopg://saura:saura@db:5432/saura
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=https://<domain>/telegram/webhook
TELEGRAM_MODE=polling            # polling saat lokal, webhook di server
LLM_PROVIDER=                    # contoh: anthropic, openai, google
LLM_MODEL=                       # model dengan function calling + vision
LLM_API_KEY=
DEFAULT_TARIFF_IDR_PER_KWH=1500
DEFAULT_PR=0.79
DEFAULT_TIMEZONE=Asia/Jakarta
REMINDER_TIME=16:00
PHOTO_STORAGE_DIR=/data/photos
SIMULATION_MODE=true
WEB_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
```

## Deployment

- Lokal: `docker compose up` menjalankan `db`, `api` (port 8000), `web` (port 3000); bot memakai polling.
- Demo: satu VPS atau layanan kontainer; webhook Telegram ke `https://<domain>/telegram/webhook`.
- Cadangan demo: mode simulasi bisa diputar ulang dengan `python -m app.sim.seed --reset` sehingga data demo selalu sama.

## Keamanan

- Token dan kunci API hanya di `.env`; `.env` masuk `.gitignore`.
- Web app memakai login sederhana (email dan kata sandi) dengan peran `admin`, `manager`, `technician`; operator tidak perlu login web.
- Foto disimpan dengan nama acak; URL foto hanya bisa dibuka pengguna yang login.
