/**
 * Navbar.ts — client-side behavior for the site navbar.
 *
 * Loaded from `Navbar.astro` via a `<script>` (bundled/hydrated by Astro, which
 * effectively runs it after the module graph is ready — the design specifies
 * scroll-spy hydrates `client:idle`; a deferred module script is equivalent for
 * this non-critical enhancement).
 *
 * Responsibilities:
 *  - Scroll-spy: an IntersectionObserver marks the in-view section's link active
 *    (`aria-current="location"` + `.is-active`). (Req 4.3)
 *  - Smooth scroll on click, instant (`auto`) under `prefers-reduced-motion`.
 *    (Req 4.2, 4.5)
 *  - Sticky/reveal-on-scroll: the navbar hides when scrolling down and reveals
 *    when scrolling up (and is always shown near the top). (Req 4.4)
 *  - Mobile menu toggle (hamburger), keyboard operable, with Escape-to-close and
 *    focus/`aria-expanded` management. (Req 21.3)
 *
 * The markup contract (data attributes / classes) is produced by `Navbar.astro`.
 */

/** Attribute/selector contract shared with Navbar.astro. */
const SELECTORS = {
  root: '[data-navbar]',
  link: '[data-nav-link]',
  menuToggle: '[data-nav-toggle]',
  menu: '[data-nav-menu]',
} as const;

const CLASS = {
  active: 'is-active',
  hidden: 'is-hidden',
  scrolled: 'is-scrolled',
  menuOpen: 'is-menu-open',
} as const;

/** True when the user has requested reduced motion (Req 4.5). */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Resolve the scroll behavior to use for anchor navigation: `auto` (instant)
 * under reduced motion, otherwise `smooth`. Exported for unit testing (Task 11.2).
 */
export function scrollBehaviorFor(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? 'auto' : 'smooth';
}

/** The section id referenced by a nav link's `href` (the part after `#`). */
function targetIdFromLink(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute('href') ?? '';
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) return null;
  const id = href.slice(hashIndex + 1);
  return id.length > 0 ? id : null;
}

/**
 * Wire smooth/instant in-page scrolling for a set of nav links. Clicking a link
 * scrolls its target section into view and updates the URL hash without a jump.
 */
function wireSmoothScroll(
  links: HTMLAnchorElement[],
  onNavigate: () => void,
): void {
  for (const link of links) {
    const id = targetIdFromLink(link);
    if (!id) continue;

    link.addEventListener('click', (event) => {
      const target = document.getElementById(id);
      if (!target) return; // let the browser handle it if the section is absent

      event.preventDefault();
      target.scrollIntoView({
        behavior: scrollBehaviorFor(prefersReducedMotion()),
        block: 'start',
      });

      // Keep the URL hash in sync without triggering the default jump.
      history.replaceState(null, '', `#${id}`);

      // Move focus to the target for keyboard/AT users without scrolling again.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });

      onNavigate();
    });
  }
}

/**
 * Scroll-spy: highlight the nav link whose section is currently in view (Req 4.3).
 * Returns a teardown function.
 */
function wireScrollSpy(links: HTMLAnchorElement[]): () => void {
  const linkById = new Map<string, HTMLAnchorElement>();
  const sections: HTMLElement[] = [];

  for (const link of links) {
    const id = targetIdFromLink(link);
    if (!id) continue;
    const section = document.getElementById(id);
    if (!section) continue;
    linkById.set(id, link);
    sections.push(section);
  }

  if (sections.length === 0) return () => {};

  const visibility = new Map<string, number>();

  const setActive = (id: string | null): void => {
    for (const [linkId, link] of linkById) {
      const isActive = linkId === id;
      link.classList.toggle(CLASS.active, isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      // The most-visible intersecting section wins.
      let bestId: string | null = null;
      let bestRatio = 0;
      for (const [id, ratio] of visibility) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (bestId) setActive(bestId);
    },
    {
      // A section counts as "in view" once it occupies the vertical middle band,
      // which keeps the active link stable while scrolling.
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0, 0.01, 0.25, 0.5, 1],
    },
  );

  for (const section of sections) observer.observe(section);

  return () => observer.disconnect();
}

