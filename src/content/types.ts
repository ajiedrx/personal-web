// Typed content model for the personal portfolio site.
// Content JSON files in src/content/ conform to these interfaces; the loader
// validates them at render time (Req 22.1, 22.2, 22.4).

// ---- Profile / contact / availability (Req 9, 15, 22.4) ----
export interface Profile {
  name: string; // owner name (Req 8.1, 16.1)
  role: string; // "Full-Stack Mobile Engineer"
  location: string; // "Surabaya, Indonesia" (Req 9.2)
  availability: string; // availability status (Req 9.3, 22.4)
  contact: ContactInfo;
}

export interface ContactInfo {
  email: string; // may be placeholder (Req 15.4, 22.4)
  linkedin: string; // URL, may be placeholder (Req 22.4)
  github: string; // "https://github.com/ajiedrx" (Req 15.2)
  socials?: SocialLink[]; // optional additional socials (Req 15.1, 22.4)
}

export interface SocialLink {
  label: string;
  url: string;
  isPlaceholder?: boolean;
}

// ---- Skills (Req 10) ----
export type SkillCategory = 'core-mobile' | 'full-stack' | 'modern-tech' | 'quality';

export interface SkillGroup {
  category: SkillCategory; // one of the four fixed categories (Req 10.1)
  labelKey: string; // localized category label
  skills: string[]; // entries shown within the group (Req 10.2, 10.3)
}

// ---- Experience timeline (Req 11) ----
export interface ExperienceEntry {
  role: string;
  organization: string;
  startDate: string; // ISO 'YYYY-MM' for sorting (Req 11.3)
  endDate: string | null; // null => "Present"
  highlights: string[]; // localized via keys where applicable (Req 11.2)
}

// ---- Featured projects (Req 12) ----
export interface Project {
  title: string; // required (Req 12.3, 12.4)
  description: string; // "selling" description; required (Req 12.3, 12.4)
  techStack: string[]; // 1..10 chips; required (Req 12.3, 12.4)
  repoUrl: string; // required (Req 12.3, 12.4)
  demoUrl?: string; // optional (Req 12.7)
  screenshot?: string; // optional asset path (Req 12.8)
}

// ---- Impact highlights (Req 13) ----
export interface ImpactItem {
  value: number; // final numeric value (Req 13.2)
  suffix?: string; // '%', '+', etc.
  labelKey: string; // localized unit/label (Req 13.4)
}

// ---- Mentorship & education (Req 14) ----
export interface MentorshipEntry {
  title: string;
  organization: string;
  date: string;
} // (Req 14.1, 14.3)

export interface EducationEntry {
  title: string;
  organization: string;
  year: string;
} // (Req 14.2, 14.3)

// ---- Certification (Req 14.4-14.7, 22.2) ----
export type CertStatus = 'active' | 'expired';

export interface CertificationEntry {
  title: string; // (Req 14.5)
  issuer: string; // issuing organization (Req 14.5)
  issuedDate: string; // ISO 'YYYY-MM' or 'YYYY'; year shown by default (Req 14.5)
  expiryDate?: string; // optional; hidden unless explicitly enabled (Req 14.6)
  credentialId?: string; // optional; hidden unless explicitly enabled (Req 14.6)
  skills?: string[]; // optional associated skills (Req 22.2)
  featured: boolean; // only featured render (Req 14.4)
  status: CertStatus; // active | expired; both render if featured (Req 14.7)
  showDetails?: boolean; // Content_Store opt-in to show expiry/credentialId (Req 14.6)
}
