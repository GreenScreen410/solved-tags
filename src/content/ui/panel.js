// 플로팅 패널 UI
import { META_TAGS } from '../../shared/constants.js';

/**
 * 플로팅 패널 생성
 * @param {Object} options - 옵션
 * @param {Function} options.onLoadData - 데이터 로드 콜백
 * @param {Function} options.onFilterChange - 필터 변경 콜백
 * @param {Function} options.onClearFilters - 필터 초기화 콜백
 * @returns {HTMLElement} 패널 요소
 */
export function createFloatingPanel({ onLoadData, onFilterChange, onClearFilters }) {
  const existingPanel = document.getElementById('solved-tags-panel');
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'solved-tags-panel';
  panel.className = 'solved-tags-panel';

  // 헤더
  const header = document.createElement('div');
  header.className = 'solved-tags-header';
  header.innerHTML = `
    <span class="solved-tags-title">📊 메타 태그 통계</span>
    <button class="solved-tags-toggle">−</button>
  `;
  panel.appendChild(header);

  // 콘텐츠
  const content = document.createElement('div');
  content.className = 'solved-tags-content';

  // 데이터 로드 버튼
  const loadBtn = document.createElement('button');
  loadBtn.id = 'solved-tags-load-btn';
  loadBtn.className = 'solved-tags-load-btn';
  loadBtn.innerHTML = '🔄 데이터 불러오기';
  loadBtn.dataset.isRefresh = 'false';
  loadBtn.addEventListener('click', () => {
    // 갱신 모드일 때만 확인 다이얼로그 표시
    if (loadBtn.dataset.isRefresh === 'true') {
      if (!confirm('데이터를 다시 불러오시겠습니까?\n⚠️ 과도한 갱신은 서버에 부하를 줄 수 있습니다.')) {
        return;
      }
    }
    onLoadData(true);
  });
  content.appendChild(loadBtn);

  // 캐시 정보
  const cacheInfo = document.createElement('div');
  cacheInfo.id = 'solved-tags-cache-info';
  cacheInfo.className = 'solved-tags-cache-info';
  cacheInfo.style.display = 'none';
  content.appendChild(cacheInfo);

  // 통계 표시
  const stats = document.createElement('div');
  stats.className = 'solved-tags-stats';

  Object.entries(META_TAGS).forEach(([key, info]) => {
    const statItem = document.createElement('div');
    statItem.className = 'solved-tags-stat-item';
    statItem.dataset.tagKey = key;
    statItem.innerHTML = `
      <span class="stat-icon" style="color: ${info.color}">${info.svg}</span>
      <span class="stat-name">${info.ko}</span>
      <span class="stat-count" style="color: ${info.color}">-</span>
      <span class="stat-checkbox"></span>
    `;

    statItem.addEventListener('click', () => onFilterChange(key));
    stats.appendChild(statItem);
  });

  content.appendChild(stats);

  // 필터 초기화 버튼
  const resetBtn = document.createElement('button');
  resetBtn.className = 'solved-tags-reset';
  resetBtn.textContent = '필터 초기화';
  resetBtn.style.display = 'none';
  resetBtn.addEventListener('click', onClearFilters);
  content.appendChild(resetBtn);

  // 총 기여 수
  const total = document.createElement('div');
  total.className = 'solved-tags-total';
  total.textContent = '데이터를 불러와주세요';
  content.appendChild(total);

  panel.appendChild(content);

  // 토글 기능
  const toggleBtn = header.querySelector('.solved-tags-toggle');
  toggleBtn.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    toggleBtn.textContent = content.classList.contains('collapsed') ? '+' : '−';
  });

  // 드래그 기능
  setupDragging(panel, header, toggleBtn);

  return panel;
}

/**
 * 드래그 기능 설정
 */
function setupDragging(panel, header, toggleBtn) {
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener('mousedown', (e) => {
    if (e.target === toggleBtn) return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    panel.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    panel.style.cursor = '';
  });
}

/**
 * 패널 UI 업데이트
 * @param {Object} state - 현재 상태
 */
export function updatePanelUI(state) {
  const { isDataLoaded, activeFilters, problemTags, filteredProblems } = state;

  // 필터 상태 업데이트
  document.querySelectorAll('.solved-tags-stat-item').forEach(item => {
    const tagKey = item.dataset.tagKey;
    if (activeFilters.has(tagKey)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 총 문제 수 업데이트
  const totalEl = document.querySelector('.solved-tags-total');
  if (totalEl) {
    if (!isDataLoaded) {
      totalEl.textContent = '데이터를 불러와주세요';
    } else if (activeFilters.size > 0) {
      totalEl.textContent = `필터링: ${filteredProblems.length}개 / 총 ${problemTags.size}개 문제`;
    } else {
      // 메타 태그가 있는 문제 수 계산
      let metaTagCount = 0;
      problemTags.forEach(problem => {
        if (problem.metaTags.size > 0) {
          metaTagCount++;
        }
      });
      totalEl.innerHTML = `총 ${problemTags.size}개 문제에 기여<br><span style="color: #17ce3a; font-weight: 500;">메타 태그 ${metaTagCount}개</span>`;
    }
  }

  // 필터 초기화 버튼 표시/숨김
  const resetBtn = document.querySelector('.solved-tags-reset');
  if (resetBtn) {
    resetBtn.style.display = activeFilters.size > 0 ? 'block' : 'none';
  }

  // 태그 카운트 업데이트
  if (isDataLoaded) {
    const tagCounts = calculateTagCounts(problemTags);
    document.querySelectorAll('.solved-tags-stat-item').forEach(item => {
      const tagKey = item.dataset.tagKey;
      const countEl = item.querySelector('.stat-count');
      if (countEl && tagCounts[tagKey] !== undefined) {
        countEl.textContent = tagCounts[tagKey];
      }
    });
  }
}

/**
 * 로드 버튼 상태 업데이트
 * @param {number} timestamp - 캐시 타임스탬프
 */
export function updateLoadButton(timestamp) {
  const loadBtn = document.getElementById('solved-tags-load-btn');
  const cacheInfo = document.getElementById('solved-tags-cache-info');

  if (loadBtn) {
    loadBtn.disabled = false;
    loadBtn.innerHTML = '데이터 갱신';
    loadBtn.dataset.isRefresh = 'true';
  }

  if (cacheInfo && timestamp) {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    cacheInfo.textContent = `마지막 갱신: ${timeStr}`;
    cacheInfo.style.display = 'block';
  }
}

/**
 * 로딩 상태 표시
 */
export function showLoading() {
  const loadBtn = document.getElementById('solved-tags-load-btn');
  if (loadBtn) {
    loadBtn.disabled = true;
    loadBtn.innerHTML = '<span class="btn-spinner"></span> 로딩 중...';
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
