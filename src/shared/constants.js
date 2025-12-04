// 메타 태그 정의 (언더바로 시작하는 태그들) - solved.ac 스타일 SVG 아이콘 사용
export const META_TAGS = {
  '_recommend': {
    ko: '추천',
    color: '#f44336',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037 .033l.034 -.03a6 6 0 0 1 4.733 -1.44l.246 .036a6 6 0 0 1 3.364 10.008l-.18 .185l-.048 .041l-7.45 7.379a1 1 0 0 1 -1.313 .082l-.094 -.082l-7.493 -7.422a6 6 0 0 1 3.176 -10.215z"></path></svg>'
  },
  '_brilliant': {
    ko: '기발한',
    color: '#ff9800',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"></path><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"></path><path d="M9.7 17l4.6 0"></path></svg>'
  },
  '_educational': {
    ko: '교육적인',
    color: '#4caf50',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"></path><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"></path><path d="M3 6l0 13"></path><path d="M12 6l0 13"></path><path d="M21 6l0 13"></path></svg>'
  },
  '_implementation': {
    ko: '구현 많은',
    color: '#27c4df',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.414 10l-7.383 7.418a2.091 2.091 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0l7.407 -7.385"></path><path d="M18.121 15.293l2.586 -2.586a1 1 0 0 0 0 -1.414l-7.586 -7.586a1 1 0 0 0 -1.414 0l-2.586 2.586a1 1 0 0 0 0 1.414l7.586 7.586a1 1 0 0 0 1.414 0z"></path></svg>'
  },
  '_mistakable': {
    ko: '실수하기 쉬운',
    color: '#531cec',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1"></path><path d="M13 14l-2 4l3 0l-2 4"></path></svg>'
  },
  '_language_shortcuts': {
    ko: '특정 언어에서 쉬운',
    color: '#9c27b0',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-13a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-9l-4 4"></path><path d="M10 14v-4a2 2 0 1 1 4 0v4"></path><path d="M14 12h-4"></path></svg>'
  },
  '_proof_by_ac': {
    ko: '증명이 어려운',
    color: '#d3244a',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l6 0"></path><path d="M10 9l4 0"></path><path d="M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6"></path></svg>'
  }
};

// 티어 이미지 URL
export const TIER_IMG_URL = 'https://static.solved.ac/tier_small/';

// 티어 이름
export const TIER_NAMES = [
  'Unrated', 'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I'
];

// 티어 색상
export const TIER_COLORS = {
  0: '#2d2d2d',
  1: '#ad5600', 2: '#ad5600', 3: '#ad5600', 4: '#ad5600', 5: '#ad5600',
  6: '#435f7a', 7: '#435f7a', 8: '#435f7a', 9: '#435f7a', 10: '#435f7a',
  11: '#ec9a00', 12: '#ec9a00', 13: '#ec9a00', 14: '#ec9a00', 15: '#ec9a00',
  16: '#27e2a4', 17: '#27e2a4', 18: '#27e2a4', 19: '#27e2a4', 20: '#27e2a4',
  21: '#00b4fc', 22: '#00b4fc', 23: '#00b4fc', 24: '#00b4fc', 25: '#00b4fc',
  26: '#ff0062', 27: '#ff0062', 28: '#ff0062', 29: '#ff0062', 30: '#ff0062'
};

// 캐시 설정
export const CACHE_KEY_PREFIX = 'solved_tags_cache_';
