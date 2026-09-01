# Implementation Plan: Personal Portfolio Web

## Overview

This plan converts the Astro + TypeScript design into an incremental, test-driven build. Work proceeds bottom-up: scaffolding and the design-token/theming CSS layer come first (sections depend on them), then the pure logic layer (typed content model, content validators, i18n locale helper) with its property-based tests, then the layout and helpers, then the interactive islands, then the nine sections wired to content/i18n, then the two locale pages, then SEO/accessibility/performance/responsive hardening, then content seeding, and finally the GitHub Actions deploy workflow. Each step builds on the previous and ends by wiring the new piece into the running site so no code is left orphaned.

Property-based tests use **fast-check** (min 100 iterations each) and validate the ten Correctness Properties from the design. Test sub-tasks are marked optional with `*`.

## Tasks

- [x] 1. Scaffold the Astro + TypeScript project and test harness
  - Initialize an Astro static project with the TypeScript template and `package.json` scripts (`dev`, `build`, `preview`, `test`)
  - Configure `astro.config.mjs` with `site: 'https://ajiedrx.github.io'`, `base: '/personal-web'`, `output: 'static'`, `trailingSlash: 'ignore'`, i18n routing (`defaultLocale: 'en'`, `locales: ['en','id']`, `prefixDefaultLocale: false`), and the `@astrojs/sitemap` integration
  - Add `tsconfig.json` extending Astro's strict TS config
  - Add Vitest + fast-check as dev dependencies and a `vitest.config.ts` (single-run via `vitest --run`)
  - Create the `src/` directory skeleton (`pages/`, `layouts/`, `components/`, `sections/`, `content/`, `i18n/`, `lib/`, `styles/`) and `public/` (favicon, robots.txt placeholder)
  - _Requirements: 1.1, 1.2, 1.5, 5.1, 5.2, 20.3_

- [x] 2. Establish the design-token and theming CSS layer
  - [x] 2.1 Create `styles/tokens.css` and `styles/themes.css`
    - Define color/spacing/type tokens as CSS custom properties (near-black/off-white/gray palette, orange `#FF5A1F` accent, blue `#2E6BFF` secondary)
    - Define light and dark theme token values keyed off `[data-theme]` on `<html>`
    - _Requirements: 7.1, 18.6_
  - [x] 2.2 Create `styles/global.css` and `styles/motion.css`
    - Base reset and semantic element styling; visible focus indicator style (≥3:1 contrast) for interactive elements
    - Reveal/ripple keyframes and transitions in `motion.css`, all wrapped in `@media (prefers-reduced-motion: reduce)` guards that disable non-essential motion
    - _Requirements: 18.4, 18.5, 18.7, 17.2_

- [x] 3. Define the typed content model
  - Create `src/content/types.ts` with interfaces: `Profile`, `ContactInfo`, `SocialLink`, `SkillGroup`, `SkillCategory`, `ExperienceEntry`, `Project`, `ImpactItem`, `MentorshipEntry`, `EducationEntry`, `CertificationEntry`, `CertStatus`
  - Mark optional fields per design (`demoUrl`, `screenshot`, `expiryDate`, `credentialId`, `skills`, `showDetails`, `socials`)
  - _Requirements: 22.1, 22.2, 22.4_

