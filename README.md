# QR Code Attendance System

---

## OVERVIEW

QR Code Attendance System adalah aplikasi presensi berbasis web yang dibuat sebagai tugas praktikum mata kuliah **Cloud Computing** sebelum Ujian Tengah Semester pada Semester 6 Program Studi **D4 Teknik Informatika**.

Aplikasi ini memungkinkan mahasiswa melakukan presensi dengan cara memindai QR Code menggunakan perangkat mereka. Data presensi yang dipindai akan dikirim ke backend untuk proses validasi dan penyimpanan ke database.

Selain presensi, sistem ini juga mendukung pengiriman data sensor perangkat seperti **accelerometer** dan **GPS** untuk monitoring perangkat secara real-time.

---

## SYSTEM ARCHITECTURE

Struktur arsitektur sistem adalah sebagai berikut:

```
User Device (Browser / Mobile)
        │
        ▼
Frontend (GitHub Pages)
        │
        ▼
HTTP Request
        │
        ▼
Backend API (Google Apps Script)
        │
        ▼
Database (Google Spreadsheet)
```

---

## TECHNOLOGY STACK

| Technology | Function |
|-----------|----------|
| Google Apps Script | Backend API |
| GitHub Pages | Frontend hosting |
| Google Spreadsheet | Database |
| Postman | API testing |
| Swagger | API documentation |

---

## FEATURES

### Attendance
- QR Code based attendance
- QR token validation
- Attendance data storage
- Attendance status checking

### Device Telemetry
- Accelerometer data collection
- GPS location tracking
- Device monitoring
- Sensor data history

---

## API BASE URL

Tambahkan Base URL API pada bagian berikut:

```
https://script.google.com/macros/s/XXXXXXXX/exec
```

---

## API ENDPOINTS

| Method | Endpoint | Description |
|------|------|------|
| POST | /scan-presence | Record attendance using QR Code |
| GET | /presence-status | Check attendance status |
| POST | /generate-qr | Generate QR Code attendance |
| POST | /telemetry/accel | Send accelerometer data |
| GET | /telemetry/accel/latest | Get latest accelerometer data |
| POST | /telemetry/gps | Send GPS data |
| GET | /telemetry/gps/latest | Get latest GPS data |
| GET | /telemetry/gps/history | Get GPS history |

---

## TESTING

### Attendance Testing

1. Buka halaman frontend yang telah di-deploy melalui GitHub Pages.
2. Scan QR Code pada halaman presensi.
3. Sistem akan mengirim data ke backend API.
4. Backend memvalidasi dan menyimpan data ke Google Spreadsheet.
5. Sistem menampilkan hasil presensi.

### API Testing

Endpoint API dapat diuji menggunakan **Postman** dengan mengirim request ke endpoint yang tersedia.

---

## SENSOR TESTING

### Accelerometer

Endpoint:

```
POST /telemetry/accel
```

Example payload:

```json
{
  "x": 0.15,
  "y": -0.02,
  "z": 9.81
}
```

### GPS

Endpoint:

```
POST /telemetry/gps
```

Example payload:

```json
{
  "latitude": -8.168,
  "longitude": 113.716
}
```

---

## API DOCUMENTATION

Dokumentasi API tersedia dalam file berikut:

```
swagger.yaml
```

File tersebut dapat dibuka menggunakan:

```
https://editor.swagger.io/
```

---

## TEAM RESPONSIBILITIES

| Role | Responsibility |
|------|---------------|
| Backend | Pengembangan API menggunakan Google Apps Script |
| Frontend | Pengembangan antarmuka web |
| QA & Testing | Pengujian sistem dan API |
| Documentation & Deployment | Dokumentasi dan deployment |

---

## LICENSE

Project ini dibuat untuk keperluan akademik pada mata kuliah **Cloud Computing**.
