import { META_TAGS, TIER_NAMES } from './constants.js';

function tierName(level) {
  return level == null ? '난이도 미제공' : (TIER_NAMES[level] ?? 'Unrated');
}

function exportProblem(problem) {
  return {
    problemId: problem.problemId,
    subId: problem.subId,
    title: problem.title || '',
    level: tierName(problem.level),
    voteLevel: tierName(problem.voteLevel),
    metaTags: Array.from(problem.votesByMetaTag.keys(), key => META_TAGS[key]?.ko).filter(Boolean),
    tags: [...problem.allTags],
    comment: problem.description || ''
  };
}

export function exportAsJSON(problems, handle) {
  const exportedAt = new Date().toISOString();
  const payload = {
    handle,
    exportedAt,
    count: problems.size,
    problems: Array.from(problems.values(), exportProblem)
  };
  downloadFile(JSON.stringify(payload, null, 2), handle, exportedAt, 'json', 'application/json');
}

export function exportAsCSV(problems, handle) {
  const rows = ['\uFEFF문제 번호,하위 ID,제목,현재 난이도,투표 난이도,메타 태그,태그,코멘트'];
  for (const problem of problems.values()) {
    const p = exportProblem(problem);
    const fields = [
      p.problemId, p.subId, p.title, p.level, p.voteLevel,
      p.metaTags.join(', '), p.tags.join(', '), p.comment
    ];
    rows.push(fields.map(csvEscape).join(','));
  }
  downloadFile(rows.join('\n'), handle, new Date().toISOString(), 'csv', 'text/csv;charset=utf-8');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadFile(content, handle, exportedAt, extension, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `solved-tags_${handle}_${exportedAt.slice(0, 10)}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