- [x] 4. Implement the content loader and validators (pure logic)
  - [x] 4.1 Implement validation and filter functions in `src/lib/content.ts`
    - `isValidProject` / `validProjects`: keep records with non-empty title, non-empty description, a repo link, and 1–10 tech-stack chips; drop others; preserve source order; log omitted records without failing the build
    - `featuredCertifications`: keep only records with `featured === true`, independent of active/expired status
    - `sortExperienceDesc`: return a permutation ordered by start date, most-recent-first, treating `endDate === null` ("Present") as most recent
    - `certification detail visibility` helper: exclude `expiryDate`/`credentialId` unless `showDetails` is enabled
    - `impact display value` helper: return the final `value` when reduced motion is requested
    - _Requirements: 11.1, 11.3, 12.1, 12.3, 12.4, 13.3, 14.4, 14.6, 14.7_
  - [x] 4.2 Write property test for valid-project filtering
    - **Property 4: Valid-project filtering preserves order and validity**
    - fast-check, min 100 iterations; generate valid + malformed project records with random chip counts (including 0 and >10)
    - Tag: `// Feature: personal-portfolio-web, Property 4: Valid-project filtering preserves order and validity`
    - **Validates: Requirements 12.1, 12.3, 12.4**
  - [x] 4.3 Write property test for featured-only certification filtering
    - **Property 5: Featured-only certification filtering, independent of status**
    - fast-check, min 100 iterations; certification lists with random `featured` flags and random `active`/`expired` status
    - Tag: `// Feature: personal-portfolio-web, Property 5: Featured-only certification filtering, independent of status`
    - **Validates: Requirements 14.4, 14.7**
  - [x] 4.4 Write property test for certification detail visibility
    - **Property 6: Certification detail fields hidden unless enabled**
    - fast-check, min 100 iterations; random `showDetails`, present/absent `expiryDate`/`credentialId`
    - Tag: `// Feature: personal-portfolio-web, Property 6: Certification detail fields hidden unless enabled`
    - **Validates: Requirements 14.6**
  - [x] 4.5 Write property test for experience timeline sorting
    - **Property 7: Experience timeline is sorted most-recent-first and lossless**
    - fast-check, min 100 iterations; experience lists with random start/end dates including `null` end
    - Tag: `// Feature: personal-portfolio-web, Property 7: Experience timeline is sorted most-recent-first and lossless`
    - **Validates: Requirements 11.1, 11.3**
  - [x] 4.6 Write property test for impact display value under reduced motion
    - **Property 8: Impact counter final value under reduced motion**
    - fast-check, min 100 iterations; arbitrary impact items
    - Tag: `// Feature: personal-portfolio-web, Property 8: Impact counter final value under reduced motion`
    - **Validates: Requirements 13.3**

- [x] 5. Implement the i18n locale helper (pure logic)
  - [x] 5.1 Implement `src/i18n/locale.ts`
    - `t(locale, key)`: dotted-key lookup resolving in-locale first, falling back to English, then echoing the key as a last resort
    - `keysOf(dict)`: enumerate all dotted leaf keys (for parity checks)
    - `getLocale` / `dictionaryFor` helpers and the `Locale` type
    - Create minimal `en.json` / `id.json` stubs with an identical key set to load against
    - _Requirements: 5.3, 5.5, 5.6_
  - [x] 5.2 Write property test for i18n key parity
    - **Property 1: i18n key parity between locales**
    - fast-check, min 100 iterations; generate locale dictionaries with randomized keys/holes
    - Tag: `// Feature: personal-portfolio-web, Property 1: i18n key parity between locales`
    - **Validates: Requirements 5.5**
  - [x] 5.3 Write property test for English fallback
    - **Property 2: English fallback for missing keys**
    - fast-check, min 100 iterations; keys present/absent per locale
    - Tag: `// Feature: personal-portfolio-web, Property 2: English fallback for missing keys`
    - **Validates: Requirements 5.3, 5.6**

