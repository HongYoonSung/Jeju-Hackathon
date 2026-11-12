# 제주얼마꽈 — 구현 명세서 (SPEC v0.1)

> 이 문서는 **어떤 AI 코딩 모델에게 전달해도 같은 결과물이 나오도록** 작성된 단일 명세서입니다.
> 💡 `📚 왜?` 박스는 사람이 읽고 공부하기 위한 설명이며, 구현 AI는 무시해도 됩니다.

---

## 0. AI 구현자에게 (반드시 먼저 읽을 것)

### 0.1 절대 규칙
1. **이 문서에 적힌 기능만 구현한다.** 부록 B(승인 대기 제안)에 있는 것은 **절대 구현하지 않는다.** 임의로 기능·화면·버튼·문구를 추가하지 않는다.
2. **AI 모델 연동부는 구현하지 않는다.** 6장의 인터페이스와 Mock 구현체만 만든다. 실제 모델 호출 코드는 `NotImplementedError`를 던지는 스텁으로 둔다.
3. 파일은 **생략 없이 전체**를 출력한다. (`// ...생략` 금지)
4. **API Key, 비밀번호, 토큰을 코드에 쓰지 않는다.** 모든 설정은 환경변수(`.env`)로 받고, `.env.example`만 제공한다.
5. 런타임에 **외부 CDN을 사용하지 않는다.** (폰트·아이콘·라이브러리 모두 npm으로 번들. 센터 PC가 폐쇄망일 수 있음)
6. 모호한 부분을 만나면 **기본값(`[기본값]` 표시)** 을 쓰고, 코드 주석에 `// SPEC-DEFAULT: <id>`를 남긴다.
7. 구현 순서는 **13장**을 따른다. 각 단계 끝에 검증 명령을 실행해 통과시킨다.

### 0.2 프로젝트 한 줄 정의
제주도민이 자연어로 "우유 1L 어디가 싸?"처럼 검색하면, AI가 **오프라인 매장 + 온라인몰**을 찾아 가격순으로 보여주고, **지도(우측)와 목록 사이드바(좌측)** 로 거리·가격·혼잡도를 비교하며 **길찾기**까지 제공하는 웹 서비스. 서비스명은 **제주얼마꽈**.

### 0.3 우선순위 표기
- **P1**: 핵심 (먼저 구현) / **P2**: 후순위 / **P3**: 선택(인터페이스 + Mock + 비활성 UI까지만)

---

## 1. 기능 요구사항 (기능서 → 추적 ID)

| ID | 우선순위 | 기능서 원문 요약 | 구현 위치 |
|---|---|---|---|
| F-01 | P2 | 메인 페이지, 제주 풍경 사진 영역 | `HomePage` |
| F-02 | P2 | 아이디 로그인 / 회원가입 | `LoginPage`, `SignupPage` |
| F-03 | P1 | 자연어 검색 → AI가 결과 도출 | `SearchBar`, `/api/search` |
| F-04 | P1 | 결과를 좌측 사이드바에 순서대로(오름차순) 나열, 온라인=`사이트` / 오프라인=`매장` 문구 | `ResultList`, `TypeBadge` |
| F-05 | P1 | 분류 버튼(거리별·가격별·오프라인/온라인) | `ClassificationBar` |
| F-06 | P1 | 사이드바에서 오프라인 매장 클릭 → 우측 지도에서 위치 표시 | `ResultCard`, `MapCanvas` |
| F-07 | P1 | 매장 클릭 시 길찾기 버튼 → 출발 주소 입력 → 길찾기·거리 계산 | `RoutePanel`, `/api/geocode`, `/api/route` |
| F-08 | P1 | 온라인몰 클릭 → 검색된 상태로 해당 사이트 이동 | `ResultCard`, `safeUrl` |
| F-09 | P1 | 매장명 옆에 혼잡도 색상(빨강/주황/노랑/초록) + 인원수 | `CrowdBadge`, `AIAgent.estimate_crowd` |
| F-10 | P3 | 대중교통 길안내(이용 수단·소요시간) | `/api/transit`, `RoutePanel`(비활성 탭) |

---

## 2. 기술 스택 (고정)

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트 | **Vite + React 18 + TypeScript** | 빠른 개발, 타입으로 API 계약 보호 |
| 라우팅 | react-router-dom v6 | |
| 서버상태 | @tanstack/react-query v5 | 로딩·에러·재시도 처리 표준화 |
| 클라이언트 상태 | zustand v4 | 선택·정렬·위치 등 소규모 전역 상태 |
| 지도 | **leaflet 1.9 + react-leaflet 4** | 폐쇄망에서 타일 서버만 바꾸면 동작 |
| 스타일 | **CSS Modules + CSS 변수(디자인 토큰)** | UI 라이브러리 의존 없음 → 모델이 달라도 결과 동일 |
| 폰트 | `@fontsource/pretendard` (셀프호스팅) | CDN 금지 |
| 백엔드 | **Python 3.11 + FastAPI + Uvicorn + Pydantic v2** | 학습시킨 AI 모델(Python)과 직접 연결 용이 |
| HTTP 클라이언트 | httpx (async) | |
| 테스트 | pytest / vitest + @testing-library/react | |
| 배포 형태 | `npm run build` → FastAPI가 `frontend/dist`를 정적 서빙 → **프로세스 1개로 실행** | 센터 PC 설치 단순화 |

> 📚 **왜 지도 라이브러리로 Leaflet인가?**
> 네이버 지도 JS API는 인터넷 + API Key가 필수라, 반출 불가 데이터를 쓰는 폐쇄망 PC에서는 지도가 아예 안 뜰 수 있습니다. Leaflet은 "타일 이미지 주소(URL 템플릿)"만 바꾸면 되므로, 개발 중엔 인터넷 타일, 센터에서는 로컬 타일로 교체할 수 있습니다. 그래서 지도 컴포넌트를 `MapCanvas` 하나로 격리해, 나중에 네이버 지도 구현체로 갈아끼울 수 있게 합니다.

---

## 3. 폴더 구조 (이 구조 그대로 생성)

```
jeju-eolmakkwa/
├─ README.md
├─ .env.example
├─ scripts/
│  ├─ dev.sh                  # 백엔드+프론트 동시 개발 실행
│  └─ build_and_serve.sh      # 프론트 빌드 후 백엔드 단독 실행
├─ docs/                      # 대회 제출 문서(14장 템플릿)
│  ├─ DATA_USAGE.md
│  ├─ AI_DISCLOSURE.md
│  └─ USER_MANUAL.md
├─ backend/
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ main.py              # FastAPI 앱, CORS, 정적 서빙, 라우터 등록
│  │  ├─ config.py            # pydantic-settings 기반 환경변수 로딩
│  │  ├─ errors.py            # 공통 에러 응답
│  │  ├─ schemas.py           # Pydantic 모델 (7장 계약과 1:1)
│  │  ├─ api/
│  │  │  ├─ health.py
│  │  │  ├─ search.py
│  │  │  ├─ geocode.py
│  │  │  ├─ route.py
│  │  │  ├─ transit.py        # P3 (Mock)
│  │  │  └─ auth.py           # P2 (501 스텁)
│  │  ├─ ai/
│  │  │  ├─ base.py           # AIAgent Protocol  ← AI 슬롯의 경계선
│  │  │  ├─ mock_agent.py     # 개발용 가짜 AI
│  │  │  ├─ local_model_agent.py  # ★ 사용자가 학습시킨 모델이 들어올 빈 자리(스텁)
│  │  │  └─ registry.py       # AI_BACKEND 환경변수로 구현체 선택
│  │  ├─ providers/
│  │  │  ├─ geocode_base.py / geocode_mock.py / geocode_nominatim.py / geocode_naver.py
│  │  │  └─ route_base.py / route_estimate.py / route_osrm.py / route_naver.py
│  │  ├─ utils/geo.py         # haversine
│  │  └─ data/mock/
│  │     ├─ stores.json       # 오프라인 매장 예시
│  │     ├─ online_malls.json # 온라인몰 예시
│  │     └─ landmarks.json    # Mock 지오코더용 지명 사전
│  └─ tests/
│     ├─ test_search.py  test_route.py  test_geocode.py  test_mock_agent.py
└─ frontend/
   ├─ package.json  vite.config.ts  tsconfig.json  index.html
   ├─ public/
   │  └─ hero-jeju-placeholder.svg
   └─ src/
      ├─ main.tsx  App.tsx
      ├─ styles/ tokens.css  global.css
      ├─ types/api.ts                 # 백엔드 스키마와 동일한 TS 타입
      ├─ lib/ api.ts  geo.ts  format.ts  crowd.ts  safeUrl.ts
      ├─ store/ useSearchStore.ts  useLocationStore.ts
      ├─ components/
      │  ├─ layout/ Header.tsx  Logo.tsx  PageBanner.tsx
      │  ├─ search/ SearchBar.tsx  LocationChip.tsx  ClassificationBar.tsx
      │  │          ResultList.tsx  ResultCard.tsx  TypeBadge.tsx  CrowdBadge.tsx  RoutePanel.tsx
      │  └─ map/ MapCanvas.tsx  markerIcon.ts
      ├─ pages/ HomePage.tsx  SearchPage.tsx  LoginPage.tsx  SignupPage.tsx  NotFoundPage.tsx
      └─ tests/
```

