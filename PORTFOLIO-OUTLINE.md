# Portfolio Web — Blueprint / Kerangka

> Dokumen ini adalah kerangka (blueprint) untuk personal portfolio web milik **Ajie Dibyo R.**
> Tujuannya: menjadi versi web yang lebih "menjual" dari resume, bukan sekadar salinan resume.
> Setelah blueprint ini disetujui, kita lanjut ke tahap **spec** (requirements → design → tasks).

---

## 1. Ringkasan & Tujuan

| Aspek | Keputusan |
|-------|-----------|
| Pemilik | Ajie Dibyo R. (@ajiedrx) — Surabaya, Indonesia |
| Positioning | Full-Stack Mobile Engineer (fokus Native Android / Kotlin + lintas platform) |
| Tujuan utama | Showcase portofolio + "sales pitch" dari resume untuk recruiter / klien / kolaborator |
| Bahasa konten | **Bilingual** — Inggris (default) + Indonesia, dengan toggle bahasa (localized) |
| Sumber data | Resume terbaru + repo GitHub (di-fetch & di-scan via GitHub MCP) |

### Positioning statement (draft, hasil asimilasi resume)
> Full-Stack Mobile Engineer dengan 4+ tahun pengalaman. Ahli Kotlin, Clean Architecture, dan
> UI deklaratif (Jetpack Compose, SwiftUI). Punya rekam jejak nyata mendorong performa aplikasi,
> memimpin refactor teknis, dan mentoring engineer — kini melebarkan sayap ke arsitektur
> multi-platform (KMP) dan alur kerja berbasis AI.

---

## 2. Tech Stack & Deployment

| Item | Pilihan | Alasan singkat |
|------|---------|----------------|
| Framework | **Astro + TypeScript** | Output statis murni, ideal untuk GitHub Pages, Lighthouse tinggi, island architecture untuk interaktivitas hemat |
| Styling | CSS modern (custom properties, layers) / opsional Tailwind | Kontrol penuh atas desain non-generik, theming dark/light lewat CSS variables |
| Animasi | CSS transitions + Web Animations API + IntersectionObserver | Smooth, ringan, tanpa dependency berat |
| Theme toggle | Ripple animation via View Transitions API + fallback clip-path | Efek "wow" saat ganti dark/light |
| i18n | Astro i18n routing (`/` = EN, `/id/` = ID) + konten terlokalisasi dari file data | Bilingual dengan toggle bahasa, SEO-friendly per-locale |
| Deploy | **GitHub Pages** via GitHub Actions (build otomatis dari `main`) | Sesuai permintaan; auto-deploy |
| Data proyek | Di-generate dari file konten (JSON/Markdown) yang sudah diisi dari scan repo | Mudah dirawat, single source of truth |

> Catatan: warna, font, dan detail visual dirinci di bagian **Design Direction** (§6).

---

## 3. Struktur Halaman (Single-Page + smooth scroll)

Situs berupa **single-page** dengan navigasi anchor + smooth scroll. Section berurutan:

1. **Hero** — hook pertama
2. **About / Positioning** — narasi singkat siapa kamu
3. **Expertise / Skills** — area keahlian (dari resume)
4. **Experience** — timeline karier (dari resume)
5. **Featured Projects** — proyek terkurasi dari GitHub
6. **Impact / Highlights** — pencapaian kuantitatif (angka-angka dari resume)
7. **Mentorship & Education** — mentorship + sertifikasi
8. **Contact** — CTA + placeholder kontak
9. **Footer**

---

## 4. Rincian Konten per Section

### 4.1 Hero
- Nama besar + role: "Full-Stack Mobile Engineer"
- Tagline pendek berdampak (contoh: "I build fast, resilient mobile apps — and the backends behind them.")
- CTA ganda: "View Projects" + "Get in touch"
- Elemen visual "wow" (lihat §6). Bukan sekadar teks di tengah layar.
- Theme toggle terlihat (ripple effect).

### 4.2 About / Positioning
- Narasi 2-3 kalimat hasil asimilasi summary resume.
- Nada: percaya diri, konkret, tidak bombastis.
- Sisipkan lokasi (Surabaya) + status (open to work / kolaborasi — placeholder, kamu konfirmasi).

### 4.3 Expertise / Skills (dari "AREA OF EXPERTISE" resume)
Dikelompokkan:
- **Core Mobile**: Kotlin (Expert), Jetpack Compose, Coroutines, Clean Architecture, SOLID
- **Full-Stack**: .NET, Web API, SQL, Azure Pipelines
- **Modern Tech**: Kotlin Multiplatform (KMP), SwiftUI, AI-Driven Development
- **Quality**: Static Code Analysis, Performance Optimization, Unit Test, UI Test

### 4.4 Experience (timeline, dari resume)
- **Full-Stack Mobile Engineer — SimpliDOTS** (Mar 2026 – Present)
  - End-to-end feature ownership: Android app + .NET Core Web API, kurangi friksi integrasi & percepat deployment.
