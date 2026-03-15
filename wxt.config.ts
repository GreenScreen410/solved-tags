import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'solved.tags',
    version: '1.3.0',
    description: 'solved.ac 기여 페이지에서 메타 태그를 표시합니다.',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://solved.ac/*'],
    icons: {
      16: 'icon16.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
    action: {
      default_icon: {
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'solved-tags@example.com',
        strict_min_version: '109.0',
      },
    },
  },
});