---

## 4. 디자인 시스템

### 4.1 방향
**제주데이터허브(jejudatahub.net)와 제주도청 사이트의 톤**을 따른다: 흰 배경, 차분한 **코발트 블루**, 얇은 회색 구분선, 각진 느낌의 작은 라운드(4px), 상단 가로 내비게이션, 연한 하늘색 배너(물결 라인 패턴).
Figma 초안은 **레이아웃 뼈대만** 참고하고(색은 무시: 빨강/초록/검정 박스는 자리표시자), 시각 디자인은 이 장의 토큰을 따른다.

### 4.2 디자인 토큰 (`styles/tokens.css`에 그대로 정의)

```css
:root {
  /* Brand */
  --color-primary: #234F9F;
  --color-primary-hover: #1B3F82;
  --color-primary-tint: #EAF0FA;
  --color-accent-teal: #1B8F8A;      /* '사이트' 뱃지 */
  --color-accent-teal-tint: #E3F4F3;

  /* Neutral */
  --color-text: #1F2933;
  --color-text-muted: #667085;
  --color-border: #E1E6EE;
  --color-border-strong: #C6CEDB;
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F6F8FB;
  --color-banner: #E8EFF8;           /* 검색 영역 배경 (데이터허브 배너 톤) */
  --color-banner-line: #BEDDF3;

  /* Crowd (혼잡도) — 의미 고정, 다른 용도로 사용 금지 */
  --crowd-low: #2E9E5B;        /* 초록 */
  --crowd-medium: #F2C200;     /* 노랑 */
  --crowd-high: #F28A1B;       /* 주황 */
  --crowd-very-high: #E5352B;  /* 빨강 */

  /* Type */
  --font-sans: 'Pretendard', 'Noto Sans KR', system-ui, -apple-system, 'Malgun Gothic', sans-serif;
  --fs-hero: 56px;  --lh-hero: 64px;
  --fs-title: 36px; --lh-title: 44px;
  --fs-h2: 24px;    --lh-h2: 32px;
  --fs-body: 16px;  --lh-body: 24px;
  --fs-small: 14px; --lh-small: 20px;
  --fs-caption: 12px; --lh-caption: 16px;
  --fw-regular: 400; --fw-medium: 500; --fw-bold: 700; --fw-extrabold: 800;

  /* Space (4px scale) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-12: 48px; --sp-16: 64px;

  /* Shape */
  --radius-sm: 4px; --radius-md: 8px; --radius-pill: 999px;
  --shadow-card: 0 2px 8px rgba(16, 24, 40, 0.08);
  --shadow-panel: 0 4px 16px rgba(16, 24, 40, 0.12);

  /* Layout */
  --header-h: 76px;
  --content-max: 1200px;
  --sidebar-w: 380px;
  --searchbar-h: 96px;
  --z-header: 1000; --z-popover: 1100;
}
```

### 4.3 컴포넌트 스타일 규칙
- **버튼** 높이 40px(기본)/52px(검색 대형), 라운드 4px, 폰트 15px/medium.
  - `primary`: 배경 `--color-primary`, 흰 글자, hover `--color-primary-hover`
  - `outline`: 배경 흰색, 1px `--color-border-strong`, 글자 `--color-text`, hover 배경 `--color-bg-subtle`
- **입력창** 높이 52px, 2px `--color-primary` 테두리(검색창) / 1px `--color-border-strong`(일반), 라운드 4px, 포커스 시 `outline: 3px solid var(--color-primary-tint)`.
- **카드(ResultCard)** 패딩 16px, 하단 1px 구분선, 선택 상태: 좌측 4px `--color-primary` 바 + 배경 `--color-primary-tint`.
- **뱃지** 높이 22px, 패딩 0 8px, 라운드 4px, 12px/bold
  - `매장`: 글자 `--color-primary`, 배경 `--color-primary-tint`
  - `사이트`: 글자 `--color-accent-teal`, 배경 `--color-accent-teal-tint`
- **포커스 링**: 모든 상호작용 요소에 `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`
- 전역: `body { font-family: var(--font-sans); color: var(--color-text); }`, 숫자는 `font-variant-numeric: tabular-nums`.

### 4.4 헤더 (모든 페이지 공통, 높이 `--header-h`)
- 흰 배경, 하단 1px `--color-border`, `position: sticky; top:0; z-index: var(--z-header)`.
- 내부 컨테이너 `max-width: var(--content-max)`, 가운데 정렬, 3분할 flex:
  1. **좌**: `Logo` (홈 링크)
  2. **중앙**: 메뉴 `홈`, `가격 검색` (18px/medium, 활성 메뉴는 하단 3px `--color-primary` 밑줄)
  3. **우**: `로그인`(outline), `회원가입`(outline) 버튼 (높이 40px)
- 로고: 인라인 SVG 물결 아이콘(24px, primary) + 텍스트 `제주`(extrabold, primary) `얼마꽈`(extrabold, `--color-text`), 22px.

### 4.5 PageBanner (연한 하늘색 배너 — 데이터허브 느낌)
- 배경 `--color-banner`, 인라인 SVG 패턴으로 **얇은 곡선 라인**(`--color-banner-line`, 1px, opacity .7)을 좌우로 흐르게 표현. 외부 이미지 파일 사용 금지.
- 홈에서는 사용하지 않고, `/search`에서는 검색바 영역(4.6)의 배경으로 사용.

---

## 5. 화면 명세

### 5.1 `/` HomePage — F-01 (P2)
레이아웃(데스크톱 ≥1024px): 컨테이너 `--content-max`, 2열 grid(`1fr 1fr`, gap 64px), 세로 중앙 정렬, 최소 높이 `calc(100vh - var(--header-h))`.

**좌측 텍스트 블록** (위→아래, 간격 16px)
1. `h1` : **`제주 얼마꽈?`** — `--fs-hero`, extrabold
2. `h2` : **`오늘 값 얼마인지 한 번에 알앙 갑서~`** — 32px/bold
3. 본문: **`제주도 오늘의 가격 한번에 알아보기`** — 18px, `--color-text-muted`
4. 버튼 행(gap 12px): **`로그인`**(primary, → `/login`), **`회원가입`**(outline, → `/signup`)

**우측 이미지 영역** `HeroImage`
- 비율 `10 / 11`, 라운드 `--radius-md`, `object-fit: cover`.
- 이미지 경로: `public/hero-jeju.jpg`가 **있으면 그것**, 없으면 `hero-jeju-placeholder.svg`(연한 하늘색 그라데이션 + 중앙 텍스트 "제주 풍경 사진 영역") 표시. → 사용자가 사진 파일만 넣으면 교체됨. 존재 여부는 `<img onError>`로 폴백 처리.
- `alt="제주 풍경"`

모바일 폭은 기본 CSS 흐름(세로 쌓임)만 허용하고 별도 디자인은 하지 않는다.

### 5.2 `/login`, `/signup` — F-02 (P2, UI 전용)
- 중앙 카드(폭 420px, 패딩 32px, 1px 테두리, `--shadow-card`), 제목(`로그인` / `회원가입`, 28px bold).
- **로그인 필드**: `아이디`, `비밀번호` / 버튼 `로그인`(primary, 전체폭)
- **회원가입 필드**: `아이디`, `비밀번호`, `비밀번호 확인` / 버튼 `회원가입`(primary, 전체폭)
- 클라이언트 검증: 아이디 4~20자 영문·숫자, 비밀번호 8자 이상, 비밀번호 확인 일치. 오류는 입력창 하단 12px 빨강(`--crowd-very-high`) 문구.
- 제출 시 `POST /api/auth/login|signup` 호출 → 서버는 **501** → 폼 상단에 `준비 중인 기능입니다.` 문구 표시. **토큰/세션 저장 코드를 만들지 않는다.**

### 5.3 `/search` SearchPage — F-03 ~ F-09 (P1, 핵심)

```
┌──────────────────────────────────────────────────────────────┐
│ Header (76px)                                                │
├──────────────────────────────────────────────────────────────┤
│ SearchBar 영역 (96px, 하늘색 배너 배경)                       │
│  [ 자연어 검색 입력창 ........................ ][검색] [내 위치 ▾] │
├────────────┬─────────────────────────────────────────────────┤
│ Sidebar    │ MapCanvas                                       │
│ 380px      │ (남은 폭 전체, 높이 = 100vh - header - searchbar)  │
│ ┌────────┐ │                                                 │
│ │분류버튼 │ │                                                 │
│ ├────────┤ │                                                 │
│ │결과목록 │ │                                                 │
│ │(스크롤) │ │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```
- 전체 높이 `100vh`, 본문(Sidebar+Map)은 `display:flex; height: calc(100vh - var(--header-h) - var(--searchbar-h))`. 페이지 자체는 스크롤하지 않고 **사이드바 목록만** `overflow-y:auto`.
- 📚 **왜 flex 분할인가?** 지도와 목록이 같은 React 트리 안에 있어야 "목록 클릭 → 지도 이동" 같은 연동이 상태 하나(`selectedId`)로 해결됩니다. 새 창/iframe으로 나누면 이 연동이 매우 어려워집니다.

