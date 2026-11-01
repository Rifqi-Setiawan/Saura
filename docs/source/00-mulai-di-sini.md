# SAURA: Dokumen Pengembangan Perangkat Lunak

Nov 1, 2026 · @Azka

Dokumen ini adalah pegangan tim untuk membangun SAURA, agen AI perawat PLTS, dengan bantuan coding agent. Tab pertama ini adalah pintu masuk; detail ada di tab berikutnya.

## Ringkasan produk dan cakupan MVP

**SAURA adalah agen AI yang menjaga PLTS kecil dan PLTS komunal tetap berproduksi, dijalankan lewat chat.** Operator memotret layar inverter setiap sore; agen membaca angkanya, membandingkannya dengan produksi yang seharusnya menurut cuaca, menghitung rupiah yang hilang, memandu pemeriksaan yang aman, membuka tiket teknisi yang biayanya disetujui pengelola, lalu memastikan produksi benar-benar pulih.

**Problem statement:** pengelola PLTS fasilitas umum dan PLTS komunal kehilangan produksi listrik dan uang karena kerusakan panel, inverter, dan baterai baru ketahuan setelah sistem mati; SAURA memakai agen AI untuk mendeteksi, mendiagnosis, dan memandu perbaikan lewat chat, sehingga kWh yang hilang dan waktu henti berkurang secara terukur.

| Bagian produk | Pengguna | Bentuk di MVP |
| --- | --- | --- |
| Bot chat SauraAI | Operator lapangan (contoh: Pak Budi) | Bot Telegram |
| Dasbor pengelola | Pengelola fasilitas (contoh: Bu Rina) | Web app responsif: tampilan laptop dan ponsel |
| Tiket teknisi | Teknisi mitra (contoh: Ahmad) | Halaman tiket di web app yang sama |
| Mesin analisis dan agen | Tidak dilihat langsung | Layanan backend |

**Masuk MVP (dibangun sebelum main event 11 November 2026):**

- Pendaftaran lokasi PLTS lewat chat.
- Laporan harian lewat foto layar inverter, dibaca dengan model visi, dikonfirmasi operator.
- Perhitungan produksi perkiraan dari data cuaca dan status harian: normal, perlu tindakan, kritis, belum ada data.
- Peringatan berisi selisih kWh dan rupiah, lalu pemeriksaan terpandu yang aman.
- Tiket teknisi dengan persetujuan biaya oleh pengelola.
- Verifikasi pemulihan dan laporan mingguan (tampilan dan PDF).
- Dasbor ringkasan lokasi, peta, grafik aktual dan perkiraan, impor CSV.
- Generator data simulasi dan empat lokasi contoh untuk demo.

**Tidak masuk MVP:** WhatsApp, integrasi API vendor inverter, pembayaran, modul baterai lengkap, aplikasi native Android atau iOS, modul keamanan inverter.

**Prinsip yang tidak boleh dilanggar:** semua angka demo diberi label "Data simulasi"; agen tidak pernah menyuruh operator naik atap, membongkar perangkat, atau menyentuh baterai dan listrik bertegangan; setiap biaya disetujui manusia; tidak ada pembayaran otomatis.

## Peta dokumen

Baca berurutan. Tab 1 sampai 3 menjawab apa dan untuk siapa; tab 4 sampai 7 menjawab bagaimana; tab 8 sampai 10 dipakai saat membangun.

| No | Tab | Isi | Pembaca utama |
| --- | --- | --- | --- |
| 0 | Mulai di sini (tab ini) | Ringkasan, peta dokumen, glosarium, temuan mockup | Semua |
| 1 | PRD | Masalah, tujuan, persona, user story, kriteria terima, metrik | Semua |
| 2 | Alur dan layar | Setiap layar mockup, naskah pesan bot, status percakapan | Frontend, bot |
| 3 | Arsitektur | Komponen, alur data, teknologi, struktur repo, deployment | Backend |
| 4 | Mesin analisis | Rumus produksi perkiraan, status, rupiah, pemulihan, cuaca | Data, backend |
| 5 | Agen AI | Loop agen, daftar tools dan skemanya, prompt sistem, pagar keselamatan | Agen |
| 6 | Data dan API | Skema database, enum, endpoint REST, webhook | Backend, frontend |
| 7 | Rencana kerja | Milestone, tugas berurutan untuk coding agent, data contoh | Semua |
| 8 | Pengujian dan demo | Kasus uji, naskah demo main event, definisi selesai | QA |
| 9 | AGENTS.md | Berkas instruksi siap salin ke root repo untuk coding agent | Coding agent |

## Cara memakai dokumen ini bersama coding agent

1. Ekspor dokumen ini ke Markdown (menu ekspor dokumen), lalu simpan setiap tab sebagai berkas di folder `docs/` repo: `docs/01-prd.md`, `docs/02-alur-layar.md`, dan seterusnya.
2. Salin isi tab **AGENTS.md** apa adanya ke berkas `AGENTS.md` di root repo. Untuk Claude Code, buat juga `CLAUDE.md` berisi satu baris: `Lihat AGENTS.md`.
3. Simpan semua gambar mockup di `docs/mockups/` dengan nama sesuai kode layar di tab Alur dan layar (contoh `M-03-alert.png`).
4. Kerjakan tugas di tab Rencana kerja **satu per satu**, sesuai urutan ID (T01, T02, ...). Untuk setiap tugas, beri coding agent perintah seperti contoh di bawah.
5. Setelah tugas selesai, jalankan uji di tab Pengujian dan demo sebelum lanjut ke tugas berikutnya.

