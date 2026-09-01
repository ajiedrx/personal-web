# Requirements Document

## Introduction

This document specifies the requirements for a personal portfolio website for Ajie Dibyo R. (@ajiedrx), positioned as a Full-Stack Mobile Engineer with a Native Android / Kotlin focus and cross-platform experience. The website is a single-page, bilingual (English default, Indonesian secondary), statically generated site built with Astro and TypeScript, deployed to GitHub Pages via GitHub Actions. The site acts as a "sales pitch" version of the owner's resume, showcasing positioning, expertise, experience, curated projects, quantitative impact, mentorship, education, and contact information. The visual direction is editorial/brutalist-refined with subtle kinetic interaction, a near-black/off-white/gray palette, an orange signature accent (#FF5A1F), and a blue secondary accent (#2E6BFF). The site emphasizes accessibility (WCAG AA), performance, SEO, and responsiveness. All content is separated from markup into localized data files.

## Glossary

- **Portfolio_Site**: The complete statically generated Astro website deployed to GitHub Pages.
- **Build_System**: The Astro static site generator and TypeScript toolchain that produces the deployable output.
- **Deployment_Pipeline**: The GitHub Actions workflow that builds and publishes the site to GitHub Pages on changes to the `main` branch.
- **Navbar**: The sticky/reveal navigation bar containing anchor links, the theme toggle, and the language toggle.
- **Theme_Toggle**: The control that switches the site between dark and light color themes.
- **Language_Toggle**: The control that switches the site content between English and Indonesian locales.
- **Locale**: A language variant of the site content; English (`en`) served at `/` and Indonesian (`id`) served at `/id/`.
- **Content_Store**: The set of data files (e.g., `projects.json`/Markdown, `profile.json`) that hold structured site content separated from markup.
- **I18n_Store**: The set of localized string files (`en.json`, `id.json`) that hold translated UI strings and localized content.
- **Section**: A distinct content region of the single page (Hero, About, Expertise, Experience, Featured Projects, Impact, Mentorship & Education, Contact, Footer).
- **Project_Card**: A UI element presenting a single curated project with title, description, tech-stack chips, and repository link.
- **Impact_Counter**: An animated numeric display presenting a quantitative highlight from the resume.
- **Scroll_Reveal**: The behavior that animates a Section into view as it enters the viewport.
- **Scroll_Spy**: The behavior that highlights the Navbar anchor corresponding to the Section currently in view.
- **Reduced_Motion_Preference**: The user's operating-system or browser setting expressed via the `prefers-reduced-motion` media query.
- **Theme_Preference**: The user's selected dark or light theme, persisted in `localStorage`.
- **Language_Preference**: The user's selected locale, persisted in `localStorage`.
- **Certification_Entry**: A record of a professional certification held by the owner, comprising a title, issuing organization, issued date, optional expiry date, optional credential identifier, optional associated skills, a featured flag, and a status of active or expired.

## Requirements

### Requirement 1: Static Site Generation with Astro and TypeScript

**User Story:** As the site owner, I want the portfolio built as a static site with Astro and TypeScript, so that the site loads fast, ranks well, and deploys cleanly to GitHub Pages.

#### Acceptance Criteria

1. THE Build_System SHALL generate static HTML output suitable for hosting on GitHub Pages.
2. THE Build_System SHALL use TypeScript for component and configuration source files.
3. THE Portfolio_Site SHALL separate content data from presentation markup by sourcing content from the Content_Store and the I18n_Store.
4. WHERE interactive behavior is required, THE Portfolio_Site SHALL implement it using Astro island components to minimize shipped JavaScript.
5. WHEN the Build_System produces output, THE Build_System SHALL configure base paths compatible with GitHub Pages project hosting.

### Requirement 2: Automated Deployment to GitHub Pages

**User Story:** As the site owner, I want the site to deploy automatically when I push to main, so that publishing updates requires no manual steps.

#### Acceptance Criteria

1. WHEN a commit is pushed to the `main` branch, THE Deployment_Pipeline SHALL build the Portfolio_Site.
2. WHEN the build completes successfully, THE Deployment_Pipeline SHALL publish the generated output to GitHub Pages.
3. IF the build fails, THEN THE Deployment_Pipeline SHALL stop before publishing and report the failure status.

### Requirement 3: Single-Page Structure and Section Ordering

**User Story:** As a visitor, I want all portfolio content on one page in a clear order, so that I can scan the owner's profile quickly.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL present all content on a single page.
2. THE Portfolio_Site SHALL render the following Sections in this order: Hero, About, Expertise, Experience, Featured Projects, Impact, Mentorship & Education, Contact, Footer.
3. THE Portfolio_Site SHALL assign a unique anchor identifier to each navigable Section.

