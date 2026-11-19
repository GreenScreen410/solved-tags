// Until the frame paints, show the leading matches that are already on the
// current solved.ac page. Only problems with a single vote are unambiguous.
export function showPagePreview(native, problemIds) {
  if (!native || !problemIds[0]) return;
  const selector = 'a[href*="/p/"][href$="/contributions"]';
  for (const list of native.children) {
    if (list.matches('[data-solved-tags-toolbar], .solved-tags-panel')) continue;
    const links = list.querySelectorAll(selector);
    if (!links.length) continue;

    const rows = new Map();
    const allRows = new Set();
    for (const link of links) {
      const path = new URL(link.href).pathname;
      const id = path.split('/').at(-2);
      let row = link;
      while (row.parentElement !== list) row = row.parentElement;
      allRows.add(row);
      rows.set(id, row);
    }

    const visible = [];
    for (const id of problemIds) {
      const row = rows.get(id);
      if (!row) break;
      visible.push(row);
    }
    if (!visible.length) return;

    const separators = [...list.children].filter(node => !allRows.has(node));
    const marked = new Map();
    function mark(element, order) {
      marked.set(element, element.style.order);
      element.setAttribute('data-solved-tags-preview-row', '');
      element.style.order = String(order);
    }
    visible.forEach((row, index) => {
      mark(row, 2 * index);
      if (index && separators[index - 1]) mark(separators[index - 1], 2 * index - 1);
    });

    native.setAttribute('data-solved-tags-preview', '');
    list.setAttribute('data-solved-tags-preview-list', '');
    return () => {
      native.removeAttribute('data-solved-tags-preview');
      list.removeAttribute('data-solved-tags-preview-list');
      for (const [node, order] of marked) {
        node.removeAttribute('data-solved-tags-preview-row');
        node.style.order = order;
      }
    };
  }
}
