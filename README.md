# KKM Dashboard — Exploratory Data Analysis (EDA)

Pipeline EDA interaktif untuk data kesihatan awam kanak-kanak Malaysia (TASKA/TADIKA & Klinik Kesihatan).
Muat naik fail CSV/Excel → peta kolum ke skema piawai → jalankan EDA penuh → lihat laporan dalam dashboard.

**Sokongan Dual-Dataset:**
- **NCDC TASKA (primary):** Format wide dengan kolum prefiks tahun (2023-2026), status gizi sedia ada
- **Klinik Birth Data (secondary):** Format narrow, pengukuran kelahiran sahaja, z-score dikira penuh

---

## Prasyarat

| Perisian | Versi Minimum |
|----------|---------------|
| **Python** | 3.12 |
| **Node.js** | 18+ |
| **npm** | 9+ |

---

## Dataset Sokongan

### 1. NCDC TASKA — Status Kesihatan Kanak-Kanak Kebangsaan

**Format:** Wide-format Excel dengan 16 sheet negeri
**Struktur:** Satu baris = satu kanak-kanak, kolum per tahun (2023/2024/2025/2026)

**Kolum Utama:**
- **ID:** No. Mykid
- **Demografi:** Nama Anak, Jantina, Tarikh Lahir, Negeri, Daerah, Nama TASKA
- **Sosio-ekonomi:** Pendapatan Keluarga (B40/M40/T20), Kumpulan Umur
- **Antropometri (per tahun):** 
  - `2025 Berat (kg)`, `2025 Tinggi (cm)`, `2025 BMI`
  - `2025 Status Berat`, `2025 Status Tinggi`, `2025 Status BMI`
  - `2025 Tarikh Pengukuran`
- **Status Labels:** "Normal", "Kurang Berat Badan", "Bantut", "Obes", "Pemantauan Lanjut"

**Proses Pipeline:**
1. Deteksi kolum prefiks tahun `^(2023|2024|2025|2026)\s`
2. Pivot wide → long (100 baris × 3 tahun = 300 baris)
3. Ekstrak `tahun_ukur` dari prefix
4. Normalize kolum: `2025 Berat (kg)` → `berat_kg`
5. Kira WHO z-score untuk validasi vs status sedia ada
6. Aggregasi indikator by negeri/daerah/umur

### 2. Clinic Birth Data — Penyediaan GIS Status Pemakanan Kanak-kanak

**Format:** CSV flat (1.26M rows)
**Struktur:** Satu baris = satu lawatan klinik (birth + vaccination visits)

**Kolum Utama:**
- **ID:** ID, BIRTH_IC
- **Demografi:** Jantina, Tarikh Lahir, Negeri, Daerah, Nama Klinik
- **Kelahiran:** Berat lahir (kg), Panjang lahir (kg), Tarikh Antropometri
- **Lawatan:** VACCINE_NAME, ASSESSMENT_STATUS

**Proses Pipeline:**
1. No pivot (narrow format)
2. Map `Berat lahir` → `berat_kg`, `Panjang lahir` → `tinggi_cm`
3. Kira WHO z-score (birth measurements = age 0 days)
4. Filter: fokus bawah 2 tahun / bawah 5 tahun (dari lawatan follow-up)

---

## Pemasangan & Mula Cepat

```bash
# 1. Klon repo
git clone <repo-url>
cd "KKM DAshboard - EDA"

# 2. Pasang dependensi Python
pip install fastapi uvicorn pandas numpy python-multipart openpyxl thefuzz

# 3. Pasang dependensi frontend
cd frontend
npm install
cd ..

# 4. Jalankan backend (terminal 1)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. Jalankan frontend (terminal 2)
cd frontend
npx vite --host
```

Buka **http://localhost:5173** dalam pelayar.

---

## Seni Bina

