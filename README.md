<p align="center">
  <img src="public/icon128.png" alt="solved.tags logo" width="128" height="128">
</p>

<h1 align="center">solved.tags</h1>

<p align="center">
  <strong>solved.ac 기여 페이지에서 메타 태그 통계를 확인하세요</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-development">Development</a> •
  <a href="#-license">License</a>
  <a href="#-Credits">Credits</a>
</p>

---

## ✨ Features

[solved.ac](https://solved.ac) 프로필의 **기여** 페이지에서 자신이 투표한 문제들의 메타 태그를 한눈에 확인할 수 있습니다.

- **메타 태그 통계** - 7가지 메타 태그별 기여 개수 확인
- **필터링** - 선택한 메타 태그 중 하나라도 포함한 문제를 40개씩 표시
- **정렬** - 기여 순서, 문제 번호, 난이도 순으로 정렬
- **코멘트 표시** - 기여 시 작성한 코멘트 확인
- **캐싱** - 현재 탭에서 조회 결과를 재사용하고 수동으로 갱신
- **다크 모드** - solved.ac의 현재 테마에 맞춰 표시
- **CSV/JSON 내보내기** - 기여 데이터를 CSV 또는 JSON 형식으로 내보내기

### 지원하는 메타 태그

| 태그 | 설명 |
|------|------|
| 추천 | 좋은 문제로 추천 |
| 기발한 | 창의적인 아이디어가 필요한 문제 |
| 교육적인 | 학습에 도움이 되는 문제 |
| 구현 많은 | 구현량이 많은 문제 |
| 실수하기 쉬운 | 실수하기 쉬운 함정이 있는 문제 |
| 특정 언어에서 쉬운 | 특정 프로그래밍 언어에서 유리한 문제 |
| 증명이 어려운 | 풀이의 정당성 증명이 어려운 문제 |

## 📦 Installation

Chrome 111 이상 또는 Firefox 128 이상을 지원합니다.

### Chrome

1. [Chrome Web Store](https://chromewebstore.google.com/detail/solvedtags/ofcomeknbplijbojjmhcpanandbpckek)에서 설치

**또는 수동 설치:**

1. [Chrome용 v1.4.1 ZIP](../../releases/download/v1.4.1/solved-tags-1.4.1-chrome.zip) 다운로드
2. 압축 해제
3. Chrome에서 `chrome://extensions` 접속
4. 우측 상단 **개발자 모드** 활성화
5. **압축해제된 확장 프로그램을 로드합니다** 클릭
6. 압축 해제한 폴더 선택

### Firefox

1. [Firefox Add-ons](https://addons.mozilla.org/ko/firefox/addon/solved-tags/)에서 설치

**또는 수동 설치:**

1. [Firefox용 v1.4.1 ZIP](../../releases/download/v1.4.1/solved-tags-1.4.1-firefox.zip) 다운로드
2. Firefox에서 `about:debugging#/runtime/this-firefox` 접속
3. **임시 부가 기능 로드** 클릭
4. zip 파일 또는 `manifest.json` 선택

---

## 🚀 Usage

1. solved.ac에 로그인합니다.
2. 프로필의 기여 페이지(`https://solved.ac/ko/u/{핸들}/contributions`)를 엽니다.
3. 제목 아래의 **메타 태그 불러오기**를 클릭합니다.

확장 프로그램은 현재 solved.ac 로그인 세션에서 볼 수 있는 기여만 조회합니다. 필터를 선택하면 현재 페이지에서 확인할 수 있는 일치 항목을 먼저 표시하고, 나머지 기여 행을 같은 목록에 채웁니다. 같은 문제에 여러 번 기여했다면 선택한 태그가 포함된 가장 최근 기여를 표시합니다.

<p align="center">
  <img src="docs/screenshot.png" alt="solved.tags 1.4 메타 태그 필터와 통계 예시" width="600">
</p>

---

## 🛠 Development

> 이 프로젝트는 [WXT](https://wxt.dev/) 프레임워크를 사용합니다.

### 요구 사항

- Node.js 18+
- npm

### 설치

```bash
git clone https://github.com/GreenScreen410/solved-tags.git
cd solved-tags
npm install
```

### 빌드

```bash
# Chrome용 빌드
npm run build

# Firefox용 빌드
npm run build:firefox

# 둘 다 빌드
npm run build:all

# Zip 패키징
npm run zip:all
```

빌드와 ZIP은 `.output-v4/`에 생성됩니다. Chrome은 `.output-v4/chrome-mv3/`, Firefox는 `.output-v4/firefox-mv2/`를 사용합니다.

### 개발 모드

```bash
# Chrome 개발 서버 (HMR 지원)
npm run dev

# Firefox 개발 서버
npm run dev:firefox
```

### 프로젝트 구조

```
solved-tags/
├── src/
│   ├── entrypoints/
│   │   ├── content.js         # 컨텐츠 스크립트 진입점
│   │   ├── native-rows.content.js # 필터 결과를 사이트의 기여 행으로 표시
│   │   ├── content/
│   │   │   ├── ui/
│   │   │   │   ├── filterBar.js    # 필터 바 UI
│   │   │   │   ├── filter.js       # 필터 로직
│   │   │   │   └── nativeResults.js # solved.ac 기여 목록 프레임
│   │   │   ├── api.js         # solved.ac v4 API 통신
│   │   │   └── content.css    # 컨텐츠 스타일
│   │   └── popup/
│   │       ├── index.html     # 팝업 UI
│   │       ├── style.css      # 팝업 스타일
│   │       └── main.js        # 팝업 로직
│   └── utils/
│       └── constants.js       # 공유 상수 (메타 태그 등)
├── public/                    # 정적 에셋 (아이콘 등)
├── .output-v4/                # 빌드 출력 (WXT)
├── wxt.config.ts              # WXT 설정 (매니페스트 포함)
└── package.json
```

---

## 📄 License

MIT License

---

## 🙏 Credits

- [solved.ac](https://solved.ac) - 백준 난이도 및 태그 서비스
- [WXT](https://wxt.dev/) - 브라우저 확장 프로그램 프레임워크
- [Tabler Icons](https://tabler-icons.io) - SVG 아이콘
- [Pretendard](https://github.com/orioncactus/pretendard) - 폰트

### Contributors

- [@oh040411](https://www.acmicpc.net/user/oh040411) - 다크모드 버그 제보
- [@hibye1217](https://www.acmicpc.net/user/hibye1217) - 난이도 미제공 티어 버그 제보, 메타 태그 배치 아이디어 제공
- [@js7777](https://www.acmicpc.net/user/js7777) - 난이도 미제공 티어 버그 제보, 페이지 이동 관련 버그 제보

---

<p align="center">
  Made with ❤️ for the competitive programming community
</p>
