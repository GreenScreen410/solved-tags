// Content Script - 메인 진입점
import { fetchAllVotes, aggregateMetaTags } from './api.js';
import { loadFromCache, saveToCache, restoreFromCache } from './cache.js';
import { createFilterBar, insertFilterBar, updateFilterBarUI, updateFilterBarLoadButton, showFilterBarLoading } from './ui/filterBar.js';
import { FilterManager } from './ui/filter.js';

console.log('[solved.tags] Content script loaded');

/**
 * 메인 앱 클래스
 */
class SolvedTagsApp {
  constructor() {
    this.allVotes = [];
    this.problemTags = new Map();
    this.filterManager = new FilterManager();
    this.currentHandle = null;
    this.isDataLoaded = false;
    this.lastUrl = window.location.href;
  }

  /**
   * URL에서 사용자 핸들 추출
   */
  extractHandle() {
    const match = window.location.pathname.match(/\/profile\/([^/]+)\/votes/);
    return match ? match[1] : null;
  }

  /**
   * 현재 URL이 votes 페이지인지 확인
   */
  isVotesPage() {
    return /\/profile\/[^/]+\/votes/.test(window.location.pathname);
  }

  /**
   * 패널 제거
   */
  cleanup() {
    const bar = document.getElementById('solved-tags-bar');
    if (bar) bar.remove();
    this.filterManager.restoreOriginalPage();
    this.isDataLoaded = false;
    this.currentHandle = null;
  }

  /**
   * URL 변경 감지 및 처리
   */
  handleUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl === this.lastUrl) return;

    this.lastUrl = currentUrl;

    if (this.isVotesPage()) {
      // votes 페이지로 이동한 경우 재초기화
      this.cleanup();
      this.init();
    } else {
      // votes 페이지가 아닌 경우 패널 제거
      this.cleanup();
    }
  }

  /**
   * URL 변경 감지 시작
   */
  startUrlWatcher() {
    // 주기적으로 URL 체크 (가장 확실한 방법)
    setInterval(() => this.handleUrlChange(), 500);

    // popstate 이벤트 (브라우저 뒤로가기/앞으로가기)
    window.addEventListener('popstate', () => this.handleUrlChange());
  }

  /**
   * 데이터 로드 (API 호출)
   */
  async loadData(forceRefresh = false) {
    const handle = this.currentHandle;
    if (!handle) return;

    // 캐시 확인 (강제 갱신이 아닐 경우)
    if (!forceRefresh) {
      const cached = loadFromCache(handle);
      if (cached) {
        const restored = restoreFromCache(cached);
        this.allVotes = restored.votes;
        this.problemTags = restored.problemTags;
        this.isDataLoaded = true;
        this.updateUI();
        updateFilterBarLoadButton(cached.timestamp);
        return;
      }
    }

    showFilterBarLoading();

    try {
      this.allVotes = await fetchAllVotes(handle);
      console.log(`[solved.tags] ${this.allVotes.length}개의 기여 데이터 로드됨`);

      this.problemTags = aggregateMetaTags(this.allVotes);
      console.log(`[solved.tags] ${this.problemTags.size}개의 문제 처리됨`);

      // 캐시에 저장
      saveToCache(handle, this.allVotes, this.problemTags);

      this.isDataLoaded = true;
      this.updateUI();
      updateFilterBarLoadButton(Date.now());

    } catch (error) {
      console.error('[Solved Tags] 오류:', error);
      const loadBtn = document.getElementById('solved-tags-load-btn');
      if (loadBtn) {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '📊 메타 태그 불러오기';
      }
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }

  /**
   * 필터 변경 처리
   */
  handleFilterChange(tagKey) {
    if (!this.isDataLoaded) {
      alert('데이터를 먼저 불러와주세요! 패널의 "데이터 불러오기" 버튼을 클릭하세요.');
      return;
    }

    this.filterManager.toggle(tagKey);

    if (this.filterManager.isEmpty()) {
      this.filterManager.restoreOriginalPage();
    } else {
      this.filterManager.renderFilteredList(this.problemTags, () => this.handleClearFilters());
    }
    this.updateUI();
  }

  /**
   * 필터 초기화 처리
   */
  handleClearFilters() {
    this.filterManager.clear();
    this.filterManager.restoreOriginalPage();
    this.updateUI();
  }

  /**
   * UI 업데이트
   */
  updateUI() {
    updateFilterBarUI({
      isDataLoaded: this.isDataLoaded,
      activeFilters: this.filterManager.activeFilters,
      problemTags: this.problemTags,
      filteredProblems: this.filterManager.getFilteredProblems(this.problemTags)
    });
  }

  /**
   * 초기화
   */
  async init() {
    this.currentHandle = this.extractHandle();
    if (!this.currentHandle) {
      console.log('[solved.tags] 사용자 핸들을 찾을 수 없습니다');
      return;
    }

    // 설정 확인
    const settings = await chrome.storage.local.get(['enabled', 'myHandle']);
    if (settings.enabled === false) {
      console.log('[solved.tags] 익스텐션이 비활성화되어 있습니다');
      return;
    }

    // 내 핸들 체크
    const myHandle = settings.myHandle?.trim();
    if (!myHandle) {
      console.log('[solved.tags] 내 핸들이 설정되지 않았습니다. 팝업에서 핸들을 설정해주세요.');
      return;
    }

    if (this.currentHandle.toLowerCase() !== myHandle.toLowerCase()) {
      console.log(`[solved.tags] 다른 사용자의 페이지입니다 (현재: ${this.currentHandle}, 내 핸들: ${myHandle})`);
      return;
    }

    console.log(`[solved.tags] 사용자: ${this.currentHandle}`);

    // 필터 바 생성 및 삽입
    const filterBar = createFilterBar({
      onLoadData: (forceRefresh) => this.loadData(forceRefresh),
      onFilterChange: (tagKey) => this.handleFilterChange(tagKey),
      onClearFilters: () => this.handleClearFilters()
    });
    insertFilterBar(filterBar);

    // 캐시된 데이터 있으면 자동 로드
    const cached = loadFromCache(this.currentHandle);
    if (cached) {
      const restored = restoreFromCache(cached);
      this.allVotes = restored.votes;
      this.problemTags = restored.problemTags;
      this.isDataLoaded = true;
      this.updateUI();
      updateFilterBarLoadButton(cached.timestamp);
    }
  }
}

// 앱 시작
const app = new SolvedTagsApp();

// URL 변경 감지 시작
app.startUrlWatcher();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  setTimeout(() => app.init(), 1000);
}
