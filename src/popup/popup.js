// Popup Script
document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enable-toggle');
  const handleInput = document.getElementById('handle-input');

  // 저장된 설정 불러오기
  chrome.storage.local.get(['enabled', 'myHandle'], (result) => {
    enableToggle.checked = result.enabled !== false;
    handleInput.value = result.myHandle || '';
  });

  // 토글 변경 시 즉시 저장 및 페이지 새로고침
  enableToggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enableToggle.checked }, () => {
      console.log('[solved.tags] 설정 저장됨:', enableToggle.checked);
    });

    // 현재 탭 새로고침
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('solved.ac')) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });

  // 핸들 입력 시 저장 (debounce)
  let saveTimeout;
  handleInput.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const handle = handleInput.value.trim();
      chrome.storage.local.set({ myHandle: handle }, () => {
        console.log('[solved.tags] 핸들 저장됨:', handle);
      });

      // 현재 탭 새로고침
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('solved.ac')) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    }, 500);
  });
});