- **Mobile Developer — SimpliDOTS** (May 2023 – Feb 2026)
  - Modularisasi monolit → build time turun s/d 30%.
  - Optimasi performa via Coroutines → hilangkan 99% ANR.
  - Strategi batch processing → hilangkan 99% Out Of Memory error.
  - Unit test lokal + Azure Pipelines.
- **Mobile Developer — Astra International** (Oct 2021 – Apr 2023)
  - Android Sprint Lead: pimpin tim 3 orang untuk refactor prioritas tinggi (migrasi API), modernisasi networking layer, mentoring junior.
- **Software Developer Intern — Maulidan Games** (Jan 2020 – Apr 2020)
  - Terapkan OOP, Design Patterns, Clean Architecture, Code Refactoring.
  - Proyek: Windows App (WPF), Android (Java), Unity game dev.

### 4.5 Featured Projects (terkurasi, relevan saja)
Sumber: scan kode repo via GitHub MCP. Hanya proyek yang mencerminkan level saat ini.

| Proyek | Deskripsi (menjual) | Stack terverifikasi | Link |
|--------|---------------------|---------------------|------|
| **Todo KMP** | Aplikasi todo lintas platform (Android + iOS) satu basis kode, dengan Clean Architecture, reminder & notifikasi native per platform. | Kotlin Multiplatform, Compose Multiplatform, Room, Koin, Coroutines, kotlinx-datetime | github.com/ajiedrx/todo-kmp |
| **InstaApp** | Klon Instagram: feed, post, komentar bertingkat, like, profil — dibangun dengan Clean Architecture + MVVM yang rapi. | Kotlin, Jetpack Compose, Koin, Coroutines/Flow | github.com/ajiedrx/InstaApp |
| **GAMV (Swift)** | Aplikasi game catalog SwiftUI dengan arsitektur modular (Swift Packages terpisah), MVVM + Router, SwiftData, plus CI (Codemagic). | Swift, SwiftUI, SwiftData, MVVM, Swift Package Modules | github.com/ajiedrx/gamv-swift |
| **LagiDimana** | Aplikasi Android dengan location tracking real-time + notification service yang tahan terhadap manipulasi waktu perangkat. | Kotlin, Location Services, Notifications | github.com/ajiedrx/LagiDimana |
| **Movapp** | Aplikasi iOS berbasis SwiftUI yang menampilkan fundamental Swift & SwiftUI. | Swift, SwiftUI | github.com/ajiedrx/movapp |

> Catatan kurasi: repo tugas kuliah / submission lama (WPF, Java algoritma, Laravel/Nuxt 2019–2021)
> **tidak** ditampilkan agar fokus pada kompetensi terkini. Bisa direvisi bila kamu mau menambah/mengurangi.
>
> Setiap kartu proyek idealnya punya: judul, deskripsi menjual, chip tech-stack, link repo,
> dan (opsional) tautan demo / screenshot bila tersedia.

### 4.6 Impact / Highlights (angka yang menjual, dari resume)
Kartu statistik / counter beranimasi:
- **4+** tahun pengalaman profesional
- **99%** ANR dihilangkan (optimasi Coroutines)
- **99%** Out Of Memory error dihilangkan (batch processing)
- **~30%** pengurangan build time (modularisasi)
- **5** tim dibimbing sebagai Capstone Project Advisor
- **3** engineer dipimpin sebagai Android Sprint Lead

### 4.7 Mentorship & Education
- **Capstone Project Advisor — Bangkit Academy (2024)**: membimbing 5 tim mengintegrasikan komponen Mobile, Cloud, dan ML; memfasilitasi mentorship standar industri (May–Dec).
- **Education & Certification**:
  - Associate Cloud Engineer — Google (2026)
  - iOS Developer Expert — Dicoding (2024)
  - Bangkit Academy Graduate — Mobile Development (2021); capstone pakai Kotlin + TensorFlow Lite.

### 4.8 Contact (placeholder — diisi user)
- Email: `{{EMAIL_PLACEHOLDER}}`
- LinkedIn: `{{LINKEDIN_PLACEHOLDER}}`
- GitHub: https://github.com/ajiedrx (terverifikasi)
- (Opsional) Twitter/X, dsb: `{{SOCIAL_PLACEHOLDER}}`
- CTA: "Let's build something" / tombol mailto.

### 4.9 Footer
- Copyright + nama
- Link cepat ke section
- "Built with Astro" (opsional)

---

## 5. Navigasi & Interaksi
- Sticky/again-reveal navbar dengan anchor ke tiap section.
- Smooth scroll + scroll-spy (highlight section aktif).
- Theme toggle dengan **ripple animation** (View Transitions API; fallback clip-path circle reveal dari titik klik).
- **Language toggle** EN/ID di navbar; preferensi disimpan (localStorage) & mengarahkan ke rute locale yang sesuai.
- Scroll-reveal untuk section (fade/slide halus via IntersectionObserver).
- Counter beranimasi di section Impact.
- Hover state kaya pada kartu proyek (tanpa berlebihan).
- Respect `prefers-reduced-motion` — matikan/redakan animasi untuk aksesibilitas.

