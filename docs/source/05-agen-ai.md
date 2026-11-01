# Agen AI

Agen SAURA adalah gabungan **mesin status (kode biasa)** untuk langkah yang sudah pasti dan **LLM dengan tool calling** untuk percakapan terbuka. Aturannya: kalau langkahnya bisa ditulis sebagai if-else, jangan serahkan ke LLM.

## Pembagian tugas kode dan LLM

| Tugas | Dikerjakan oleh |
| --- | --- |
| Alur pendaftaran, konfirmasi angka, tombol | Mesin status `bot/states.py` |
| Membaca angka E-Today dari foto | Model visi lewat `vision/ocr.py` |
| Menghitung perkiraan, kinerja, status, rupiah | Mesin analisis (rumus) |
| Memahami jawaban bebas operator ("listrik mati tadi siang") | LLM |
| Memilih langkah pemeriksaan berikutnya, menyusun ringkasan dugaan | LLM dengan tools |
| Menjawab pertanyaan operator ("kenapa produksinya turun?") | LLM dengan tools, berbasis data lokasi |
| Menyetujui biaya, menutup tiket | Hanya manusia lewat web app |

## Loop agen

Agen dipicu oleh event, bukan berjalan terus-menerus.

| Event | Pemicu | Yang terjadi |
| --- | --- | --- |
| `message_received` | Teks dari operator | Bila ada status menunggu, mesin status menangani; selain itu LLM dipanggil |
| `photo_received` | Foto dari operator | Sesuai status: foto inverter, foto panel, atau foto kode error |
| `button_pressed` | Tombol inline | Mesin status |
| `assessment_ready` | Laporan selesai dianalisis | Kirim kartu status yang sesuai; bila `ACTION` tawarkan pemeriksaan, bila `CRITICAL` buat tiket |
| `reminder_due` | Penjadwal 16.00 dan 19.00 | Kirim pengingat |
| `no_data` | Penjadwal 20.00 | Status `NO_DATA`, kabari pengelola di dasbor |
| `ticket_updated` | Web app | Kabari operator dan teknisi |
| `recovery_verified` | Mesin analisis | Kirim kartu pemulihan |

Satu putaran LLM: susun konteks (profil lokasi, 7 hari terakhir, status percakapan, 10 pesan terakhir), panggil LLM dengan daftar tools, jalankan tool yang diminta, kirim hasil kembali, ulangi sampai LLM memberi jawaban akhir. **Maksimal 6 panggilan tool per putaran**; bila tercapai, kirim pesan aman "Saya teruskan ke tim SAURA, ya." dan catat.

## Daftar tools

Semua tools ditulis di `agent/tools.py`, punya skema JSON, dan mengembalikan JSON. Nama tool dalam bahasa Inggris supaya konsisten dengan kode.

| Tool | Masukan | Keluaran | Catatan |
| --- | --- | --- | --- |
| `get_site_context` | `site_id` | Profil lokasi, 7 laporan dan penilaian terakhir, tiket aktif | Dipanggil otomatis di awal putaran |
| `read_inverter_photo` | `photo_id` | `{kwh_today, confidence, label_seen, raw_text}` | Hanya E-Today |
| `save_daily_report` | `site_id, date, kwh, source, photo_id?` | `report_id` | `source`: `ocr`, `manual`, `csv`, `sim` |
| `run_assessment` | `site_id, date` | `{expected_kwh, actual_kwh, performance, status, gap_kwh, loss_idr, irradiance, weather_source}` | Memanggil mesin analisis |
| `ask_operator` | `question, buttons[]?, awaiting` | `message_id` | Mengatur status percakapan |
| `request_photo` | `kind` (`inverter`, `panel`, `error_code`) | `message_id` | Untuk `panel`, catatan keselamatan ditambahkan otomatis oleh kode |
| `get_playbook_step` | `topic` | Langkah yang sudah diverifikasi | Satu-satunya sumber instruksi tindakan |
| `classify_cause` | `site_id, answers{}` | `{cause, confidence, recommended_action}` | Memanggil `engine/triage.py` |
| `create_ticket` | `site_id, reason, evidence_photo_ids[], priority` | `{ticket_code, status}` | Status awal selalu `AWAITING_APPROVAL` bila ada biaya |
| `notify_manager` | `site_id, ticket_code?, text` | `notification_id` | Notifikasi di web app |
| `send_card` | `card_type, data{}` | `message_id` | Kartu dari templat `bot/messages.py`, bukan teks bebas |

Contoh skema satu tool:

```json
{
  "name": "create_ticket",
  "description": "Buat tiket kunjungan teknisi untuk lokasi. Biaya selalu menunggu persetujuan pengelola.",
  "input_schema": {
    "type": "object",
    "properties": {
      "site_id": {"type": "string"},
      "reason": {"type": "string", "description": "Ringkasan 1 kalimat: data dan dugaan"},
      "evidence_photo_ids": {"type": "array", "items": {"type": "string"}},
      "priority": {"type": "string", "enum": ["critical", "normal"]}
    },
    "required": ["site_id", "reason", "priority"]
  }
}
```

