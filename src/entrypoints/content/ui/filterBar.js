// 인라인 필터 바 UI (페이지 내 삽입)
import { META_TAGS } from '@/utils/constants.js';
import { SORT_OPTIONS } from './filter.js';

// 정렬 옵션 레이블
const SORT_LABELS = {
  [SORT_OPTIONS.ORDER]: '기여 순서',
  [SORT_OPTIONS.PROBLEM_ID_ASC]: '번호 오름차순',
  [SORT_OPTIONS.PROBLEM_ID_DESC]: '번호 내림차순',
  [SORT_OPTIONS.LEVEL_ASC]: '난이도 낮은 순',
  [SORT_OPTIONS.LEVEL_DESC]: '난이도 높은 순'
};

/**
 * 필터 바 생성 (페이지 내 삽입)
 * @param {Object} options - 옵션
 * @param {Function} options.onLoadData - 데이터 로드 콜백
 * @param {Function} options.onFilterChange - 필터 변경 콜백
 * @param {Function} options.onClearFilters - 필터 초기화 콜백
 * @param {Function} options.onSortChange - 정렬 변경 콜백
 * @returns {HTMLElement} 필터 바 요소
 */
export function createFilterBar({ onLoadData, onFilterChange, onClearFilters, onSortChange, onExport }) {
  const existingBar = document.getElementById('solved-tags-bar');
  if (existingBar) existingBar.remove();

  const bar = document.createElement('div');
  bar.id = 'solved-tags-bar';
  bar.className = 'solved-tags-bar';

  // 상단 행: 로드 버튼 + 캐시 정보
  const topRow = document.createElement('div');
  topRow.className = 'solved-tags-bar-top';

  const loadBtn = document.createElement('button');
  loadBtn.id = 'solved-tags-load-btn';
  loadBtn.className = 'solved-tags-bar-load-btn';
  loadBtn.innerHTML = '메타 태그 불러오기';
  loadBtn.dataset.isRefresh = 'false';
  loadBtn.addEventListener('click', () => {
    if (loadBtn.dataset.isRefresh === 'true') {
      if (!confirm('데이터를 다시 불러오시겠습니까?\n⚠️ 과도한 갱신은 solved.ac 서버에 부하를 줄 수 있습니다.')) {
        return;
      }
    }
    onLoadData(true);
  });
  topRow.appendChild(loadBtn);

  const cacheInfo = document.createElement('span');
  cacheInfo.id = 'solved-tags-cache-info';
  cacheInfo.className = 'solved-tags-bar-cache';
  topRow.appendChild(cacheInfo);

  // 정렬 드롭다운 (상단 우측)
  const sortContainer = document.createElement('div');
  sortContainer.id = 'solved-tags-sort-container';
  sortContainer.className = 'solved-tags-bar-sort';
  sortContainer.style.display = 'none';

  const sortLabel = document.createElement('span');
  sortLabel.className = 'sort-label';
  sortLabel.textContent = '정렬:';
  sortContainer.appendChild(sortLabel);

  // 커스텀 드롭다운
  const dropdown = document.createElement('div');
  dropdown.className = 'solved-tags-dropdown';

  const dropdownBtn = document.createElement('button');
  dropdownBtn.type = 'button';
  dropdownBtn.className = 'solved-tags-dropdown-btn';
  dropdownBtn.innerHTML = `
    <span class="dropdown-text">${SORT_LABELS[SORT_OPTIONS.ORDER]}</span>
    <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
  `;

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'solved-tags-dropdown-menu';

  Object.entries(SORT_LABELS).forEach(([value, label]) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'solved-tags-dropdown-item';
    item.dataset.value = value;
    item.textContent = label;
    if (value === SORT_OPTIONS.ORDER) item.classList.add('active');
    item.addEventListener('click', () => {
      dropdownBtn.querySelector('.dropdown-text').textContent = label;
      dropdownMenu.querySelectorAll('.solved-tags-dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      dropdown.classList.remove('open');
      onSortChange(value);
    });
    dropdownMenu.appendChild(item);
  });

  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // 외부 클릭 시 닫기 (드롭다운 자체에 등록)
  dropdown.addEventListener('focusout', (e) => {
    if (!dropdown.contains(e.relatedTarget)) {
      dropdown.classList.remove('open');
    }
  });

  // 문서 클릭 시 닫기 (once 옵션으로 회피)
  dropdownBtn.addEventListener('click', () => {
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  });

  dropdown.appendChild(dropdownBtn);
  dropdown.appendChild(dropdownMenu);
  sortContainer.appendChild(dropdown);
  topRow.appendChild(sortContainer);

  bar.appendChild(topRow);

  // 태그 필터 행
  const filterRow = document.createElement('div');
  filterRow.id = 'solved-tags-filter-row';
  filterRow.className = 'solved-tags-bar-filters';
  filterRow.style.display = 'none';

  Object.entries(META_TAGS).forEach(([key, info]) => {
    const tagBtn = document.createElement('button');
    tagBtn.className = 'solved-tags-bar-tag';
    tagBtn.dataset.tagKey = key;
    tagBtn.innerHTML = `
      <span class="tag-icon" style="color: ${info.color}">${info.svg}</span>
      <span class="tag-name">${info.ko}</span>
      <span class="tag-count">0</span>
    `;
    tagBtn.style.setProperty('--tag-color', info.color);
    tagBtn.addEventListener('click', () => onFilterChange(key));
    filterRow.appendChild(tagBtn);
  });

  // 필터 초기화 버튼
  const resetBtn = document.createElement('button');
  resetBtn.id = 'solved-tags-reset-btn';
  resetBtn.className = 'solved-tags-bar-reset';
  resetBtn.innerHTML = '✕ 초기화';
  resetBtn.style.display = 'none';
  resetBtn.addEventListener('click', onClearFilters);
  filterRow.appendChild(resetBtn);

  bar.appendChild(filterRow);

  // 통계 행
  const statsRow = document.createElement('div');
  statsRow.id = 'solved-tags-stats-row';
  statsRow.className = 'solved-tags-bar-stats';
  statsRow.style.display = 'none';
  bar.appendChild(statsRow);

  // 내보내기 드롭다운
  const exportContainer = document.createElement('div');
  exportContainer.id = 'solved-tags-export-container';
  exportContainer.className = 'solved-tags-export-container';
  exportContainer.style.display = 'none';

  const exportDropdown = document.createElement('div');
  exportDropdown.className = 'solved-tags-dropdown';

  const exportDropdownBtn = document.createElement('button');
  exportDropdownBtn.type = 'button';
  exportDropdownBtn.className = 'solved-tags-dropdown-btn solved-tags-export-btn';
  exportDropdownBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M12 17v-6"/><path d="M9.5 14.5l2.5 2.5l2.5 -2.5"/></svg>
    <span class="dropdown-text">내보내기</span>
    <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
  `;

  const exportMenu = document.createElement('div');
  exportMenu.className = 'solved-tags-dropdown-menu';

  [
    { value: 'json', label: 'JSON으로 내보내기' },
    { value: 'csv', label: 'CSV로 내보내기' }
  ].forEach(({ value, label }) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'solved-tags-dropdown-item';
    item.textContent = label;
    item.addEventListener('click', () => {
      exportDropdown.classList.remove('open');
      onExport(value);
    });
    exportMenu.appendChild(item);
  });

  exportDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('open');
  });

  exportDropdownBtn.addEventListener('click', () => {
    const closeHandler = (e) => {
      if (!exportDropdown.contains(e.target)) {
        exportDropdown.classList.remove('open');
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  });

  exportDropdown.appendChild(exportDropdownBtn);
  exportDropdown.appendChild(exportMenu);
  exportContainer.appendChild(exportDropdown);
  bar.appendChild(exportContainer);

  return bar;
}

/**
 * 페이지에 필터 바 삽입 — React hydration 완료 후 올바른 위치에 삽입
 */
export function insertFilterBar(bar) {
  return new Promise((resolve, reject) => {
    // 이미 삽입되어 있으면 즉시 완료
    if (document.getElementById('solved-tags-bar')) {
      resolve();
      return;
    }

    const tryInsert = () => {
      // 삽입 직전 중복 체크
      if (document.getElementById('solved-tags-bar')) {
        return true; // 이미 다른 경로로 삽입됨
      }
      // votes 페이지의 문제 목록(ul) 찾기
      const problemList = document.querySelector('ul[class*="css-"]');
      if (problemList && problemList.parentElement) {
        problemList.parentElement.insertBefore(bar, problemList);
        return true;
      }
      return false;
    };

    // 즉시 시도
    if (tryInsert()) {
      resolve();
      return;
    }

    // React가 아직 렌더링 중이면 MutationObserver로 대기
    let inserted = false;
    const observer = new MutationObserver(() => {
      if (!inserted && tryInsert()) {
        inserted = true;
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 10초 후에도 찾지 못하면 observer 해제
    setTimeout(() => {
      observer.disconnect();
      if (!inserted) {
        reject(new Error('Filter bar insertion timed out'));
      }
    }, 10000);
  });
}

/**
 * 필터 바 UI 업데이트
 */
export function updateFilterBarUI(state) {
  const { isDataLoaded, activeFilters, problemTags, filteredProblems } = state;

  const filterRow = document.getElementById('solved-tags-filter-row');
  const statsRow = document.getElementById('solved-tags-stats-row');
  const resetBtn = document.getElementById('solved-tags-reset-btn');
  const sortContainer = document.getElementById('solved-tags-sort-container');
  const exportBtn = document.getElementById('solved-tags-export-container');

  if (!isDataLoaded) return;

  // 내보내기 버튼 표시
  if (exportBtn) {
    exportBtn.style.display = 'inline-flex';
  }

  // 필터 행 표시
  if (filterRow) {
    filterRow.style.display = 'flex';
  }

  // 정렬 드롭다운 표시
  if (sortContainer) {
    sortContainer.style.display = 'flex';
  }

  // 필터 상태 업데이트
  document.querySelectorAll('.solved-tags-bar-tag').forEach(btn => {
    const tagKey = btn.dataset.tagKey;
    if (activeFilters.has(tagKey)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 초기화 버튼 표시/숨김
  if (resetBtn) {
    resetBtn.style.display = activeFilters.size > 0 ? 'inline-flex' : 'none';
  }

  // 통계 업데이트
  if (statsRow) {
    let metaTagCount = 0;
    problemTags.forEach(problem => {
      if (problem.metaTags.size > 0) metaTagCount++;
    });

    if (activeFilters.size > 0) {
      statsRow.innerHTML = `<span>필터링 결과: <strong>${filteredProblems.length}</strong>개 / 전체 기여 ${problemTags.size}개 중 메타 태그 <strong style="color: #17ce3a">${metaTagCount}</strong>개</span>`;
      statsRow.style.display = 'block';
    } else {
      statsRow.innerHTML = `<span>전체 기여 <strong>${problemTags.size}</strong>개 · 메타 태그 포함 <strong style="color: #17ce3a">${metaTagCount}</strong>개</span>`;
      statsRow.style.display = 'block';
    }
  }

  // 태그 카운트 업데이트
  const tagCounts = calculateTagCounts(problemTags);
  document.querySelectorAll('.solved-tags-bar-tag').forEach(btn => {
    const tagKey = btn.dataset.tagKey;
    const countEl = btn.querySelector('.tag-count');
    if (countEl && tagCounts[tagKey] !== undefined) {
      countEl.textContent = tagCounts[tagKey];
    }
  });
}

/**
 * 로드 버튼 상태 업데이트
 */
export function updateFilterBarLoadButton(timestamp) {
  const loadBtn = document.getElementById('solved-tags-load-btn');
  const cacheInfo = document.getElementById('solved-tags-cache-info');

  if (loadBtn) {
    loadBtn.disabled = false;
    loadBtn.innerHTML = '갱신';
    loadBtn.dataset.isRefresh = 'true';
  }

  if (cacheInfo && timestamp) {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    cacheInfo.textContent = `${timeStr}`;
    cacheInfo.style.display = 'inline';
  }
}

/**
 * 로딩 상태 표시
 */
export function showFilterBarLoading() {
  const loadBtn = document.getElementById('solved-tags-load-btn');
  if (loadBtn) {
    loadBtn.disabled = true;
    loadBtn.innerHTML = '<span class="btn-spinner"></span> 로딩...';
  }
}

/**
 * 태그별 카운트 계산
 */
function calculateTagCounts(problemTags) {
  const tagCounts = {};
  Object.keys(META_TAGS).forEach(key => tagCounts[key] = 0);

  problemTags.forEach(problem => {
    problem.metaTags.forEach(tag => {
      if (tagCounts[tag] !== undefined) {
        tagCounts[tag]++;
      }
    });
  });

  return tagCounts;
}