---

## 6. Design Direction (anti-generic, bikin ter-hook)

Tujuan: hindari kesan "template AI". Beberapa arah yang aku usulkan (final dipilih di tahap design):

### Palet warna (berbasis preferensi: hitam, putih, abu, biru, orange, merah)
- **Netral dominan**: near-black (`#0B0B0D`), off-white (`#F7F7F5`), skala abu.
- **Aksen utama**: satu warna berani sebagai signature — kandidat **orange terbakar** (`#FF5A1F`) atau **merah-oranye**.
- **Aksen sekunder**: **biru** (`#2E6BFF`) untuk kontras dingin / link / state.
- Dark & light mode dua-duanya dirancang serius (bukan sekadar invert).

### Tipografi
- Pairing kontras: display font berkarakter untuk heading (mis. grotesk tebal / editorial) + sans netral untuk body.
- Skala tipografi besar & percaya diri di hero.

### Signature visual (pilih salah satu di tahap design)
- **Opsi A — "Editorial/Brutalist-refined"**: grid tegas, tipografi raksasa, garis, angka besar, aksen orange. Rapi tapi berani.
- **Opsi B — "Kinetic/Interactive"**: hero dengan elemen bergerak halus (gradient mesh / noise / cursor-reactive), depth berlapis.
- **Opsi C — "Terminal/Engineer"**: nuansa IDE/terminal halus (monospace aksen, syntax-like highlight) yang pas dengan persona engineer.

> **KEPUTUSAN FINAL: Opsi A + sentuhan B** — editorial berani (grid tegas, tipografi raksasa, aksen
> orange sebagai signature, biru sebagai aksen sekunder) dipadukan interaksi halus (hero kinetic
> ringan, depth berlapis, micro-interaction). Kesan senior, teknis, tapi hidup.

### Prinsip
- Hierarki jelas, whitespace berani.
- Konsistensi spacing (skala 4/8px).
- Kontras warna memenuhi WCAG AA.
- Detail micro-interaction, bukan animasi ramai.

---

## 7. Best Practices yang Dipatuhi
- **Aksesibilitas**: semantik HTML, alt text, focus state terlihat, kontras AA, `prefers-reduced-motion`, navigasi keyboard.
- **Performa**: aset teroptimasi, lazy-load gambar, minim JS (island), font subset.
- **SEO**: meta tags, Open Graph, title/description, sitemap, structured data (Person schema).
- **Responsif**: mobile-first, breakpoint teruji.
- **Kualitas kode**: TypeScript, struktur komponen bersih, konten terpisah dari markup.
- **CI/CD**: GitHub Actions build + deploy ke GitHub Pages.

---

## 8. Struktur Proyek (rencana)
```
personal-web/
├── src/
│   ├── components/      # Hero, Navbar, ProjectCard, ThemeToggle, dst.
│   ├── layouts/         # Base layout (meta, theme init)
│   ├── sections/        # About, Experience, Projects, Impact, Contact
│   ├── content/         # projects.json / *.md, profile.json (data terpisah)
│   ├── i18n/            # en.json, id.json (string terlokalisasi) + helper locale
│   ├── styles/          # tokens (warna, tipografi), global, utilities
│   └── pages/           # index.astro (EN), id/index.astro (ID)
├── public/              # favicon, og-image, assets statis
├── .github/workflows/   # deploy.yml (GitHub Pages)
├── astro.config.mjs
└── README.md
```

---

## 9. Placeholder yang Perlu Kamu Isi Nanti
- `{{EMAIL_PLACEHOLDER}}` — email kontak
- `{{LINKEDIN_PLACEHOLDER}}` — URL LinkedIn
- `{{SOCIAL_PLACEHOLDER}}` — sosial lain (opsional)
- Status ketersediaan (open to work / freelance / not looking)
- Konfirmasi bahasa konten (Inggris/Indonesia)
- (Opsional) screenshot/GIF demo untuk kartu proyek

---

## 10. Keputusan Final (dikonfirmasi user)
1. **Bahasa**: Inggris default + toggle ke Indonesia (bilingual, localized/i18n). ✅
2. **Signature visual**: Opsi **A + sentuhan B** (editorial berani + interaksi halus). ✅
3. **Proyek**: 5 proyek terkurasi di §4.5 — sudah pas. ✅
4. **Domain**: default GitHub Pages (`ajiedrx.github.io/personal-web`). ✅
5. **Stack**: Astro + TypeScript. ✅

---

## 11. Langkah Berikutnya
Blueprint disetujui. Selanjutnya masuk ke **Spec**: menyusun `requirements.md`,
`design.md`, dan `tasks.md`, lalu implementasi bertahap.
