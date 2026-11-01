# Data dan API

Skema ini adalah kontrak. Perubahan skema atau endpoint wajib memperbarui tab ini dulu. Semua `id` bertipe UUID, semua waktu disimpan dalam UTC (`timestamptz`), tanggal laporan disimpan sebagai `date` waktu lokal lokasi.

## Tabel database

### `app_user` (pengguna web)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| name | text | contoh: Rina |
| email | text unique | login |
| password\_hash | text | bcrypt |
| role | enum `user_role` | `admin`, `manager`, `technician` |
| phone | text null |  |
| created\_at | timestamptz |  |

### `operator` (pengguna bot)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| telegram\_user\_id | bigint unique |  |
| telegram\_chat\_id | bigint |  |
| name | text | contoh: Budi |
| honorific | text | `Pak` atau `Bu` |
| created\_at | timestamptz |  |

### `site` (lokasi PLTS)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| name | text | MA Nurul Huda |
| city, province | text | Bandung, Jawa Barat |
| lat, lon | numeric | dari geocoding |
| kwp | numeric(8,2) | 10 |
| system\_type | enum `system_type` | `on_grid`, `hybrid`, `off_grid` |
| has\_battery | boolean |  |
| panel\_mount | enum `panel_mount` | `roof`, `ground`, `unknown` |
| timezone | text | Asia/Jakarta |
| tariff\_idr\_per\_kwh | integer | 1500 |
| pr\_default | numeric(4,3) | 0,790 |
| pr\_calibrated | numeric(4,3) null | hasil kalibrasi |
| operator\_id | uuid FK operator |  |
| manager\_id | uuid FK app\_user |  |
| technician\_id | uuid FK app\_user null | teknisi default |
| reminder\_time | time | 16:00 |
| is\_simulated | boolean | true untuk data demo |
| created\_at | timestamptz |  |

### `photo`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| site\_id | uuid FK |  |
| kind | enum `photo_kind` | `inverter`, `panel`, `error_code` |
| storage\_path | text | nama acak |
| telegram\_file\_id | text null |  |
| created\_at | timestamptz |  |

### `daily_report`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| site\_id | uuid FK |  |
| date | date | unik bersama site\_id |
| kwh | numeric(8,2) | E-Today |
| source | enum `report_source` | `ocr`, `manual`, `csv`, `sim` |
| photo\_id | uuid FK null |  |
| ocr\_confidence | numeric(3,2) null |  |
| confirmed\_by\_operator | boolean |  |
| created\_at | timestamptz |  |

### `weather_daily`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| site\_id, date | PK gabungan |  |
| irradiance\_kwh\_m2 | numeric(5,2) |  |
| source | enum `weather_source` | `open_meteo`, `nasa_power`, `nasa_climatology` |
| fetched\_at | timestamptz |  |

### `daily_assessment`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| site\_id, date | unik gabungan |  |
| report\_id | uuid FK null | null bila `NO_DATA` |
| expected\_kwh, actual\_kwh, gap\_kwh | numeric(8,2) |  |
| performance | numeric(5,4) | 0,6250 |
| loss\_idr | integer | 18000 |
| status | enum `site_status` | `NO_DATA`, `CRITICAL`, `ACTION`, `NORMAL` |
| reason\_code | text | contoh `below_action_ratio`, `cloudy_guard` |
| weather\_source | enum `weather_source` |  |
| created\_at | timestamptz |  |

### `conversation`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| operator\_id | uuid PK |  |
| state | text | nilai dari tabel status di tab Alur dan layar |
| context | jsonb | data sementara: site\_id, jawaban pemeriksaan |
| updated\_at | timestamptz |  |

### `check_session` (pemeriksaan terpandu)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| site\_id | uuid FK |  |
| assessment\_id | uuid FK |  |
| answers | jsonb | `{pln_outage, error_code, panel_photo_ids[]}` |
| cause, confidence | text | hasil triage |
| started\_at, ended\_at | timestamptz |  |

### `ticket`, `ticket_event`, `ticket_photo`

| Kolom `ticket` | Tipe | Keterangan |
| --- | --- | --- |
| id | uuid PK |  |
| code | text unique | `SA-024`, urut per sistem |
| site\_id | uuid FK |  |
| status | enum `ticket_status` | lihat alur status di bawah |
| priority | enum | `critical`, `normal` |
| reason, cause | text |  |
| technician\_id | uuid FK null | Ahmad |
| scheduled\_at | timestamptz null | 27 Okt 09.00 |
| estimated\_cost\_idr | integer null | 150000 |
| approved\_by, approved\_at | uuid, timestamptz null |  |
| created\_at | timestamptz |  |

`ticket_event`: id, ticket\_id, type (`created`, `approved`, `postponed`, `question`, `done_by_tech`, `resolved`, `reopened`, `cost_change`), actor\_user\_id null, note, created\_at. `ticket_photo`: ticket\_id, photo\_id.

### Tabel pendukung

- `notification`: id, user\_id, site\_id, ticket\_id null, text, read\_at, created\_at.
- `agent_log`: id, operator\_id, site\_id, event, context\_summary jsonb, tool\_calls jsonb, final\_message, guardrail\_hits jsonb, duration\_ms, created\_at.
- `weekly_report`: id, site\_id, week\_start date, totals jsonb, pdf\_path, created\_at.
- `config`: key text PK, value jsonb (ambang di tab Mesin analisis).

## Alur status tiket

