// Run solved.ac's own contribution list in a same-origin results frame.
// The website owns the row markup, CSS, translations, and tooltip behavior.
const FRAME_NAME = 'solved-tags-results';
const FIRST_ROWS = 6;
const ROOT = 'data-solved-tags-frame';
const LAYOUT = 'data-solved-tags-layout';
const LIST = 'data-solved-tags-list';
const VISIBLE = 'data-solved-tags-visible';
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
  [data-solved-tags-list] > :not([data-solved-tags-visible]) {
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
    let startFirstPage;
    const firstSelection = new Promise(resolve => { startFirstPage = resolve; });
    let catalog;
    let page = 0;
    let records = [];
    let served = false;
    let awaitingPaint = false;
    let list;
    let view = { ids: [], revision: -1 };
    let rowsById = new Map();
    let separators = [];
    let nativeOrder = [];
    const knownVoteIds = new WeakMap();
    let visible = new Set();
    let lastHeight = -1;
    let lastRevision = -1;
    let lastComplete;
    let displayedRevision = -1;
    let complete = false;
    let paintFrame;
    let expansionTimer;
    let failed = false;
    const marked = new Set();

    function reportHeight() {
      if (displayedRevision !== view.revision || (view.ids.length && !list?.isConnected)) return;
      const height = view.ids.length ? Math.ceil(list.getBoundingClientRect().height) : 0;
      if (height !== lastHeight || displayedRevision !== lastRevision || complete !== lastComplete) {
        lastHeight = height;
        lastRevision = displayedRevision;
        lastComplete = complete;
        send('rows-height', { height, revision: displayedRevision, complete });
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
      clearTimeout(timeout);
      cancelExpansion();
      startFirstPage();
      send('rows-error');
    }
    let timeout;

    window.fetch = async function(input, init) {
      const url = new URL(input instanceof Request ? input.url : input, location.href);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (method.toUpperCase() !== 'GET' || url.origin !== origin || url.pathname !== endpoint) {
        return nativeFetch.call(this, input, init);
      }
      await firstSelection;
      const requestedPage = Number(url.searchParams.get('page') || 1);
      if (failed || requestedPage !== page) return new Response(null, { status: 503 });
      served = true;
      return Response.json({
        items: records,
        total: records.length,
        hiddenCount: 0,
        page,
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

    function applyView(ids) {
      if (!list || failed) return;
      const order = [];
      for (const [index, id] of ids.entries()) {
        const row = rowsById.get(id);
        if (!row) return fail();
        if (index && separators.length) order.push(separators[index - 1]);
        order.push(row);
      }

      const next = new Set(order);
      for (const node of visible) {
        if (!next.has(node)) node.removeAttribute(VISIBLE);
      }
      for (const node of next) {
        if (!visible.has(node)) node.setAttribute(VISIBLE, '');
      }
      visible = next;

      // Native links and tooltip triggers keep their handlers. Move only the
      // out-of-order nodes so keyboard traversal follows the selected sort.
      let cursor = list.firstElementChild;
      for (const node of order) {
        while (cursor && !visible.has(cursor)) cursor = cursor.nextElementSibling;
        if (node === cursor) cursor = cursor.nextElementSibling;
        else list.insertBefore(node, cursor);
      }
      structure.takeRecords();
      displayedRevision = view.revision;
      complete = ids.length === view.ids.length;
      document.documentElement.setAttribute('data-solved-tags-ready', '');
      reportHeight();
    }

    function cancelExpansion() {
      cancelAnimationFrame(paintFrame);
      clearTimeout(expansionTimer);
      expansionTimer = undefined;
    }

    function expandAfterPaint() {
      if (expansionTimer !== undefined) return;
      const expand = () => {
        cancelExpansion();
        requestPage(view.ids, true);
      };
      // Keep the preview usable before asking React for the full slice.
      // An off-screen document may not receive animation frames.
      expansionTimer = setTimeout(expand, 100);
      paintFrame = requestAnimationFrame(() => {
        clearTimeout(expansionTimer);
        expansionTimer = setTimeout(expand, 0);
      });
    }

    // A unique native page requests another slice without reloading the app.
    // Serialize route changes so late network/React work cannot win a race.
    function requestPage(ids, keepPreview) {
      if (awaitingPaint || failed || !ids.length) return;
      records = ids.map(id => catalog.get(id));
      if (records.includes(undefined) || page >= 10000) return fail();

      if (list?.isConnected) {
        // Preserve the displayed preview order while putting React's children
        // back in their original sequence for its next keyed reconciliation.
        let order = 0;
        for (const child of visible) child.style.order = String(order++);
        let cursor = list.firstElementChild;
        for (const child of nativeOrder) {
          if (child === cursor) cursor = cursor.nextElementSibling;
          else list.insertBefore(child, cursor);
        }
        structure.takeRecords();
      }
      if (!keepPreview) document.documentElement.removeAttribute('data-solved-tags-ready');
      awaitingPaint = true;
      served = false;
      timeout ??= setTimeout(fail, 25000);
      page++;
      if (page === 1) {
        startFirstPage();
      } else {
        const url = new URL(location.href);
        url.searchParams.set('page', String(page));
        history.replaceState(history.state, '', url);
        window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      }
    }

    function updateView() {
      if (failed) return;
      if (!view.ids.length) {
        cancelExpansion();
        clearTimeout(timeout);
        timeout = undefined;
        displayedRevision = view.revision;
        complete = true;
        if (list && !awaitingPaint) applyView([]);
        else reportHeight();
        return;
      }
      if (!catalog) return;
      if (awaitingPaint) {
        timeout ??= setTimeout(fail, 25000);
        return;
      }

      let count = 0;
      if (list?.isConnected) {
        while (count < view.ids.length && rowsById.has(view.ids[count])) count++;
      }
      if (count) {
        applyView(view.ids.slice(0, count));
        if (count < view.ids.length) expandAfterPaint();
      } else {
        requestPage(view.ids.slice(0, FIRST_ROWS), false);
      }
    }

    function setView(data) {
      if (!Array.isArray(data.ids) || !Number.isSafeInteger(data.revision) ||
          data.revision <= view.revision) return;
      cancelExpansion();
      view = { ids: data.ids, revision: data.revision };
      if (awaitingPaint) document.documentElement.removeAttribute('data-solved-tags-ready');
      updateView();
    }

    function indexRows(candidate) {
      const links = candidate.querySelectorAll('a[href*="/p/"][href$="/contributions"]');
      if (!records.length || links.length !== records.length) return null;
      const rows = new Map();
      for (let i = 0; i < records.length; i++) {
        const { problem, voteId, vote } = records[i];
        const suffix = encodeURIComponent(`${problem.problemId}${problem.subId ?? ''}`);
        if (!new URL(links[i].href).pathname.endsWith(`/p/${suffix}/contributions`)) return null;

        let row = links[i];
        while (row.parentElement !== candidate) row = row.parentElement;
        const id = voteId ?? vote.id;
        // A previous query can be shown while the next vote on the same
        // problem is loading. The site's row keys are vote IDs.
        if (knownVoteIds.has(row) && knownVoteIds.get(row) !== id) return null;
        rows.set(id, row);
      }
      if (rows.size !== records.length) return null;
      const rowElements = new Set(rows.values());
      if (rowElements.size !== rows.size) return null;
      const dividers = [...candidate.children].filter(node => !rowElements.has(node));
      if (dividers.length !== 0 && dividers.length !== rows.size - 1) return null;
      return { rows, dividers };
    }

    function syncList(changes = []) {
      if (!served || failed) return;
      if (list?.isConnected && !changes.some(change => change.target === list)) return;

      // The native list and the controls are direct children of the stack
      // following the route title. Ignore controls and the initial skeleton.
      const heading = document.querySelector('main > :not([aria-hidden="true"]) > :is(h1,h2)');
      const stack = heading?.nextElementSibling;
      for (const candidate of stack?.children ?? []) {
        const index = indexRows(candidate);
        if (!index) continue;
        for (const element of marked) element.removeAttribute(LAYOUT);
        marked.clear();
        list?.removeAttribute(LIST);
        size.disconnect();
        list = candidate;
        rowsById = index.rows;
        separators = index.dividers;
        nativeOrder = [...candidate.children];
        for (const [id, row] of rowsById) knownVoteIds.set(row, id);
        for (const node of visible) {
          node.removeAttribute(VISIBLE);
          node.style.removeProperty('order');
        }
        visible.clear();
        list.setAttribute(LIST, '');
        for (let ancestor = list.parentElement; ancestor; ancestor = ancestor.parentElement) {
          marked.add(ancestor);
          ancestor.setAttribute(LAYOUT, '');
        }
        clearTimeout(timeout);
        timeout = undefined;
        awaitingPaint = false;
        size.observe(list);
        updateView();
        return;
      }
      // Keep the verified preview while the native router still shows its
      // previous list. New children remain hidden until their keys match.
      if (awaitingPaint && list?.isConnected) return;
      if (list) {
        list.removeAttribute(LIST);
        list = null;
        lastHeight = -1;
        size.disconnect();
        document.documentElement.removeAttribute('data-solved-tags-ready');
        awaitingPaint = true;
        if (view.ids.length && !timeout) timeout = setTimeout(fail, 25000);
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
    window.addEventListener('message', event => {
      if (event.origin !== origin || event.source !== window.parent || failed) return;
      const data = event.data;
      if (data?.type === 'solved-tags:rows-view') {
        setView(data);
      } else if (data?.type === 'solved-tags:rows-data' && !catalog) {
        const rows = data.items;
        if (!Array.isArray(rows) || !rows.length || !rows.every(row =>
          Number.isInteger(row?.problem?.problemId) && Number.isInteger(row.voteId ?? row.vote?.id))) {
          return fail();
        }
        catalog = new Map(rows.map(row => [row.voteId ?? row.vote.id, row]));
        send('rows-ready');
        if (data.revision > view.revision) setView(data);
        else updateView();
      }
    });
    if (document.documentElement) start();
    else document.addEventListener('readystatechange', start, { once: true });
    send('rows-request');
  }
});
