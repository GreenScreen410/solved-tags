import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const isFirefox = process.env.BROWSER === 'firefox';
const outDir = isFirefox ? 'dist-firefox' : 'dist';
const manifestFile = isFirefox ? 'src/manifest.firefox.json' : 'src/manifest.json';

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.js'),
        popup: resolve(__dirname, 'src/popup/popup.js'),
        background: resolve(__dirname, 'src/background/background.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    // 소스맵 생성 (디버깅용)
    sourcemap: process.env.NODE_ENV !== 'production',
    // esbuild로 최소화
    minify: 'esbuild',
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: manifestFile, dest: '', rename: 'manifest.json' },
        { src: 'src/popup/popup.html', dest: '' },
        { src: 'src/popup/popup.css', dest: '' },
        { src: 'src/content/content.css', dest: '', rename: 'content.css' },
        { src: 'src/assets/icons', dest: '' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
