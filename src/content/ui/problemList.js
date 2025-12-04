// 문제 목록 렌더링 관련 함수들
import { META_TAGS, TIER_IMG_URL, TIER_NAMES, TIER_COLORS } from '../../shared/constants.js';

/**
 * 문제 요소 생성
 * @param {Object} problem - 문제 데이터
 * @returns {HTMLElement} li 요소
 */
export function createProblemElement(problem) {
  const li = document.createElement('li');
  li.className = 'solved-tags-problem-item';

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
      <div class="problem-meta-tags">${metaTagsHtml}</div>
      <div class="problem-tags">${tagsHtml}</div>
    </div>
  `;

  return li;
}
