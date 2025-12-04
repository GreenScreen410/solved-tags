// 브라우저 API 호환 레이어
// Firefox는 browser.*, Chrome은 chrome.*을 사용
// Firefox도 chrome.*을 지원하지만, Promise 기반 API를 위해 browser 사용 권장

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export default browserAPI;
