import { META_TAGS } from '@/utils/constants.js';
import { SORT_OPTIONS, filterProblems } from './filter.js';
import { createNativeResults } from './nativeResults.js';

const RESULT_BATCH_SIZE = 40;
const numbers = new Intl.NumberFormat('ko-KR');
const SORT_CHOICES = [
  [SORT_OPTIONS.ORDER, '최근 기여 순'],
  [SORT_OPTIONS.PROBLEM_ID_ASC, '문제 번호 오름차순'],
  [SORT_OPTIONS.PROBLEM_ID_DESC, '문제 번호 내림차순'],
  [SORT_OPTIONS.LEVEL_ASC, '낮은 난이도 순'],
  [SORT_OPTIONS.LEVEL_DESC, '높은 난이도 순']
];

export function createFilterBar({ onLoad, onExport }) {
  const root = document.createElement('section');
  root.className = 'solved-tags-panel';
  root.setAttribute('aria-label', '메타 태그 통계');
  root.innerHTML = `
    <div class="solved-tags-box">
      <div class="solved-tags-heading">
        <div class="solved-tags-identity">
          <span class="solved-tags-symbol" aria-hidden="true"><i></i><i></i><i></i></span>
          <div>
            <h3>메타 태그</h3>
            <p data-status role="status"></p>
          </div>
        </div>
        <button type="button" data-load>메타 태그 불러오기</button>
      </div>
      <div data-controls hidden>
        <div class="solved-tags-filters" aria-label="메타 태그 필터" role="group"></div>
        <div class="solved-tags-footer">
          <p data-summary role="status">
            <span data-match-summary hidden></span>
            <span data-total-summary></span>
            <span data-meta-summary></span>
            <span data-hidden-summary hidden></span>
          </p>
          <div class="solved-tags-export" role="group" aria-label="전체 기여 내보내기">
            <span aria-hidden="true">내보내기</span>
            <button type="button" data-export="csv" aria-label="CSV 내보내기">CSV</button>
            <button type="button" data-export="json" aria-label="JSON 내보내기">JSON</button>
          </div>
        </div>
        <div class="solved-tags-result-tools" hidden>
          <label data-sort-label>정렬 <select data-sort></select></label>
          <button type="button" data-reset>필터 초기화</button>
        </div>
      </div>
    </div>
    <div class="solved-tags-results" aria-label="필터링한 기여 문제" hidden></div>
    <button type="button" data-more hidden></button>
  `;

  const load = root.querySelector('[data-load]');
  const status = root.querySelector('[data-status]');
  const controls = root.querySelector('[data-controls]');
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
  let shown = 0;

  function appendResults(moveFocus = false) {
    const end = Math.min(shown + RESULT_BATCH_SIZE, matches.length);
    const items = [];
    for (; shown < end; shown++) {
      for (const [key, vote] of matches[shown].votesByMetaTag) {
        if (activeTags.has(key)) {
          items.push(vote);
          break;
        }
      }
    }
    if (items.length) nativeResults.append(items, moveFocus);
    more.hidden = shown >= matches.length;
    if (!more.hidden) {
      const nextCount = Math.min(RESULT_BATCH_SIZE, matches.length - shown);
      more.textContent = `${nextCount}개 더 보기`;
    }
  }

  function updateResults() {
    const filtered = !!data && activeTags.size > 0;
    matches = filtered ? filterProblems(taggedProblems, activeTags, sort.value) : [];
    shown = 0;
    root.toggleAttribute('data-filtered', filtered);
    tools.hidden = matchSummary.hidden = !filtered;
    results.hidden = matches.length === 0;
    matchSummary.textContent = filtered ? `필터 결과 ${numbers.format(matches.length)}개` : '';
    nativeResults.clear();
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
    firstSelected?.button.focus();
  });
  for (const button of exportButtons) {
    button.addEventListener('click', () => onExport(button.dataset.export, data.problems));
  }

  return {
    root,
    destroy: nativeResults.clear,
    setData(next) {
      data = next;
      controls.hidden = !data;
      root.toggleAttribute('data-loaded', !!data);
      taggedProblems = [];
      const counts = new Map();
      if (data) {
        for (const problem of data.problems.values()) {
          if (!problem.votesByMetaTag.size) continue;
          taggedProblems.push(problem);
          for (const key of problem.votesByMetaTag.keys()) counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      } else {
        activeTags.clear();
      }

      for (const [key, { button, count }] of tagButtons) {
        button.setAttribute('aria-pressed', String(activeTags.has(key)));
        count.textContent = numbers.format(counts.get(key) ?? 0);
      }
      for (const button of exportButtons) button.disabled = !data?.problems.size;
      root.querySelector('[data-total-summary]').textContent = data
        ? `기여 문제 ${numbers.format(data.problems.size)}개` : '';
      root.querySelector('[data-meta-summary]').textContent = data
        ? `메타 태그 포함 ${numbers.format(taggedProblems.length)}개` : '';
      const hidden = root.querySelector('[data-hidden-summary]');
      hidden.hidden = !data?.hiddenCount;
      hidden.textContent = data?.hiddenCount
        ? `공개 범위로 숨겨진 기여 ${numbers.format(data.hiddenCount)}건` : '';
      updateResults();
    },
    setStatus(message, disabled = false) {
      status.textContent = message;
      load.disabled = disabled;
      load.textContent = data ? '새로고침' : '메타 태그 불러오기';
    }
  };
}
