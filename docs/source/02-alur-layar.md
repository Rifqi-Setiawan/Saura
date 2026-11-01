# Alur pengguna dan layar

Setiap layar mockup diberi kode. Simpan gambar mockup di `docs/mockups/` dengan nama kode ini. Teks di layar adalah teks resmi; coding agent wajib memakainya persis, kecuali yang ditandai berubah di tab Mulai di sini.

## Daftar layar

| Kode | Layar | Kanal | Peran | User story |
| --- | --- | --- | --- | --- |
| M-01 | Sambutan dan pendaftaran lokasi | Bot | Operator | US-01 |
| M-02 | Jenis sistem dan "Lokasi siap dipantau" | Bot | Operator | US-01 |
| M-03 | Pengingat sore dan kirim foto inverter | Bot | Operator | US-02 |
| M-04 | "Mohon cek hasil bacaan" dan "Laporan tersimpan" | Bot | Operator | US-02 |
| M-05 | Peringatan "Perlu diperiksa" | Bot | Operator | US-03 |
| M-06 | Pemeriksaan terpandu | Bot | Operator | US-04 |
| M-07 | Detail tiket | Web (ponsel) | Pengelola, teknisi | US-05 |
| M-08 | Persetujuan biaya | Web (ponsel) | Pengelola | US-05 |
| M-09 | Ringkasan lokasi (dasbor) | Web (laptop) | Pengelola | US-08 |
| M-10 | "Produksi kembali sesuai perkiraan" | Bot | Operator | US-06 |
| M-11 | Laporan mingguan | Bot dan web | Operator, pengelola | US-07 |

## Alur utama: dari laporan sampai pulih

Skenario demo memakai data simulasi MA Nurul Huda, Bandung, 10 kWp, on-grid.

| Waktu | Kejadian | Layar |
| --- | --- | --- |
| Hari pendaftaran | Pak Budi mendaftarkan lokasi | M-01, M-02 |
| 26 Okt 16.00 | Pengingat, Pak Budi mengirim foto inverter (E-Today 20,0 kWh) | M-03 |
| 26 Okt 16.01 | Bot membaca angka, Pak Budi mengonfirmasi | M-04 |
| 26 Okt 16.01 | Perkiraan 32 kWh, selisih 12 kWh, Rp18.000/hari: status Perlu tindakan | M-05 |
| 26 Okt 16.05 | Pemeriksaan terpandu: PLN normal, tidak ada kode error, foto panel dari halaman | M-06 |
| 26 Okt 16.10 | Pak Budi menekan Minta teknisi, tiket SA-024 dibuat | M-07 |
| 26 Okt malam | Bu Rina menyetujui kunjungan Rp150.000 | M-08, M-09 |
| 27 Okt 09.00 | Ahmad berkunjung, menandai tiket selesai dikerjakan | M-07 |
| 28 sampai 30 Okt | Tiga laporan berturut 29, 30, 31 kWh: pemulihan terverifikasi | M-10 |
| Senin berikutnya | Laporan mingguan 24 sampai 30 Okt: 198 vs 224 kWh, selisih 26 kWh, Rp39.000 | M-11 |

## Naskah pesan bot

Variabel ditulis `{seperti_ini}`. Tombol ditulis **tebal**.

### M-01 Sambutan

- Kartu: "Selamat datang, {nama}" / "Saya bantu pantau PLTS dan tindak lanjutnya lewat chat." / **Daftarkan PLTS** / **Lihat contoh**
- "Di mana lokasi PLTS Bapak/Ibu?" (operator menjawab nama tempat dan kota)
- "Berapa kapasitas panelnya?" (contoh jawaban: 10 kWp)
- **Lihat contoh** membuka lokasi demo berlabel Data simulasi.

### M-02 Jenis sistem

- "Jenis sistemnya apa?" / **On-grid** / **Hybrid / off-grid**
- Bila Hybrid / off-grid: "Ada baterainya?" / **Ada** / **Tidak ada**
- Kartu centang: "Lokasi siap dipantau": {nama\_lokasi}, {kota}, Kapasitas {kwp} kWp, {jenis\_sistem}
- "Kirim foto layar inverter setiap sore. Saya ingatkan pukul 16.00." / **Kirim laporan pertama**

### M-03 dan M-04 Laporan harian

- Pengingat: "Selamat sore, {nama}. Kirim foto layar inverter untuk laporan hari ini."
- Setelah foto: "Foto diterima. Saya baca angkanya dulu."
- Kartu "Mohon cek hasil bacaan": Tanggal {tanggal}; Produksi hari ini {kwh} kWh; Sumber Foto inverter; "Yang dipakai adalah E-Today, bukan E-Total." / **Angka sudah benar** / **Ubah angka**
- Setelah konfirmasi: "Laporan tersimpan. Terima kasih. Saya lanjut cek kinerjanya."
- Bila gagal baca: "Angkanya belum terbaca jelas. Coba foto lebih dekat, atau ketik angka E-Today, misalnya 20,5."

### M-05 Peringatan

- Kartu oranye "Perlu diperiksa": {nama\_lokasi}, {tanggal}; "Produksi lebih rendah" {aktual} kWh; "Perkiraan {perkiraan} kWh"; bar Aktual dan Perkiraan; "Perkiraan menyesuaikan cuaca historis."; Selisih {selisih} kWh; "Potensi penghematan terlewat Rp{rupiah} / hari" dan "Asumsi Rp{tarif}/kWh, seluruh selisih terpakai."
- "Penyebab belum pasti. Kita cek dulu, ya." / **Mulai pemeriksaan**
- Kartu merah untuk Kritis: "Produksi nol saat cuaca cerah. Saya buatkan tiket teknisi sekarang."

