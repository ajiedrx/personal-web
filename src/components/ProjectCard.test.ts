import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ProjectCard from './ProjectCard.astro';
import { validProjects } from '../lib/content';
import type { Project } from '../content/types';

// Structural tests for ProjectCard (Task 16.2).
//
// Validates: Requirements 12.4, 12.5, 12.7, 12.8
//
// Rendering strategy: ProjectCard is a presentation-only `.astro` component.
// Astro's `experimental_AstroContainer` renders it to an HTML string
// in-process, so we can assert on the *real* produced markup and its scoped
// `<style>` block. The base path (`/personal-web/`) is threaded through Vitest
// via vitest.config.ts, so `withBase(...)` resolves the same way it does in the
// deployed build — which makes the screenshot base-prefix assertion meaningful.

const LABELS = {
  repoLabel: 'View repository',
  demoLabel: 'View live demo',
  screenshotAlt: 'Screenshot of Todo KMP',
} as const;

/** A well-formed base project used as the starting point for each case. */
const BASE_PROJECT: Project = {
  title: 'Todo KMP',
  description: 'A Kotlin Multiplatform todo app sharing logic across platforms.',
  techStack: ['Kotlin', 'Compose', 'SQLDelight'],
  repoUrl: 'https://github.com/ajiedrx/todo-kmp',
};

/** Render a single ProjectCard to its HTML string. */
async function renderCard(project: Project): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ProjectCard, {
    props: {
      project,
      repoLabel: LABELS.repoLabel,
      demoLabel: LABELS.demoLabel,
      screenshotAlt: LABELS.screenshotAlt,
    },
  });
}

describe('ProjectCard rendered markup (container rendering)', () => {
  it('always renders the title, description, tech chips, and repository link (Req 12.3)', async () => {
    const html = await renderCard(BASE_PROJECT);

    expect(html).toContain(BASE_PROJECT.title);
    expect(html).toContain(BASE_PROJECT.description);
    for (const chip of BASE_PROJECT.techStack) {
      expect(html).toContain(chip);
    }
    // Repository link is always present and points at the repo URL.
    expect(html).toMatch(
      new RegExp(`<a[^>]*href="${BASE_PROJECT.repoUrl}"[^>]*>`, 'i'),
    );
  });

  describe('demo link is conditional (Req 12.7)', () => {
    it('omits the demo link when no demoUrl is provided', async () => {
      const html = await renderCard(BASE_PROJECT);

      expect(html).not.toContain(LABELS.demoLabel);
      expect(html).not.toContain('project-card__link--demo');
    });

    it('renders the demo link only when demoUrl is provided', async () => {
      const demoUrl = 'https://todo-kmp.example.com';
      const html = await renderCard({ ...BASE_PROJECT, demoUrl });

      expect(html).toContain(LABELS.demoLabel);
      expect(html).toContain('project-card__link--demo');
      // The demo link targets the provided demo URL.
      expect(html).toMatch(new RegExp(`<a[^>]*href="${demoUrl}"[^>]*>`, 'i'));
    });
  });

  describe('screenshot is conditional and base-prefixed (Req 12.8)', () => {
    it('omits the screenshot when none is provided', async () => {
      const html = await renderCard(BASE_PROJECT);

      expect(html).not.toContain('project-card__screenshot');
      expect(html).not.toMatch(/<img[^>]*>/i);
    });

    it('renders the screenshot base-prefixed when one is provided', async () => {
      const screenshot = 'assets/projects/todo-kmp.png';
      const html = await renderCard({ ...BASE_PROJECT, screenshot });

      // The image element renders with the localized alt text.
      const imgMatch = html.match(/<img[^>]*class="project-card__screenshot"[^>]*>/i);
      expect(imgMatch, 'expected a screenshot <img> element').not.toBeNull();
      expect(imgMatch![0]).toContain(`alt="${LABELS.screenshotAlt}"`);

      // The src is base-prefixed under /personal-web/ exactly once (Req 12.8).
      const srcMatch = imgMatch![0].match(/src="([^"]*)"/i);
      expect(srcMatch, 'expected a src attribute on the screenshot').not.toBeNull();
      const src = srcMatch![1];
      expect(src).toBe('/personal-web/assets/projects/todo-kmp.png');
      expect(src.match(/\/personal-web\//g)?.length ?? 0).toBe(1);
      expect(src.endsWith(screenshot)).toBe(true);
    });
  });

  it('defines a hover state that is visually distinct from the default (Req 12.5)', () => {
    // Astro's container renderer does not thread scoped `<style>` blocks into
    // the HTML string, so we assert the scoped-style contract against the
    // component's own `<style>` block read from source. This still verifies the
    // real rule the component ships (Req 12.5).
    const source = readFileSync(
      fileURLToPath(new URL('./ProjectCard.astro', import.meta.url)),
      'utf8',
    );
    const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/i);
    expect(styleMatch, 'expected a scoped <style> block').not.toBeNull();
    const css = styleMatch![1];

    // A distinct `:hover` rule must exist on the card.
    expect(css).toMatch(/\.project-card:hover/i);

    // The hover declaration block must differ from the default: extract the
    // `.project-card:hover { ... }` body and assert it declares at least one
    // visual change (transform / border / shadow) — i.e. it is not empty and
    // therefore visually distinct from the resting state.
    const hoverBody = css.match(/\.project-card:hover\s*\{([^}]*)\}/i);
    expect(hoverBody, 'expected a .project-card:hover rule body').not.toBeNull();
    const declarations = hoverBody![1].trim();
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations).toMatch(/transform|border-color|box-shadow/i);
  });
});