#### 5.3.1 SearchBar (F-03)
- 입력창(placeholder: `찾고 싶은 상품을 말해 주세요 (예: 우유 1L 제일 싼 곳)`), 최대 200자, `Enter` 또는 `검색` 버튼으로 제출.
- 빈 문자열/공백만 입력 시 제출하지 않는다.
- 제출 → `POST /api/search` 호출. 진행 중에는 버튼 텍스트 `검색 중…` + `disabled`.
- 오른쪽 `LocationChip`(5.3.2).

#### 5.3.2 LocationChip — 사용자 위치 (거리 계산의 기준점)
- 칩 형태 버튼: `📍 내 위치: {label}` (label 예: `제주시청 부근`, `현재 위치`, 입력한 주소). 클릭 시 아래 팝오버(폭 320px, `--shadow-panel`, `z-index: var(--z-popover)`) 열림:
  - 버튼 `현재 위치 사용` → `navigator.geolocation.getCurrentPosition` (타임아웃 8초)
  - 입력창 + 버튼 `주소로 설정` → `POST /api/geocode`
- **[기본값]** 초기 위치는 제주시청 `{lat:33.4996, lng:126.5312, label:'제주시청 부근', source:'default'}`. 앱 시작 시 자동으로 위치 권한을 요청하지 않는다(버튼을 눌렀을 때만).
- 위치는 **메모리(zustand)에만 저장**, `localStorage` 등에 저장하지 않는다.

#### 5.3.3 ClassificationBar (F-05) — 분류 버튼
사이드바 최상단, 2줄 구성, 패딩 12px 16px, 하단 1px 구분선.

1. **정렬(세그먼트 버튼, 단일 선택)**: `추천순` | `거리순` | `가격순`  *(기본 선택: `추천순`)*
2. **유형 필터(칩, 단일 선택)**: `전체 (n)` | `오프라인 (n)` | `온라인 (n)`  *(기본: `전체`)*, n은 현재 결과 개수.

정렬 규칙 (모두 **오름차순**):
| 정렬 | 규칙 |
|---|---|
| 추천순 | `rank` 오름차순 (AI가 준 순서) |
| 거리순 | 오프라인: 사용자 위치와의 직선거리 오름차순 → 그 뒤에 온라인(거리 없음)을 `rank` 순으로 |
| 가격순 | `price.amount` 오름차순, `price`가 null이면 맨 뒤 |

필터는 정렬 **이전**에 적용한다. 정렬·필터는 **클라이언트에서만** 수행(재호출 없음).
> 📚 **왜 클라이언트에서 정렬하나?** AI 호출은 느리고(로컬 모델) 비용이 큽니다. 한 번 받은 결과 목록은 브라우저가 들고 있고, 버튼은 그 목록을 다시 줄 세우기만 하면 되므로 즉시 반응합니다.

#### 5.3.4 ResultList / ResultCard (F-04, F-06, F-08, F-09)
리스트는 `visibleResults`를 순서대로 렌더. 빈 결과면 `검색 결과가 없습니다.` 한 줄. 검색 전(idle)에는 `찾고 싶은 상품을 검색해 보세요.` 한 줄.

**카드 구조**
```
[①] 이마트 제주점  [🟠 약 180명]            ← 1행: 순번 + 이름 + (오프라인만) CrowdBadge
     [매장]  제주시 ○○로 123 · 1.2km         ← 2행: TypeBadge + 주소 + 직선거리(오프라인)
     4,980원 / 1L                            ← 3행: 가격(굵게 18px) + 단위
     [ 길찾기 ]                              ← 오프라인이고 '선택된' 카드에만 표시
```
```
[②] 쿠팡  ↗                                  ← 온라인: 외부 이동 아이콘
     [사이트]  쿠팡 · 5,200원 / 1L
```
- 순번 원(24px)은 현재 **정렬 결과의 표시 순서**(1부터).
- 직선거리 표기: 1km 미만 `850m`, 이상 `1.2km`(소수 1자리). 위치가 없으면 생략.
- 가격 표기: `4,980원` (천 단위 콤마), `price`가 null이면 `가격 정보 없음`.
- **오프라인 카드 클릭 (F-06)**: `selectedId` 설정 → 카드 선택 스타일 + `길찾기` 버튼 노출 + 지도가 해당 좌표로 `flyTo(zoom 16, 0.6s)` + 마커 팝업(매장명).
- **온라인 카드 클릭 (F-08)**: `safeUrl(deeplink_url)`이 유효하면 `window.open(url, '_blank', 'noopener,noreferrer')`. 유효하지 않으면 이동하지 않는다. (카드는 `<button>`이 아니라 `<a target="_blank" rel="noopener noreferrer">`로 구현해도 됨 — 키보드 접근성)
- 📚 **왜 `safeUrl`이 필요한가?** 링크는 AI가 만든 값입니다. 모델이 이상한 값(`javascript:...`)을 내놓거나 오염되면 클릭만으로 위험한 동작이 실행될 수 있어, **https + 허용 도메인 목록(`ALLOWED_ONLINE_HOSTS`)** 만 통과시킵니다.

#### 5.3.5 CrowdBadge (F-09)
- 구성: 지름 10px 색 원 + `약 {N}명` (13px, medium). 이름 **바로 오른쪽**에 inline 배치.
- 색 매핑(`lib/crowd.ts`):

| level | 의미 | 색 변수 |
|---|---|---|
| `low` | 적음 | `--crowd-low` (초록) |
| `medium` | 보통 | `--crowd-medium` (노랑) |
| `high` | 많음 | `--crowd-high` (주황) |
| `very_high` | 매우 많음 | `--crowd-very-high` (빨강) |

- `crowd`가 null(오프라인이지만 미산출)이면 배지를 표시하지 않는다.
- `title` 속성: `기준 시각 {as_of}`.

#### 5.3.6 RoutePanel — 길찾기 (F-07)
선택된 오프라인 카드의 `길찾기` 버튼을 누르면 카드 **바로 아래에 펼침**(아코디언):
1. 라벨 `출발지`, 입력창(placeholder `출발 주소를 입력하세요`), 버튼 `길찾기`(primary, 40px), 보조 링크 버튼 `내 위치로`(현재 `LocationChip` 위치를 출발지로 채움).
2. 제출 → `POST /api/geocode`(주소→좌표) → `POST /api/route`(좌표→경로).
3. 결과 영역: `도로 거리 12.4km · 자동차 약 21분` (큰 글씨 16px bold). `provider`가 추정(`estimate`)이면 뒤에 작은 회색 `(추정)`을 붙인다.
4. 지도에 **경로선**(폴리라인, 색 `--color-primary`, 두께 5, 불투명도 .85)과 출발지 마커(파란 원 + `출발`)를 그리고 `fitBounds`로 경로 전체를 보여준다.
5. 실패 시 입력창 아래 빨간 문구: 지오코딩 실패 → `주소를 찾지 못했어요. 더 자세히 입력해 주세요.` / 경로 실패 → `경로를 계산하지 못했어요.`
6. 다른 카드를 선택하거나 닫으면 경로선과 출발지 마커를 제거.
- **[P3]** 패널 상단에 탭 `자동차` | `대중교통`. `대중교통` 탭은 `VITE_FEATURE_TRANSIT !== 'true'`이면 `disabled` + 툴팁 `준비 중`. 활성 시 `POST /api/transit` 결과를 `버스 402 → 도보 5분 · 총 38분` 형태의 목록으로 표시.

#### 5.3.7 MapCanvas
- Leaflet 지도. 초기 `center=[33.38, 126.55], zoom=10`(제주 전체가 보이는 값).
- 타일: `import.meta.env.VITE_TILE_URL` (기본 `https://tile.openstreetmap.org/{z}/{x}/{y}.png`), attribution `© OpenStreetMap contributors` **반드시 표시**.
- **마커**(오프라인만): `divIcon`으로 지름 28px 원, 배경 = 혼잡도 색(없으면 `--color-primary`), 가운데 흰 숫자(순번), 흰 테두리 2px + 그림자. 선택된 마커는 36px로 확대.
- **사용자 위치 마커**: 파란 점(14px) + 반투명 파란 후광(32px).
- **결과 도착 시 자동 `fitBounds`**: 오프라인 마커 전체 + 사용자 위치를 포함, padding 40px, `maxZoom: 15`.
- 컨테이너 크기가 변할 때 `map.invalidateSize()` 호출(ResizeObserver).
- 📚 **왜 `invalidateSize`?** Leaflet은 처음 그려질 때의 div 크기를 기억합니다. 사이드바 폭이 바뀌거나 레이아웃이 늦게 잡히면 타일이 회색으로 깨지는데, 이 호출로 "크기가 바뀌었다"고 알려줍니다.

---

## 6. ★ AI 슬롯 (구현 금지 영역과 경계)

> 사용자가 **직접 학습시킨 모델**이 들어올 자리입니다. 구현 AI는 **인터페이스·Mock·스텁까지만** 만든다.