### M-06 Pemeriksaan terpandu

Urutan pertanyaan tetap, agen boleh melewati yang tidak relevan.

1. "Apakah PLN sempat padam?" (jawaban bebas atau tombol **Ya** / **Tidak**)
2. "Ada kode error di layar inverter?" / **Ada kode error** / **Tidak ada**. Bila ada, minta foto kodenya.
3. "Kirim foto panel dari tempat yang aman." diikuti peringatan kuning "Cukup dari bawah. Hindari atap dan kabel."
4. Penutup: "Saya teruskan bukti ini ke teknisi. Tidak perlu bongkar perangkat." / **Minta teknisi** / **Kirim foto lain**

### M-10 Pemulihan

- "{nama}, saya cek produksi setelah kunjungan teknisi."
- Kartu "Produksi kembali sesuai perkiraan": {aktual} kWh; "Perkiraan {perkiraan} kWh"; Kinerja {persen}%; "3 laporan berurutan sesuai cuaca."; "Pemeriksaan {rentang\_tanggal}"; grafik tiga titik.
- "Tiket {kode} selesai. Terima kasih sudah mengirim laporan." / **Lihat laporan**

## Status percakapan bot

Setiap chat operator punya satu status aktif yang disimpan di database.

| Status | Masuk dari | Menunggu | Keluar ke |
| --- | --- | --- | --- |
| `IDLE` | Default | Perintah atau foto | `ONBOARD_*`, `REPORT_WAIT_CONFIRM` |
| `ONBOARD_LOCATION` | Daftarkan PLTS | Nama dan kota | `ONBOARD_CAPACITY` |
| `ONBOARD_CAPACITY` | Lokasi tersimpan | Angka kWp | `ONBOARD_SYSTEM` |
| `ONBOARD_SYSTEM` | Kapasitas valid | Tombol jenis sistem | `IDLE` (lokasi aktif) |
| `REPORT_WAIT_CONFIRM` | Foto terbaca | Benar atau Ubah | `REPORT_WAIT_MANUAL` atau analisis |
| `REPORT_WAIT_MANUAL` | Ubah angka atau gagal baca | Angka kWh | analisis |
| `CHECK_PLN` | Mulai pemeriksaan | Jawaban PLN | `CHECK_ERROR` |
| `CHECK_ERROR` | Jawaban PLN | Tombol kode error | `CHECK_ERROR_PHOTO` atau `CHECK_PANEL_PHOTO` |
| `CHECK_ERROR_PHOTO` | Ada kode error | Foto kode | `CHECK_PANEL_PHOTO` |
| `CHECK_PANEL_PHOTO` | Tidak ada error | Foto panel | `CHECK_DONE` |
| `CHECK_DONE` | Foto panel | Minta teknisi atau foto lain | `IDLE` + tiket |

Pesan di luar status yang ditunggu dijawab agen dengan bahasa natural, lalu agen mengingatkan langkah yang sedang berjalan.

## Layar web

### M-09 Ringkasan lokasi (laptop)

- Sidebar: Ringkasan, Lokasi PLTS, Tiket, Laporan, Pengaturan; profil pengguna di bawah.
- Header: judul "Ringkasan lokasi", badge "Data simulasi", pemilih tanggal, tombol **Impor CSV**.
- Empat kartu: {n} lokasi Terdaftar, {n} Kritis, {n} Perlu tindakan, {n} Belum ada data.
- Tabel Prioritas hari ini: Lokasi, Status, Produksi "aktual / perkiraan", Tindak lanjut.
- Peta sebaran lokasi dengan pin berwarna status dan legenda.
- Grafik garis tujuh hari Aktual dan Perkiraan untuk lokasi yang dipilih; catatan "Nilai contoh untuk demonstrasi. Perkiraan memakai cuaca historis."
- Kartu "{n} persetujuan menunggu" dengan tombol **Tinjau persetujuan**.

### M-07 Detail tiket dan M-08 Persetujuan biaya (ponsel)

- Tab bawah: Tiket, Lokasi, Profil.
- Detail tiket: kode, status, lokasi dan kapasitas, produksi aktual dan perkiraan, "Dugaan perlu pemeriksaan", foto bukti operator, rencana kunjungan (teknisi, jadwal, estimasi biaya), catatan "Kunjungan mulai setelah persetujuan pengelola.", **Lihat riwayat lokasi**.
- Persetujuan biaya: Pemeriksaan teknisi, teknisi, jadwal, estimasi kunjungan, biaya tambahan "Perlu persetujuan baru", status "Menunggu keputusan", catatan "Tidak ada pembayaran otomatis.", **Setujui kunjungan**, **Tanya teknisi**, **Tunda**, "Keputusan tercatat di riwayat tiket."

## Gaya visual

- Warna utama biru `#2563EB`; peringatan oranye `#F59E0B`; kritis merah `#DC2626`; normal biru; belum ada data abu-abu `#9CA3AF`.
- Font Inter atau sistem; angka besar untuk kWh dan rupiah.
- Semua angka simulasi ditandai badge "Data simulasi".