describe('valid projects render while invalid ones are omitted (Req 12.4)', () => {
  /** A mixed source list: some valid records, some missing required fields. */
  const mixed: Partial<Project>[] = [
    // Valid.
    {
      title: 'Todo KMP',
      description: 'Shared Kotlin Multiplatform todo app.',
      techStack: ['Kotlin', 'Compose'],
      repoUrl: 'https://github.com/ajiedrx/todo-kmp',
    },
    // Invalid: missing repository link.
    {
      title: 'No Repo',
      description: 'Missing the required repository link.',
      techStack: ['TypeScript'],
    },
    // Valid.
    {
      title: 'InstaApp',
      description: 'A photo sharing app with a modern feed.',
      techStack: ['Swift', 'SwiftUI'],
      repoUrl: 'https://github.com/ajiedrx/instaapp',
    },
    // Invalid: empty title.
    {
      title: '   ',
      description: 'Whitespace-only title should be rejected.',
      techStack: ['Go'],
      repoUrl: 'https://github.com/ajiedrx/blank',
    },
    // Invalid: too many tech chips (>10).
    {
      title: 'Too Many Chips',
      description: 'Eleven chips exceeds the allowed maximum.',
      techStack: Array.from({ length: 11 }, (_, i) => `t${i}`),
      repoUrl: 'https://github.com/ajiedrx/chips',
    },
  ];

  it('renders a card for each valid record and none for invalid ones', async () => {
    // Suppress the build-time warning emitted for omitted records.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const kept = validProjects(mixed);

      // Only the two valid records survive, in source order.
      expect(kept.map((p) => p.title)).toEqual(['Todo KMP', 'InstaApp']);

      // Every surviving record renders as a card.
      for (const project of kept) {
        const html = await renderCard(project);
        expect(html).toContain('class="project-card"');
        expect(html).toContain(project.title);
        expect(html).toMatch(
          new RegExp(`<a[^>]*href="${project.repoUrl}"[^>]*>`, 'i'),
        );
      }

      // The invalid records never appear among the kept set, so their titles
      // are not rendered by any card produced from `validProjects`.
      const renderedTitles = kept.map((p) => p.title);
      expect(renderedTitles).not.toContain('No Repo');
      expect(renderedTitles).not.toContain('Too Many Chips');
      expect(renderedTitles).not.toContain('   ');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