- [x] 6. Implement base-path and preference-persistence helpers
  - [x] 6.1 Implement `src/lib/withBase.ts`
    - `withBase(path)`: prefix internal hrefs/anchors/assets with `import.meta.env.BASE_URL`
    - `localePath(locale, hash?)`: `/` for EN and `/id/` for ID, base-prefixed, with optional `#anchor`
    - _Requirements: 1.5, 4.2, 6.2_
  - [x] 6.2 Implement theme/language storage helpers
    - `persistTheme` / `readStoredTheme` and `persistLanguage` / `readStoredLanguage`, all wrapped in try/catch so a storage failure applies the choice for the session without throwing; reads that throw are treated as "no preference"
    - _Requirements: 6.3, 6.4, 7.5, 7.6, 7.7, 7.8_
  - [x] 6.3 Write property test for theme preference round-trip
    - **Property 3: Theme preference round-trip**
    - fast-check, min 100 iterations; `{dark, light}`
    - Tag: `// Feature: personal-portfolio-web, Property 3: Theme preference round-trip`
    - **Validates: Requirements 7.5, 7.7**
  - [x] 6.4 Write property test for language preference round-trip
    - **Property 9: Language preference round-trip**
    - fast-check, min 100 iterations; `{en, id}`
    - Tag: `// Feature: personal-portfolio-web, Property 9: Language preference round-trip`
    - **Validates: Requirements 6.3, 6.4**
  - [x] 6.5 Write property test for theme selection surviving storage failure
    - **Property 10: Theme selection survives storage failure**
    - fast-check, min 100 iterations; throwing storage stub
    - Tag: `// Feature: personal-portfolio-web, Property 10: Theme selection survives storage failure`
    - **Validates: Requirements 7.6**

- [x] 7. Checkpoint - pure logic layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create the SEO builders and BaseLayout
  - [x] 8.1 Implement `src/lib/seo.ts`
    - Builders for per-locale `<title>`/meta description, Open Graph tags, and Person JSON-LD describing the owner
    - _Requirements: 20.1, 20.2, 20.4_
  - [x] 8.2 Implement `src/layouts/BaseLayout.astro`
    - Emit `<html lang>` per locale (`en` at `/`, `id` at `/id/`), the `<head>` metadata from `seo.ts`, and one `<main>` landmark
    - Include the inline pre-paint theme script that reads stored theme (or defaults to dark) and sets `data-theme` on `<html>` synchronously before first paint
    - Import the styles layer and slot in the sticky Navbar
    - _Requirements: 5.4, 7.7, 7.8, 18.1, 20.1, 20.2, 20.4_
  - [x] 8.3 Write output tests for BaseLayout head and lang
    - Assert per-locale `<title>`/meta description, OG tags, valid Person JSON-LD, `<html lang>` = `en`/`id`
    - _Requirements: 5.4, 20.1, 20.2, 20.4_

- [x] 9. Implement the ThemeToggle island
  - [x] 9.1 Build `ThemeToggle.astro` with ripple/reveal behavior
    - `client:load` island; `applyTheme` sets `data-theme` and toggle state; feature-detect `document.startViewTransition` for a ripple from the click point, else `clip-path` circle-reveal fallback; complete within 600 ms
    - Persist via the storage helpers; under reduced motion switch without ripple/reveal
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9_
  - [x] 9.2 Write unit tests for ThemeToggle defaults and reduced motion
    - Dark default when no preference stored; no ripple/reveal under reduced motion
    - _Requirements: 7.8, 7.9_

- [x] 10. Implement the LanguageToggle island
  - `client:load` island in the Navbar; on selection, persist the language preference and route to the corresponding locale path via `localePath`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11. Implement the Navbar with scroll-spy and mobile nav
  - [x] 11.1 Build `Navbar.astro` + `Navbar.ts`
    - Anchor links to each navigable section; `client:idle` scroll-spy via IntersectionObserver highlighting the in-view link; sticky/reveal on scroll; smooth scroll on click, instant scroll under reduced motion; mobile navigation affordance; hosts Theme and Language toggles
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 21.3_
  - [x] 11.2 Write unit tests for Navbar navigation behavior
    - One link per section with unique anchor targets; `smooth` normally vs `auto` under reduced motion
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 12. Implement the ScrollReveal and ImpactCounter islands
  - [x] 12.1 Build `ScrollReveal.astro`
    - `client:visible` IntersectionObserver controller that reveals sections entering the viewport; no-op (final state) under reduced motion
    - _Requirements: 17.1, 17.2_
  - [x] 12.2 Build `ImpactCounter.astro`
    - `client:visible` island that counts up to the final value on viewport entry; renders the final value immediately under reduced motion; uses the impact display-value helper
    - _Requirements: 13.2, 13.3_

