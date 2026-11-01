# PRD: SAURA MVP

Versi 1.0 untuk purwarupa Seno Hackathon ITS 2026. Target: demo stabil pada main event 11 sampai 13 November 2026 di Surabaya.

## 1. Masalah

- PLTS di sekolah, pesantren, balai desa, dan koperasi sering turun produksinya tanpa ada yang tahu, sampai sistem mati.
- Kementerian ESDM pernah mencatat sekitar 50 dari 500 PLTS yang dibangun pemerintah pusat rusak, umumnya di baterai dan inverter (data 2016), dan mengakui SDM pengelola tidak disiapkan.
- Operator di lapangan tidak terlatih membaca data inverter; teknisi datang hanya beberapa kali setahun; pengelola tidak tahu berapa uang yang hilang.

## 2. Tujuan dan bukan tujuan

**Tujuan MVP**

1. Operator awam bisa melapor produksi harian dalam kurang dari 1 menit lewat satu foto.
2. Penurunan produksi terdeteksi pada hari yang sama dengan laporan, lengkap dengan selisih kWh dan rupiah.
3. Setiap temuan berakhir pada satu tindakan jelas: pantau, periksa terpandu, atau tiket teknisi.
4. Pengelola melihat semua lokasi dan menyetujui biaya di satu tempat.
5. Pemulihan dibuktikan dengan data, bukan klaim.

**Bukan tujuan MVP:** mengendalikan inverter dari jauh, memasang sensor atau data logger, pembayaran, diagnosis tingkat komponen yang menggantikan teknisi, aplikasi native.

## 3. Persona

| Persona | Contoh di mockup | Kebutuhan | Kanal |
| --- | --- | --- | --- |
| Operator lapangan | Pak Budi, MA Nurul Huda | Lapor cepat, instruksi jelas, tidak disuruh hal berbahaya | Telegram |
| Pengelola fasilitas | Bu Rina | Tahu lokasi mana yang bermasalah, kendali atas biaya, laporan untuk pimpinan | Web app (laptop dan ponsel) |
| Teknisi mitra | Ahmad | Bukti sebelum berangkat, jadwal, biaya yang sudah disetujui | Web app (halaman tiket) |
| Admin SAURA atau installer | Tim SAURA | Mendaftarkan pengelola, memantau banyak lokasi, impor CSV | Web app |

## 4. User story dan kriteria terima

Format kriteria memakai Given / When / Then supaya mudah diubah menjadi tes.

### US-01 Pendaftaran lokasi lewat chat (P0)

Sebagai operator, saya ingin mendaftarkan PLTS lewat chat supaya bisa langsung dipantau.

- Given operator membuka bot pertama kali, When menekan **Daftarkan PLTS**, Then bot menanyakan berurutan: nama dan lokasi, kapasitas (kWp), jenis sistem (On-grid atau Hybrid / off-grid), dan ada atau tidaknya baterai.
- Then bot menampilkan kartu **Lokasi siap dipantau** berisi nama, kota, kapasitas, jenis sistem.
- Then bot menjadwalkan pengingat harian pukul 16.00 waktu setempat dan menampilkan tombol **Kirim laporan pertama**.
- Kapasitas harus angka antara 0,5 dan 2.000 kWp; selain itu bot meminta ulang dengan contoh.
- Lokasi dicari koordinatnya lewat geocoding; bila gagal, bot meminta operator membagikan lokasi Telegram.

### US-02 Laporan harian lewat foto inverter (P0)

Sebagai operator, saya ingin cukup memotret layar inverter supaya tidak perlu mengetik angka.

