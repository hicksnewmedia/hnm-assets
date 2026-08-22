import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Studio is the web root, but it imports the shared motion core and
// templates from ../src — the same files Remotion renders. fs.allow lets
// Vite reach outside the root to do that.
export default defineConfig({
  root: 'studio',
  plugins: [react()],
  server: { fs: { allow: [resolve(__dirname)] } },
  build: { outDir: '../dist', emptyOutDir: true },
});