- [x] 13. Checkpoint - islands and layout
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Build the Hero and About sections
  - [x] 14.1 Implement `sections/Hero.astro`
    - Owner name + role "Full-Stack Mobile Engineer"; tagline from I18n_Store; dual CTAs to `#projects` and `#contact`; subtle kinetic visual, rendered static under reduced motion
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 14.2 Implement `sections/About.astro`
    - Positioning narrative from I18n_Store; location "Surabaya, Indonesia"; availability from Content_Store
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 14.3 Write structural tests for Hero
    - Renders name, role, tagline, and both CTAs targeting `#projects` and `#contact`
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 15. Build the Expertise and Experience sections
  - [x] 15.1 Implement `sections/Expertise.astro` with `SkillGroup.astro`
    - Four category groups (Core Mobile, Full-Stack, Modern Tech, Quality); skill entries sourced from Content_Store within their assigned group
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 15.2 Implement `sections/Experience.astro` with `TimelineEntry.astro`
    - Render entries via `sortExperienceDesc` (most-recent-first); show role, organization, date range, highlights per entry
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 16. Build the Featured Projects section
  - [x] 16.1 Implement `sections/FeaturedProjects.astro` with `ProjectCard.astro`
    - One card per valid curated project via `validProjects`; card shows title, selling description, 1–10 tech-stack chips, repository link; open repo/demo links to their targets; render demo link and screenshot only when provided; distinct hover state
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  - [x] 16.2 Write structural tests for ProjectCard
    - Demo link/screenshot shown only when provided; hover state differs from default; invalid records omitted while valid ones still render
    - _Requirements: 12.4, 12.5, 12.7, 12.8_

- [x] 17. Build the Impact and Mentorship & Education sections
  - [x] 17.1 Implement `sections/Impact.astro`
    - Render `ImpactCounter` islands for highlight values from Content_Store with their units/labels
    - _Requirements: 13.1, 13.4_
  - [x] 17.2 Implement `sections/MentorshipEducation.astro`
    - Mentorship entries and education entries (title, organization, date/year); featured certifications only via `featuredCertifications`, showing title, issuer, issued year; expiry/credentialId hidden unless `showDetails` enabled; featured entries render regardless of active/expired
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [x] 17.3 Write structural tests for featured certifications
    - Title, issuer, issued year shown; expiry/credentialId hidden by default
    - _Requirements: 14.5, 14.6_

- [x] 18. Build the Contact and Footer sections
  - [x] 18.1 Implement `sections/Contact.astro`
    - Render email, LinkedIn, GitHub (verified `https://github.com/ajiedrx`), and additional socials from Content_Store; mailto CTA wired only when a real email is present; placeholder values render as inert, non-broken targets
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 18.2 Implement `sections/Footer.astro`
    - Copyright notice containing owner name; quick links to navigable sections
    - _Requirements: 16.1, 16.2_
  - [x] 18.3 Write structural tests for Contact
    - Verified GitHub link present; working mailto CTA; placeholders render without broken targets
    - _Requirements: 15.2, 15.3, 15.4_

- [x] 19. Compose the locale pages
  - [x] 19.1 Implement `src/pages/index.astro` (EN) and `src/pages/id/index.astro` (ID)
    - Compose all nine sections in fixed order (Hero, About, Expertise, Experience, Featured Projects, Impact, Mentorship & Education, Contact, Footer) inside BaseLayout, each with a unique anchor id; parameterize by locale and pull all visible strings through `t()`
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.5_
  - [x] 19.2 Write structural test for section order and anchors
    - Sections render in the fixed sequence; each navigable section has a unique anchor id; same order across both locales
    - _Requirements: 3.2, 3.3, 5.5_

