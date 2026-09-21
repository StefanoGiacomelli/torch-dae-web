import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const site = process.env.ASTRO_SITE_URL;
const base = process.env.ASTRO_BASE_PATH ?? '/';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  site,
  base,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