### Requirement 4: Anchor Navigation with Smooth Scroll and Scroll-Spy

**User Story:** As a visitor, I want a navbar that scrolls me to sections and shows where I am, so that I can move through the page easily.

#### Acceptance Criteria

1. THE Navbar SHALL display anchor links to each navigable Section.
2. WHEN a visitor activates a Navbar anchor link, THE Portfolio_Site SHALL scroll smoothly to the corresponding Section.
3. WHILE a Section is the one currently in view, THE Scroll_Spy SHALL highlight the corresponding Navbar anchor link.
4. WHILE the visitor scrolls the page, THE Navbar SHALL remain accessible through sticky or reveal behavior.
5. WHERE the Reduced_Motion_Preference is enabled, THE Portfolio_Site SHALL perform anchor navigation without smooth-scroll animation.

### Requirement 5: Bilingual Content and i18n Routing

**User Story:** As a visitor, I want to read the site in English or Indonesian, so that I can use my preferred language.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL serve English content at the root path `/`.
2. THE Portfolio_Site SHALL serve Indonesian content at the path `/id/`.
3. THE Portfolio_Site SHALL source all localized text for each Locale from the I18n_Store.
4. WHEN the English Locale is rendered, THE Portfolio_Site SHALL set the HTML `lang` attribute to `en`; WHEN the Indonesian Locale is rendered, THE Portfolio_Site SHALL set the HTML `lang` attribute to `id`.
5. THE Portfolio_Site SHALL present the same Sections in the same order across both Locales, with each localized string having a corresponding entry in both the English and Indonesian I18n_Store files.
6. IF a localized string key is missing from a Locale's I18n_Store, THEN THE Portfolio_Site SHALL fall back to the English value for that key.

### Requirement 6: Language Toggle with Persisted Preference

**User Story:** As a visitor, I want a language toggle that remembers my choice, so that I do not have to reselect my language on return visits.

#### Acceptance Criteria

1. THE Navbar SHALL display a Language_Toggle for switching between English and Indonesian.
2. WHEN a visitor selects a language using the Language_Toggle, THE Portfolio_Site SHALL navigate to the corresponding Locale route.
3. WHEN a visitor selects a language using the Language_Toggle, THE Portfolio_Site SHALL store the Language_Preference in `localStorage`.
4. WHEN a visitor loads the Portfolio_Site AND a Language_Preference exists in `localStorage`, THE Portfolio_Site SHALL apply the stored Language_Preference.

### Requirement 7: Theme Toggle with Ripple Animation and Persisted Preference

**User Story:** As a visitor, I want to switch between dark and light themes with a distinctive transition that remembers my choice, so that I can view the site comfortably.

#### Acceptance Criteria

1. THE Navbar SHALL display a Theme_Toggle that visually indicates whether the dark or light theme is currently active.
2. WHEN a visitor activates the Theme_Toggle, THE Portfolio_Site SHALL switch between dark and light themes and complete the switch within 600 milliseconds.
3. WHEN a visitor activates the Theme_Toggle AND the View Transitions API is available, THE Portfolio_Site SHALL animate the theme change as a ripple expanding from the click point over a duration between 200 and 600 milliseconds.
4. IF the View Transitions API is unavailable, THEN THE Portfolio_Site SHALL animate the theme change using a clip-path circle-reveal from the click point over a duration between 200 and 600 milliseconds.
5. WHEN a visitor selects a theme, THE Portfolio_Site SHALL store the Theme_Preference in `localStorage`.
6. IF storing the Theme_Preference in `localStorage` fails, THEN THE Portfolio_Site SHALL apply the selected theme for the current session.
7. WHEN a visitor loads the Portfolio_Site AND a Theme_Preference exists in `localStorage`, THE Portfolio_Site SHALL apply the stored Theme_Preference before first paint.
8. WHEN a visitor loads the Portfolio_Site AND no Theme_Preference exists in `localStorage`, THE Portfolio_Site SHALL apply the dark theme as the default before first paint.
9. WHERE the Reduced_Motion_Preference is enabled, THE Portfolio_Site SHALL switch the theme without ripple or reveal animation.

### Requirement 8: Hero Section

**User Story:** As a visitor, I want an impactful hero introduction, so that I immediately understand who the owner is and what they do.

#### Acceptance Criteria