## Pagar keselamatan (`agent/guardrails.py`)

Pagar ditegakkan oleh kode, tidak hanya oleh prompt.

1. **Instruksi tindakan hanya dari playbook.** LLM tidak boleh mengarang langkah perbaikan; teks tindakan harus berasal dari `get_playbook_step`.
2. **Daftar larangan.** Sebelum dikirim, setiap pesan dicek terhadap pola terlarang: naik atap, memanjat, membuka atau membongkar inverter, mencabut atau menyambung kabel, menyentuh baterai, menyentuh terminal atau kabel listrik. Bila cocok, pesan diganti "Bagian ini dikerjakan teknisi, ya. Saya bisa buatkan tiketnya." dan kejadiannya dicatat.
3. **Foto panel selalu disertai** "Cukup dari bawah. Hindari atap dan kabel." (ditambahkan kode).
4. **Tidak ada tool untuk menyetujui biaya atau membayar.** Persetujuan hanya lewat endpoint web yang butuh login pengelola.
5. **Status dari mesin analisis.** LLM tidak boleh menulis atau mengubah status lokasi.
6. **Kata "dugaan" atau "belum pasti"** wajib untuk penyebab.
7. **Audit log.** Setiap putaran menyimpan konteks ringkas, tool yang dipanggil beserta argumen dan hasil, pesan akhir, dan durasi di tabel `agent_log`.
8. **Label simulasi.** Bila `SIMULATION_MODE=true`, setiap kartu berisi angka diberi badge "Data simulasi".

## Playbook awal (`agent/playbook.yaml`)

| Topik | Langkah yang diizinkan |
| --- | --- |
| `check_pln` | Tanyakan apakah PLN sempat padam hari ini |
| `check_error_code` | Minta operator melihat layar inverter dan memotret kode error bila ada, tanpa membuka penutup |
| `photo_panel` | Minta foto panel dari halaman atau dari bawah |
| `clean_ground_panel` | Hanya untuk panel di tanah: siram air bersih dan lap lembut pada pagi atau sore hari, jangan memakai sabun keras atau sikat kawat |
| `wait_tomorrow` | Pantau laporan besok, tidak perlu tindakan |
| `call_technician` | Tawarkan tiket teknisi |

Isi playbook ditinjau oleh anggota tim atau dosen berlatar energi sebelum demo.

## Prompt sistem (`agent/prompts.py`)

```text
Kamu adalah SauraAI, asisten perawatan PLTS untuk operator di sekolah, pesantren, dan desa.
Bahasa: Indonesia sederhana, ramah, sopan (sapa "Pak" atau "Bu" sesuai profil). Kalimat pendek, maksimal 2 kalimat per balasan teks bebas.

Kamu punya akses ke tools. Aturan:
1. Angka produksi, perkiraan, status, dan rupiah hanya boleh berasal dari hasil tool. Jangan menebak angka.
2. Instruksi tindakan hanya boleh berasal dari get_playbook_step. Jangan mengarang langkah perbaikan.
3. Jangan pernah meminta operator naik atap, membuka inverter, menyentuh kabel, terminal, atau baterai. Pekerjaan itu milik teknisi.
4. Sebut penyebab sebagai "dugaan" atau "belum pasti".
5. Kamu tidak bisa menyetujui biaya. Biaya selalu disetujui pengelola.
6. Untuk kartu berisi angka, gunakan send_card, bukan teks bebas.
7. Bila tidak yakin, tanya satu hal saja kepada operator.

Konteks lokasi:
{site_context_json}
Status percakapan saat ini: {conversation_state}
```

## Prompt pembacaan foto (`vision/ocr.py`)

```text
Gambar ini adalah foto layar inverter PLTS.
Cari nilai produksi energi HARI INI. Label umumnya: E-Today, E-Day, Today, Daily, Hari ini.
JANGAN gunakan E-Total, Total, atau angka kumulatif.
Kembalikan HANYA JSON:
{"kwh_today": number|null, "label_seen": string|null, "confidence": number 0-1, "raw_text": string}
Bila tidak yakin atau label hari ini tidak terlihat, isi kwh_today null dan confidence di bawah 0.5.
```

Pemeriksaan setelah respons: `kwh_today` harus antara 0 dan 8 x kapasitas kWp; bila di luar rentang, anggap gagal baca.

## Contoh putaran

Operator mengetik: "tadi siang listrik PLN mati sebentar" saat status `CHECK_PLN`.

1. Mesin status meneruskan ke LLM karena jawaban bukan tombol.
2. LLM memanggil `classify_cause(site_id, {pln_outage: true})` lalu menerima `{cause: "grid_outage", confidence: "sedang", recommended_action: "wait_tomorrow"}`.
3. LLM memanggil `get_playbook_step("wait_tomorrow")`.
4. Balasan: "Terima kasih, Pak. Dugaan saya produksi turun karena PLN padam, inverter ikut berhenti. Saya pantau laporan besok."
5. `agent_log` menyimpan semua langkah.
