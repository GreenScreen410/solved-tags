// Popup Script
document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enable-toggle');

  // 저장된 설정 불러오기
  browser.storage.local.get(['enabled']).then((result) => {
    enableToggle.checked = result.enabled !== false;
  });

  // 토글 변경 시 즉시 저장 및 페이지 새로고침
  enableToggle.addEventListener('change', () => {
    browser.storage.local.set({ enabled: enableToggle.checked });

    // 현재 탭 새로고침
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0] && tabs[0].url.includes('solved.ac')) {
        browser.tabs.reload(tabs[0].id);
      }
    });
  });
});
