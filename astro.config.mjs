import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://qr-code-generator-app.com',
  output: 'static',
  adapter: vercel(),
  integrations: [clerk(), react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
