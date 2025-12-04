// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[solved.tags] Extension installed');

  // 기본 설정 저장
  chrome.storage.local.set({ enabled: true });
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse(result);
    });
    return true; // 비동기 응답을 위해 true 반환
  }
});
