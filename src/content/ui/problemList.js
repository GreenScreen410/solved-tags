// 문제 목록 렌더링 관련 함수들
import { META_TAGS, TIER_IMG_URL, TIER_NAMES, TIER_COLORS } from '../../shared/constants.js';
import { isDarkMode } from '../theme.js';

/**
 * 문제 요소 생성
 * @param {Object} problem - 문제 데이터
 * @returns {HTMLElement} li 요소
 */
export function createProblemElement(problem) {
  const li = document.createElement('li');
  li.className = 'solved-tags-problem-item';

  // 생성 시점에 다크 모드 클래스 적용
  if (isDarkMode()) {
    li.classList.add('solved-tags-dark');
  }

  // 문제의 현재 난이도
  const problemLevel = problem.level ?? 0;
  const tierName = TIER_NAMES[problemLevel] || 'Unrated';
  const tierColor = TIER_COLORS[problemLevel] || '#2d2d2d';

  // 투표한(기여한) 난이도
  const voteTierName = TIER_NAMES[problem.voteLevel] || 'Unrated';
  const voteTierColor = TIER_COLORS[problem.voteLevel] || '#2d2d2d';

  // META_TAGS 정의 순서대로 메타 태그 정렬
  const orderedMetaTags = Object.keys(META_TAGS).filter(key => problem.metaTags.has(key));

  const metaTagsHtml = orderedMetaTags.map(tagKey => {
    const info = META_TAGS[tagKey];
    if (!info) return '';
    return `<span class="problem-meta-badge" style="background-color: ${info.color}20; color: ${info.color}; border-color: ${info.color}">${info.svg} ${info.ko}</span>`;
  }).join('');

  const tagsHtml = problem.allTags.slice(0, 5).map(tag =>
    `<a href="/problems/tags/${tag.key}" class="problem-tag">#${tag.name}</a>`
  ).join('');

  // 코멘트가 있으면 표시
  const commentHtml = problem.description
    ? `<div class="problem-comment">${escapeHtml(problem.description)}</div>`
    : '';

  li.innerHTML = `
    <div class="problem-content">
      <div class="problem-header">
        <a href="https://www.acmicpc.net/problem/${problem.problemId}" target="_blank" rel="noreferrer" class="problem-link">
          <img src="${TIER_IMG_URL}${problemLevel}.svg" alt="${tierName}" class="tier-icon">
          <span class="problem-id">${problem.problemId}</span>
        </a>
        <span class="problem-arrow">→</span>
        <img src="${TIER_IMG_URL}${problem.voteLevel}.svg" alt="${voteTierName}" class="tier-icon">
        <span class="tier-name" style="color: ${voteTierColor}">${voteTierName}</span>
      </div>
      ${commentHtml}
      <div class="problem-meta-tags">${metaTagsHtml}</div>
      <div class="problem-tags">${tagsHtml}</div>
    </div>
  `;

  return li;
}

/**
 * HTML 이스케이프 (XSS 방지)
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