```
┌───────────────┐       /api/*        ┌──────────────┐
│  React 18     │  ──── proxy ────▶   │  FastAPI      │
│  Vite 6       │  :5173              │  Uvicorn      │
│  Recharts     │                     │  :8000        │
└───────────────┘                     └──────────────┘
      │                                     │
      │  components/tabs/                   │  main.py
      │  - IndicatorsTab                    │  - run_eda()
      │  - ChartsTab                        │  - compute_numerical_summary()
      │  - NumericalTab                     │  - compute_categorical_summary()
      │  - CategoricalTab                   │  - build_chart_blocks()
      │  - ProfileTab                       │  - compute_quality_score()
      │  - MissingTab, DupTab, etc.         │  - validate_ic()
      └────────────────────────────────────-┘
```

---

## Aliran Kerja (5 Langkah)

| Langkah | Penerangan |
|---------|------------|
| **1. Muat Naik** | Pilih fail CSV atau Excel (.xlsx). |
| **2. Pratonton** | Lihat 20 baris pertama & ringkasan kolum. |
| **3. Peta Kolum** | Petakan kolum asal → skema piawai (id, berat_kg, tinggi_cm, dll). |
| **4. Tetapan** | Tetapkan ambang BMI, strategi null, dll. |
| **5. Laporan EDA** | Dashboard penuh dengan skor kualiti, statistik, carta, & tab laporan. |

---

## Komponen EDA Utama

### 1. Pemahaman Struktur Data ✅

| Apa | Di Mana |
|-----|---------|
| Jumlah baris & kolum | Stat cards (Step 5) |
| Jenis data per kolum (numerical / categorical) | **Tab Profil Kolum** — jadual penuh dengan dtype asal, jenis ditafsir, bilangan unik, contoh nilai |
| Medan dipetakan vs belum dipetakan | Stat card "Medan Dipetakan", banner amaran untuk medan kritikal hilang |
| Skema piawai vs kolum asal vs terbitan | Tag warna dalam ProfileTab (hijau = standard, ungu = terbitan, kelabu = asal) |

### 2. Pembersihan Data ✅

| Apa | Di Mana |
|-----|---------|
| **Nilai hilang (missing values)** | **Tab Nilai Hilang** — per kolum: bilangan null, % null, skor keparahan, bar visual, indeks baris null |
| **Rekod duplikat** | **Tab Duplikat** — bilangan, %, sebelum/selepas |
| **Pengesahan IC / MyKid** | **Tab IC** — 12-digit NRIC rules, notasi saintifik, suffix, kadar sah/tidak sah |
| **Normalisasi ejaan** | **Tab Ejaan** — nilai asal, isu, cadangan, keparahan |
| **Normalisasi jantina & pendapatan** | Backend: peta varian → M/F, B40/M40/T20 |
| **Penukaran sentinel → NaN** | Backend: `<NA>`, `nan`, `""`, `" "` → `np.nan` |
| **Konsistensi jenis data** | ProfileTab: dtype asal vs ditafsir |

### 3. Statistik Deskriptif ✅

| Statistik | Kolum | Tab |
|-----------|-------|-----|
| N, Min, Max, **Julat** | berat_kg, tinggi_cm, bmi, umur | **Tab Numerik** |
| **Mean, Median, Mod** | ↑ | ↑ |
| **StdDev, Kepencongan (Skewness), Kurtosis** | ↑ | ↑ |
| Persentil: P5, P25, P75, P95 | ↑ | ↑ |
| Frekuensi & peratusan (Top 10) | negeri, jantina, pendapatan, status BMI/berat/tinggi | **Tab Kategorikal** |
| Bilangan unik | Semua kolum | ProfileTab |

### 4. Visualisasi ✅

| Jenis Carta | Data | Perpustakaan |
|-------------|------|-------------|
| **Histogram** (20-bin) | BMI, Berat, Tinggi, Umur | Recharts `BarChart` |
| **Box Plot** (CSS) | Setiap kolum numerik — Q1, median, Q3, whisker, titik outlier | NumericalTab (inline SVG/CSS) |
| **Scatter Plot** | Berat vs Tinggi, BMI vs Umur | Recharts `ScatterChart` |
| **Carta Pai / Donut** | Status BMI (kumpulan) | Recharts `PieChart` |
| **Carta Bar Mendatar** | Jantina, Rekod mengikut Negeri (Top 15) | Recharts `BarChart` (layout vertical) |
| **Carta Garis (Trend)** | Trend tahunan (bantut, obes, kurang berat) | Recharts `LineChart` |
| **Bar frekuensi** (dalam jadual) | Setiap kolum kategorikal | CategoricalTab (CSS bar) |
| **Bar null** | Per kolum | ProfileTab, MissingTab |

