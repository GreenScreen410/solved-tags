// 인라인 필터 바 UI (페이지 내 삽입)
import { META_TAGS } from '../../shared/constants.js';

/**
 * 필터 바 생성 (페이지 내 삽입)
 * @param {Object} options - 옵션
 * @param {Function} options.onLoadData - 데이터 로드 콜백
 * @param {Function} options.onFilterChange - 필터 변경 콜백
 * @param {Function} options.onClearFilters - 필터 초기화 콜백
 * @returns {HTMLElement} 필터 바 요소
 */
export function createFilterBar({ onLoadData, onFilterChange, onClearFilters }) {
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
  loadBtn.innerHTML = '📊 메타 태그 불러오기';
  loadBtn.dataset.isRefresh = 'false';
  loadBtn.addEventListener('click', () => {
    if (loadBtn.dataset.isRefresh === 'true') {
      if (!confirm('데이터를 다시 불러오시겠습니까?\n⚠️ 과도한 갱신은 서버에 부하를 줄 수 있습니다.')) {
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

  return bar;
}

/**
 * 페이지에 필터 바 삽입
 */
export function insertFilterBar(bar) {
  // 이미 삽입되어 있으면 스킵
  if (document.getElementById('solved-tags-bar')) {
    return;
  }

  const waitForContainer = () => {
    // 문제 목록 ul 직접 찾기
    const problemList = document.querySelector('ul[class*="css-"]');
    if (problemList && problemList.parentElement) {
      // ul 바로 앞에 필터 바 삽입
      problemList.parentElement.insertBefore(bar, problemList);
      return true;
    }
    return false;
  };

  // 바로 삽입 시도, 실패하면 재시도
  if (!waitForContainer()) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (waitForContainer() || attempts > 20) {
        clearInterval(interval);
        if (attempts > 20) {
          console.log('[solved.tags] 컨테이너를 찾지 못해 상단에 삽입합니다');
          document.body.insertBefore(bar, document.body.firstChild);
        }
      }
    }, 200);
  }
}

/**
 * 필터 바 UI 업데이트
 */
export function updateFilterBarUI(state) {
  const { isDataLoaded, activeFilters, problemTags, filteredProblems } = state;

  const filterRow = document.getElementById('solved-tags-filter-row');
  const statsRow = document.getElementById('solved-tags-stats-row');
  const resetBtn = document.getElementById('solved-tags-reset-btn');

  if (!isDataLoaded) return;

  // 필터 행 표시
  if (filterRow) {
    filterRow.style.display = 'flex';
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
      statsRow.innerHTML = `<span>필터링: <strong>${filteredProblems.length}</strong>개 / 총 ${problemTags.size}개</span>`;
      statsRow.style.display = 'block';
    } else {
      statsRow.innerHTML = `<span>총 <strong>${problemTags.size}</strong>개 문제 기여 · 메타 태그 <strong style="color: #17ce3a">${metaTagCount}</strong>개</span>`;
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
    loadBtn.innerHTML = '🔄 갱신';
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
