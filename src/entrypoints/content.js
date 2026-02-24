// Content Script - 메인 진입점
import { fetchAllVotes, aggregateMetaTags } from './content/api.js';
import { loadFromCache, saveToCache, restoreFromCache } from './content/cache.js';
import { createFilterBar, insertFilterBar, updateFilterBarUI, updateFilterBarLoadButton, showFilterBarLoading } from './content/ui/filterBar.js';
import { FilterManager } from './content/ui/filter.js';
import { startThemeDetection } from './content/theme.js';
import './content/content.css';

export default defineContentScript({
  matches: ['https://solved.ac/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  main() {

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
        this.isInitializing = false; // 중복 init() 방지
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
        this.isInitializing = false;
      }

      /**
       * 상태 감시 — votes 페이지 여부와 필터바 존재 여부를 주기적으로 확인
       */
      startWatcher() {
        setInterval(() => {
          const onVotesPage = this.isVotesPage();
          const barExists = !!document.getElementById('solved-tags-bar');

          if (onVotesPage && !barExists && !this.isInitializing) {
            this.init();
          } else if (!onVotesPage && barExists) {
            this.cleanup();
          }
        }, 1000);
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
          this.problemTags = aggregateMetaTags(this.allVotes);

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
       * 정렬 기준 변경 처리
       */
      handleSortChange(sortOption) {
        this.filterManager.setSortBy(sortOption);

        // 필터가 활성화된 상태에서만 목록 다시 렌더링
        if (!this.filterManager.isEmpty()) {
          this.filterManager.renderFilteredList(this.problemTags, () => this.handleClearFilters());
        }
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
        if (this.isInitializing) return;
        if (document.getElementById('solved-tags-bar')) return;

        this.isInitializing = true;

        this.currentHandle = this.extractHandle();
        if (!this.currentHandle) {
          this.isInitializing = false;
          return;
        }

        const settings = await browser.storage.local.get(['enabled']);
        if (settings.enabled === false) {
          this.isInitializing = false;
          return;
        }

        const filterBar = createFilterBar({
          onLoadData: (forceRefresh) => this.loadData(forceRefresh),
          onFilterChange: (tagKey) => this.handleFilterChange(tagKey),
          onClearFilters: () => this.handleClearFilters(),
          onSortChange: (sortOption) => this.handleSortChange(sortOption)
        });
        insertFilterBar(filterBar);
        this.isInitializing = false;

        // 테마 감지 시작
        startThemeDetection();

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

    // 1) 매 500ms마다 상태 체크
    app.startWatcher();

    // 2) storage 변경 감지 — 팝업에서 enabled 토글 시 즉시 반응
    browser.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        if (changes.enabled.newValue === true && app.isVotesPage()) {
          app.init();
        } else if (changes.enabled.newValue === false) {
          app.cleanup();
        }
      }
    });

    if (app.isVotesPage()) {
      app.init();
    }
  }
});