1. THE Hero Section SHALL display the owner name and the role "Full-Stack Mobile Engineer".
2. THE Hero Section SHALL display a short impact-oriented tagline sourced from the I18n_Store.
3. THE Hero Section SHALL display a call-to-action link to the Featured Projects Section and a call-to-action link to the Contact Section.
4. WHERE the Reduced_Motion_Preference is disabled, THE Hero Section SHALL present a subtle kinetic visual element.
5. WHERE the Reduced_Motion_Preference is enabled, THE Hero Section SHALL present the visual element without motion.

### Requirement 9: About / Positioning Section

**User Story:** As a visitor, I want a concise positioning statement, so that I understand the owner's value and focus.

#### Acceptance Criteria

1. THE About Section SHALL display a positioning narrative sourced from the I18n_Store.
2. THE About Section SHALL display the owner location as Surabaya, Indonesia.
3. THE About Section SHALL display an availability status value sourced from the Content_Store.

### Requirement 10: Expertise / Skills Section

**User Story:** As a visitor, I want to see the owner's skills grouped by area, so that I can assess technical fit quickly.

#### Acceptance Criteria

1. THE Expertise Section SHALL present skills grouped into the categories Core Mobile, Full-Stack, Modern Tech, and Quality.
2. THE Expertise Section SHALL source the skill entries for each category from the Content_Store.
3. THE Expertise Section SHALL display each skill entry within its assigned category group.

### Requirement 11: Experience Timeline Section

**User Story:** As a visitor, I want a career timeline, so that I can follow the owner's professional progression.

#### Acceptance Criteria

1. THE Experience Section SHALL present career entries as a chronological timeline sourced from the Content_Store.
2. THE Experience Section SHALL display, for each entry, the role, the organization, the date range, and the associated highlights.
3. THE Experience Section SHALL order the timeline entries from most recent to earliest.

### Requirement 12: Featured Projects Section

**User Story:** As a visitor, I want to browse curated projects with clear tech context, so that I can evaluate the owner's recent work.

#### Acceptance Criteria

1. THE Featured Projects Section SHALL render exactly one Project_Card for each curated project sourced from the Content_Store.
2. THE Featured Projects Section SHALL include the curated projects Todo KMP, InstaApp, GAMV, LagiDimana, and Movapp.
3. THE Project_Card SHALL display a project title, a selling description, between 1 and 10 tech-stack chips, and a repository link.
4. IF a curated project is missing a required field (title, selling description, tech-stack chips, or repository link), THEN THE Featured Projects Section SHALL omit that Project_Card and continue rendering the remaining valid Project_Cards.
5. WHEN a visitor's pointer enters a Project_Card, THE Project_Card SHALL present a hover state that is visually distinct from its default state.
6. WHEN a visitor activates a repository link or demo link, THE Project_Card SHALL open the corresponding target destination.
7. WHERE a project provides a demo link, THE Project_Card SHALL display the demo link.
8. WHERE a project provides a screenshot, THE Project_Card SHALL display the screenshot.

### Requirement 13: Impact / Highlights Section with Animated Counters

**User Story:** As a visitor, I want to see quantified achievements, so that I can gauge the owner's measurable impact.

#### Acceptance Criteria

1. THE Impact Section SHALL display Impact_Counter elements for the highlight values sourced from the Content_Store.
2. WHEN an Impact_Counter enters the viewport, THE Impact_Counter SHALL animate from a starting value to its final value.
3. WHERE the Reduced_Motion_Preference is enabled, THE Impact_Counter SHALL display its final value without count-up animation.
4. THE Impact Section SHALL display the units or labels associated with each highlight value.

### Requirement 14: Mentorship & Education Section

**User Story:** As a visitor, I want to see mentorship, education, and the owner's most relevant certifications, so that I understand the owner's leadership and credentials without wading through every course completed.

#### Acceptance Criteria

1. THE Mentorship & Education Section SHALL display the mentorship entries sourced from the Content_Store.
2. THE Mentorship & Education Section SHALL display the education entries sourced from the Content_Store.
3. THE Mentorship & Education Section SHALL display, for each mentorship and education entry, the title, the issuing organization, and the associated date or year.
4. THE Mentorship & Education Section SHALL display only the Certification_Entry records whose featured flag is set.
5. THE Mentorship & Education Section SHALL display, for each featured Certification_Entry, the title, the issuing organization, and the issued year.
6. THE Mentorship & Education Section SHALL NOT display the expiry date or credential identifier of a Certification_Entry unless the Content_Store explicitly enables that display.
7. THE Mentorship & Education Section SHALL display featured Certification_Entry records regardless of whether their status is active or expired.

### Requirement 15: Contact Section

