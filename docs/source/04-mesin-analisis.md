# Mesin analisis

Semua fungsi di sini deterministik, murni (tanpa efek samping kecuali `weather.py`), dan wajib punya unit test. Contoh angka memakai skenario mockup: MA Nurul Huda, 10 kWp, aktual 20 kWh, perkiraan 32 kWh.

## 1. Radiasi harian (`engine/weather.py`)

Sumber utama Open-Meteo, cadangan NASA POWER. Simpan hasil di tabel `weather_daily` (cache per lokasi per tanggal) supaya tidak memanggil API berulang.

**Open-Meteo (utama, tersedia untuk hari ini):**

```text
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &daily=shortwave_radiation_sum
  &timezone=Asia%2FJakarta
  &past_days=7
```

Respons memuat `daily.time[]` dan `daily.shortwave_radiation_sum[]` dalam MJ/m2. Ubah ke kWh/m2 dengan membagi 3,6.

**NASA POWER (cadangan dan kalibrasi):**

```text
GET https://power.larc.nasa.gov/api/temporal/daily/point
  ?parameters=ALLSKY_SFC_SW_DWN&community=RE
  &latitude={lat}&longitude={lon}
  &start=YYYYMMDD&end=YYYYMMDD&format=JSON
```

Nilai di `properties.parameter.ALLSKY_SFC_SW_DWN` sudah dalam kWh/m2/hari. Nilai -999 berarti belum tersedia (data beberapa hari terakhir sering belum ada).

**Urutan fallback dan label:**

| Urutan | Sumber | Label di layar |
| --- | --- | --- |
| 1 | Open-Meteo tanggal itu | "Perkiraan menyesuaikan cuaca hari ini." |
| 2 | NASA POWER tanggal itu | "Perkiraan menyesuaikan cuaca hari ini." |
| 3 | Rata-rata NASA POWER tanggal yang sama 5 tahun terakhir | "Perkiraan menyesuaikan cuaca historis." |

Catatan: mockup menulis "cuaca historis"; pakai label dinamis sesuai sumber. Memakai rata-rata historis saja akan membuat hari mendung terbaca sebagai kerusakan, jadi sumber 1 dan 2 wajib dicoba lebih dulu. Verifikasi nama parameter API saat implementasi dan tulis tesnya dengan respons tiruan.

## 2. Produksi perkiraan (`engine/expected.py`)

```latex
E_{perkiraan} = P_{kWp} \times H \times PR
```

- P\_kWp: kapasitas lokasi.
- H: radiasi harian (kWh/m2/hari) dari langkah 1.
- PR: performance ratio lokasi. Nilai awal 0,79 (kinerja PLTS komunal Kalifam, Papua: 22.639 dari 28.356 kWh per tahun).

Contoh: 10 kWp x 4,05 kWh/m2 x 0,79 = 32,0 kWh.

**Kalibrasi PR per lokasi:** setelah 7 laporan valid pertama yang statusnya bukan kritis, hitung median dari aktual / (P\_kWp x H), batasi di rentang 0,60 sampai 0,90, simpan di `site.pr_calibrated`. Kalibrasi ulang hanya manual oleh admin. Bila median di bawah 0,60, jangan dikalibrasi; tandai lokasi untuk dicek teknisi.

## 3. Kinerja, selisih, dan rupiah (`engine/money.py`)

```latex
kinerja = \frac{E_{aktual}}{E_{perkiraan}} \qquad selisih = \max(0,\ E_{perkiraan} - E_{aktual}) \qquad rupiah = selisih \times tarif
```

- Tarif default Rp1.500/kWh, bisa diubah per lokasi. Untuk PLTS komunal yang listriknya digantikan genset, gunakan biaya genset (rentang Rp6.000 sampai Rp10.000/kWh) yang diisi pengelola.
- Contoh: kinerja 20/32 = 62,5%; selisih 12 kWh; rupiah 12 x 1.500 = Rp18.000 per hari.
- Format tampilan: `Rp18.000`, `20,0 kWh`, `97%` (koma desimal, titik ribuan).

## 4. Status harian (`engine/status.py`)

Diperiksa berurutan; aturan pertama yang cocok menang.

