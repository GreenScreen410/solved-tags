// Background Service Worker
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.storage.local.set({ enabled: true });
  });

  // 메시지 리스너
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SETTINGS') {
      browser.storage.local.get(['enabled']).then((result) => {
        sendResponse(result);
      });
      return true; // 비동기 응답을 위해 true 반환
    }
  });
});