**User Story:** As a visitor, I want clear contact options, so that I can reach the owner.

#### Acceptance Criteria

1. THE Contact Section SHALL display the email, LinkedIn, GitHub, and additional social values sourced from the Content_Store.
2. THE Contact Section SHALL display the verified GitHub profile link `https://github.com/ajiedrx`.
3. THE Contact Section SHALL display a call-to-action control that opens a `mailto` link to the configured email address.
4. WHERE a contact value is a placeholder, THE Contact Section SHALL render the placeholder without a broken link target.

### Requirement 16: Footer Section

**User Story:** As a visitor, I want a footer with quick links and attribution, so that I can navigate and identify the site source.

#### Acceptance Criteria

1. THE Footer Section SHALL display a copyright notice containing the owner name.
2. THE Footer Section SHALL display quick links to the navigable Sections.

### Requirement 17: Scroll-Reveal Animations

**User Story:** As a visitor, I want sections to appear smoothly as I scroll, so that the experience feels polished.

#### Acceptance Criteria

1. WHEN a Section enters the viewport, THE Scroll_Reveal SHALL animate the Section into view using an IntersectionObserver.
2. WHERE the Reduced_Motion_Preference is enabled, THE Portfolio_Site SHALL display Sections in their final state without Scroll_Reveal animation.

### Requirement 18: Accessibility Compliance

**User Story:** As a visitor using assistive technology, I want an accessible site, so that I can use it regardless of ability.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL use semantic HTML elements for Sections, headings, navigation, and landmarks, with exactly one top-level heading per page and no skipped heading levels.
2. WHERE an image conveys information, THE Portfolio_Site SHALL provide descriptive alternative text for the image.
3. WHERE an image is decorative, THE Portfolio_Site SHALL provide empty alternative text so it is ignored by assistive technology.
4. WHEN an interactive element receives keyboard focus, THE Portfolio_Site SHALL render a visible focus indicator with a contrast ratio of at least 3 to 1 against adjacent colors.
5. THE Portfolio_Site SHALL support operation of the Navbar, Theme_Toggle, Language_Toggle, and links using only the keyboard, including activation via Enter or Space and navigation via Tab in a logical reading order.
6. THE Portfolio_Site SHALL maintain a text contrast ratio of at least 4.5 to 1 for normal-size text and at least 3 to 1 for large-size text, in both the light and dark themes.
7. WHERE the Reduced_Motion_Preference is enabled, THE Portfolio_Site SHALL suppress all non-essential animations and transitions across all Sections.

### Requirement 19: Performance Optimization

**User Story:** As a visitor, I want the site to load quickly, so that I can view the content without delay.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL lazy-load images that appear below the initial viewport.
2. THE Portfolio_Site SHALL serve optimized image assets.
3. THE Build_System SHALL subset fonts to the character ranges used by the Portfolio_Site.
4. THE Portfolio_Site SHALL ship interactive JavaScript only for island components that require it.

### Requirement 20: SEO and Structured Data

**User Story:** As the site owner, I want strong SEO metadata, so that the portfolio is discoverable and presents well when shared.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL include a title and meta description for each Locale.
2. THE Portfolio_Site SHALL include Open Graph metadata for social sharing previews.
3. THE Build_System SHALL generate a sitemap for the Portfolio_Site.
4. THE Portfolio_Site SHALL include Person structured data describing the owner.

### Requirement 21: Responsive Layout

**User Story:** As a visitor on any device, I want the layout to adapt to my screen, so that the site is usable on mobile and desktop.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL apply a mobile-first responsive layout.
2. WHILE the viewport width changes across defined breakpoints, THE Portfolio_Site SHALL adjust the layout of each Section to remain readable and usable.
3. THE Navbar SHALL provide navigation access on small viewports.

### Requirement 22: Content and Placeholder Data Management

**User Story:** As the site owner, I want content and placeholders managed in data files, so that I can update text and fill in contact details later without editing markup.

#### Acceptance Criteria

1. THE Content_Store SHALL hold structured project, profile, experience, skills, impact, mentorship, education, and certification data.
2. THE Content_Store SHALL store each Certification_Entry with a title, an issuing organization, an issued date, an optional expiry date, an optional credential identifier, optional associated skills, a featured flag, and a status of active or expired.
3. THE I18n_Store SHALL hold localized UI strings and localized content for the English and Indonesian Locales.
4. THE Content_Store SHALL define placeholder fields for email, LinkedIn URL, additional social links, and availability status.
5. WHEN a content value is updated in the Content_Store or I18n_Store, THE Build_System SHALL reflect the updated value in the generated output without markup changes.