- Given pukul 16.00, Then bot mengirim pengingat "Kirim foto layar inverter untuk laporan hari ini".
- When operator mengirim foto, Then bot membalas "Foto diterima. Saya baca angkanya dulu." dalam 3 detik.
- Then dalam 15 detik bot menampilkan kartu **Mohon cek hasil bacaan**: tanggal, produksi hari ini (kWh), sumber "Foto inverter", catatan "Yang dipakai adalah E-Today, bukan E-Total", tombol **Angka sudah benar** dan **Ubah angka**.
- When operator menekan **Ubah angka**, Then bot meminta angka manual dan menyimpan sumber "Input manual".
- When model tidak yakin (confidence di bawah 0,7) atau angka E-Today tidak ditemukan, Then bot meminta foto ulang yang lebih dekat atau angka manual.
- Then setelah konfirmasi, bot menampilkan **Laporan tersimpan** dan menjalankan analisis.
- Satu laporan per lokasi per tanggal; laporan kedua di tanggal yang sama menggantikan yang pertama setelah konfirmasi.

### US-03 Peringatan penurunan produksi (P0)

- Given laporan tersimpan, When kinerja di bawah ambang (lihat tab Mesin analisis), Then bot mengirim kartu **Perlu diperiksa** berisi: nama lokasi, tanggal, produksi aktual, produksi perkiraan, bar perbandingan, selisih kWh, potensi penghematan terlewat Rp per hari beserta asumsi tarif, kalimat "Penyebab belum pasti. Kita cek dulu, ya.", dan tombol **Mulai pemeriksaan**.
- When status normal, Then bot cukup membalas ringkas "Produksi sesuai perkiraan" tanpa peringatan.
- Status kritis mengikuti US-05 langsung.

### US-04 Pemeriksaan terpandu (P0)

- When operator menekan **Mulai pemeriksaan**, Then agen bertanya satu per satu: apakah PLN sempat padam; apakah ada kode error di layar inverter (tombol **Ada kode error** dan **Tidak ada**); lalu meminta foto panel dari tempat yang aman.
- Then setiap permintaan foto panel disertai peringatan "Cukup dari bawah. Hindari atap dan kabel."
- Then agen menyimpulkan dugaan penyebab (atau "belum pasti") dan menawarkan **Minta teknisi** atau **Kirim foto lain**.
- Agen tidak pernah meminta operator naik atap, membuka panel inverter, mencabut kabel, atau menyentuh baterai.

### US-05 Tiket teknisi dan persetujuan biaya (P0)

- When operator menekan **Minta teknisi** atau status kritis, Then sistem membuat tiket `SA-xxx` berisi produksi aktual dan perkiraan, dugaan, foto bukti, teknisi, jadwal, estimasi biaya; status **Menunggu persetujuan**.
- Then pengelola menerima notifikasi dan melihat layar **Persetujuan biaya** dengan tombol **Setujui kunjungan**, **Tanya teknisi**, **Tunda**, serta catatan "Tidak ada pembayaran otomatis."
- When disetujui, Then status tiket menjadi **Dijadwalkan**, teknisi dan operator dikabari.
- Setiap keputusan tercatat di riwayat tiket dengan waktu dan nama pengguna.
- Biaya tambahan di luar estimasi memerlukan persetujuan baru.

### US-06 Verifikasi pemulihan (P0)

- Given tiket berstatus **Selesai dikerjakan** oleh teknisi, When tiga laporan berikutnya berturut-turut mencapai kinerja minimal 90%, Then status tiket menjadi **Selesai** dan bot mengirim kartu **Produksi kembali sesuai perkiraan** berisi produksi terakhir, kinerja, grafik tiga hari, dan nomor tiket.
- When dalam tiga laporan itu kinerja kembali turun, Then tiket dibuka ulang dan pengelola dikabari.

### US-07 Laporan mingguan (P1)

- Setiap Senin pukul 07.00, bot dan dasbor menyiapkan **Laporan mingguan** per lokasi: total produksi dan perkiraan, selisih kWh dan rupiah, linimasa penanganan, status pemantauan, tombol **Unduh PDF** dan **Lihat sumber data**.
- Data simulasi wajib berlabel "Data contoh, bukan hasil pilot".

### US-08 Dasbor ringkasan lokasi (P0)

