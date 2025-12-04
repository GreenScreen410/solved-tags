// 테마 감지 및 적용 유틸리티

/**
 * 다크 모드 여부 확인
 */
export function isDarkMode() {
  const html = document.documentElement;
  const body = document.body;

  // data-theme 속성 확인
  const htmlTheme = html.getAttribute('data-theme');
  const bodyTheme = body?.getAttribute('data-theme');

  if (htmlTheme === 'dark' || htmlTheme === 'black' ||
    bodyTheme === 'dark' || bodyTheme === 'black') {
    return true;
  }

  // 클래스 확인
  if (html.classList.contains('dark') || body?.classList.contains('dark')) {
    return true;
  }

  // 배경색으로 판단 (fallback)
  const bgColor = getComputedStyle(body || html).backgroundColor;
  if (bgColor) {
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
      if (brightness < 50) return true;
    }
  }

  return false;
}

/**
 * solved.ac 테마 감지 및 클래스 적용 시작
 */
export function startThemeDetection() {
  const applyTheme = () => {
    const dark = isDarkMode();

    // 필터 바에 클래스 적용
    const bar = document.getElementById('solved-tags-bar');
    if (bar) {
      bar.classList.toggle('solved-tags-dark', dark);
    }

    // 문제 목록 아이템에도 클래스 적용
    document.querySelectorAll('.solved-tags-problem-item').forEach(item => {
      item.classList.toggle('solved-tags-dark', dark);
    });
  };

  // 초기 적용
  applyTheme();

  // MutationObserver로 테마 변경 감지
  const observer = new MutationObserver(applyTheme);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  });

  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });
  }
}
