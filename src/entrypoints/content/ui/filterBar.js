import { META_TAGS } from '@/utils/constants.js';
import { SORT_OPTIONS, filterProblems } from './filter.js';
import { createNativeResults } from './nativeResults.js';

const RESULT_BATCH_SIZE = 40;
const numbers = new Intl.NumberFormat('ko-KR');
const SORT_CHOICES = [
  [SORT_OPTIONS.ORDER, '기본 정렬'],
  [SORT_OPTIONS.PROBLEM_ID_ASC, '문제 번호 오름차순'],
  [SORT_OPTIONS.PROBLEM_ID_DESC, '문제 번호 내림차순'],
  [SORT_OPTIONS.LEVEL_ASC, '낮은 난이도 순'],
  [SORT_OPTIONS.LEVEL_DESC, '높은 난이도 순']
];

export function createFilterBar({ onLoad, onExport }) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.dataset.solvedTagsTrigger = '';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'solved-tags-options');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span data-trigger-label>메타 태그</span><svg class="solved-tags-caret" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
  const triggerLabel = trigger.firstElementChild;
  const root = document.createElement('div');
  root.className = 'solved-tags-panel';
  root.innerHTML = `
    <div id="solved-tags-options" class="solved-tags-menu" role="dialog" aria-label="메타 태그 필터" tabindex="-1" hidden>
      <div data-controls hidden>
        <div class="solved-tags-filters" aria-label="메타 태그" role="group"></div>
        <p data-summary>
          <span data-total-summary></span>
          <span data-meta-summary></span>
          <span data-hidden-summary hidden></span>
        </p>
      </div>
      <div class="solved-tags-result-tools" hidden>
        <label data-sort-label>결과 정렬 <select data-sort></select></label>
        <button type="button" data-reset>필터 초기화</button>
      </div>
      <p data-status role="status"></p>
      <div class="solved-tags-actions">
        <button type="button" data-load>메타 태그 불러오기</button>
        <div class="solved-tags-export" role="group" aria-label="현재 조건의 기여 내보내기" hidden>
          <span>내보내기</span>
          <button type="button" data-export="csv" aria-label="CSV 내보내기">CSV</button>
          <button type="button" data-export="json" aria-label="JSON 내보내기">JSON</button>
        </div>
      </div>
    </div>
    <p data-match-summary role="status" hidden></p>
    <div class="solved-tags-results" aria-label="필터링한 기여 문제"></div>
    <button type="button" data-more hidden></button>
  `;

  const menu = root.querySelector('.solved-tags-menu');
  const load = root.querySelector('[data-load]');
  const status = root.querySelector('[data-status]');
  const controls = menu.querySelector('[data-controls]');
  const filters = root.querySelector('.solved-tags-filters');
  const tools = root.querySelector('.solved-tags-result-tools');
  const sort = root.querySelector('[data-sort]');
  const matchSummary = root.querySelector('[data-match-summary]');
  const results = root.querySelector('.solved-tags-results');
  const more = root.querySelector('[data-more]');
  const nativeResults = createNativeResults(results);
  const exportButtons = root.querySelectorAll('[data-export]');
  const tagButtons = new Map();
  const activeTags = new Set();
  let data = null;
  let taggedProblems = [];
  let matches = [];
  let visibleIds = [];
  let openEvents;
  let menuSize;
  let loadAttempted = false;

  function placeMenu() {
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const margin = 8;
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const roomBelow = height - rect.bottom - margin - gap;
    const roomAbove = rect.top - margin - gap;
    const above = roomBelow < menu.scrollHeight && roomAbove > roomBelow;
    menu.style.maxHeight = `${Math.max(0, above ? roomAbove : roomBelow)}px`;
    menu.style.left = `${Math.max(margin, Math.min(rect.left, width - menu.offsetWidth - margin))}px`;
    menu.style.top = `${above ? rect.top - menu.offsetHeight - gap : rect.bottom + gap}px`;
  }

  function closeMenu() {
    openEvents?.abort();
    menuSize?.disconnect();
    openEvents = menuSize = undefined;
    menu.hidden = true;
    if (menu.parentElement !== root) root.prepend(menu);
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    // The page footer paints above main's stacking context on short lists.
    // Put the dropdown alongside the site's own portaled menus.
    document.body.append(menu);
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    openEvents = new AbortController();
    const { signal } = openEvents;
    const closeOutside = event => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) closeMenu();
    };
    document.addEventListener('pointerdown', closeOutside, { capture: true, signal });
    document.addEventListener('focusin', closeOutside, { signal });
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab' && menu.contains(event.target)) {
        const stops = [...menu.querySelectorAll('button:enabled, select:enabled')].filter(el => el.getClientRects().length);
        const leaving = event.shiftKey ? event.target === menu || event.target === stops[0] : event.target === stops.at(-1);
        if (leaving || !stops.length) {
          if (event.shiftKey) event.preventDefault();
          closeMenu();
          trigger.focus();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        trigger.focus();
      }
    }, { signal });
    window.addEventListener('scroll', placeMenu, { capture: true, passive: true, signal });
    window.addEventListener('resize', placeMenu, { signal });
    menuSize = new ResizeObserver(placeMenu);
    menuSize.observe(menu);
    menuSize.observe(trigger);
    placeMenu();
    menu.focus({ preventScroll: true });
    if (!data && !load.disabled && !loadAttempted) {
      loadAttempted = true;
      onLoad();
    }
  }

  trigger.addEventListener('click', () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  function appendResults(moveFocus = false) {
    const end = Math.min(visibleIds.length + RESULT_BATCH_SIZE, matches.length);
    for (let index = visibleIds.length; index < end; index++) {
      for (const [key, vote] of matches[index].votesByMetaTag) {
        if (activeTags.has(key)) {
          visibleIds.push(vote.voteId ?? vote.vote.id);
          break;
        }
      }
    }
    const previewIds = moveFocus || data?.scoped ? [] : matches.slice(0, end).map(problem => problem.contributionCount === 1
      ? encodeURIComponent(`${problem.problemId}${problem.subId ?? ''}`) : null);
    nativeResults.show(visibleIds, previewIds, moveFocus);
    more.hidden = end >= matches.length;
    if (!more.hidden) {
      const nextCount = Math.min(RESULT_BATCH_SIZE, matches.length - end);
      more.textContent = `${nextCount}개 더 보기`;
    }
  }

  function updateResults() {
    const filtered = activeTags.size > 0;
    matches = filtered ? filterProblems(taggedProblems, activeTags, sort.value) : [];
    visibleIds = [];
    triggerLabel.textContent = activeTags.size ? `메타 태그 · ${activeTags.size}` : '메타 태그';
    trigger.toggleAttribute('data-selected', activeTags.size > 0);
    root.toggleAttribute('data-filtered', filtered);
    tools.hidden = matchSummary.hidden = !filtered;
    sort.parentElement.hidden = !data;
    matchSummary.textContent = filtered && data ? `필터 결과 ${numbers.format(matches.length)}개` : '';
    appendResults();
  }

  for (const [key, tag] of Object.entries(META_TAGS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.setProperty('--tag-color', tag.color);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = tag.svg;
    button.firstElementChild.setAttribute('aria-hidden', 'true');
    const count = document.createElement('span');
    count.className = 'solved-tags-count';
    button.append(tag.ko, count);
    button.addEventListener('click', () => {
      if (activeTags.has(key)) activeTags.delete(key);
      else activeTags.add(key);
      button.setAttribute('aria-pressed', String(activeTags.has(key)));
      updateResults();
    });
    filters.append(button);
    tagButtons.set(key, { button, count });
  }

  for (const [value, label] of SORT_CHOICES) sort.add(new Option(label, value));
  sort.addEventListener('change', updateResults);
  more.addEventListener('click', () => appendResults(true));
  load.addEventListener('click', onLoad);
  root.querySelector('[data-reset]').addEventListener('click', () => {
    const firstSelected = tagButtons.get(activeTags.values().next().value);
    for (const key of activeTags) tagButtons.get(key).button.setAttribute('aria-pressed', 'false');
    activeTags.clear();
    updateResults();
    (data ? firstSelected?.button : trigger)?.focus();
  });
  for (const button of exportButtons) {
    button.addEventListener('click', () => onExport(button.dataset.export, data.problems));
  }

  function applyData(next, preserveTags) {
    data = next;
    controls.hidden = !data;
    menu.querySelector('.solved-tags-export').hidden = !data;
    root.toggleAttribute('data-loaded', !!data);
    taggedProblems = [];
    const counts = new Map();
    const votes = new Map();
    if (data) {
      for (const problem of data.problems.values()) {
        if (!problem.votesByMetaTag.size) continue;
        taggedProblems.push(problem);
        for (const [key, vote] of problem.votesByMetaTag) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
          votes.set(vote.voteId ?? vote.vote.id, vote);
        }
      }
    } else if (!preserveTags) {
      activeTags.clear();
      loadAttempted = false;
    }

    nativeResults.setItems([...votes.values()]);
    for (const [key, { button, count }] of tagButtons) {
      button.setAttribute('aria-pressed', String(activeTags.has(key)));
      count.textContent = numbers.format(counts.get(key) ?? 0);
    }
    for (const button of exportButtons) button.disabled = !data?.problems.size;
    menu.querySelector('[data-total-summary]').textContent = data
      ? `기여 문제 ${numbers.format(data.problems.size)}개` : '';
    menu.querySelector('[data-meta-summary]').textContent = data
      ? `메타 태그 포함 ${numbers.format(taggedProblems.length)}개` : '';
    const hidden = menu.querySelector('[data-hidden-summary]');
    hidden.hidden = !data?.hiddenCount;
    hidden.textContent = data?.hiddenCount
      ? `공개 범위로 숨겨진 기여 ${numbers.format(data.hiddenCount)}건` : '';
    updateResults();
  }

  return {
    root,
    trigger,
    get needsData() {
      return activeTags.size > 0 || !menu.hidden;
    },
    destroy() {
      closeMenu();
      trigger.remove();
      nativeResults.clear();
    },
    prepare: nativeResults.prepare,
    cancelPrepare() {
      if (!data) nativeResults.clear();
    },
    suspend() {
      loadAttempted = false;
      sort.value = SORT_OPTIONS.ORDER;
      applyData(null, true);
      status.textContent = '';
      load.disabled = false;
      load.textContent = '메타 태그 불러오기';
    },
    setData(next) {
      applyData(next, false);
    },
    setStatus(message, disabled = false) {
      status.textContent = message;
      if (!data && activeTags.size) matchSummary.textContent = message;
      load.disabled = disabled;
      load.textContent = data ? '새로고침' : '메타 태그 불러오기';
    }
  };
}
