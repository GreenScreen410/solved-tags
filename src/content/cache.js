// 캐시 관리 함수들
import { CACHE_KEY_PREFIX, CACHE_EXPIRY_HOURS } from '../shared/constants.js';

/**
 * 캐시에서 데이터 로드
 * @param {string} handle - 사용자 핸들
 * @returns {Object|null} 캐시된 데이터 또는 null
 */
export function loadFromCache(handle) {
  try {
    const cacheKey = CACHE_KEY_PREFIX + handle;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const now = Date.now();
    const expiry = data.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

    if (now > expiry) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`[solved.tags] 캐시에서 데이터 로드 (${new Date(data.timestamp).toLocaleString()})`);
    return data;
  } catch (e) {
    console.error('[Solved Tags] 캐시 로드 실패:', e);
    return null;
  }
}

/**
 * 캐시에 데이터 저장
 * @param {string} handle - 사용자 핸들
 * @param {Array} votes - 투표 데이터
 * @param {Map} problemTagsData - 문제별 태그 데이터
 */
export function saveToCache(handle, votes, problemTagsData) {
  try {
    const cacheKey = CACHE_KEY_PREFIX + handle;
    // Map을 배열로 변환하여 저장
    const problemTagsArray = [];
    problemTagsData.forEach((value, key) => {
      problemTagsArray.push({
        id: key,
        ...value,
        metaTags: [...value.metaTags] // Set을 배열로 변환
      });
    });

    const data = {
      timestamp: Date.now(),
      votes: votes,
      problemTags: problemTagsArray
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
    console.log('[solved.tags] 캐시에 데이터 저장됨');
  } catch (e) {
    console.error('[Solved Tags] 캐시 저장 실패:', e);
  }
}

/**
 * 캐시된 데이터를 Map/Set으로 복원
 * @param {Object} cachedData - 캐시된 데이터
 * @returns {Object} { votes, problemTags }
 */
export function restoreFromCache(cachedData) {
  const votes = cachedData.votes;
  const problemTags = new Map();

  cachedData.problemTags.forEach(item => {
    problemTags.set(item.id, {
      ...item,
      metaTags: new Set(item.metaTags) // 배열을 Set으로 변환
    });
  });

  return { votes, problemTags };
}