### 6.1 인터페이스 `backend/app/ai/base.py`
```python
from typing import Protocol
from datetime import datetime
from app.schemas import SearchRequest, SearchResponse, CrowdInfo

class AIAgent(Protocol):
    async def search(self, req: SearchRequest) -> SearchResponse:
        """자연어 질의 → 오프라인 매장/온라인몰 결과(순위·가격 포함). crowd는 비워도 됨."""

    async def estimate_crowd(self, place_ids: list[str], at: datetime) -> list[CrowdInfo]:
        """오프라인 매장별 혼잡도(4단계)와 추정 인원수."""
```

### 6.2 구현체 3종 (`registry.py`가 `AI_BACKEND` 값으로 선택)
| AI_BACKEND | 파일 | 동작 |
|---|---|---|
| `mock` **[기본값]** | `mock_agent.py` | 8.1의 규칙으로 가짜 결과 생성 |
| `local` | `local_model_agent.py` | **스텁**: 모든 메서드가 `NotImplementedError("AI model not connected")` → API 계층이 `503 AI_NOT_READY`로 변환 |

`local_model_agent.py` 상단 docstring에 반드시 다음을 적는다(나중에 모델 연결할 사람을 위한 안내):
```
이 파일에 학습된 모델을 연결한다.
- 입력: SearchRequest (query, user_location, client_time)
- 출력: SearchResponse (7.1 계약 준수)
- 연결 방식 예: (a) 같은 프로세스에서 모델 로드  (b) AI_ENDPOINT 의 로컬 HTTP 서버(Ollama/llama.cpp/자체 서버) 호출
- 반출 불가 데이터(카드·유동인구 등)는 센터 PC 안에서만 접근한다. 이 저장소에 원본 데이터를 포함하지 않는다.
```

### 6.3 오케스트레이션 규칙 (`api/search.py`)
1. `agent.search(req)` 호출 (타임아웃 `AI_TIMEOUT_S`, 기본 60초 → 초과 시 `504 AI_TIMEOUT`).
2. 응답의 오프라인 장소 중 `crowd`가 null인 것들만 모아 `agent.estimate_crowd(ids, now)` 1회 호출해 채움.
3. **응답 검증**: Pydantic 검증 실패/좌표가 제주 범위(위도 33.1~33.65, 경도 126.1~127.0) 밖/`deeplink_url` 비허용 → 해당 항목 **제거**(전체 실패 아님)하고 서버 로그에 경고.
4. 결과는 최대 `MAX_RESULTS=30`개로 자른다.

---

## 7. API 계약 (프론트 `types/api.ts` ↔ 백엔드 `schemas.py` 동일)

공통: Content-Type `application/json`, 오류는 `{ "error": { "code": "STRING", "message": "사용자에게 보여줄 한국어 문장" } }`.

### 7.1 `POST /api/search`
**Request**
```json
{
  "query": "우유 1L 제일 싼 곳",
  "user_location": { "lat": 33.4996, "lng": 126.5312 },
  "client_time": "2026-11-12T14:30:00+09:00"
}
```
- `query`: 1~200자(공백 제거 후), `user_location`: null 허용.

**Response 200**
```json
{
  "request_id": "uuid4",
  "query": "우유 1L 제일 싼 곳",
  "generated_at": "2026-11-12T14:30:02+09:00",
  "results": [
    {
      "id": "store_001",
      "type": "offline",
      "rank": 1,
      "name": "예시마트 노형점",
      "price": { "amount": 2480, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": { "address": "제주시 노형동 (예시)", "lat": 33.4846, "lng": 126.4783 },
      "online": null,
      "crowd": { "level": "high", "estimated_people": 180, "as_of": "2026-11-12T14:00:00+09:00", "source": "mock" }
    },
    {
      "id": "online_001",
      "type": "online",
      "rank": 2,
      "name": "쿠팡",
      "price": { "amount": 2650, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": null,
      "online": { "site_name": "쿠팡", "deeplink_url": "https://www.coupang.com/np/search?q=%EC%9A%B0%EC%9C%A0" },
      "crowd": null
    }
  ]
}
```
- `type="offline"` ⇒ `offline` 필수, `online` null. `type="online"` ⇒ 반대.
- `crowd.level` ∈ `low | medium | high | very_high`, `crowd.source` ∈ `model | mock`.
- `price`는 null 허용.

### 7.2 `POST /api/geocode`
Req `{ "address": "제주시 노형동 1234" }` → Res `{ "lat": 33.48, "lng": 126.47, "label": "제주시 노형동", "provider": "mock" }`
실패: `404 GEOCODE_NOT_FOUND`.

### 7.3 `POST /api/route`
Req `{ "origin": {lat,lng}, "destination": {lat,lng}, "mode": "driving" }`
Res
```json
{
  "distance_m": 12400,
  "duration_s": 1260,
  "geometry": [[33.49, 126.53], [33.48, 126.47]],
  "provider": "estimate"
}
```
- `geometry`는 `[lat, lng]` 쌍 배열(Leaflet 순서와 동일). 외부 API가 `[lng, lat]`를 주면 **백엔드에서 뒤집어서** 내보낸다.
- `provider` ∈ `estimate | osrm | naver`. `estimate`일 때 프론트는 `(추정)` 표시.

### 7.4 `POST /api/transit` (P3, Mock)
Req `{ origin, destination, depart_at }` → Res
```json
{ "options": [ { "total_duration_s": 2280, "transfers": 0,
  "steps": [ {"mode":"walk","label":"도보","duration_s":300}, {"mode":"bus","label":"402번","duration_s":1800}, {"mode":"walk","label":"도보","duration_s":180} ] } ],
  "provider": "mock" }
```

### 7.5 `POST /api/auth/login`, `POST /api/auth/signup` (P2)
항상 `501 { "error": { "code": "NOT_IMPLEMENTED", "message": "준비 중인 기능입니다." } }`.

### 7.6 `GET /api/health` → `{ "status": "ok", "ai_backend": "mock", "geocoder": "mock", "router": "estimate" }`

### 7.7 에러 코드 표
| HTTP | code | 상황 |
|---|---|---|
| 422 | `VALIDATION_ERROR` | 입력 검증 실패 |
| 404 | `GEOCODE_NOT_FOUND` | 주소 없음 |
| 501 | `NOT_IMPLEMENTED` | 인증 등 |
| 503 | `AI_NOT_READY` | AI 모델 미연결 (`local` 스텁) |
| 504 | `AI_TIMEOUT` | AI 응답 지연 |
| 502 | `UPSTREAM_ERROR` | 지오코딩/경로 외부 서비스 실패 |

프론트는 `error.message`를 그대로 SearchBar 아래 빨간 한 줄로 표시한다. (`AI_NOT_READY`일 때 문구: `AI가 아직 연결되지 않았어요.`)

---

## 8. 백엔드 세부

### 8.1 Mock AI 규칙 (`mock_agent.py`) — 결정적(deterministic) 결과
- 데이터: `data/mock/stores.json`(오프라인 10개), `online_malls.json`(온라인 4개).
- 가격: `base = 1500 + (sha256(query) % 4000)` (10원 단위 반올림). 매장별 `price = base * store.price_factor(0.9~1.15)`.
- **rank**: 가격 오름차순으로 매긴 순위(1부터), 오프라인·온라인 혼합.
- **혼잡도**: `ratio = store.capacity_index * hour_profile(hour)`; `hour_profile`은 11~13시, 17~19시 피크인 종 모양(0.15~1.0). `estimated_people = round(ratio * store.max_people)`.
  - level: `ratio < .25 → low`, `< .5 → medium`, `< .75 → high`, 그 이상 `very_high`. (`as_of`는 해당 시각 정각, `source:"mock"`)
- 온라인 `deeplink_url`: 몰별 검색 URL 템플릿에 `urllib.parse.quote(query)` 적용.
  - 쿠팡 `https://www.coupang.com/np/search?q={q}` / 네이버쇼핑 `https://search.shopping.naver.com/search/all?query={q}` / 11번가 `https://search.11st.co.kr/Search.tmall?kwd={q}` / G마켓 `https://browse.gmarket.co.kr/search?keyword={q}`
  - ⚠️ 외부 사이트 URL은 바뀔 수 있으므로 README에 "구현 시 실제 동작 확인 필요"라고 적는다.
- `stores.json` 필드: `id, name, address, lat, lng, price_factor, capacity_index, max_people`. 좌표는 **예시값**이며 README에 "실제 매장 위치가 아님"을 명시.
  - 사용할 대략적 좌표(제주 전역 분산): 노형동(33.4846,126.4783), 연동(33.4890,126.4930), 이도동(33.4960,126.5470), 애월(33.4619,126.3311), 한림(33.4120,126.2640), 조천(33.5440,126.6370), 서귀포(33.2541,126.5601), 성산(33.4580,126.9420), 대정(33.2270,126.2520), 표선(33.3260,126.8310)

### 8.2 Provider (환경변수로 선택)
| 환경변수 | 값 | 설명 |
|---|---|---|
| `GEOCODER` | `mock`[기본] / `nominatim` / `naver` | `mock`: `landmarks.json` 부분일치 검색, 없으면 제주시청 좌표 반환 + `label`에 `(대략)` 표기 |
| `ROUTER` | `estimate`[기본] / `osrm` / `naver` | `estimate`: 직선거리 × 1.3, 평균 30km/h로 시간 산정, `geometry`는 [출발, 도착] 2점 |

