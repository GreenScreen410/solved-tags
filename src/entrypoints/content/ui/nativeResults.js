import { showPagePreview } from './pagePreview.js';

// The site's renderer starts alongside the API request. Each filter or sort
// sends a new view to that document; late paints belong to an older revision.
export function createNativeResults(container) {
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.hidden = true;
  container.append(status);

  let frame;
  let items;
  let ids = [];
  let revision = 0;
  let requested = false;
  let sent = false;
  let failed = false;
  let focusFrame = false;
  let timeout;
  let statusTimer;
  let restorePreview;

  function clearPreview() {
    restorePreview?.();
    restorePreview = undefined;
  }

  function disconnect() {
    clearTimeout(timeout);
    clearTimeout(statusTimer);
    window.removeEventListener('message', receive);
    frame?.remove();
    frame = undefined;
    requested = sent = false;
    clearPreview();
  }

  function fail() {
    disconnect();
    failed = true;
    status.hidden = !ids.length;
    status.textContent = 'solved.ac 기여 목록을 표시하지 못했습니다.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '다시 시도';
    retry.addEventListener('click', prepare, { once: true });
    status.append(retry);
  }

  function waitForView() {
    clearTimeout(timeout);
    clearTimeout(statusTimer);
    status.hidden = true;
    if (!ids.length) return;
    timeout = setTimeout(fail, 30000);
    statusTimer = setTimeout(() => {
      status.textContent = '필터를 적용하는 중…';
      status.hidden = false;
    }, 180);
  }

  function sendData() {
    if (!items || !requested || sent) return;
    sent = true;
    frame.contentWindow.postMessage({ type: 'solved-tags:rows-data', items, ids, revision }, location.origin);
  }

  function receive(event) {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    switch (event.data?.type) {
      case 'solved-tags:rows-request':
        requested = true;
        sendData();
        break;
      case 'solved-tags:rows-height': {
        const height = event.data.height;
        if (event.data.revision !== revision || !Number.isFinite(height) || height < 0 ||
            (ids.length && !height)) return;
        clearTimeout(timeout);
        clearTimeout(statusTimer);
        status.hidden = true;
        clearPreview();
        frame.style.height = `${Math.ceil(height)}px`;
        frame.style.visibility = ids.length && height ? 'visible' : 'hidden';
        if (focusFrame && ids.length && height) {
          focusFrame = false;
          frame.focus();
        }
        break;
      }
      case 'solved-tags:rows-error':
        fail();
        break;
    }
  }

  function prepare() {
    if (frame) return;
    failed = false;
    frame = document.createElement('iframe');
    frame.name = 'solved-tags-results';
    frame.title = '필터링한 solved.ac 기여 목록';
    frame.style.height = '0';
    frame.style.visibility = 'hidden';
    window.addEventListener('message', receive);
    container.append(frame);
    const current = frame;
    // Register the browsing context before the frame's document_start script runs.
    setTimeout(() => {
      if (frame === current) frame.src = location.pathname + '#solved-tags-results';
    }, 0);
    waitForView();
  }

  function clear() {
    disconnect();
    items = undefined;
    ids = [];
    failed = focusFrame = false;
    container.removeAttribute('data-active');
    status.hidden = true;
  }

  return {
    prepare,
    clear,
    setItems(next) {
      if (!next.length) {
        clear();
        return;
      }
      if (sent) disconnect();
      items = next;
      ids = [];
      if (!frame) prepare();
      sendData();
    },
    show(nextIds, previewIds, focus) {
      clearPreview();
      ids = nextIds;
      revision++;
      focusFrame = focus;
      container.toggleAttribute('data-active', !!ids.length);
      if (!focus && frame) {
        frame.style.height = '0';
        frame.style.visibility = 'hidden';
        restorePreview = showPagePreview(container.closest('[data-solved-tags-stack]'), previewIds);
      }
      if (failed && ids.length) prepare();
      waitForView();
      if (sent) {
        frame.contentWindow.postMessage({ type: 'solved-tags:rows-view', ids, revision }, location.origin);
      }
    }
  };
}
