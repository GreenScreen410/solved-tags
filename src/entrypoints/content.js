import { fetchContributionStats } from './content/api.js';
import { createFilterBar } from './content/ui/filterBar.js';
import { exportAsJSON, exportAsCSV } from '@/utils/export.js';
import './content/content.css';

const CONTRIBUTIONS_ROUTE = /^\/(?:(?<locale>[a-z]{2}(?:-[a-z0-9]+)*)\/)?u\/(?<handle>[^/]+)\/contributions\/?$/i;
const HEADING_SELECTOR = 'main > :not([aria-hidden="true"]) > :is(h1, h2)';
const clock = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' });

function profileFromPath(pathname) {
  const match = CONTRIBUTIONS_ROUTE.exec(pathname);
  if (!match) return null;
  try {
    return { locale: match.groups.locale ?? '', handle: decodeURIComponent(match.groups.handle) };
  } catch {
    return null;
  }
}

function hasLoginPrompt(nativeContent, path) {
  const loginLinks = nativeContent?.querySelectorAll('a[href*="/login?"]') ?? [];
  for (const link of loginLinks) {
    const url = new URL(link.href);
    const redirect = url.searchParams.get('redirect');
    const target = redirect?.split(/[?#]/, 1)[0];
    if (url.origin === location.origin && /\/login\/?$/.test(url.pathname) &&
        (target === path || target === location.origin + path)) return true;
  }
  return false;
}

export default defineContentScript({
  matches: ['https://solved.ac/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  async main(ctx) {
    const cache = new Map();
    const observer = new MutationObserver(syncPage);
    let enabled = (await browser.storage.local.get('enabled')).enabled !== false;
    let panel;

    function unmount() {
      observer.disconnect();
      panel?.request?.abort();
      panel?.ui.destroy();
      panel?.ui.root.remove();
      panel = undefined;
    }

    function updateRoute() {
      const path = location.pathname;
      if (enabled && panel?.path === path) return;
      unmount();
      if (/\/(?:login|logout)\/?$/.test(path)) cache.clear();
      const profile = enabled && profileFromPath(path);
      if (!profile) return;

      const { handle, locale } = profile;
      const titleLocale = locale || document.documentElement.lang;
      const current = {
        path, handle, titleLocale,
        cacheKey: JSON.stringify([handle.toLowerCase(), titleLocale]),
        ui: createFilterBar({
          onLoad: () => load(current),
          onExport: (format, problems) => {
            const exportFile = format === 'csv' ? exportAsCSV : exportAsJSON;
            exportFile(problems, handle);
          }
        })
      };
      panel = current;
      syncPage();
    }

    function syncPage() {
      if (!panel) return;
      if (panel.path !== location.pathname) {
        updateRoute();
        return;
      }
      const heading = panel.heading?.isConnected ? panel.heading : document.querySelector(HEADING_SELECTOR);
      if (!heading) {
        if (panel.heading !== null) {
          observer.disconnect();
          observer.observe(document.body, { childList: true, subtree: true });
          panel.heading = null;
        }
        return;
      }

      const { ui } = panel;
      if (heading.nextElementSibling !== ui.root) heading.after(ui.root);
      const native = ui.root.nextElementSibling;
      if (panel.heading !== heading || panel.native !== native) {
        observer.disconnect();
        // Watch direct replacements along the route layout and login changes inside the native list.
        // The extension's own result rows are outside the observed subtrees.
        for (let ancestor = heading.parentElement; ancestor; ancestor = ancestor.parentElement) {
          observer.observe(ancestor, { childList: true });
        }
        if (native) observer.observe(native, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['href']
        });
        panel.heading = heading;
        panel.native = native;
      }

      const locked = hasLoginPrompt(native, panel.path);
      if (locked === panel.locked) return;
      panel.locked = locked;
      if (locked) {
        panel.request?.abort();
        panel.request = undefined;
        cache.clear();
        ui.setData(null);
        ui.setStatus('메타 태그를 보려면 solved.ac에 로그인해 주세요.', true);
      } else {
        const cached = cache.get(panel.cacheKey);
        ui.setData(cached ?? null);
        ui.setStatus(cached ? `조회 시각 ${clock.format(cached.timestamp)}` : '');
      }
    }

    async function load(current) {
      if (panel !== current || current.locked || current.request || location.pathname !== current.path) return;
      const request = new AbortController();
      current.request = request;
      current.ui.setStatus('기여 데이터를 불러오는 중…', true);

      try {
        const stats = await fetchContributionStats(current.handle, current.titleLocale, request.signal, (done, total) => {
          if (!request.signal.aborted && done < total) {
            current.ui.setStatus(`기여 데이터를 불러오는 중… ${done} / ${total}페이지`, true);
          }
        });
        if (request.signal.aborted || location.pathname !== current.path) return;
        const data = { ...stats, timestamp: Date.now() };
        cache.set(current.cacheKey, data);
        current.ui.setData(data);
        current.ui.setStatus(`조회 시각 ${clock.format(data.timestamp)}`);
      } catch (error) {
        if (!request.signal.aborted && location.pathname === current.path) {
          current.ui.setStatus(error.message || '기여 데이터를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        // A failed page can leave other requests in the same batch in flight.
        request.abort();
        if (current.request === request) current.request = undefined;
      }
    }

    if (window.navigation) {
      ctx.addEventListener(window.navigation, 'currententrychange', updateRoute);
    } else {
      ctx.addEventListener(window, 'wxt:locationchange', updateRoute);
    }
    const onSettingsChanged = (changes, area) => {
      if (area !== 'local' || !changes.enabled) return;
      enabled = changes.enabled.newValue !== false;
      updateRoute();
    };
    browser.storage.onChanged.addListener(onSettingsChanged);
    ctx.onInvalidated(() => {
      browser.storage.onChanged.removeListener(onSettingsChanged);
      unmount();
    });
    updateRoute();
  }
});
