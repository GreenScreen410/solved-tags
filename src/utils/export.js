// 데이터 내보내기 유틸리티
import { META_TAGS, TIER_NAMES } from './constants.js';

/**
 * problemTags Map에서 정돈된 데이터 배열 생성
 * @param {Map} problemTags - 문제별 태그 맵
 * @returns {Array} 정돈된 문제 데이터 배열
 */
function buildExportData(problemTags) {
  const data = [];

  problemTags.forEach((problem) => {
    const metaTagNames = [...problem.metaTags]
      .filter(key => META_TAGS[key])
      .map(key => META_TAGS[key].ko);

    data.push({
      problemId: problem.problemId,
      title: problem.title || '',
      level: problem.level == null ? '난이도 미제공' : (TIER_NAMES[problem.level] || 'Unrated'),
      voteLevel: problem.voteLevel == null ? '난이도 미제공' : (TIER_NAMES[problem.voteLevel] || 'Unrated'),
      metaTags: metaTagNames,
      tags: problem.allTags.map(t => t.name),
      comment: problem.description || ''
    });
  });

  return data;
}

/**
 * JSON 파일로 내보내기
 * @param {Map} problemTags - 문제별 태그 맵
 * @param {string} handle - 사용자 핸들
 */
export function exportAsJSON(problemTags, handle) {
  const data = buildExportData(problemTags);
  const exportObj = {
    handle,
    exportedAt: new Date().toISOString(),
    count: data.length,
    problems: data
  };

  const json = JSON.stringify(exportObj, null, 2);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `solved-tags_${handle}_${timestamp}.json`;

  downloadFile(json, filename, 'application/json');
}

/**
 * CSV 파일로 내보내기
 * @param {Map} problemTags - 문제별 태그 맵
 * @param {string} handle - 사용자 핸들
 */
export function exportAsCSV(problemTags, handle) {
  const data = buildExportData(problemTags);

  const headers = ['문제 번호', '제목', '현재 난이도', '투표 난이도', '메타 태그', '태그', '코멘트'];
  const rows = data.map(p => [
    p.problemId,
    csvEscape(p.title),
    p.level,
    p.voteLevel,
    csvEscape(p.metaTags.join(', ')),
    csvEscape(p.tags.join(', ')),
    csvEscape(p.comment)
  ].join(','));

  // BOM 추가 (한글 엑셀 호환)
  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows].join('\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `solved-tags_${handle}_${timestamp}.csv`;

  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * CSV 필드 이스케이프
 */
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Blob API를 사용한 파일 다운로드
 * @param {string} content - 파일 내용
 * @param {string} filename - 파일명
 * @param {string} mimeType - MIME 타입
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // 정리
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
