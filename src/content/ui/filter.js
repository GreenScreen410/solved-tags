// 필터 관리
import { createProblemElement } from './problemList.js';

/**
 * 필터 매니저 클래스
 */
// 정렬 기준 상수
export const SORT_OPTIONS = {
  ORDER: 'order',           // 기여 순서 (기본)
  PROBLEM_ID_ASC: 'id_asc', // 문제 번호 오름차순
  PROBLEM_ID_DESC: 'id_desc', // 문제 번호 내림차순
  LEVEL_ASC: 'level_asc',   // 난이도 낮은 순
  LEVEL_DESC: 'level_desc'  // 난이도 높은 순
};

export class FilterManager {
  constructor() {
    this.activeFilters = new Set();
    this.originalContent = null;
    this.isFilterMode = false;
    this.sortBy = SORT_OPTIONS.ORDER; // 기본: 기여 순서
  }

  /**
   * 정렬 기준 설정
   * @param {string} sortOption - 정렬 기준
   */
  setSortBy(sortOption) {
    this.sortBy = sortOption;
  }

  /**
   * 필터 토글
   * @param {string} tagKey - 태그 키
   */
  toggle(tagKey) {
    if (this.activeFilters.has(tagKey)) {
      this.activeFilters.delete(tagKey);
    } else {
      this.activeFilters.add(tagKey);
    }
  }

  /**
   * 필터 초기화
   */
  clear() {
    this.activeFilters.clear();
  }

  /**
   * 필터가 비어있는지 확인
   */
  isEmpty() {
    return this.activeFilters.size === 0;
  }

  /**
   * 필터링된 문제 목록 반환 (OR 조건)
   * @param {Map} problemTags - 문제별 태그 맵
   * @returns {Array} 필터링된 문제 배열
   */
  getFilteredProblems(problemTags) {
    if (this.isEmpty()) {
      return [];
    }

    const filtered = [];
    problemTags.forEach((problem, id) => {
      const hasAnyFilter = [...this.activeFilters].some(filter => problem.metaTags.has(filter));
      if (hasAnyFilter) {
        filtered.push(problem);
      }
    });

    this.sortProblems(filtered);
    return filtered;
  }

  /**
   * 문제 목록 정렬
   * @param {Array} problems - 정렬할 문제 배열
   */
  sortProblems(problems) {
    switch (this.sortBy) {
      case SORT_OPTIONS.ORDER:
        problems.sort((a, b) => a.order - b.order);
        break;
      case SORT_OPTIONS.PROBLEM_ID_ASC:
        problems.sort((a, b) => a.problemId - b.problemId);
        break;
      case SORT_OPTIONS.PROBLEM_ID_DESC:
        problems.sort((a, b) => b.problemId - a.problemId);
        break;
      case SORT_OPTIONS.LEVEL_ASC:
        problems.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        break;
      case SORT_OPTIONS.LEVEL_DESC:
        problems.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
        break;
      default:
        problems.sort((a, b) => a.order - b.order);
    }
  }

  /**
   * 필터링된 문제 목록 렌더링
   * @param {Map} problemTags - 문제별 태그 맵
   * @param {Function} onClear - 필터 해제 콜백 (미사용, 호환성 유지)
   */
  renderFilteredList(problemTags, onClear) {
    const filteredProblems = this.getFilteredProblems(problemTags);
    const container = this.findListContainer();

    if (!container) return;

    // 원본 콘텐츠 저장 (처음 한 번만)
    if (!this.originalContent) {
      this.originalContent = container.innerHTML;
    }

    this.isFilterMode = true;

    // 컨테이너 내용만 교체 (필터 바는 컨테이너 밖에 있음)
    container.innerHTML = '';

    // 문제 목록 렌더링
    filteredProblems.forEach(problem => {
      const li = createProblemElement(problem);
      container.appendChild(li);
    });
  }

  /**
   * 원본 페이지 복원
   */
  restoreOriginalPage() {
    const container = this.findListContainer();
    if (!container || !this.originalContent) return;

    container.innerHTML = this.originalContent;
    this.isFilterMode = false;
  }

  /**
   * 문제 목록 컨테이너 찾기 (필터 바 제외)
   */
  findListContainer() {
    // solved-tags-bar를 제외한 ul 찾기
    const lists = document.querySelectorAll('ul[class*="css-"]');
    for (const list of lists) {
      // 필터 바 내부의 요소가 아닌지 확인
      if (!list.closest('#solved-tags-bar')) {
        return list;
      }
    }
    return null;
  }
}
