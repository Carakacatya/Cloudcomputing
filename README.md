
Project ini merupakan tugas praktikum mata kuliah Cloud Computing yang dikerjakan secara berkelompok sebelum UTS pada semester 6 Program Studi D4 Teknik Informatika.

Deskripsi Project
Sistem ini adalah aplikasi presensi berbasis web menggunakan QR Code.
Mahasiswa melakukan presensi dengan cara memindai QR Code, kemudian data akan dikirim ke backend untuk proses validasi dan penyimpanan ke database.

Selain fitur presensi, sistem juga mendukung pengiriman data sensor perangkat seperti:
Accelerometer
GPS

Data sensor tersebut digunakan untuk monitoring perangkat secara real-time.

Arsitektur Sistem
User Device (Browser / Mobile)
↓
Frontend (GitHub Pages)
↓
HTTP Request
↓
Backend API (Google Apps Script)
↓
Database (Google Spreadsheet)

🛠 Tech Stack
Google Apps Script → Backend API
GitHub Pages → Frontend Hosting
Google Spreadsheet → Database
Postman → API Testing
Swagger → Dokumentasi API

Fitur Utama
Presensi menggunakan QR Code
Validasi token QR
Penyimpanan data presensi
Monitoring status presensi
Pengiriman data accelerometer
Pengiriman dan penyimpanan data GPS
Monitoring data sensor perangkat

Base URL API


Endpoint API
Method	Endpoint	Deskripsi
POST	/scan-presence	Mencatat presensi berdasarkan QR
GET	/presence-status	Mengecek status presensi
POST	/generate-qr	Generate QR Code presensi
POST	/telemetry/accel	Mengirim data accelerometer
GET	/telemetry/accel/latest	Mengambil data accelerometer terbaru
POST	/telemetry/gps	Mengirim data lokasi GPS
GET	/telemetry/gps/latest	Mengambil lokasi GPS terbaru
GET	/telemetry/gps/history	Mengambil riwayat lokasi GPS

Cara Pengujian
Akses halaman deployment (GitHub Pages).
Scan QR Code untuk melakukan presensi.
Data akan dikirim ke backend dan disimpan ke Google Spreadsheet.
Sistem menampilkan response ke pengguna.
Endpoint API juga dapat diuji menggunakan Postman.

Pengujian Sensor:
Kirim data accelerometer ke endpoint /telemetry/accel
Kirim data GPS ke endpoint /telemetry/gps

Dokumentasi
Dokumentasi API tersedia dalam file swagger.yaml
Dapat dibuka menggunakan https://editor.swagger.io/

Pembagian Tugas
Backend
Frontend
QA & Testing
Dokumentasi & Deployment