- Pengelola melihat kartu jumlah lokasi terdaftar, Kritis, Perlu tindakan, Belum ada data; tabel **Prioritas hari ini** diurutkan Kritis, Perlu tindakan, Belum ada data, Normal; peta sebaran berwarna status; grafik aktual dan perkiraan tujuh hari untuk lokasi terpilih; kotak persetujuan yang menunggu.
- Tombol tindak lanjut per baris: **Tiket teknisi**, **Menunggu persetujuan**, **Pantau rutin**, **Ingatkan operator**.

### US-09 Impor CSV (P1)

- Pengelola bisa mengunggah CSV produksi harian dari aplikasi inverter dengan kolom minimal `tanggal, kwh`. Baris diproses seperti laporan harian dengan sumber "CSV".

### US-10 Mode data simulasi (P0)

- Admin bisa mengisi empat lokasi contoh dan 30 hari data simulasi, termasuk satu skenario penurunan dan pemulihan untuk MA Nurul Huda, supaya demo bisa diputar ulang kapan saja.

## 5. Prioritas fitur

| Kode | Fitur | Prioritas |
| --- | --- | --- |
| F1 | Pendaftaran lokasi via chat | P0 |
| F2 | Laporan foto inverter + konfirmasi | P0 |
| F3 | Mesin produksi perkiraan dan status | P0 |
| F4 | Peringatan + pemeriksaan terpandu | P0 |
| F5 | Tiket + persetujuan biaya | P0 |
| F6 | Verifikasi pemulihan | P0 |
| F7 | Dasbor ringkasan | P0 |
| F8 | Mode data simulasi | P0 |
| F9 | Laporan mingguan + PDF | P1 |
| F10 | Impor CSV | P1 |
| F11 | Pengingat "Belum ada data" ke operator | P1 |
| F12 | WhatsApp, API vendor, modul baterai | P2 (setelah pilot) |

## 6. Kebutuhan non-fungsional

- Balasan pertama bot kurang dari 3 detik; hasil bacaan foto kurang dari 15 detik.
- Bot tetap bisa dipakai dengan sinyal lemah: pesan pendek, foto dikompres di sisi Telegram.
- Bahasa Indonesia sederhana, kalimat maksimal 15 kata, tanpa istilah teknis yang tidak dijelaskan.
- Kunci API di variabel lingkungan, tidak pernah di repo.
- Setiap keputusan agen menyimpan data masukan, keputusan, dan alasan (audit log).
- Zona waktu per lokasi (default Asia/Jakarta).

## 7. Metrik keberhasilan

| Metrik | Target purwarupa | Cara ukur |
| --- | --- | --- |
| Akurasi baca E-Today dari foto | Minimal 90% pada 30 foto uji | Bandingkan dengan angka sebenarnya |
| Akurasi status pada data uji berlabel | Minimal 85% | Generator data simulasi |
| Waktu lapor harian | Kurang dari 60 detik | Uji pengguna |
| Selisih produksi perkiraan vs aktual pada data inverter nyata | Dilaporkan apa adanya | Dataset Kaggle Solar Power Generation |
| Uji pengguna saat main event | Minimal 3 pengguna menyelesaikan alur lapor sampai peringatan | Observasi |

## 8. Asumsi dan risiko

| Asumsi atau risiko | Penanganan |
| --- | --- |
| Tarif Rp1.500/kWh mewakili nilai listrik yang hilang | Bisa diubah per lokasi; untuk PLTS komunal pakai biaya genset Rp6.000 sampai Rp10.000/kWh |
| Layar inverter bermacam merek | Model visi + konfirmasi manusia; selalu ada jalur ketik manual |
| Data cuaca hari ini belum tersedia | Pakai rata-rata historis tanggal yang sama, diberi label |
| Operator lupa lapor | Pengingat 16.00 dan 19.00, status Belum ada data 20.00 |
| Diagnosis salah | Agen menyebut "dugaan", keputusan mahal selalu lewat teknisi dan pengelola |