| Dari | Aksi | Ke | Siapa |
| --- | --- | --- | --- |
| (baru) | Tiket dibuat | `AWAITING_APPROVAL` | Agen |
| `AWAITING_APPROVAL` | Setujui kunjungan | `SCHEDULED` | Pengelola |
| `AWAITING_APPROVAL` | Tunda | `POSTPONED` | Pengelola |
| `AWAITING_APPROVAL` | Tanya teknisi | tetap, tambah event `question` | Pengelola |
| `POSTPONED` | Setujui | `SCHEDULED` | Pengelola |
| `SCHEDULED` | Tandai selesai dikerjakan | `DONE_BY_TECH` | Teknisi |
| `DONE_BY_TECH` | 3 laporan pulih | `RESOLVED` | Mesin analisis |
| `DONE_BY_TECH` | Laporan kembali turun | `REOPENED` | Mesin analisis |
| `REOPENED` | Setujui kunjungan ulang | `SCHEDULED` | Pengelola |
| apa pun | Biaya berubah | kembali `AWAITING_APPROVAL` | Teknisi |

## REST API

Prefix `/api/v1`, JSON, autentikasi `Authorization: Bearer <JWT>` kecuali webhook dan login.

| Metode | Path | Peran | Fungsi |
| --- | --- | --- | --- |
| POST | `/auth/login` | publik | Login, kembalikan token |
| GET | `/me` | semua | Profil pengguna |
| GET | `/dashboard/summary?date=` | manager, admin | Kartu hitungan, prioritas hari ini, persetujuan menunggu |
| GET | `/sites` | manager, admin | Daftar lokasi + status hari ini |
| GET | `/sites/{id}` | manager, admin, technician | Detail lokasi |
| GET | `/sites/{id}/series?days=7` | manager, admin | Deret aktual dan perkiraan |
| PATCH | `/sites/{id}` | admin | Ubah tarif, PR, jadwal pengingat |
| POST | `/sites/{id}/reports` | admin | Laporan manual |
| POST | `/import/csv` | manager, admin | Unggah CSV produksi harian |
| GET | `/tickets?status=` | semua | Daftar tiket sesuai peran |
| GET | `/tickets/{code}` | semua | Detail tiket + foto + event |
| POST | `/tickets/{code}/approve` | manager | Setujui kunjungan |
| POST | `/tickets/{code}/postpone` | manager | Tunda |
| POST | `/tickets/{code}/question` | manager | Kirim pertanyaan ke teknisi |
| POST | `/tickets/{code}/done` | technician | Tandai selesai dikerjakan |
| GET | `/sites/{id}/weekly?week_start=` | manager, admin | Data laporan mingguan |
| GET | `/sites/{id}/weekly.pdf?week_start=` | manager, admin | PDF laporan mingguan |
| GET | `/photos/{id}` | semua yang berhak atas lokasi | Berkas foto |
| GET | `/notifications` | semua | Notifikasi |
| POST | `/sim/reset` | admin | Isi ulang data simulasi (hanya bila `SIMULATION_MODE=true`) |
| POST | `/telegram/webhook` | Telegram | Update bot (cek secret token) |

### Contoh respons `GET /dashboard/summary?date=2026-10-26`

```json
{
  "date": "2026-10-26",
  "simulated": true,
  "counts": {"registered": 4, "critical": 1, "action": 1, "no_data": 1, "normal": 1},
  "priorities": [
    {"site_id": "...", "name": "Balai Desa Cibiru", "status": "CRITICAL", "actual_kwh": 0, "expected_kwh": 24, "action": {"type": "ticket", "label": "Tiket teknisi"}},
    {"site_id": "...", "name": "MA Nurul Huda", "status": "ACTION", "actual_kwh": 20, "expected_kwh": 32, "action": {"type": "awaiting_approval", "label": "Menunggu persetujuan"}},
    {"site_id": "...", "name": "SMP Cendekia", "status": "NO_DATA", "actual_kwh": null, "expected_kwh": null, "action": {"type": "remind", "label": "Ingatkan operator"}},
    {"site_id": "...", "name": "SDN Sukamaju", "status": "NORMAL", "actual_kwh": 15.4, "expected_kwh": 16, "action": {"type": "monitor", "label": "Pantau rutin"}}
  ],
  "pending_approvals": [{"ticket_code": "SA-024", "site_name": "MA Nurul Huda", "estimated_cost_idr": 150000}]
}
```

### Contoh respons `GET /tickets/SA-024`

```json
{
  "code": "SA-024",
  "status": "AWAITING_APPROVAL",
  "site": {"name": "MA Nurul Huda", "city": "Bandung", "kwp": 10},
  "production": {"date": "2026-10-26", "actual_kwh": 20, "expected_kwh": 32},
  "cause": "Dugaan perlu pemeriksaan",
  "evidence_photos": ["/api/v1/photos/...", "/api/v1/photos/..."],
  "visit": {"technician": "Ahmad", "scheduled_at": "2026-10-27T02:00:00Z", "estimated_cost_idr": 150000},
  "events": [{"type": "created", "at": "2026-10-26T09:10:00Z", "note": "Dibuat oleh SauraAI"}]
}
```

### Format CSV impor

```csv
tanggal,kwh
2026-10-20,30.1
2026-10-21,29.0
```

Kolom lain diabaikan. Tanggal format `YYYY-MM-DD`; desimal titik atau koma diterima. Respons: `{imported, skipped, errors[]}`.
