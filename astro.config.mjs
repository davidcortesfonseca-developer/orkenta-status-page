import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://status.orkenta-ia.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
  },
});
