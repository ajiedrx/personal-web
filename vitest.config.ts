/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

// Mirror the deployed base path (`base: '/personal-web'` in astro.config.mjs)
// so `import.meta.env.BASE_URL` resolves the same way under Vitest as in the
// build. Astro's `getViteConfig` does not thread the `base` config through to
// the test environment, so base-path helpers (`withBase` / `localePath`) and
// the SEO builders that depend on them would otherwise see `/` instead of the
// real `/personal-web/` prefix, making base-path assertions meaningless.
export default getViteConfig({
  base: '/personal-web/',
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
