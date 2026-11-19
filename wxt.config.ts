import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output-v4',
  zip: { excludeSources: ['_backup/**'] },
  manifest: ({ browser }) => ({
    ...(browser === 'chrome' && { minimum_chrome_version: '111', permissions: ['scripting'] }),
    name: 'solved.tags',
    description: 'solved.ac 기여 페이지에서 메타 태그를 표시합니다.',
    host_permissions: ['https://solved.ac/*'],
    icons: {
      16: 'icon16.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'solved-tags@example.com',
        strict_min_version: '128.0',
      },
    },
  }),
});
