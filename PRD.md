# Product Requirements Document (PRD)

**Project Name:** Dashboard Monitoring Laporan K3 PLN UP3 Kebon Jeruk (View-Only)
**Status:** In Development
**Date:** Juli 2026
fffffffffffffffffffffff
---
## 1. Ringkasan Proyek (Overview)
Proyek ini adalah sebuah aplikasi web *dashboard* interaktif yang dibangun secara khusus untuk mendukung efisiensi kerja Staf K3 (Keselamatan dan Kesehatan Kerja) di lingkungan **PLN UP3 Kebon Jeruk**. Aplikasi ini berfungsi untuk menampilkan rekapitulasi data laporan rutin lapangan secara *view-only*. 

Menggunakan Google Sheets sebagai sistem *database* utama sekaligus *Content Management System* (CMS), aplikasi ini memastikan Staf K3 mendapatkan visualisasi data terbaru dengan cepat tanpa harus membuka *spreadsheet* mentah, sekaligus memiliki sistem *login* internal yang sederhana dan terpusat.

## 2. Tujuan (Objectives)
*   **Efisiensi Operasional K3 PLN:** Menghemat waktu Staf K3 PLN UP3 Kebon Jeruk dalam menganalisis data temuan inspeksi (PSA) dan observasi (CVV).
*   **Visualisasi Terstruktur:** Menyediakan antarmuka yang bersih untuk memantau metrik keselamatan lapangan berdasarkan waktu dan kinerja masing-masing unit kerja (seperti YANTEK, TEKNIK, dll).
*   **Sinkronisasi Real-Time:** Memastikan data yang tampil di *dashboard* selalu terbarui selaras dengan input di Google Sheets.

## 3. Target Pengguna (Target Audience)
**Staf Keselamatan dan Kesehatan Kerja (K3) PLN UP3 Kebon Jeruk:** Pengguna profesional internal yang membutuhkan akses cepat dan terlindungi ke data metrik lapangan guna mengevaluasi kinerja keselamatan per unit dan memantau kepatuhan standar keselamatan kerja.

## 4. Tech Stack
Sistem menggunakan arsitektur *client-server*:
*   **Database & CMS:** Google Sheets (Akses dari *backend* via Google Cloud Service Account).
*   **Backend:** Java Spring Boot, Google API Client Library (v4).
*   **Frontend:** Vite (HTML/JS/Framework penunjang), Tailwind CSS.
*   **Komunikasi Data:** REST API (JSON) menggunakan Axios / Fetch API.

## 5. Struktur Dataset (Google Sheets)
Sumber data berasal dari satu file Google Sheets dengan beberapa tab terpisah yang dikelola langsung oleh tim internal PLN UP3 Kebon Jeruk.

### 5.1. Tabel Laporan Utama

| Nama Tabel (Tab) | Struktur Kolom | Catatan Format Waktu |
| :--- | :--- | :--- |
| **PSA** | Timestamp, Nama Inspektor, Jabatan Inspektor, Periode Inspeksi, Nama Unit | `dd/MM/yyyy HH:mm:ss` (String) |
| **CVV** | Timestamp, Nama Observer, Perusahaan, Jabatan/Posisi Observer, Pekerjaan Pada Bagian, Nama Unit | `dd/MM/yyyy HH:mm:ss` (String) |
| **Brosur** | Tanggal, Pekerjaan, Pelaksana | Format input manual |

### 5.2. Tabel Ranking Kinerja Unit
Data *ranking* memiliki struktur agregasi berbasis Nama Unit (misal: YANTEK).
*   **Struktur Kolom UI:** RANK, NAMA, JUMLAH.
*   **Logika Data:** Data *ranking* sudah dikalkulasi dan bersifat final di Google Sheets. *Backend* memetakan struktur tersebut ke dalam format JSON bertingkat (*nested JSON*) untuk dirender di *frontend*.

### 5.3. Tabel Akun (Autentikasi Internal)

| Nama Tabel (Tab) | Struktur Kolom | Catatan |
| :--- | :--- | :--- |
| **Akun** | Username, Password | Data *password* disimpan dalam bentuk teks biasa (*plaintext*) sesuai kesepakatan kebutuhan internal yang disederhanakan. |

## 6. Spesifikasi Fitur Utama

### 6.1. Sistem Login Internal
*   **Deskripsi:** Gerbang akses (*Route Guard*) di sisi *frontend* untuk memastikan hanya Staf K3 yang berwenang yang dapat melihat *dashboard*.
*   **Mekanisme:** *User* memasukkan *Username* dan *Password* di antarmuka web. *Backend* (Spring Boot) akan mencocokkan input tersebut secara langsung dengan teks yang ada di tab "Akun" pada Google Sheets tanpa melalui proses *hashing* (enkripsi).

### 6.2. Dashboard View-Only Terintegrasi
*   **Deskripsi:** Antarmuka web yang menampilkan data dalam bentuk *data table*.
*   **Navigasi:** Menggunakan sistem *Tabs* untuk memisahkan tabel PSA, CVV, Brosur, dan Ranking agar analisis data lebih terfokus.
*   **Rendering Tabel Ranking:** UI mengakomodasi desain khusus di mana baris judul unit (misal: "YANTEK") membentang menutupi tiga kolom di bawahnya secara visual menggunakan atribut `colSpan="3"`.

### 6.3. Filter Analisis Waktu (Tanggal & Bulan)
*   **Deskripsi:** Fitur penyaringan data laporan untuk memudahkan Staf K3 melacak tren keselamatan pada periode spesifik.
*   **Parameter Filter:** 
    *   Rentang Tanggal (*Start Date* hingga *End Date*).
    *   Pemilihan Bulan spesifik.
*   **Pemrosesan (Backend):** Spring Boot memproses *parsing* teks `Timestamp` dari Sheets menjadi objek waktu lokal (`LocalDateTime`), melakukan komparasi/penyaringan (*filtering*), dan mengirimkan JSON hasil saringan ke Vite.

## 7. Batasan Sistem (Out of Scope)
Fungsi-fungsi berikut secara eksplisit **tidak** disertakan dalam cakupan proyek web ini:
*   Fungsi enkripsi/hashing *password* tingkat lanjut (misal: BCrypt).
*   Formulir input data laporan K3 baru via antarmuka web.
*   Fungsi modifikasi (*Edit*) atau penghapusan (*Delete*) baris data laporan.
*   Logika perhitungan matematis kompleks di sisi *backend* atau *frontend* (seluruh rekapitulasi diselesaikan di ranah fungsionalitas rumusan Google Sheets).