### 5. Pengesanan Outlier ✅

| Kaedah | Penerangan | Lokasi |
|--------|------------|--------|
| **IQR (1.5×)** | Outlier biasa: di bawah Q1−1.5·IQR atau di atas Q3+1.5·IQR | NumericalTab: `Outlier IQR` |
| **IQR Ekstrem (3×)** | Outlier melampau: 3× IQR | NumericalTab: `Outlier Ekstrem` |
| **Z-Score > 3** | Titik data > 3 sisihan piawai dari min | NumericalTab: `Outlier Z>3` |
| **Julat Biologi** | Had domain khusus kanak-kanak — berat 0.5–80 kg, tinggi 30–200 cm, BMI 5–60, umur 0–120 bulan | NumericalTab: `Luar Julat Bio` |
| **Box Plot Visual** | Titik outlier ditanda kuning pada box plot mini | NumericalTab |
| **Konsistensi BMI** | BMI dikira semula vs nilai asal, flag jika berbeza > ambang | Tab BMI |

---

## WHO 2006 Z-Score & Indikator KKM ✅

### WHO 2006 Growth Standards (LMS Method)

Pipeline menggunakan **WHO Child Growth Standards 2006** untuk mengira z-score antropometrik:

**Z-Score Formula (LMS):**
```
Z = ((X/M)^L - 1) / (L * S)  untuk L ≠ 0
Z = log(X/M) / S             untuk L = 0
```

**3 Indikator Z-Score:**
- **WAZ (Weight-for-Age):** Status berat berbanding umur (0-60 bulan)
- **HAZ (Height-for-Age):** Status tinggi/bantut (0-60 bulan)
- **BAZ (BMI-for-Age):** Status BMI/susut/obes (0-60 bulan)

**Klasifikasi:**
| Z-Score | WAZ | HAZ | BAZ |
|---------|-----|-----|-----|
| **< -3** | Kurang berat teruk | Bantut teruk | Susut teruk |
| **-3 to -2** | Kurang berat badan | Bantut | Susut |
| **-2 to +1** | Normal | Normal | Normal |
| **+1 to +2** | Risiko berat berlebihan | - | Berlebihan berat badan |
| **> +2** | Berat berlebihan | - | Obes |

### 4 Indikator KKM (WHO-aligned)

Pipeline mengira prevalens untuk **4 indikator gizi kanak-kanak** mengikut piawaian KKM:

| Indikator | Definisi (z-score) | Definisi (label) |
|-----------|-------------------|------------------|
| **Kurang Berat Badan** | WAZ < -2 | "Kurang Berat Badan" |
| **Bantut** | HAZ < -2 | "Bantut", "Bantut Teruk" |
| **Susut** | BAZ < -2 | "Susut" |
| **Berlebihan Berat Badan & Obes** | BAZ > +1 | "Berlebihan berat badan", "Obes" |

**2 Kumpulan Umur:**
- **Bawah 2 Tahun:** 0-23 bulan (0-24 tidak termasuk)
- **Bawah 5 Tahun:** 0-59 bulan (0-60 tidak termasuk)

**3 Peringkat Geografi:** Aggregasi by Negeri, Kawasan/Bahagian, Daerah

**Dimensi Tambahan:**
- By gender (M/F)
- By income group (B40/M40/T20)
- By year (tahun_ukur)
- Time-series trajectory (per-child year-over-year)

