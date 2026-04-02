import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';
import sentry from '@sentry/astro';

export default defineConfig({
  site: 'https://qr-code-generator-app.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    clerk(),
    react(),
    sitemap(),
    sentry({
      sourceMapsUploadOptions: {
        project: 'qrcraft',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: {
          name: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local-dev',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
