import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'studio',
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  server: { fs: { allow: [resolve(__dirname)] } },
  build: { outDir: '../dist', emptyOutDir: true },
});
