// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

// En GitHub Pages la web cuelga de /<repo>/ (BASE_URL lo pone el workflow).
// En su dominio propio va en la raíz.
const BASE = process.env.BASE_URL || '/';
const SITE = process.env.SITE_URL || 'https://example.com';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwind()] },
});