**Sumber Indikator Flexibility:**
- **NCDC TASKA:** Gunakan status label sedia ada ("Normal", "Kurang Berat Badan") DAN kira z-score untuk validasi
- **Clinic Birth:** Gunakan z-score sahaja (tiada status label dalam data asal)
- Report flag bila z-score classification ≠ source label untuk audit

**Lokasi dalam Dashboard:**
- **Tab Indikator:** Prevalens summary by age group × indicator × geography
- **Tab Charts:** Trend lines, pie charts by status
- **Tableau Export:** Aggregated table ready for drill-down dashboards

---

## Skor Kualiti Data (100 mata)

| Dimensi | Markah | Penerangan |
|---------|--------|------------|
| Liputan Medan | 20 | Berapa banyak medan teras (11) yang dipetakan |
| Ketepatan IC | 15 | Kadar IC/MyKid yang sah |
| Medan Kritikal Hilang | 25 | Kadar null dalam medan antropometrik & status |
| Duplikat | 20 | Peratusan baris pendua |
| BMI Konsisten | 10 | Padanan antara BMI dikira vs BMI asal |
| Ejaan | 10 | Bilangan isu ejaan dalam kolum status/kategorikal |

**Gred:** A (≥85) · B (≥70) · C (≥55) · D (<55)

---

## Struktur Fail

```
KKM DAshboard - EDA/
├── main.py                    # Backend FastAPI (EDA pipeline)
├── index.html                 # Landing page (static)
├── README.md
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx           # App root (5-step wizard)
        ├── constants.js       # STANDARD_SCHEMA, REPORT_TABS, etc.
        ├── styles.css
        └── components/
            ├── QualityScore.jsx
            ├── StatCard.jsx
            ├── DataTable.jsx
            └── tabs/
                ├── index.js           # Barrel export
                ├── IndicatorsTab.jsx  # Prevalens (bantut, obes, dll)
                ├── ChartsTab.jsx      # Histogram, scatter, pie, line
                ├── NumericalTab.jsx   # Statistik deskriptif + box plot
                ├── CategoricalTab.jsx # Taburan frekuensi
                ├── ProfileTab.jsx     # Profil kolum (dtype, unik, null)
                ├── MissingTab.jsx     # Nilai hilang
                ├── CompletenessTab.jsx
                ├── BmiTab.jsx         # Konsistensi BMI
                ├── IcTab.jsx          # Pengesahan IC
                ├── SpellingTab.jsx    # Isu ejaan
                ├── DupTab.jsx         # Duplikat
                ├── AgeTab.jsx         # Taburan umur
                └── ChangesTab.jsx     # Log perubahan
```

---

## API Endpoints

| Method | Path | Penerangan |
|--------|------|------------|
| `POST` | `/upload` | Muat naik CSV/Excel, return pratonton + kolum |
| `POST` | `/run-eda` | Jalankan EDA penuh dengan pemetaan & tetapan |
| `POST` | `/export` | Eksport data bersih sebagai CSV |

---

## Dependensi

### Backend (Python 3.12)

| Pakej | Versi | Guna |
|-------|-------|------|
| fastapi | 0.115.0 | Web framework |
| uvicorn | 0.30.6 | ASGI server |
| pandas | 2.1.4 | Manipulasi data |
| numpy | 1.26.2 | Pengiraan numerik |
| python-multipart | — | Muat naik fail |
| openpyxl | — | Baca .xlsx |
| thefuzz | — | Padanan ejaan kabur (fuzzy) |

### Frontend (Node 18+)

| Pakej | Versi | Guna |
|-------|-------|------|
| react | 18.3.1 | UI library |
| react-dom | 18.3.1 | DOM rendering |
| recharts | 3.8.1 | Carta (histogram, scatter, pie, line) |
| vite | 6.0.0 | Bundler & dev server |

---

## Arahan Penyelenggara

```bash
# Jalankan backend sahaja
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Jalankan frontend sahaja
cd frontend && npx vite --host

# Build frontend untuk production
cd frontend && npx vite build
# Output: frontend/dist/

# Semak sintaks Python
python -c "import ast; ast.parse(open('main.py', encoding='utf-8').read()); print('OK')"
```
