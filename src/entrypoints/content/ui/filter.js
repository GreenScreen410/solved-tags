export const SORT_OPTIONS = {
  ORDER: 'order',
  PROBLEM_ID_ASC: 'id_asc',
  PROBLEM_ID_DESC: 'id_desc',
  LEVEL_ASC: 'level_asc',
  LEVEL_DESC: 'level_desc'
};

const compareBy = {
  [SORT_OPTIONS.PROBLEM_ID_ASC]: (a, b) => a.problemId - b.problemId,
  [SORT_OPTIONS.PROBLEM_ID_DESC]: (a, b) => b.problemId - a.problemId,
  [SORT_OPTIONS.LEVEL_ASC]: (a, b) => (a.level ?? 0) - (b.level ?? 0),
  [SORT_OPTIONS.LEVEL_DESC]: (a, b) => (b.level ?? 0) - (a.level ?? 0)
};

export function filterProblems(problems, activeTags, sort) {
  const tags = [...activeTags];
  const matches = [];
  for (const problem of problems.values()) {
    if (tags.some(tag => problem.votesByMetaTag.has(tag))) matches.push(problem);
  }

  // The API and the problem collection already follow the selected native sort.
  if (sort !== SORT_OPTIONS.ORDER) matches.sort(compareBy[sort]);
  return matches;
}
