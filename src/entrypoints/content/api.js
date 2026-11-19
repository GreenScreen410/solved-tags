import { META_TAGS } from '../../utils/constants.js';

const PAGE_BATCH_SIZE = 4;

const LEGACY_META_TAGS = {
  _recommend: ':recommend',
  _brilliant: ':brilliant',
  _educational: ':edu',
  _implementation: ':impl',
  _mistakable: ':mistake',
  _language_shortcuts: ':lang',
  _proof_by_ac: ':proof'
};

// Pagination belongs to the native list. The extension counts all pages for
// the current contribution type, comment filter, and sort.
export function contributionQuery(search) {
  const params = new URLSearchParams(search);
  const query = new URLSearchParams({ sort: params.get('sort') === 'helpful' ? 'helpful' : 'recent' });
  const only = params.get('only');
  if (['scoring', 'helpful', 'vouched'].includes(only)) query.set('only', only);
  if (params.get('commented') === 'true') query.set('commented', 'true');
  return query.toString();
}

export async function fetchContributionStats(handle, locale, query, signal, onProgress) {
  const url = new URL(`/api/v4/users/${encodeURIComponent(handle)}/contributions`, location.origin);
  url.search = query;
  url.searchParams.set('limit', '20');

  async function fetchPage(page) {
    url.searchParams.set('page', String(page));
    const options = { credentials: 'same-origin', signal };
    // Firefox MV2 provides a fetch that uses the page's origin and login session.
    const response = typeof globalThis.content?.fetch === 'function'
      ? await globalThis.content.fetch(url.href, options)
      : await fetch(url.href, options);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('solved.ac 로그인 상태와 기여 공개 범위를 확인해 주세요.');
      }
      if (response.status === 429) {
        throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      }
      throw new Error(`기여 데이터를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0 ||
        !Number.isInteger(data.pageSize) || data.pageSize < 1 || data.page !== page ||
        !Number.isInteger(data.hiddenCount) || data.hiddenCount < 0) {
      throw new Error('solved.ac의 기여 데이터 응답 형식이 올바르지 않습니다.');
    }
    return data;
  }

  const first = await fetchPage(1);
  const problems = new Map();
  addContributions(problems, first.items, locale);
  const pages = Math.ceil(first.total / first.pageSize);
  onProgress?.(1, Math.max(1, pages));
  for (let page = 2; page <= pages; page += PAGE_BATCH_SIZE) {
    const batchSize = Math.min(PAGE_BATCH_SIZE, pages - page + 1);
    const batch = await Promise.all(Array.from({ length: batchSize },
      (_, offset) => fetchPage(page + offset)));
    for (const result of batch) addContributions(problems, result.items, locale);
    onProgress?.(page + batchSize - 1, pages);
  }
  return { problems, hiddenCount: first.hiddenCount, scoped: url.searchParams.has('only') || url.searchParams.has('commented') };
}

function addContributions(problems, items, locale) {
  for (const item of items) {
    const { problem, vote } = item;
    const { problemId, subId, titles, level } = problem;
    const key = JSON.stringify([problemId, subId]);
    let entry = problems.get(key);
    if (!entry) {
      const title = titles.find(item => item.language === locale) ??
        titles.find(item => item.isOriginal) ?? titles[0];
      entry = {
        problemId,
        subId,
        contributionCount: 0,
        title: title?.title ?? '',
        level,
        voteLevel: vote.level,
        description: vote.comment ?? '',
        votesByMetaTag: new Map(),
        allTags: new Set()
      };
      problems.set(key, entry);
    }

    entry.contributionCount++;
    for (const { tag, legacyKey } of vote.tags) {
      const key = tag?.key ?? legacyKey;
      const metaKey = Object.hasOwn(LEGACY_META_TAGS, key) ? LEGACY_META_TAGS[key] : key;
      if (Object.hasOwn(META_TAGS, metaKey)) {
        // Keep the first contribution for each tag in the native API's sort order.
        if (!entry.votesByMetaTag.has(metaKey)) entry.votesByMetaTag.set(metaKey, item);
      } else if (tag && !tag.isMeta) {
        entry.allTags.add(tag.key);
      }
    }
  }
}
