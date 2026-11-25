import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined;

export default defineConfig({
  site: site?.href,
  base: site?.pathname === '/' ? undefined : site?.pathname,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
