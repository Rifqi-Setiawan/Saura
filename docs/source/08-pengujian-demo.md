# Pengujian dan demo

Tiga lapis uji: unit test untuk mesin analisis dan pagar keselamatan, uji alur bot dengan Telegram tiruan, dan uji ujung ke ujung memakai naskah demo.

## Unit test wajib

| ID | Modul | Masukan | Harapan |
| --- | --- | --- | --- |
| UT-01 | expected | 10 kWp, H 4,05, PR 0,79 | 32,0 kWh (toleransi 0,1) |
| UT-02 | status | aktual 20, perkiraan 32, H 4,05 | ACTION, kinerja 0,625 |
| UT-03 | money | selisih 12, tarif 1.500 | 18.000 |
| UT-04 | status | aktual 0, perkiraan 24, H 4,05 | CRITICAL |
| UT-05 | status | aktual 0,5, perkiraan 20, H 1,2 | ACTION dengan reason `cloudy_guard`, tidak CRITICAL |
| UT-06 | status | aktual 15,4, perkiraan 16 | NORMAL |
| UT-07 | status | aktual 45, perkiraan 32 | ditandai mencurigakan, tanpa status |
| UT-08 | status | kinerja 0,82, 0,80, 0,79 tiga hari | ACTION karena streak |
| UT-09 | status | tidak ada laporan pukul 20.01 | NO\_DATA |
| UT-10 | recovery | DONE\_BY\_TECH lalu 29, 30, 31 (perkiraan 32) | RESOLVED |
| UT-11 | recovery | DONE\_BY\_TECH lalu 29, 20 | REOPENED |
| UT-12 | weekly | deret 24 sampai 30 Okt di tab Rencana kerja | 180, 224, 44, 66.000 |
| UT-13 | weather | Open-Meteo 14,58 MJ/m2 | 4,05 kWh/m2, sumber `open_meteo` |
| UT-14 | weather | Open-Meteo gagal, NASA -999 | klimatologi, label "cuaca historis" |
| UT-15 | ocr | JSON `kwh_today` 20,0, confidence 0,92, kapasitas 10 | diterima |
| UT-16 | ocr | `kwh_today` 8420 (E-Total), kapasitas 10 | ditolak, minta ulang |
| UT-17 | guardrails | pesan "Silakan naik atap dan bersihkan panel" | diganti pesan teknisi, `guardrail_hits` tercatat |
| UT-18 | guardrails | permintaan foto panel | otomatis berisi "Cukup dari bawah. Hindari atap dan kabel." |
| UT-19 | tickets | manager menyetujui tiket AWAITING\_APPROVAL | SCHEDULED + event `approved` |
| UT-20 | tickets | technician mencoba approve | 403 |

## Uji alur bot

Gunakan `python-telegram-bot` dengan objek update tiruan, atau akun Telegram uji.

| ID | Alur | Langkah | Harapan |
| --- | --- | --- | --- |
| BT-01 | Pendaftaran | Daftarkan PLTS, isi nama, "10 kWp", On-grid | Kartu Lokasi siap dipantau; pengingat terjadwal 16.00 |
| BT-02 | Kapasitas salah | Isi "sepuluh" lalu "10" | Bot minta ulang dengan contoh, lalu lanjut |
| BT-03 | Laporan foto | Kirim foto inverter contoh | Kartu Mohon cek hasil bacaan dalam 15 detik |
| BT-04 | Ubah angka | Tekan Ubah angka, ketik "20,5" | Tersimpan sumber `manual` |
| BT-05 | Peringatan | Laporan 20 kWh di skenario demo | Kartu Perlu diperiksa dengan Rp18.000 / hari |
| BT-06 | Pemeriksaan | PLN normal, Tidak ada error, foto panel | Peringatan keselamatan muncul; tombol Minta teknisi |
| BT-07 | Tiket | Tekan Minta teknisi | Tiket SA-xxx AWAITING\_APPROVAL, notifikasi ke pengelola |
| BT-08 | Teks bebas | "tadi PLN mati" saat CHECK\_PLN | Dugaan PLN padam, tanpa tiket |
| BT-09 | Uji keselamatan | Operator bertanya "perlu saya naik ke atap?" | Agen menolak dan menawarkan teknisi |

## Naskah demo main event (5 menit)

Siapkan: laptop dengan dasbor terbuka sebagai Bu Rina, ponsel dengan Telegram sebagai Pak Budi, foto inverter contoh di galeri ponsel, data sudah di-reset.

1. **Reset data:** `python -m app.sim.seed --reset --demo-date 2026-10-26`.
2. **Dasbor (30 detik):** tunjukkan 4 lokasi, 1 kritis, 1 perlu tindakan, 1 belum ada data; peta dan grafik MA Nurul Huda.
3. **Laporan lewat foto (60 detik):** Pak Budi mengirim foto layar inverter, bot membaca 20,0 kWh, tekan Angka sudah benar.
4. **Peringatan (30 detik):** muncul Perlu diperiksa, 20 vs 32 kWh, Rp18.000 per hari.
5. **Pemeriksaan terpandu (60 detik):** jawab PLN normal, Tidak ada error, kirim foto panel; tunjukkan peringatan keselamatan.
6. **Tiket dan persetujuan (45 detik):** tekan Minta teknisi; di dasbor muncul 1 persetujuan menunggu; buka tiket di ponsel, Setujui kunjungan.
7. **Pemulihan (45 detik):** jalankan `python -m app.sim.advance --to 2026-10-30`; bot mengirim Produksi kembali sesuai perkiraan; buka laporan mingguan dan unduh PDF.

Cadangan: rekam video seluruh naskah sehari sebelum acara. Bila internet gagal, putar video dan jelaskan sambil menunjuk layar.

## Uji pengguna saat main event

- Minta minimal 3 orang (idealnya operator atau pengelola PLTS sungguhan) menjalankan langkah 3 sampai 6 tanpa bantuan.
- Catat: waktu lapor, langkah yang membingungkan, kata yang tidak dipahami, apakah mereka percaya angka rupiah.
- Simpan hasil di `docs/uji-pengguna.md`; ini bukti co-design untuk rubrik.

## Definisi selesai (berlaku untuk setiap tugas)

- [ ] Kriteria selesai tugas terpenuhi.
- [ ] Tes baru ditulis dan seluruh tes lulus.
- [ ] Tidak ada kunci API atau data pribadi di repo.
- [ ] Teks di layar sama dengan naskah di tab Alur dan layar.
- [ ] Angka simulasi berlabel.
- [ ] Dokumen diperbarui bila kontrak berubah.
