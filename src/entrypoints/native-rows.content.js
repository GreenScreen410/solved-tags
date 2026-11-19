// Run solved.ac's own contribution list in a same-origin results frame.
// The website owns the row markup, CSS, translations, and tooltip behavior.
const FRAME_NAME = 'solved-tags-results';
const ROOT = 'data-solved-tags-frame';
const LAYOUT = 'data-solved-tags-layout';
const LIST = 'data-solved-tags-list';
const css = `
  html[data-solved-tags-frame], html[data-solved-tags-frame] body {
    margin: 0 !important;
    overflow: hidden !important;
  }
  html[data-solved-tags-frame]:not([data-solved-tags-ready]) body {
    visibility: hidden !important;
  }
  [data-solved-tags-layout] {
    display: block !important;
    position: static !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }
  [data-solved-tags-layout] > :not([data-solved-tags-layout], [data-solved-tags-list], style, script, head, [data-portal], [data-floating-ui-portal]) {
    display: none !important;
  }
  /* Chakra's tooltip portal can also be an unmarked direct child of body. */
  body[data-solved-tags-layout] > div:has([role="tooltip"]),
  body[data-solved-tags-layout] > div:has([data-scope="tooltip"][data-part="positioner"]) {
    display: block !important;
  }
`;

export default defineContentScript({
  matches: ['https://solved.ac/*/u/*/contributions*', 'https://solved.ac/u/*/contributions*'],
  allFrames: true,
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const route = /^\/(?:[a-z]{2}(?:-[a-z0-9]+)*\/)?u\/([^/]+)\/contributions\/?$/i.exec(location.pathname);
    if (!route || window === window.top || window.name !== FRAME_NAME ||
        location.hash !== '#' + FRAME_NAME || window.frameElement?.getAttribute('name') !== FRAME_NAME) return;
    const origin = location.origin;
    if (window.parent.location.origin !== origin) return;

    const endpoint = '/api/v4/users/' + encodeURIComponent(decodeURIComponent(route[1])) + '/contributions';
    const nativeFetch = window.fetch;
    const send = (type, fields) => window.parent.postMessage({ type: 'solved-tags:' + type, ...fields }, origin);
    let resolveItems;
    const ready = new Promise(resolve => { resolveItems = resolve; });
    let items;
    let served = false;
    let list;
    let lastHeight = 0;
    let failed = false;
    const marked = new Set();

    function reportHeight() {
      if (!list?.isConnected) return;
      const height = Math.ceil(list.getBoundingClientRect().height);
      if (height > 0 && height !== lastHeight) {
        lastHeight = height;
        send('rows-height', { height });
      }
    }

    const size = new ResizeObserver(reportHeight);
    const structure = new MutationObserver(syncList);
    function fail() {
      if (failed) return;
      failed = true;
      structure.disconnect();
      size.disconnect();
      document.documentElement?.removeAttribute('data-solved-tags-ready');
      resolveItems(null);
      send('rows-error');
    }
    let timeout = setTimeout(fail, 25000);

    window.fetch = async function(input, init) {
      const url = new URL(input instanceof Request ? input.url : input, location.href);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (method.toUpperCase() !== 'GET' || url.origin !== origin || url.pathname !== endpoint) {
        return nativeFetch.call(this, input, init);
      }
      const records = await ready;
      if (!records || failed) return new Response(null, { status: 503 });
      served = true;
      return Response.json({
        items: records,
        total: records.length,
        hiddenCount: 0,
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Math.max(1, records.length),
        sort: 'recent'
      });
    };

    function start() {
      const html = document.documentElement;
      html.setAttribute(ROOT, '');
      const style = document.createElement('style');
      style.textContent = css;
      (document.head || html).append(style);
      structure.observe(html, { childList: true, subtree: true });
      syncList();
    }

    function syncList(changes = []) {
      if (!served || !items || failed) return;
      if (list?.isConnected && !changes.some(change => list.contains(change.target))) return;

      // On the contributions route, the title is followed by a stack containing
      // the native controls, the list of rows, and optional pagination.
      const heading = document.querySelector('main > :not([aria-hidden="true"]) > :is(h1,h2)');
      const stack = heading?.nextElementSibling;
      for (const candidate of stack?.children ?? []) {
        const links = candidate.querySelectorAll('a[href*="/p/"][href$="/contributions"]');
        if (links.length !== items.length || !links.length) continue;
        const correct = items.every(({ problem }, index) => {
          const path = new URL(links[index].href).pathname;
          const id = encodeURIComponent(`${problem.problemId}${problem.subId ?? ''}`);
          return path.endsWith(`/p/${id}/contributions`);
        });
        if (!correct) continue;
        if (candidate === list) return;

        for (const element of marked) element.removeAttribute(LAYOUT);
        marked.clear();
        list?.removeAttribute(LIST);
        size.disconnect();
        list = candidate;
        list.setAttribute(LIST, '');
        for (let ancestor = list.parentElement; ancestor; ancestor = ancestor.parentElement) {
          marked.add(ancestor);
          ancestor.setAttribute(LAYOUT, '');
        }
        document.documentElement.setAttribute('data-solved-tags-ready', '');
        clearTimeout(timeout);
        size.observe(list);
        reportHeight();
        return;
      }
      if (list) {
        list.removeAttribute(LIST);
        list = null;
        lastHeight = 0;
        size.disconnect();
        document.documentElement.removeAttribute('data-solved-tags-ready');
        timeout = setTimeout(fail, 25000);
      }
    }

    // Router links should leave the embedded view. Preserve native modified-click
    // and keyboard behavior by letting the browser follow the original anchor.
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!list?.contains(link)) return;
      if (!link.target || link.target === '_self') link.target = '_parent';
      event.stopPropagation();
    }, true);
    window.addEventListener('message', function receive(event) {
      if (event.origin !== origin || event.source !== window.parent ||
          event.data?.type !== 'solved-tags:rows-data') return;
      const rows = event.data.items;
      if (!Array.isArray(rows) || !rows.length || !rows.every(row => Number.isInteger(row?.problem?.problemId))) {
        fail();
        return;
      }
      window.removeEventListener('message', receive);
      items = rows;
      resolveItems(items);
    });
    if (document.documentElement) start();
    else document.addEventListener('readystatechange', start, { once: true });
    send('rows-request');
  }
});