- [x] 20. Seed content data files
  - [x] 20.1 Populate `src/content/*.json` from the blueprint
    - `profile.json` (name, role, location, availability, contact with placeholder-flagged email/LinkedIn/socials); `projects.json` (Todo KMP, InstaApp, GAMV, LagiDimana, Movapp); `experience.json` timeline; `skills.json` four groups; `impact.json` values; `mentorship.json`; `education.json`; `certifications.json` (all 17 certifications with the 4 featured ones flagged, each with status active/expired)
    - _Requirements: 12.2, 22.1, 22.2, 22.4_
  - [x] 20.2 Populate `src/i18n/en.json` and `src/i18n/id.json`
    - Localized UI strings and localized content (taglines, positioning narrative, descriptions, category labels, availability text) with an identical key set across both locales
    - _Requirements: 5.3, 5.5, 22.3, 22.5_

- [x] 21. Add SEO, performance, and responsive hardening
  - [x] 21.1 Wire SEO output and performance optimizations
    - Confirm `@astrojs/sitemap` emits `sitemap.xml`; add per-locale meta/OG/JSON-LD via `seo.ts`; lazy-load below-the-fold images; serve optimized image assets; subset fonts at build; ship JS only for the designated islands
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 20.1, 20.2, 20.3, 20.4_
  - [x] 21.2 Apply mobile-first responsive layout across sections
    - Section layouts adapt across defined breakpoints and remain readable; navbar accessible on small viewports
    - _Requirements: 21.1, 21.2, 21.3_
  - [x] 21.3 Write SEO/output and no-JS tests
    - Title/meta description and OG per locale; sitemap generated; Person JSON-LD valid; no client JS emitted for static sections (only designated islands hydrate)
    - _Requirements: 1.4, 19.4, 20.1, 20.2, 20.3, 20.4_
  - [x] 21.4 Write structural and accessibility tests
    - Exactly one `<h1>` and no skipped heading levels; semantic landmarks (`nav`, `main`, `footer`); interactive elements keyboard operable with visible focus; assert computed contrast ≥4.5:1 (normal) / ≥3:1 (large text and focus indicator) for both theme token pairs; axe smoke scan on both locale pages
    - _Requirements: 18.1, 18.4, 18.5, 18.6_

- [x] 22. Add the GitHub Actions deploy workflow
  - Create `.github/workflows/deploy.yml`: on push to `main` (+ `workflow_dispatch`), a `build` job runs `npm ci`, tests (gate), then `astro build` and uploads the `dist` artifact; a `deploy` job with `needs: build` publishes to GitHub Pages so a failed build never reaches deploy
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 23. Final checkpoint - full build and tests
  - Ensure all tests pass and the site builds under the `/personal-web/` base; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (test sub-tasks) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirements for traceability.
- Property-based tests use fast-check with a minimum of 100 iterations and are tagged `// Feature: personal-portfolio-web, Property {n}: {text}`.
- Checkpoints (tasks 7, 13, 23) ensure incremental validation.
- The pure logic layer (content validators, i18n helper, preference persistence) is built and property-tested before any markup depends on it.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3", "5.1", "6.1"] },
    { "id": 2, "tasks": ["4.1", "5.2", "5.3", "6.2", "8.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "6.3", "6.4", "6.5", "8.2"] },
    { "id": 4, "tasks": ["8.3", "9.1", "10", "11.1", "12.1", "12.2"] },
    { "id": 5, "tasks": ["9.2", "11.2", "14.1", "14.2", "15.1", "15.2", "16.1", "17.1", "17.2", "18.1", "18.2"] },
    { "id": 6, "tasks": ["14.3", "16.2", "17.3", "18.3", "19.1", "20.1", "20.2"] },
    { "id": 7, "tasks": ["19.2", "21.1", "21.2", "22"] },
    { "id": 8, "tasks": ["21.3", "21.4"] }
  ]
}
```