Contoh perintah untuk coding agent:

```text
Baca AGENTS.md, docs/01-prd.md, dan bagian yang relevan di docs/.
Kerjakan tugas T05 dari docs/07-rencana-kerja.md saja.
Penuhi semua kriteria selesai T05, tulis tesnya, jalankan tesnya sampai lulus.
Jangan mengubah skema database atau kontrak API tanpa memperbarui docs/06-data-api.md.
Laporkan berkas yang diubah dan hasil tes.
```

Aturan untuk tim: kalau implementasi harus berbeda dari dokumen, perbarui dokumennya dulu, baru kodenya. Dokumen ini adalah sumber kebenaran.

## Glosarium

| Istilah | Arti di SAURA |
| --- | --- |
| PLTS | Pembangkit listrik tenaga surya |
| kWp | Kapasitas puncak panel (kilowatt peak) |
| On-grid | PLTS terhubung ke PLN, tanpa baterai |
| Hybrid / off-grid | PLTS dengan baterai; off-grid tidak terhubung PLN |
| E-Today | Angka produksi hari ini di layar inverter (kWh). Inilah yang dipakai SAURA |
| E-Total | Angka produksi kumulatif sejak inverter dipasang. Jangan dipakai sebagai produksi harian |
| Radiasi harian | Energi matahari per m2 per hari (kWh/m2/hari), dari data cuaca |
| PR (performance ratio) | Rasio kinerja sistem terhadap kondisi ideal; nilai awal 0,79 |
| Produksi perkiraan | Produksi yang seharusnya hari itu menurut kapasitas dan cuaca |
| Kinerja | Produksi aktual dibagi produksi perkiraan, dalam persen |
| Selisih | Produksi perkiraan dikurangi produksi aktual (kWh) |
| Potensi penghematan terlewat | Selisih dikali tarif listrik (default Rp1.500/kWh) |
| Status lokasi | Normal, Perlu tindakan, Kritis, atau Belum ada data |
| Pemeriksaan terpandu | Tanya jawab langkah demi langkah oleh agen untuk mengumpulkan bukti dengan aman |
| Tiket | Permintaan kunjungan teknisi, wajib disetujui pengelola bila berbiaya |
| Pemulihan terverifikasi | Tiga laporan berturut-turut dengan kinerja minimal 90% setelah tindakan |
| Operator | Orang di lokasi yang mengirim laporan harian |
| Pengelola | Penanggung jawab fasilitas yang menyetujui biaya |
| Teknisi mitra | Teknisi yang menerima tiket kunjungan |
| Data simulasi | Data buatan untuk demo; selalu diberi label di layar |

## Temuan dari mockup yang perlu diseragamkan

Hitungan di tiap kartu mockup sudah benar: 12 kWh x Rp1.500 = Rp18.000 dan 31/32 kWh = 97%. Ada tujuh hal yang perlu diputuskan sebelum dibangun; keputusan default dokumen ini ditulis di kolom kanan.

| Temuan | Di mana | Keputusan default |
| --- | --- | --- |
| Nomor tiket memakai awalan **JS-024**, sisa nama lama JuruSurya | Detail tiket, persetujuan biaya, laporan pemulihan | Ganti menjadi **SA-024** (format `SA-` + 3 digit) |
| Nama bot **SauraAI**, nama aplikasi **Saura**, ikon matahari di bot tetapi ikon petir di dasbor | Semua layar | Nama produk SAURA; bot tampil sebagai "SauraAI"; pakai satu ikon matahari |
| Peran yang menyetujui disebut "manajer" dan "pengelola" | Detail tiket | Selalu "pengelola" |
| Subjudul bot kadang "Monitoring PLTS", kadang "Data simulasi" | Header chat | Subjudul "Monitoring PLTS"; label "Data simulasi" jadi badge terpisah selama demo |
| Status "Belum ada data" ada di dasbor tetapi belum ada aturan kapan muncul | Dasbor | Muncul bila tidak ada laporan sampai pukul 20.00 waktu setempat (lihat tab Mesin analisis) |
| Laporan mingguan 24 sampai 30 Okt menulis 198 vs 224 kWh dan Rp39.000, tidak cocok dengan grafik dasbor 20 sampai 26 Okt | Laporan mingguan dan dasbor | Ubah mockup laporan mingguan menjadi 180 vs 224 kWh, selisih 44 kWh, Rp66.000 (rincian di tab Rencana kerja) |
| Catatan "Perkiraan menyesuaikan cuaca historis" di peringatan dan dasbor | Peringatan, dasbor | Label dinamis: "cuaca hari ini" bila memakai data cuaca harian, "cuaca historis" hanya untuk fallback |