/**
 * Sticky/reveal-on-scroll: hide the navbar when scrolling down past a threshold,
 * reveal it when scrolling up, and always show it near the top (Req 4.4).
 * Returns a teardown function.
 */
function wireStickyReveal(root: HTMLElement): () => void {
  const REVEAL_THRESHOLD = 8; // px of movement before reacting to jitter
  const TOP_ZONE = 80; // px; always show the navbar this close to the top
  let lastY = window.scrollY;
  let ticking = false;

  const update = (): void => {
    const y = window.scrollY;
    const delta = y - lastY;

    root.classList.toggle(CLASS.scrolled, y > TOP_ZONE);

    if (y <= TOP_ZONE) {
      root.classList.remove(CLASS.hidden);
    } else if (Math.abs(delta) > REVEAL_THRESHOLD) {
      // Scrolling down hides; scrolling up reveals.
      root.classList.toggle(CLASS.hidden, delta > 0);
    }

    lastY = y;
    ticking = false;
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => window.removeEventListener('scroll', onScroll);
}

/**
 * Mobile menu (hamburger) toggle. Keyboard operable via the native <button>,
 * closes on Escape, on link activation, and when resizing up to desktop
 * (Req 21.3). Returns a teardown function.
 */
function wireMobileMenu(
  root: HTMLElement,
  toggle: HTMLButtonElement,
  menu: HTMLElement,
  links: HTMLAnchorElement[],
): { close: () => void; teardown: () => void } {
  const openLabel = toggle.getAttribute('data-label-open') ?? 'Open menu';
  const closeLabel = toggle.getAttribute('data-label-close') ?? 'Close menu';

  const setOpen = (open: boolean): void => {
    root.classList.toggle(CLASS.menuOpen, open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? closeLabel : openLabel);
    menu.toggleAttribute('data-open', open);
  };

  const close = (): void => setOpen(false);

  const onToggleClick = (): void => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!isOpen);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close();
      toggle.focus();
    }
  };

  const desktopQuery = window.matchMedia('(min-width: 48rem)');
  const onDesktopChange = (event: MediaQueryListEvent): void => {
    if (event.matches) close();
  };

  toggle.addEventListener('click', onToggleClick);
  document.addEventListener('keydown', onKeydown);
  for (const link of links) link.addEventListener('click', close);
  desktopQuery.addEventListener('change', onDesktopChange);

  setOpen(false);

  return {
    close,
    teardown: () => {
      toggle.removeEventListener('click', onToggleClick);
      document.removeEventListener('keydown', onKeydown);
      for (const link of links) link.removeEventListener('click', close);
      desktopQuery.removeEventListener('change', onDesktopChange);
    },
  };
}

/** Initialize the navbar behavior. Idempotent: safe to call once per navbar. */
export function initNavbar(root: HTMLElement): () => void {
  if (root.dataset.navbarReady === 'true') return () => {};
  root.dataset.navbarReady = 'true';

  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(SELECTORS.link),
  );
  const toggle = root.querySelector<HTMLButtonElement>(SELECTORS.menuToggle);
  const menu = root.querySelector<HTMLElement>(SELECTORS.menu);

  const mobile =
    toggle && menu ? wireMobileMenu(root, toggle, menu, links) : null;

  wireSmoothScroll(links, () => mobile?.close());
  const teardownSpy = wireScrollSpy(links);
  const teardownSticky = wireStickyReveal(root);

  return () => {
    teardownSpy();
    teardownSticky();
    mobile?.teardown();
    delete root.dataset.navbarReady;
  };
}

/** Auto-initialize every navbar on the page (browser only). */
export function bootstrapNavbars(): void {
  const roots = document.querySelectorAll<HTMLElement>(SELECTORS.root);
  roots.forEach((root) => initNavbar(root));
}

// Run in the browser. In test/SSR environments `document` is guarded by callers.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapNavbars, { once: true });
  } else {
    bootstrapNavbars();
  }
}