- `nominatim`: `https://nominatim.openstreetmap.org/search?format=json&q=...&countrycodes=kr` , **User-Agent 필수**, 초당 1회 제한 준수(간단한 락).
- `osrm`: `{OSRM_BASE_URL}/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson`
- `naver`: 네이버 클라우드 Geocoding/Directions — 키는 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`에서만 읽는다. **키가 없으면 앱 시작 시 경고 로그 + `mock/estimate`로 자동 폴백.**
- 모든 provider는 공통 베이스 클래스(`async def geocode(address)`, `async def route(o, d, mode)`)를 구현.
- 📚 **왜 provider를 갈아끼우게 하나?** "지금은 가짜, 나중엔 진짜, 센터에선 오프라인용"처럼 환경마다 필요한 구현이 다릅니다. 인터페이스 뒤에 숨기면 화면 코드는 한 줄도 안 바뀝니다.

### 8.3 설정 (`config.py`, pydantic-settings) 및 `.env.example`
```
# --- AI 슬롯 ---
AI_BACKEND=mock            # mock | local
AI_ENDPOINT=               # local 모델용 (예: http://127.0.0.1:11434)
AI_TIMEOUT_S=60

# --- 지도/경로 ---
GEOCODER=mock              # mock | nominatim | naver
ROUTER=estimate            # estimate | osrm | naver
OSRM_BASE_URL=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# --- 보안/동작 ---
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_ONLINE_HOSTS=www.coupang.com,search.shopping.naver.com,search.11st.co.kr,browse.gmarket.co.kr
MAX_RESULTS=30
LOG_LEVEL=INFO

# --- 프론트(빌드 시 주입) ---
VITE_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_FEATURE_TRANSIT=false
```

### 8.4 보안·개인정보
- 사용자가 입력한 **주소·좌표·검색어를 로그에 남기지 않는다**(요청 ID와 상태 코드만).
- CORS는 `ALLOWED_ORIGINS`만 허용. 입력 길이 제한은 Pydantic 필드 제약으로.
- 프론트는 AI가 준 문자열을 `dangerouslySetInnerHTML`로 렌더링하지 않는다(React 기본 이스케이프 사용).
- 제출물에 `.env`, 키, 원본 반출불가 데이터를 포함하지 않는다.

---

## 9. 프론트 세부

### 9.1 상태 (zustand)
```ts
// useLocationStore
{ location: {lat:number; lng:number; label:string; source:'default'|'gps'|'address'}; setLocation(...) }

