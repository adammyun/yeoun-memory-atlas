import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  return {
    root: resolve(root, 'github-pages'),
    base: '/yeoun-memory-atlas/',
    publicDir: resolve(root, 'public'),
    resolve: {
      alias: {
        '@': root,
        'next/link': resolve(root, 'github-pages/shims/next-link.tsx'),
        'next/image': resolve(root, 'github-pages/shims/next-image.tsx'),
        'next/navigation': resolve(root, 'github-pages/shims/next-navigation.ts'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.VITE_NAVER_MAPS_CLIENT_ID': JSON.stringify(
        env.VITE_NAVER_MAPS_CLIENT_ID ?? '',
      ),
    },
    plugins: [
      react(),
      {
        name: 'yeoun-pages-files',
        writeBundle(options) {
          const output = options.dir ?? resolve(root, 'dist-pages');
          mkdirSync(output, { recursive: true });
          writeFileSync(resolve(output, '.nojekyll'), '');
          copyFileSync(resolve(root, 'public/favicon.svg'), resolve(output, 'favicon.svg'));
        },
      },
    ],
    build: {
      outDir: resolve(root, 'dist-pages'),
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
