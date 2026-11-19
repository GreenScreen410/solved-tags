// Each batch lives in its own solved.ac document so its real contribution rows
// keep their own renderer, styles, event handlers and tooltip portals.
export function createNativeResults(container) {
  const frames = new Map();

  function receive(event) {
    if (event.origin !== location.origin || !event.data) return;
    const batch = frames.get(event.source);
    if (!batch) return;

    if (event.data.type === 'solved-tags:rows-request') {
      event.source.postMessage({ type: 'solved-tags:rows-data', items: batch.items }, event.origin);
    } else if (event.data.type === 'solved-tags:rows-height') {
      const height = event.data.height;
      if (!Number.isFinite(height) || height <= 0) return;
      clearTimeout(batch.timeout);
      batch.frame.style.height = `${Math.ceil(height)}px`;
      batch.frame.style.visibility = 'visible';
      batch.status.remove();
      if (batch.focus) {
        batch.frame.focus();
        batch.focus = false;
      }
    } else if (event.data.type === 'solved-tags:rows-error') {
      batch.fail();
    }
  }

  function load(wrapper, items, focus) {
    const frame = document.createElement('iframe');
    frame.name = 'solved-tags-results';
    frame.title = '필터링한 solved.ac 기여 목록';
    frame.style.height = '0';
    frame.style.visibility = 'hidden';
    const page = new URL(location.pathname, location.origin);
    page.hash = 'solved-tags-results';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = '기여 목록을 표시하는 중…';
    wrapper.replaceChildren(status, frame);

    const source = frame.contentWindow;
    const batch = { items, frame, status, focus, fail };

    function fail() {
      clearTimeout(batch.timeout);
      frames.delete(source);
      frame.remove();
      status.textContent = 'solved.ac 기여 목록을 표시하지 못했습니다.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '다시 시도';
      retry.addEventListener('click', () => load(wrapper, items, focus), { once: true });
      status.append(retry);
      wrapper.replaceChildren(status);
    }

    frames.set(source, batch);
    batch.timeout = setTimeout(batch.fail, 30000);
    // Establish the browsing context and message receiver before document_start runs.
    setTimeout(() => {
      if (frames.has(source)) frame.src = page.href;
    }, 0);
  }

  return {
    append(items, focus) {
      window.addEventListener('message', receive);
      const wrapper = document.createElement('div');
      container.append(wrapper);
      load(wrapper, items, focus);
    },
    clear() {
      window.removeEventListener('message', receive);
      for (const batch of frames.values()) clearTimeout(batch.timeout);
      frames.clear();
      container.replaceChildren();
    }
  };
}