| Urutan | Status | Aturan | Contoh |
| --- | --- | --- | --- |
| 1 | `NO_DATA` (Belum ada data) | Tidak ada laporan sampai pukul 20.00 waktu lokasi | SMP Cendekia |
| 2 | `CRITICAL` (Kritis) | Aktual kurang dari 5% perkiraan dan H minimal 2,5 kWh/m2; atau kinerja di bawah 30% dua hari berturut-turut | Balai Desa Cibiru 0 / 24 kWh |
| 3 | `ACTION` (Perlu tindakan) | Kinerja di bawah 75%; atau kinerja di bawah 85% tiga hari berturut-turut | MA Nurul Huda 20 / 32 kWh |
| 4 | `NORMAL` (Normal) | Selain di atas | SDN Sukamaju 15,4 / 16 kWh |

**Pengaman cuaca mendung:** bila H di bawah 1,5 kWh/m2, status paling tinggi `ACTION` dan pesan menyebut "Cuaca sangat mendung, saya pantau besok." Tidak ada tiket otomatis pada hari itu.

**Pengaman data aneh:** bila aktual lebih dari 1,3 x perkiraan, jangan beri status; minta operator mengecek apakah angka yang terbaca E-Total.

Semua ambang di atas disimpan di tabel `config` supaya bisa diubah tanpa deploy:

| Kunci | Default |
| --- | --- |
| `critical_ratio` | 0,05 |
| `critical_min_irradiance` | 2,5 |
| `critical_two_day_ratio` | 0,30 |
| `action_ratio` | 0,75 |
| `action_streak_ratio` | 0,85 |
| `action_streak_days` | 3 |
| `cloudy_irradiance` | 1,5 |
| `suspicious_ratio` | 1,3 |
| `recovery_ratio` | 0,90 |
| `recovery_days` | 3 |
| `no_data_cutoff` | 20:00 |

## 5. Dugaan penyebab (`engine/triage.py`)

Menggabungkan pola data dengan jawaban pemeriksaan terpandu. Keluaran: `cause` (kode), `confidence` (rendah, sedang, tinggi), dan tindakan yang disarankan.

| Bukti | Dugaan | Tindakan |
| --- | --- | --- |
| PLN sempat padam (on-grid) | Inverter berhenti mengikuti PLN; perilaku normal | Catat, pantau besok, tanpa tiket |
| Ada kode error di layar | Gangguan inverter | Tiket teknisi + foto kode |
| Aktual hampir nol saat cerah | Inverter mati atau trip | Kritis, tiket teknisi hari ini |
| Kinerja turun pelan beberapa hari, cerah, tanpa error | Panel kotor | Panel di tanah: panduan bersihkan dari tanah. Panel di atap: tiket teknisi |
| Turun mendadak ke kira-kira (n-1)/n dari biasanya | Satu string terputus | Tiket teknisi |
| Tidak cocok pola mana pun | Belum pasti | Pemeriksaan terpandu, lalu tawarkan teknisi |

Agen boleh menyebut dugaan, tetapi selalu dengan kata "dugaan" atau "belum pasti".

## 6. Verifikasi pemulihan (`engine/recovery.py`)

- Mulai dihitung setelah tiket ditandai `DONE_BY_TECH` atau setelah operator mengonfirmasi tindakan (misalnya panel dibersihkan).
- Pulih bila 3 laporan berturut-turut berikutnya memiliki kinerja minimal 90%. Contoh mockup: 29, 30, 31 kWh dengan perkiraan sekitar 32 kWh.
- Bila salah satu dari 3 laporan itu berstatus `ACTION` atau `CRITICAL`, tiket dibuka ulang (`REOPENED`).
- Hari tanpa laporan tidak memutus hitungan, tetapi tidak dihitung.

## 7. Laporan mingguan (`reports/weekly.py`)

- Periode Senin sampai Minggu; contoh mockup memakai 24 sampai 30 Oktober.
- Total produksi = jumlah aktual; total perkiraan = jumlah perkiraan di hari yang ada laporannya.
- Selisih dan rupiah = jumlah harian (bukan dihitung ulang dari total).
- Contoh: 198 vs 224 kWh, selisih 26 kWh, Rp39.000.
- Linimasa penanganan dari tabel `ticket_event` dan `daily_assessment`.

## 8. Validasi dengan data nyata

- Uji rumus produksi perkiraan pada dataset Kaggle Solar Power Generation (2 PLTS, 34 hari, data inverter dan sensor iradiasi). Laporkan MAPE harian per inverter.
- Uji kalibrasi PR pada NREL PVDAQ (data multi-tahun) untuk satu sistem.
- Hasil dipakai di slide purwarupa sebagai "selisih produksi perkiraan vs aktual".