// useSearchStore
{
  status: 'idle'|'loading'|'success'|'error';
  errorMessage: string|null;
  query: string;
  results: Place[];
  sortKey: 'recommend'|'distance'|'price';     // 기본 'recommend'
  typeFilter: 'all'|'offline'|'online';         // 기본 'all'
  selectedId: string|null;
  route: RouteResult|null;  routeOrigin: LatLng|null;
  // selectors
  visibleResults(): PlaceWithDistance[];        // 필터 → 정렬
}
```
- 새 검색이 성공하면 `selectedId`, `route`를 초기화.
- 거리(`distance_m`)는 `lib/geo.ts`의 `haversine`으로 **프론트에서 계산**해 `visibleResults()`에서 붙인다.

### 9.2 API 클라이언트 (`lib/api.ts`)
- `fetch` 래퍼, 기본 타임아웃 70초(`AbortController`), 오류 응답을 `{code,message}`로 파싱해 throw.
- 개발 시 `vite.config.ts`의 `server.proxy: { '/api': 'http://127.0.0.1:8000' }`.

### 9.3 유틸 시그니처
```ts
haversine(a: LatLng, b: LatLng): number            // meters
formatDistance(m: number): string                  // '850m' | '1.2km'
formatPrice(n: number): string                     // '4,980원'
formatDuration(sec: number): string                // '21분' | '1시간 5분'
crowdMeta(level): { color: string; label: string } // 5.3.5 표
safeUrl(raw: string, allowedHosts: string[]): string | null
```
`safeUrl`: `new URL(raw)` 성공 + `protocol === 'https:'` + `hostname`이 허용 목록에 포함될 때만 문자열 반환. 허용 목록은 빌드 시 `VITE_ALLOWED_ONLINE_HOSTS`로도 주입 가능하며 기본값은 8.3과 동일.

---

## 10. 데이터 활용 메모 (대회 제출용 / AI 슬롯 참고 — **이 저장소에서는 구현하지 않음**)
- 혼잡도 모델의 입력 후보(제주빅데이터센터, 센터 PC 내부에서만 사용 — **반출 불가**): 카드 이용 현황(시간대/요일별/읍면동/500m격자), 외식업 포스 이용 현황, 일/시간대별 교통량, 일일 날씨 정보.
- 반출 가능 데이터(교통·날씨 등)는 공개 저장소 포함 여부와 무관하게 **출처·이용조건을 `docs/DATA_USAGE.md`에 기록**.
- Mock 개발 단계에서는 어떤 센터 데이터도 사용하지 않는다.

---

## 11. 비기능 요구사항
- 브라우저: 최신 Chrome / Edge (데스크톱 기준).
- 센터 PC(i7-8700 / GTX1060 / RAM 32GB)에서 **프론트+백엔드(mock)가 동시에 쾌적하게** 동작할 것(모델이 GPU를 쓰므로 웹 서버는 경량 유지).
- 첫 화면 JS 번들(gzip) 400KB 이하를 목표로 한다(라우트 단위 `React.lazy`는 `SearchPage`에만 적용).
- 접근성 최소선: 시맨틱 태그, 모든 입력에 `<label>`(시각적으로 숨겨도 됨), 4.3의 포커스 링.

---

## 12. 테스트 (최소 필수)
**백엔드(pytest)**
- `/api/search`: 정상, 빈 query 422, 응답의 오프라인 항목에 crowd가 채워짐, 비허용 도메인 deeplink 항목이 제거됨, `AI_BACKEND=local`일 때 503.
- `/api/route`: `estimate` 결과의 distance/duration 양수, geometry 2점.
- `mock_agent`: 같은 입력 → 같은 출력(결정적).

**프론트(vitest)**
- `haversine`/`formatDistance`/`formatPrice`/`safeUrl` 단위 테스트(비허용 도메인, `javascript:` 차단 케이스 포함).
- `visibleResults` 정렬·필터 6가지 조합.
- `ResultCard`: 온라인은 `사이트`, 오프라인은 `매장` 뱃지 표시, 선택 시에만 `길찾기` 버튼 표시.

---

## 13. 구현 순서와 검증

| 단계 | 작업 | 검증 |
|---|---|---|
| 1 | 폴더 생성, `.env.example`, 백엔드 `main.py`, `/api/health` | `curl localhost:8000/api/health` |
| 2 | `schemas.py`, `ai/base.py`, `mock_agent.py`, `registry.py`, `/api/search` | `pytest tests/test_search.py tests/test_mock_agent.py` |
| 3 | geocode/route provider(`mock`,`estimate`) + 엔드포인트 | `pytest tests/test_geocode.py tests/test_route.py` |
| 4 | 프론트 스캐폴드(Vite), `tokens.css`, `global.css`, Header/Logo, 라우터 | `npm run dev`로 헤더 확인 |
| 5 | `types/api.ts`, `lib/*`, 유틸 테스트 | `npm run test` |
| 6 | 스토어 + SearchPage 레이아웃(SearchBar, 빈 사이드바, MapCanvas 렌더) | 지도 타일 정상 표시 |
| 7 | 검색 연동 + ResultList/ResultCard/TypeBadge/CrowdBadge (**F-03,04,09**) | 검색 시 목록·색 배지 표시 |
| 8 | ClassificationBar + 정렬/필터 (**F-05**) | 6가지 조합 테스트 통과 |
| 9 | 카드↔지도 연동 + 마커·fitBounds·flyTo (**F-06**) | 카드 클릭 시 지도 이동 |
| 10 | 온라인 카드 새 탭 이동 + `safeUrl` (**F-08**) | 비허용 도메인 차단 테스트 |
| 11 | LocationChip + RoutePanel + 경로선 (**F-07**) | 주소 입력 → 거리·경로선 표시 |
| 12 | HomePage·Login/Signup UI (**F-01, F-02**) | 화면 확인, 제출 시 "준비 중" 문구 |
| 13 | (P3) transit Mock + 비활성 탭 (**F-10**), `build_and_serve.sh`, README | `npm run build` 후 단일 프로세스 실행 |

**완료 기준(Definition of Done)**: 1장 표의 F-01 ~ F-09 항목이 모두 동작하고, `pytest`·`vitest` 통과, `grep -r "API_KEY\|secret" .`에 실제 키 값이 없으며, 부록 B 항목이 하나도 구현되지 않았을 것.

---

## 14. 대회 제출 문서 템플릿 (`docs/`)
대회 규정상 제출물에 포함해야 하는 문서의 **목차만** 만들어 둔다(내용은 개발 후 작성).
- `DATA_USAGE.md`: 사용 데이터명 / 출처 / 이용조건 / 전처리·분석 흐름 / 외부 데이터·오픈소스 목록
- `AI_DISCLOSURE.md`: 사용한 AI 모델 / AI 활용 범위(코드 생성 도구 포함) / 외부 API·서비스 / 외부 코드
- `USER_MANUAL.md`: 설치·실행 / 사용 방법 / 오류·제약사항
- `README.md`에는 설치·실행 절차, 의존성 목록, 환경변수 설명, 외부 서비스 의존성(지도 타일·지오코딩·경로)을 반드시 명시.

---

# 부록 A. 결정이 필요한 사항 (현재 `[기본값]`으로 처리 중)

| # | 항목 | 현재 기본값 | 왜 필요한가 |
|---|---|---|---|
| A1 | **가격 데이터는 어디서 오는가** | AI 슬롯이 담당(Mock은 가짜 가격) | 센터 데이터에는 상품 가격이 없음 |
| A2 | **매장 위치(좌표) 데이터 출처** | AI 슬롯이 담당(Mock은 예시 좌표) | 지도 마커의 근거 |
| A3 | 길찾기·주소검색 엔진 | `estimate`(직선×1.3 추정) / `mock` | 실제 도로 경로는 외부 서비스 또는 자체 OSRM 필요 |
| A4 | 혼잡도 `인원수`의 정의 | "해당 시각 매장 내 추정 인원" | 카드 이용 데이터로 직접 산출하기 어려움 |
| A5 | 기본 정렬 | 추천순(AI 순서) | 기능서의 "오름차순"이 가격인지 순위인지 모호 |
| A6 | 로그인 | UI만(서버 501) | 실제 인증이 필요한지 |

# 부록 B. 승인 대기 제안 — **승인 전 구현 금지**

| ID | 제안 | 한 줄 이유 |
|---|---|---|
| B-01 | 검색 로딩 스켈레톤/오류 재시도 버튼 등 상태 UI 보강 | 로컬 모델은 응답이 느림 |
| B-02 | 지도 혼잡도 범례(색상 의미 표시) | 색 의미 설명이 없음 |
| B-03 | 마커 클릭 → 사이드바 해당 카드 강조·스크롤 | 지도→목록 방향 연동 |
| B-04 | 홈 히어로에 검색창 또는 `가격 검색 시작` 버튼 | 홈에서 핵심 기능으로 가는 길이 메뉴뿐 |
| B-05 | 검색 예시 칩(`우유 1L`, `라면`…) | 첫 사용자 안내 |
| B-06 | 혼잡도순 정렬 | 혼잡도는 표시만 되고 정렬 불가 |
| B-07 | "AI 추정치·기준 시각·데이터 출처" 안내 문구 | 대회의 출처·사실관계 요구 |
| B-08 | 모바일 반응형(목록/지도 전환) | 현재 데스크톱 전용 |
| B-09 | 푸터(출처·문의·이용안내) | 공공 서비스 사이트 관례 |
| B-10 | 최근 검색어 / 즐겨찾기 | 재사용성 |
| B-11 | 길찾기 도보/대중교통 확장 및 실제 대중교통 연동(반출 가능 버스 데이터 활용) | F-10 구체화 |
| B-12 | 영업시간·전화번호 표시 | 매장 정보 보강 |


# Jeju-Hackathon Git/GitHub 워크플로우 가이드

> 대상 저장소:
> - **공동 저장소**: https://github.com/CraemyKim/Jeju-Hackathon (`upstream` / `origin` 2번째 push URL)
> - **개인 저장소**: https://github.com/HongYoonSung/Jeju-Hackathon (`origin` 기본 push URL)
>
> **push 정책**: `git push origin main` 한 번으로 두 저장소에 동시 push (origin에 push URL 2개 등록)
>
> 목적: **pull → branch → commit → push → Pull Request → merge → pull** 한 사이클을 사람과 AI 코딩 도구가 **똑같은 방식으로** 반복하도록 정의한 문서.
> 💡 `📚 왜?` 박스는 공부용 설명입니다. AI 에이전트는 **0장과 1~8장의 명령/규칙**만 따르면 됩니다.

---

## 0. AI 에이전트 필수 규칙

1. **작업 전 항상** `git status`와 `git branch --show-current`로 현재 상태를 확인한다.
2. **`main`에 직접 커밋하거나 푸시하지 않는다.** 모든 변경은 작업 브랜치 → Pull Request → 머지로만 들어간다.
3. **`git push --force`, `git reset --hard origin/...`, `git clean -fd`는 사용자의 명시적 허락 없이 실행하지 않는다.**
4. **커밋 전 반드시** `git status`와 `git diff --staged`로 올라갈 파일을 확인한다.
5. **절대 커밋하지 않는 것**: `.env`, API Key·토큰·비밀번호, 센터 **반출 불가 원본 데이터**, `node_modules/`, `__pycache__/`, 모델 가중치 대용량 파일, 개인정보가 담긴 파일. (대회 규정: 민감정보를 제출 코드에 포함하면 안 됨)
6. 한 브랜치 = 한 가지 목적. 한 커밋 = 한 가지 의미 있는 변경.
7. 명령이 실패하면 **원인을 읽고** 보고한다. 같은 명령을 반복하거나 `--force`로 우회하지 않는다.
8. 기본 브랜치 이름은 `main`으로 가정하되, **처음 한 번 확인**한다 (1.3). 다르면(`master` 등) 이 문서의 `main`을 모두 그 이름으로 바꿔 읽는다.
9. 작업이 끝나면 **무엇을 했는지, 어떤 브랜치/PR인지**를 한국어 한두 문장으로 보고한다.

---

## 1. 최초 1회 설정

### 1.1 Git 설치 확인 및 사용자 정보
```bash
git --version
git config --global user.name  "내 이름"
git config --global user.email "GitHub에 등록한 이메일"
git config --global init.defaultBranch main
git config --global pull.rebase false      # pull 시 merge 방식(초보자 안전)
```
📚 **왜?** 커밋에는 "누가 썼는지"가 기록됩니다. 이메일이 GitHub 계정과 같아야 내 활동으로 표시됩니다. `pull.rebase false`는 pull 할 때 히스토리를 다시 쓰지 않고 합치는 가장 단순한 방식입니다.

### 1.2 저장소 가져오기 (clone)
```bash
git clone https://github.com/HongYoonSung/Jeju-Hackathon.git
cd Jeju-Hackathon
```
📚 **왜?** clone은 GitHub(원격, `origin`)에 있는 저장소 전체를 내 컴퓨터(로컬)로 복사합니다. 이후 로컬에서 작업하고 `push`로 원격에 올립니다.

### 1.3 기본 브랜치와 원격 확인
```bash
git remote -v                      # origin 주소 확인
git branch -a                      # 로컬/원격 브랜치 목록
git symbolic-ref refs/remotes/origin/HEAD   # 기본 브랜치 확인 (예: origin/main)
```

### 1.4 두 저장소 동시 push 설정 (최초 1회)

이 프로젝트는 **개인 저장소(HongYoonSung)** 와 **공동 저장소(CraemyKim)** 에 동시에 push합니다.

```bash
# origin의 기본 fetch/push URL (개인 저장소)
git remote set-url origin https://github.com/HongYoonSung/Jeju-Hackathon.git

# origin에 공동 저장소 push URL 추가
git remote set-url --add --push origin https://github.com/HongYoonSung/Jeju-Hackathon.git
git remote set-url --add --push origin https://github.com/CraemyKim/Jeju-Hackathon.git

# upstream (공동 저장소 fetch용)
git remote add upstream https://github.com/CraemyKim/Jeju-Hackathon.git

# 확인: origin에 push URL이 2개 보여야 함
git remote -v
```

이후 `git push origin main` 한 번으로 두 저장소 모두에 push됩니다.

> ⚠️ CraemyKim/Jeju-Hackathon에 push하려면 해당 계정의 **Collaborator 권한**이 필요합니다.

### 1.5 인증 (push에 필요)
- **HTTPS**: 첫 push 때 GitHub 로그인 창 또는 **Personal Access Token(PAT)** 입력. 비밀번호가 아니라 토큰을 쓴다. 토큰은 코드/문서에 **절대 적지 않는다.**
- **GitHub CLI(권장)**: `gh auth login` 후 브라우저 인증. 이후 `gh pr create` 등을 쓸 수 있다.
- **SSH**를 쓴다면 주소는 `git@github.com:HongYoonSung/Jeju-Hackathon.git`.

### 1.6 협업자 권한
다른 사람 저장소라면 **Settings → Collaborators**에서 초대를 받아야 직접 push 할 수 있다. 권한이 없으면 **Fork → Pull Request** 방식을 쓴다 (9장).

---

## 2. 전체 사이클 한눈에 보기

```
 [원격 origin/main] ──pull──▶ [로컬 main]
                                   │ branch
                                   ▼
                         [로컬 feature 브랜치]
                                   │ add + commit (여러 번)
                                   │ push
                                   ▼
                      [원격 origin/feature 브랜치]
                                   │ Pull Request 생성 → 리뷰 → 머지
                                   ▼
 [원격 origin/main] ◀──────── (머지됨)
        │
        └──pull──▶ [로컬 main 최신화] → 브랜치 정리 → 다음 작업
```

---

## 3. STEP 1 — Pull: 작업 시작 전 최신화

```bash
git switch main
git pull origin main
```
- `git switch main`: main 브랜치로 이동.
- `git pull origin main`: 원격 main의 새 커밋을 내 main에 가져와 합침(= `fetch` + `merge`).

📚 **왜 항상 먼저 pull 하나?** 팀원이 이미 main을 바꿔 놓았을 수 있습니다. 오래된 main에서 브랜치를 따면 나중에 **충돌(conflict)** 이 크게 납니다. "작업 시작 = 최신 main에서 출발"이 원칙입니다.

**실패 시**
| 증상 | 원인 | 조치 |
|---|---|---|
| `Your local changes would be overwritten` | main에 저장 안 된 변경이 있음 | `git status` 확인 → 필요하면 `git stash`(11.2) 후 재시도 |
| `Authentication failed` | 인증 실패 | 1.4 재설정 |

---

## 4. STEP 2 — Branch: 작업 브랜치 만들기

```bash
git switch -c feature/f03-search-bar
```
`-c`는 create. 새 브랜치를 만들고 바로 이동한다.

### 4.1 브랜치 이름 규칙
`<종류>/<기능ID>-<짧은-설명>` (소문자, 하이픈, 영문)

| 종류 | 용도 | 예시 |
|---|---|---|
| `feature/` | 새 기능 | `feature/f03-search-bar` |
| `fix/` | 버그 수정 | `fix/map-tile-gray` |
| `docs/` | 문서 | `docs/readme-install` |
| `chore/` | 설정·빌드·의존성 | `chore/add-gitignore` |
| `refactor/` | 동작 변경 없는 구조 개선 | `refactor/api-client` |
| `test/` | 테스트 추가 | `test/haversine` |

> 기능 ID(F-03 등)는 `JEJU_EOLMAKKWA_SPEC.md`의 추적 ID를 쓴다.

📚 **왜 브랜치를 따로 만드나?** 브랜치는 "main의 복사본에서 안전하게 실험하는 공간"입니다. 망쳐도 main은 멀쩡하고, 마음에 들면 PR로 합칩니다. 이름에 기능 ID를 넣으면 나중에 "이 변경이 어떤 요구사항 때문인지" 바로 추적됩니다.

---

## 5. STEP 3 — Commit: 변경을 의미 단위로 저장

### 5.1 변경 확인 → 스테이징 → 커밋
```bash
git status                       # 무엇이 바뀌었나
git diff                         # 내용 확인(아직 스테이징 전)
git add frontend/src/components/search/SearchBar.tsx   # 파일을 명시해서 추가
git diff --staged                # 올라갈 내용 최종 확인
git commit -m "feat(search): 자연어 검색창 컴포넌트 추가 (F-03)"
```
- ⚠️ `git add .` / `git add -A`는 `.env`나 불필요한 파일까지 올릴 위험이 있다. **파일 경로를 지정**하거나, `git status`로 확인한 뒤에만 사용한다.

📚 **왜 add와 commit이 따로 있나?** `add`는 "이번 커밋에 넣을 것만 골라 담는 장바구니(스테이징)", `commit`은 "장바구니를 확정해 스냅샷으로 저장"입니다. 그래서 여러 파일을 고쳤어도 의미별로 나눠 커밋할 수 있습니다.

### 5.2 커밋 메시지 규칙 (Conventional Commits, 한국어 허용)
```
<type>(<scope>): <한 줄 요약, 50자 내외, 마침표 없음>

(선택) 본문: 무엇을/왜 바꿨는지
(선택) Refs: F-03
```
| type | 의미 |
|---|---|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 |
| `style` | 포맷·세미콜론 등(동작 무관) |
| `refactor` | 구조 개선 |
| `test` | 테스트 |
| `chore` | 빌드·설정·의존성 |

좋은 예: `fix(map): 사이드바 폭 변경 시 타일 깨짐 해결 (invalidateSize)`
나쁜 예: `수정`, `asdf`, `최종final2`

📚 **왜 규칙을 두나?** 나중에 `git log`만 봐도 프로젝트 역사가 읽히고, 어떤 커밋이 문제를 만들었는지 찾기 쉽습니다. "왜"를 적어두면 6개월 뒤의 나에게도 도움이 됩니다.

### 5.3 커밋 크기 기준
- 한 커밋이 **되돌려도 앱이 깨지지 않는** 단위가 이상적.
- 서로 관련 없는 변경(예: 문서 오타 + 기능 추가)은 **분리**한다.

### 5.4 .gitignore (없으면 최초 커밋으로 추가: `chore/add-gitignore`)
```gitignore
# 비밀/환경
.env
.env.*
!.env.example

# Python
__pycache__/
*.pyc
.venv/
venv/

# Node
node_modules/
frontend/dist/

# OS/에디터
.DS_Store
Thumbs.db
.vscode/
.idea/

# 데이터·모델 (용량/반출 불가/개인정보)
data/raw/
*.csv
*.parquet
*.gguf
*.safetensors
*.bin
```
📚 **왜?** `.gitignore`에 적힌 파일은 Git이 아예 추적하지 않습니다. 비밀키·대용량 모델·반출 불가 데이터가 실수로 올라가는 사고를 **구조적으로** 막는 안전장치입니다. 한 번 push된 비밀키는 지워도 기록에 남으므로 "올리지 않는 것"이 유일한 해법입니다.

---

## 6. STEP 4 — Push: 원격에 올리기

```bash
git push -u origin feature/f03-search-bar
```
- `-u`(= `--set-upstream`)는 **처음 한 번만**. 이후에는 `git push`만 입력해도 된다.
- **이 프로젝트는 `origin`에 push URL이 2개 등록되어 있어 한 번의 push로 아래 두 곳에 동시 업로드된다:**
  - `https://github.com/HongYoonSung/Jeju-Hackathon.git` (개인 저장소)
  - `https://github.com/CraemyKim/Jeju-Hackathon.git` (공동 저장소)

📚 **왜 push 하나?** commit은 내 컴퓨터에만 저장됩니다. push를 해야 GitHub에 올라가 팀원이 보고, PR을 만들 수 있고, 내 컴퓨터가 고장 나도 코드가 안전합니다.

**실패 시**
| 증상 | 조치 |
|---|---|
| `rejected (non-fast-forward)` | 원격 브랜치에 내가 모르는 커밋이 있음 → `git pull origin <브랜치>` 후 재시도. **`--force` 금지** |
| `Permission denied` / 403 | 협업자 권한 없음 → 1.6, 9장 |

---

## 7. STEP 5 — Pull Request(PR) 생성

### 7.1 방법 A: 웹
push 직후 저장소 페이지에 뜨는 **Compare & pull request** 버튼 클릭 → base: `main` ← compare: 내 브랜치.

### 7.2 방법 B: GitHub CLI
```bash
gh pr create --base main --head feature/f03-search-bar \
  --title "feat(search): 자연어 검색창 추가 (F-03)" \
  --body-file .github/PULL_REQUEST_TEMPLATE.md
```

### 7.3 PR 템플릿 (`.github/PULL_REQUEST_TEMPLATE.md`로 저장)
```markdown
## 변경 요약
<!-- 무엇을 바꿨는지 2~3줄 -->

## 관련 기능 / 이슈
- 명세 ID: F-0X
- Closes #이슈번호 (있다면)

## 변경 유형
- [ ] 기능 추가  - [ ] 버그 수정  - [ ] 문서  - [ ] 리팩터링  - [ ] 설정

## 테스트 방법
<!-- 실행 명령, 확인 화면/결과 -->

## 체크리스트
- [ ] 로컬에서 실행/테스트 통과
- [ ] `.env`, 키, 반출 불가 데이터가 포함되지 않음
- [ ] 명세서에 없는 기능을 임의로 추가하지 않음
- [ ] 관련 문서(README 등) 갱신
```

### 7.4 좋은 PR의 기준
- 제목은 커밋 규칙과 동일한 형식.
- **작게** 유지한다(리뷰하기 쉬운 규모, 대략 변경 400줄 이하 권장).
- 스크린샷/실행 결과를 첨부하면 리뷰가 빨라진다.

📚 **왜 PR을 거치나?** PR은 "main에 합치기 전의 검문소"입니다. 변경 내용을 한눈에 비교(diff)하고, 리뷰·토론하고, 자동 검사를 돌릴 수 있습니다. 혼자 작업해도 PR을 쓰면 "내가 뭘 바꿨는지" 기록이 남고 실수를 한 번 더 잡을 수 있습니다.

---

## 8. STEP 6 — Merge → STEP 7 — 로컬 Pull & 정리

### 8.1 머지 전 확인
- 충돌(conflict) 없음 표시, 리뷰 승인(있다면), 체크리스트 완료.
- 충돌이 있으면 **10장** 먼저.

### 8.2 머지 방식 (GitHub PR 화면의 버튼)
| 방식 | 결과 | 이 프로젝트 권장 |
|---|---|---|
| **Squash and merge** | PR의 모든 커밋을 **1개로 합쳐** main에 추가 | ✅ **기본 권장** (main 히스토리가 깔끔) |
| Create a merge commit | 커밋 전부 + 머지 커밋 | 커밋 이력을 그대로 보존하고 싶을 때 |
| Rebase and merge | 커밋을 main 위에 일렬로 재배치 | 숙련자용 |

CLI로 머지: `gh pr merge <PR번호> --squash --delete-branch`

### 8.3 머지 후 로컬 정리 (사이클 마무리)
```bash
git switch main
git pull origin main                  # 머지된 결과를 로컬 main에 반영
git branch -d feature/f03-search-bar  # 로컬 작업 브랜치 삭제
git fetch --prune                     # 원격에서 사라진 브랜치 정보 정리
```
📚 **왜 다시 pull?** 머지는 **GitHub(원격)** 에서 일어났습니다. 내 로컬 main은 아직 옛날 상태이므로 pull로 따라잡아야 다음 브랜치를 최신 상태에서 시작할 수 있습니다. 이것이 "pull로 시작해서 pull로 끝나는" 사이클입니다. 다 쓴 브랜치는 지워 목록을 깨끗이 유지합니다(`-d`는 머지 안 된 브랜치는 지워주지 않는 안전한 옵션).

---

## 9. 변형: 권한이 없을 때 (Fork 방식)
```bash
# 1) GitHub 웹에서 Fork 클릭 → 내 계정에 복사본 생성
git clone https://github.com/<내계정>/Jeju-Hackathon.git
cd Jeju-Hackathon
git remote add upstream https://github.com/CraemyKim/Jeju-Hackathon.git

# 2) 최신화: 원본(upstream)의 main을 가져온다
git switch main
git pull upstream main
git push origin main

# 3) 이후 3~8장과 동일하게 브랜치/커밋/push 후,
#    PR의 base repository는 CraemyKim/Jeju-Hackathon 으로 지정
```
📚 **왜?** Fork는 "원본에 쓰기 권한이 없는 사람이 내 계정에 복사본을 만들어 작업하고, PR로 원본에 제안"하는 오픈소스 표준 방식입니다. `upstream`은 원본, `origin`은 내 복사본을 가리키는 이름입니다.

---

## 10. 충돌(Conflict) 해결

### 10.1 언제 생기나
두 사람이 **같은 파일의 같은 부분**을 다르게 고쳤을 때.

### 10.2 해결 절차 (브랜치 쪽에서 main을 가져와 해결)
```bash
git switch feature/f03-search-bar
git fetch origin
git merge origin/main            # 충돌 발생 시 파일에 표시가 생김
git status                       # 'both modified' 파일 확인
```
충돌 파일 안의 표시:
```
<<<<<<< HEAD
(내 브랜치의 내용)
=======
(main의 내용)
>>>>>>> origin/main
```
1. 두 내용을 읽고 **의도에 맞게 하나로 합친 최종본**을 만든다. 표식(`<<<<<<<`, `=======`, `>>>>>>>`)은 **전부 삭제**.
2. 앱을 실행/테스트해 정상 확인.
3. ```bash
   git add <해결한 파일>
   git commit                    # 기본 머지 메시지 사용 가능
   git push
   ```
4. PR 화면에서 충돌 표시가 사라졌는지 확인.

**AI 에이전트 주의**: 어느 쪽 코드가 맞는지 **판단이 불확실하면 임의로 한쪽을 버리지 말고** 사용자에게 두 버전을 보여주고 묻는다. 충돌을 피하려고 `--force`나 `git checkout --theirs .`를 일괄 적용하지 않는다.

📚 **왜 생기고 왜 사람이 풀어야 하나?** Git은 "줄 단위로 글자가 다른지"만 압니다. 두 변경 중 어느 쪽이 의미상 옳은지는 모르기 때문에 사람(또는 판단 능력이 있는 AI)이 결정해야 합니다. 작은 PR을 자주 머지하고, 작업 전 pull을 습관화하면 충돌이 크게 줄어듭니다.

---

## 11. 자주 쓰는 복구·보조 명령

### 11.1 실수 되돌리기 (안전한 것 위주)
| 상황 | 명령 |
|---|---|
| 스테이징(add)만 취소 | `git restore --staged <파일>` |
| 수정한 파일을 마지막 커밋 상태로 되돌림(⚠️ 변경 사라짐) | `git restore <파일>` |
| 마지막 커밋 메시지만 수정 (**push 전에만**) | `git commit --amend` |
| 이미 push한 커밋을 취소 | `git revert <커밋해시>` (취소 내용을 새 커밋으로 기록, 안전) |
| 잘못 올라간 비밀키 | **즉시 키 폐기/재발급**이 1순위. 기록 삭제는 별도 절차 필요 → 사용자에게 알린다 |

⚠️ `git reset --hard`는 변경을 영구 삭제할 수 있으니 허락 없이 쓰지 않는다.

### 11.2 작업 중 잠깐 치워두기
```bash
git stash push -m "임시: 검색창 작업 중"   # 변경을 임시 보관
git stash list
git stash pop                              # 다시 꺼내기
```

### 11.3 상태/기록 보기
```bash
git log --oneline --graph --decorate -15   # 최근 15개 커밋을 그래프로
git diff main...HEAD                       # main 대비 내 브랜치의 변경
git show <커밋해시>                        # 특정 커밋 내용
```

---

## 12. main 보호 설정 (저장소 소유자가 1회 설정, 권장)
GitHub → **Settings → Branches → Add branch ruleset(또는 protection rule)** → 대상 `main`
- ☑ Require a pull request before merging
- ☑ (팀 작업 시) Require approvals: 1
- ☑ Block force pushes
- ☑ Restrict deletions

📚 **왜?** 규칙을 사람의 기억에 맡기지 않고 GitHub가 **강제**하게 만드는 설정입니다. 실수로 main에 직접 push하거나 force push로 히스토리를 날리는 일을 막아줍니다.

---

## 13. 실전 예시: F-03 검색창을 한 사이클로 올리기

```bash
# 1. Pull
git switch main
git pull origin main

# 2. Branch
git switch -c feature/f03-search-bar

# (코드 작성: frontend/src/components/search/SearchBar.tsx 등)

# 3. Commit (의미 단위로 2번)
git status
git add frontend/src/components/search/SearchBar.tsx
git commit -m "feat(search): 자연어 검색창 컴포넌트 추가 (F-03)"
git add frontend/src/lib/api.ts frontend/src/types/api.ts
git commit -m "feat(api): /api/search 클라이언트와 응답 타입 추가 (F-03)"

# 4. Push
git push -u origin feature/f03-search-bar

# 5. Pull Request
gh pr create --base main --title "feat(search): 자연어 검색창 추가 (F-03)" --body "SearchBar와 /api/search 연동. 로컬에서 Mock AI로 확인함."

# 6. Merge (웹에서 Squash and merge, 또는)
gh pr merge --squash --delete-branch

# 7. Pull & 정리
git switch main
git pull origin main
git fetch --prune
```

---

## 14. 사이클 체크리스트 (AI·사람 공용)

**시작 전**
- [ ] `git switch main && git pull origin main`
- [ ] 새 브랜치 `종류/기능ID-설명`을 만들었다

**작업 중**
- [ ] 한 브랜치 = 한 목적
- [ ] 커밋 전 `git status`, `git diff --staged` 확인
- [ ] `.env`/키/반출 불가 데이터/대용량 모델이 스테이징에 없다
- [ ] 커밋 메시지가 `type(scope): 요약` 형식이다

**올리기**
- [ ] `git push -u origin <브랜치>`
- [ ] PR 템플릿을 채웠다 (변경 요약, 명세 ID, 테스트 방법, 체크리스트)

**끝내기**
- [ ] 충돌 없음 + 테스트 통과 확인 후 Squash and merge
- [ ] `git switch main && git pull origin main`
- [ ] 로컬 브랜치 삭제, `git fetch --prune`
- [ ] 사용자에게 결과(브랜치명, PR 번호/링크, 머지 여부) 보고

---

## 15. 용어 사전 (공부용)
| 용어 | 뜻 |
|---|---|
| repository(저장소) | 코드와 변경 기록이 담긴 폴더 |
| remote / origin | 원격 저장소(GitHub)와 그 기본 별칭 |
| clone | 원격 저장소를 로컬로 복사 |
| branch | 독립된 작업 갈래 |
| stage(add) | 다음 커밋에 넣을 변경 선택 |
| commit | 변경의 스냅샷 저장(로컬) |
| push | 로컬 커밋을 원격으로 업로드 |
| pull | 원격의 변경을 로컬로 가져와 합침 (`fetch`+`merge`) |
| fetch | 가져오기만 하고 합치지는 않음 |
| Pull Request | "내 브랜치를 main에 합쳐 주세요"라는 요청 + 리뷰 공간 |
| merge | 두 브랜치의 변경을 하나로 합침 |
| conflict | 같은 부분을 다르게 고쳐 자동 병합이 불가능한 상태 |
| fork | 남의 저장소를 내 계정으로 복사 |
| upstream | fork의 원본 저장소 별칭 |
| HEAD | 지금 보고 있는 커밋/브랜치 위치 |