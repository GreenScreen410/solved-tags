import { contributionQuery, fetchContributionStats } from './content/api.js';
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

// Locate the controls by their option values across locales and Chakra class changes.
function findToolbar(stack) {
  const only = stack?.querySelector('select option[value="scoring"]')?.closest('[data-part="root"]');
  const sort = stack?.querySelector('select option[value="recent"]')?.closest('[data-part="root"]');
  const controls = sort?.parentElement;
  const template = sort?.querySelector('button[data-part="trigger"]');
  if (!only || !template || only.parentElement !== controls) return;
  let toolbar = controls;
  while (toolbar.parentElement !== stack) toolbar = toolbar.parentElement;
  return { controls, toolbar, template };
}

export default defineContentScript({
  matches: ['https://solved.ac/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  async main(ctx) {
    const cache = new Map();
    const observer = new MutationObserver(changes => {
      if (panel && changes.some(({ target }) => !panel.ui.root.contains(target) && !panel.ui.trigger.contains(target))) syncPage();
    });
    let enabled = (await browser.storage.local.get('enabled')).enabled !== false;
    let panel;

    function detachToolbar() {
      if (!panel?.mount) return;
      const { stack, toolbar, controls } = panel.mount;
      stack.removeAttribute('data-solved-tags-stack');
      toolbar.removeAttribute('data-solved-tags-toolbar');
      controls.removeAttribute('data-solved-tags-controls');
      panel.ui.destroy();
      panel.ui.root.remove();
      panel.mount = undefined;
    }

    function unmount() {
      observer.disconnect();
      panel?.request?.abort();
      if (panel?.mount) detachToolbar();
      else panel?.ui.destroy();
      panel = undefined;
    }

    function updateRoute() {
      const path = location.pathname;
      if (enabled && panel?.path === path) {
        syncPage();
        return;
      }
      unmount();
      if (/\/(?:login|logout)\/?$/.test(path)) cache.clear();
      const profile = enabled && profileFromPath(path);
      if (!profile) return;

      const { handle, locale } = profile;
      const current = {
        path, handle, titleLocale: locale || document.documentElement.lang,
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
      const { ui } = panel;
      const heading = panel.heading?.isConnected && panel.heading.matches(HEADING_SELECTOR)
        ? panel.heading : document.querySelector(HEADING_SELECTOR);
      const stack = heading?.nextElementSibling;
      if (panel.heading !== heading || panel.stack !== stack) {
        observer.disconnect();
        for (let ancestor = heading?.parentElement; ancestor; ancestor = ancestor.parentElement) {
          observer.observe(ancestor, { childList: true });
        }
        observer.observe(stack ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
        panel.heading = heading;
        panel.stack = stack;
      }

      const previous = panel.mount;
      if (!previous || previous.stack !== stack || previous.toolbar.parentElement !== stack ||
          !previous.toolbar.contains(previous.controls) || !previous.controls.contains(previous.template)) {
        const next = findToolbar(stack);
        if (previous) detachToolbar();
        if (next) {
          panel.mount = { ...next, stack };
          stack.setAttribute('data-solved-tags-stack', '');
          next.toolbar.setAttribute('data-solved-tags-toolbar', '');
          next.controls.setAttribute('data-solved-tags-controls', '');
          ui.trigger.className = next.template.className;
        }
      }
      const attachResults = panel.mount && panel.mount.toolbar.nextElementSibling !== ui.root;
      if (panel.mount) {
        const { controls, toolbar } = panel.mount;
        if (ui.trigger.parentElement !== controls) controls.append(ui.trigger);
        if (attachResults) toolbar.after(ui.root);
      }

      const locked = hasLoginPrompt(stack, panel.path);
      const query = contributionQuery(location.search);
      if (locked === panel.locked && query === panel.query) {
        // Moving an iframe restarts its document. Restore the current view if
        // the site replaced the toolbar or the stack during a route update.
        if (attachResults && !locked) {
          const cached = cache.get(panel.cacheKey);
          if (cached) ui.setData(cached);
          else if (ui.needsData && !panel.request) load(panel);
        }
        return;
      }
      panel.request?.abort();
      panel.request = undefined;
      panel.locked = locked;
      panel.query = query;
      panel.cacheKey = JSON.stringify([panel.handle.toLowerCase(), panel.titleLocale, query]);
      if (locked) {
        cache.clear();
        ui.setData(null);
        ui.setStatus('메타 태그를 보려면 solved.ac에 로그인해 주세요.', true);
        return;
      }
      ui.suspend();
      const cached = cache.get(panel.cacheKey);
      if (cached) ui.setData(cached);
      ui.setStatus(cached ? `조회 시각 ${clock.format(cached.timestamp)}` : '');
      if (!cached && ui.needsData && panel.mount) load(panel);
    }

    async function load(current) {
      if (panel !== current || current.locked || current.request || location.pathname !== current.path) return;
      const request = new AbortController();
      current.request = request;
      current.ui.prepare();
      current.ui.setStatus('기여 데이터를 불러오는 중…', true);

      try {
        const stats = await fetchContributionStats(current.handle, current.titleLocale, current.query, request.signal, (done, total) => {
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
          current.ui.cancelPrepare();
          current.ui.setStatus(error.message || '기여 데이터를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
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
