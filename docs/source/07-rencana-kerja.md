# Rencana kerja

Kerjakan tugas berurutan. Setiap tugas kecil, punya berkas yang jelas, dan punya kriteria selesai yang bisa diuji. Beri coding agent satu tugas per sesi.

## Milestone

| Milestone | Target | Tugas | Hasil |
| --- | --- | --- | --- |
| M0 | 1 Nov | Tidak ada kode | Berkas pendaftaran dengan mockup |
| M1 Fondasi dan mesin | 4 Nov | T01 sampai T08 | Mesin analisis lulus semua tes |
| M2 Bot dan agen | 7 Nov | T09 sampai T12 | Alur lapor sampai tiket jalan di Telegram |
| M3 Web app | 9 Nov | T13 sampai T19 | Dasbor, tiket, persetujuan, laporan mingguan |
| M4 Siap demo | 10 Nov | T20 | Skenario demo bisa diputar ulang, video cadangan |
| Main event | 11 sampai 13 Nov | Perbaikan dari uji pengguna | Minimal 3 pengguna mencoba |

## Daftar tugas

| ID | Tugas | Berkas utama | Selesai bila |
| --- | --- | --- | --- |
| T01 | Kerangka repo, Docker Compose, `.env.example`, lint dan tes otomatis | `docker-compose.yml`, `backend/`, `web/` | `docker compose up` menyalakan db, api, web; `pytest` dan `npm run lint` jalan |
| T02 | Model database dan migrasi Alembic untuk semua tabel di tab Data dan API | `backend/app/models/`, `db/` | Migrasi naik dan turun tanpa galat; tes membuat dan membaca satu baris tiap tabel |
| T03 | Seed dan generator data simulasi | `sim/seed.py`, `sim/generator.py` | `python -m app.sim.seed --reset` menghasilkan data persis seperti bagian Data contoh di bawah; \`python -m app.sim.advance --to 2026-10-30\` memajukan skenario hari demi hari |
| T04 | Pengambil radiasi harian dengan cache dan fallback | `engine/weather.py` | Tes dengan respons tiruan Open-Meteo, NASA POWER, nilai -999, dan klimatologi |
| T05 | Produksi perkiraan, kinerja, rupiah, status | `engine/expected.py`, `money.py`, `status.py` | Tes: 20/32 jadi ACTION Rp18.000; 0/24 cerah jadi CRITICAL; 15,4/16 jadi NORMAL; H 1,2 tidak pernah CRITICAL; 45/32 ditandai mencurigakan |
| T06 | Verifikasi pemulihan dan perhitungan mingguan | `engine/recovery.py`, `reports/weekly.py` | Tes: 29, 30, 31 kWh setelah DONE\_BY\_TECH jadi RESOLVED; angka mingguan sama dengan Data contoh |
| T07 | Dugaan penyebab | `engine/triage.py` | Satu tes per baris tabel dugaan di tab Mesin analisis |
| T08 | Pembungkus LLM dan pembaca foto inverter | `llm.py`, `vision/ocr.py` | Unit test memakai LLM tiruan; uji manual 10 foto contoh, akurasi dicatat di `docs/hasil-uji.md` |
| T09 | Bot: polling dan webhook, pendaftaran M-01 dan M-02, geocoding | `bot/` | Pendaftaran lengkap di Telegram sesuai naskah; validasi kapasitas |
| T10 | Bot: pengingat dan laporan harian M-03 dan M-04 | `bot/`, `scheduler/jobs.py` | Foto terbaca, konfirmasi, ubah angka, gagal baca; satu laporan per tanggal |
| T11 | Orkestrator agen, tools, playbook, pagar keselamatan, `agent_log` | `agent/` | Tes pagar: pesan berisi "naik atap" diganti; tidak ada tool persetujuan; batas 6 tool per putaran |
| T12 | Peringatan M-05, pemeriksaan terpandu M-06, pembuatan tiket | `bot/`, `agent/` | Skenario MA Nurul Huda berjalan dari foto sampai tiket SA-024 |
| T13 | REST: login, dasbor, lokasi, deret grafik | `api/` | Respons sama bentuknya dengan contoh di tab Data dan API |
| T14 | REST: tiket, persetujuan, tunda, pertanyaan, selesai, notifikasi | `api/routes_tickets.py` | Alur status tiket sesuai tabel; pengguna tanpa peran ditolak 403 |
| T15 | Web: kerangka Next.js, login, sidebar | `web/` | Login tiga peran contoh; sidebar sesuai M-09 |
| T16 | Web: halaman Ringkasan lokasi M-09 | `web/app/(dashboard)/ringkasan` | Kartu, tabel prioritas, peta, grafik 7 hari, kotak persetujuan, badge Data simulasi |
| T17 | Web: Detail tiket M-07 dan Persetujuan biaya M-08 (tampilan ponsel) | `web/app/(dashboard)/tiket/` | Setujui, Tunda, Tanya teknisi mengubah status dan tercatat di riwayat |
| T18 | Pesan pemulihan M-10, laporan mingguan M-11, PDF | `bot/`, `reports/` | Kartu dan PDF berisi angka Data contoh dan label "Data contoh, bukan hasil pilot" |
| T19 | Impor CSV | `api/routes_import.py`, `web/` | CSV contoh diproses; baris rusak dilaporkan, bukan membuat galat |
| T20 | Kesiapan demo | seluruh repo | Naskah demo di tab Pengujian berjalan 3 kali berturut tanpa galat; video cadangan direkam |

## Data contoh (seed demo)

Semua lokasi adalah data simulasi. Koordinat di sekitar Bandung; radiasi demo diset 4,05 kWh/m2 dan PR 0,79 untuk 20 sampai 30 Oktober 2026 supaya angka sama dengan mockup.

| Lokasi | Kapasitas | Jenis | Operator | Status 26 Okt | Aktual / perkiraan 26 Okt |
| --- | --- | --- | --- | --- | --- |
| Balai Desa Cibiru | 7,5 kWp | On-grid | (contoh) | Kritis | 0 / 24,0 kWh |
| MA Nurul Huda | 10 kWp | On-grid, tanpa baterai | Pak Budi | Perlu tindakan | 20,0 / 32,0 kWh |
| SDN Sukamaju | 5 kWp | On-grid | (contoh) | Normal | 15,4 / 16,0 kWh |
| SMP Cendekia | 6 kWp | On-grid | (contoh) | Belum ada data | tidak ada laporan |

Pengguna web contoh: Bu Rina (manager), Ahmad (technician), Admin SAURA (admin).

**Deret MA Nurul Huda (perkiraan 32,0 kWh setiap hari):**

| Tanggal | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aktual (kWh) | 30 | 28 | 26 | 24 | 23 | 21 | 20 | 26 | 29 | 30 | 31 |
| Kejadian |  |  |  |  |  |  | Peringatan, tiket SA-024 | Kunjungan teknisi 09.00 | Pulih 1 | Pulih 2 | Pulih 3, tiket selesai |

Laporan mingguan 24 sampai 30 Okt dari deret ini: total aktual 180 kWh, perkiraan 224 kWh, selisih 44 kWh, Rp66.000.

**Catatan penting:** mockup laporan mingguan menulis 198 kWh dan Rp39.000, tetapi angka itu tidak bisa dicapai bila grafik 20 sampai 26 Okt di dasbor benar (hari kunjungan harus 44 kWh, di atas perkiraan). Pilih salah satu: ubah mockup laporan mingguan menjadi 180 vs 224 kWh, selisih 44 kWh, Rp66.000, atau ubah grafik dasbor. Seed di atas mengikuti grafik dasbor.

## Generator data simulasi

Untuk uji akurasi status, `sim/generator.py` membuat 30 sampai 90 hari data per lokasi dengan label gangguan:

| Gangguan | Cara membuat | Label |
| --- | --- | --- |
| Normal | aktual = perkiraan x N(1, 0,05) | `normal` |
| Panel kotor | kinerja turun 0,5 sampai 1,5% per hari sejak hari d | `soiling` |
| String putus | aktual x (n-1)/n sejak hari d, n = 2 sampai 4 | `string_down` |
| Inverter mati | aktual 0 selama 1 sampai 3 hari | `inverter_trip` |
| PLN padam | aktual x 0,3 sampai 0,7 satu hari, jawaban PLN = ya | `grid_outage` |
| Data hilang | tidak ada laporan | `missing` |
| Mendung | H 0,8 sampai 1,5 kWh/m2, kinerja normal | `cloudy` |

Generator menyimpan labelnya di berkas terpisah supaya akurasi status bisa dihitung (target minimal 85%). Radiasi diambil dari data NASA POWER asli koordinat Bandung, gangguan disisipkan di atasnya.
