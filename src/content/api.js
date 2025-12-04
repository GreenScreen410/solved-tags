// API 관련 함수들

/**
 * API에서 모든 투표 데이터 가져오기
 * @param {string} handle - 사용자 핸들
 * @returns {Promise<Array>} 투표 데이터 배열
 */
export async function fetchAllVotes(handle) {
  const votes = [];
  let totalCount = 0;

  try {
    // 첫 페이지 가져오기
    const firstResponse = await fetch(`https://solved.ac/api/v3/user/votes?handle=${handle}&page=1`);
    if (!firstResponse.ok) throw new Error('API 요청 실패');

    const firstData = await firstResponse.json();
    totalCount = firstData.count;
    votes.push(...firstData.items);

    const totalPages = Math.ceil(totalCount / 30);
    console.log(`[solved.tags] 총 ${totalCount}개 투표, ${totalPages} 페이지`);

    // 나머지 페이지들 병렬로 가져오기 (2페이지부터)
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        fetch(`https://solved.ac/api/v3/user/votes?handle=${handle}&page=${p}`)
          .then(res => res.json())
          .then(data => data.items)
      );
    }

    const remainingPages = await Promise.all(pagePromises);
    remainingPages.forEach(items => votes.push(...items));

    return votes;
  } catch (error) {
    console.error('[Solved Tags] 데이터 가져오기 실패:', error);
    return [];
  }
}

/**
 * 문제별 메타 태그 집계
 * @param {Array} votes - 투표 데이터 배열
 * @returns {Map} 문제별 태그 맵
 */
export function aggregateMetaTags(votes) {
  const problemTagsMap = new Map();
  let orderIndex = 0;

  votes.forEach(vote => {
    const problemId = vote.problemId;

    if (!problemTagsMap.has(problemId)) {
      problemTagsMap.set(problemId, {
        problemId,
        title: vote.problem?.titleKo || vote.problem?.title || vote.titleKo || vote.title,
        level: vote.problem?.level,      // 문제의 현재 난이도
        voteLevel: vote.level,           // 사용자가 투표한(기여한) 난이도
        metaTags: new Set(),
        allTags: [],
        description: vote.comment || '',
        order: orderIndex++              // 기여 순서 (API 응답 순서)
      });
    }

    const problem = problemTagsMap.get(problemId);

    vote.voteTags.forEach(tag => {
      if (tag.key.startsWith('_')) {
        problem.metaTags.add(tag.key);
      }
      if (!tag.isMeta && !tag.key.startsWith('_')) {
        const tagName = tag.displayNames?.find(d => d.language === 'ko')?.name || tag.key;
        if (!problem.allTags.find(t => t.key === tag.key)) {
          problem.allTags.push({ key: tag.key, name: tagName });
        }
      }
    });
  });

  return problemTagsMap;
}
