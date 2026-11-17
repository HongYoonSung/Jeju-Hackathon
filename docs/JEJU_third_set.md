# 제주얼마꽈 — 구현 명세서 (SPEC v0.3)

> **어떤 AI 코딩 모델에게 전달해도 같은 결과물이 나오도록** 작성된 단일 명세서입니다. v0.1·v0.2를 **완전히 대체**합니다.
> 💡 `📚 왜?` 박스는 사람이 읽는 공부용 설명이며, 구현 AI는 무시해도 됩니다.
> 키 발급·AI 모델 연결 같은 **사람이 직접 해야 할 일**은 별도 문서 `NAVER_AND_AI_INTEGRATION_GUIDE.md`에 있습니다.

---

## 0. AI 구현자에게 (반드시 먼저 읽을 것)

### 0.1 절대 규칙
1. **이 문서에 적힌 기능만 구현한다.** 부록 B(승인 대기 제안)는 **절대 구현하지 않는다.** 임의로 기능·화면·버튼·문구를 추가하지 않는다.
2. **AI 모델 연동부는 구현하지 않는다.** 8장의 인터페이스·Mock·스텁까지만 만든다.
3. 파일은 **생략 없이 전체**를 출력한다. (`// ...생략` 금지)
4. **API Key·Secret·비밀번호·토큰을 코드·테스트·문서 예시에 쓰지 않는다.** 설정은 환경변수로만 받고 `.env.example`에는 **빈 값**만 둔다.
5. **네이버 Client Secret은 백엔드 `.env`에만** 둔다. 프론트에는 지도용 **Key ID만** `VITE_NAVER_MAP_KEY_ID`로 전달한다. 프론트 코드·빌드 산출물에 Secret이 들어가면 실패다.
6. 런타임 외부 요청은 **허용 목록**에만 한다: 프론트 = 네이버 지도 스크립트·타일(11.5), 백엔드 = 네이버 Maps API·(선택) OSRM·AI 모델 서버. 그 밖의 CDN(폰트·아이콘·라이브러리)은 쓰지 않고 npm으로 번들한다.
7. 모호한 부분은 `[기본값]`을 쓰고 코드 주석에 `// SPEC-DEFAULT: <id>`를 남긴다.
8. **거리·시간을 직선거리로 계산해 "정상 값"처럼 표시하지 않는다.** 직선 기반 폴백(`estimate`)은 반드시 `(추정)`으로 표기한다.
9. 토스(Toss)의 로고·폰트 등 **상표/독점 자산을 사용하지 않는다.** 스타일(여백·둥근 모서리·타이포 위계·톤)만 참고한다.
10. 네이버 지도의 **로고·저작권 표기를 가리거나 숨기지 않는다.**
11. 외부 API가 **응답 필드 이름·주소·인증 파라미터를 바꿀 수 있음**을 전제로, 호출 주소는 환경변수로 받고 응답 파싱은 한 파일에 모은다(10장).
12. 구현 순서는 **15장**을 따르고, 단계마다 검증 명령을 통과시킨다.

### 0.2 프로젝트 한 줄 정의
첫 화면에는 **입력칸 하나**만 있다. 도민이 "노형동 근처에서 우유 제일 싼 곳 알려줘"라고 말하면 **에이전트가 의도를 해석**하고, 화면이 **네이버 지도 + 가격표**로 전환되어 답을 알려 준다. 오프라인 매장은 **실시간 교통을 반영한 도로 기준 거리·시간**, **혼잡도**, **내비게이션 형식 길안내**를, 온라인몰은 **검색된 상태의 사이트 이동**을 제공한다. 서비스명은 **제주얼마꽈**.

### 0.3 우선순위
**P1** 핵심 / **P2** 후순위 / **P3** 선택(인터페이스 + Mock + 비활성 UI까지만)

---

## 1. v0.2 → v0.3 변경 요약

| 구분 | 내용 |
|---|---|
| 변경 | 지도: Leaflet → **네이버 Web Dynamic Map**(기본). Leaflet은 **로딩 실패 시 대체용(P2)** |
| 변경 | 경로 엔진: OSRM 단독 → **`ROUTER_CHAIN=naver,osrm,estimate`** (네이버 Directions 5 우선, 실패 시 다음 엔진) |
| 변경 | 지오코딩: **네이버 Geocoding** 우선 (`GEOCODER_CHAIN=naver,mock`) |
| 추가 | **실시간 교통 반영 여부(`traffic_aware`)** 표시, 응답의 길안내 문구는 네이버 `guide`를 그대로 사용 |
| 추가 | **도로 거리 일괄 계산 전략**: 네이버에는 매트릭스 API가 없으므로 *직선거리 상위 N개만* 병렬 호출 + 캐시 + 나머지는 `estimate` |
| 추가 | 원격 AI 서버 연결용 설정(`AI_API_KEY`, `AI_RETRIES`, `AI_MODEL_NAME`)과 `ai_reachable` 점검 |
| 추가 | 키 점검 스크립트 `scripts/check_naver.py`, 지도 로더 `loadNaverMaps`, 인증 실패 감지(`navermap_authFailure`) |
| 유지 | GPT형 랜딩, 에이전트 해석·답변문·화면 힌트, 가격표, 토스 스타일 디자인, AI 슬롯 구조 |

---

## 2. 기능 요구사항 (추적 ID)

| ID | 우선순위 | 내용 | 구현 위치 |
|---|---|---|---|
| F-01 | P1 | GPT형 랜딩(입력칸만) → 제출 시 결과 화면 전환 | `MainPage`, `LandingInput` |
| F-02 | P2 | 아이디 로그인 / 회원가입 (UI 전용) | `LoginPage`, `SignupPage` |
| F-03 | P1 | 에이전트가 질의를 해석하고 답변문·화면 힌트·결과 반환 (되묻기 포함) | `/api/search`, `AgentSummary` |
| F-04 | P1 | 좌측 패널 목록, 온라인=`사이트` / 오프라인=`매장` | `ResultList`, `TypeBadge` |
| F-05 | P1 | 분류 버튼(거리순·가격순·오프라인/온라인) | `ClassificationBar` |
| F-06 | P1 | 오프라인 매장 클릭 → 지도에서 위치 표시 | `ResultCard`, `MapCanvas` |
| F-07 | P1 | **네이버 도로 기반 길안내**: 출발 주소 → 경로선 + 거리·시간 + 단계별 안내 | `RouteView`, `/api/route` |
| F-08 | P1 | 온라인몰 클릭 → 검색된 상태로 사이트 이동 | `ResultCard`, `safeUrl` |
| F-09 | P1 | 매장명 옆 혼잡도 색상 + 인원수 | `CrowdBadge` |
| F-10 | P3 | 대중교통 길안내 | `/api/transit`, 비활성 탭 |
| F-11 | P1 | 도로 기준 거리·시간 일괄 계산(목록·정렬·가격표) | `/api/metrics`, `routing/` |
| F-12 | P1 | 가격표 보기 | `PriceTable` |
| F-13 | P1 | **네이버 지도 표시**(마커·경로선·이동·범위맞춤) | `NaverMapCanvas` |
| F-14 | P2 | **지도 로딩/인증 실패 시 Leaflet 대체** | `LeafletMapCanvas`, `useMapProvider` |

---

## 3. 기술 스택 (고정)

| 영역 | 선택 | 비고 |
|---|---|---|
| 프론트 | Vite + React 18 + TypeScript, react-router-dom v6 | |
| 상태/서버상태 | zustand v4 / @tanstack/react-query v5 | |
| **지도** | **네이버 Web Dynamic Map (JS v3)** — 런타임에 스크립트 로드 | 타입: `@types/navermaps`(devDependency, 존재 여부·이름은 npm에서 확인) |
| 지도(대체) | leaflet 1.9 + react-leaflet 4 *(P2, F-14)* | 네이버 로딩 실패 시만 사용 |
| 아이콘/스타일/폰트 | lucide-react / CSS Modules + CSS 변수 / Pretendard(`@fontsource` 셀프호스팅) | |
| 화면 전환 | View Transitions API(미지원 시 즉시 전환) | |
| 백엔드 | Python 3.11 + FastAPI + Uvicorn + Pydantic v2 + httpx + cachetools | |
| 경로 | **네이버 Directions 5**(주) → OSRM(선택, 오프라인용) → estimate(최후) | |
| 지오코딩 | **네이버 Geocoding**(주) → mock | |
| 테스트 | pytest(+respx 또는 httpx MockTransport) / vitest + @testing-library/react | |
| 배포 | `npm run build` → FastAPI가 `frontend/dist` 서빙(프로세스 1개) | |

> 📚 **왜 "체인"인가?** 네이버는 정확하고 교통상황까지 반영하지만 인터넷·키·호출 한도가 필요합니다. OSRM은 오프라인으로 돌지만 교통을 모릅니다. 그래서 *앞 엔진이 실패하면 다음 엔진*으로 넘어가게 만들어, 키가 없거나 네트워크가 막혀도 화면이 죽지 않게 합니다. 어떤 엔진이 답했는지는 응답의 `provider/source`에 항상 기록해 화면이 솔직하게 표시합니다.

---

## 4. 폴더 구조 (이 구조 그대로 생성)

```
jeju-eolmakkwa/
├─ README.md   .env.example   .gitignore
├─ docker-compose.osrm.yml            # 선택(OSRM)
├─ scripts/ dev.sh  build_and_serve.sh  check_naver.py  osrm_prepare.sh
├─ docs/ DATA_USAGE.md  AI_DISCLOSURE.md  USER_MANUAL.md
├─ osrm-data/                          # .gitignore 대상
├─ backend/
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ main.py  config.py  errors.py  schemas.py
│  │  ├─ api/ health.py search.py metrics.py geocode.py route.py transit.py auth.py
│  │  ├─ ai/ base.py mock_agent.py local_model_agent.py registry.py
│  │  ├─ providers/
│  │  │  ├─ base.py                    # Router/Geocoder 프로토콜, ProviderUnavailable
│  │  │  ├─ router_naver.py            # 네이버 응답 파싱은 이 파일에만
│  │  │  ├─ router_osrm.py  router_estimate.py  router_chain.py
│  │  │  ├─ geocode_naver.py  geocode_mock.py  geocode_chain.py
│  │  ├─ routing/ instructions_ko.py (OSRM용)  naver_guide.py (type→action)  metrics_service.py
│  │  ├─ utils/ geo.py  cache.py
│  │  └─ data/mock/ stores.json  online_malls.json  landmarks.json
│  └─ tests/ (+ fixtures/naver_directions_sample.json)
└─ frontend/
   ├─ package.json  vite.config.ts  tsconfig.json  index.html  .env.example
   └─ src/
      ├─ main.tsx  App.tsx
      ├─ styles/ tokens.css  global.css
      ├─ types/api.ts
      ├─ lib/ api.ts format.ts crowd.ts safeUrl.ts actionIcon.ts viewTransition.ts loadNaverMaps.ts
      ├─ store/ useAppStore.ts
      ├─ components/
      │  ├─ common/ Logo Button Spinner CountUp
      │  ├─ landing/ LandingInput
      │  ├─ layout/ TopBar
      │  ├─ panel/ AgentSummary LocationChip ViewTabs ClassificationBar ResultList ResultCard
      │  │         PriceTable TypeBadge CrowdBadge RouteView StepList
      │  └─ map/ MapCanvas.tsx (선택자)  NaverMapCanvas.tsx  LeafletMapCanvas.tsx  mapTypes.ts  useMapProvider.ts  markerHtml.ts
      ├─ pages/ MainPage LoginPage SignupPage NotFoundPage
      └─ tests/
```

---

## 5. 디자인 시스템 (토스 스타일)

### 5.1 방향
한 화면 = 한 가지 질문(랜딩은 입력칸 하나), 큰 굵은 제목, 넉넉한 여백, 테두리보다 옅은 회색 면과 부드러운 그림자, 큰 둥근 모서리, **큰 숫자(가격)+작은 보조 설명**, 해요체 문구("찾아보고 있어요"). 지도·가격표 화면은 카드·행 단위로 깔끔하게 구성한다.

### 5.2 토큰 (`styles/tokens.css`에 그대로)
```css
:root {
  --color-primary: #3182F6; --color-primary-hover: #1B64DA; --color-primary-tint: #E8F3FF;
  --color-accent-teal: #0FA3A3; --color-accent-teal-tint: #E0F6F6;
  --color-text: #191F28; --color-text-secondary: #4E5968; --color-text-muted: #8B95A1;
  --color-border: #E5E8EB; --color-bg: #FFFFFF; --color-surface: #F2F4F6; --color-danger: #F04452;
  /* 혼잡도: 의미 고정, 다른 용도 금지 */
  --crowd-low: #2EB872; --crowd-medium: #F5C400; --crowd-high: #F58A1F; --crowd-very-high: #F04452;

  --font-sans: 'Pretendard Variable','Pretendard','Noto Sans KR',system-ui,-apple-system,'Malgun Gothic',sans-serif;
  --fs-display: 32px; --lh-display: 42px; --fs-title: 22px; --lh-title: 30px;
  --fs-body: 16px; --lh-body: 24px; --fs-small: 14px; --lh-small: 20px; --fs-caption: 12px; --lh-caption: 16px;
  --fs-price: 20px; --fw-regular: 400; --fw-medium: 500; --fw-bold: 700;

  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-12: 48px; --sp-16: 64px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-pill: 999px;
  --shadow-soft: 0 4px 16px rgba(0,0,0,.06); --shadow-input: 0 8px 28px rgba(25,31,40,.10); --shadow-panel: 0 8px 24px rgba(0,0,0,.12);
  --ease-out: cubic-bezier(.2,.8,.2,1); --dur-fast: 150ms; --dur-base: 240ms; --dur-slow: 400ms;
  --topbar-h: 64px; --panel-w: 440px; --content-max: 640px; --z-topbar: 1000; --z-popover: 1100;
}
@media (prefers-reduced-motion: reduce) { :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; } }
```

### 5.3 컴포넌트 규칙
- **Button** 높이 48px(small 40px), 라운드 12px, 15~16px/bold. `primary`(파랑 면·흰 글자), `secondary`(`--color-surface` 면 + secondary 글자, 테두리 없음), `text`(배경 없음).
- **Card/Row** 라운드 16px(행은 12px), 구분선 대신 간격. 선택 = `--color-primary-tint` 배경.
- **뱃지** 높이 22px, 라운드 8px, 12px/bold. `매장`=파랑 글자+tint, `사이트`=teal 글자+tint.
- **일반 입력창** 높이 56px, `--color-surface` 면, 테두리 없음, 라운드 12px, 포커스 `box-shadow: 0 0 0 2px var(--color-primary)`.
- 포커스 링 `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`, 숫자 `font-variant-numeric: tabular-nums`.
- **CountUp**: 0 → 목표값 600ms ease-out. `prefers-reduced-motion`이면 즉시 표시.
- **TopBar** 높이 64px, 흰 배경(결과 화면에서만 하단 1px 구분선). 좌 `Logo`(클릭 시 랜딩 초기화), 우 `로그인`(text 버튼). 메뉴 없음. 로고 = 물결 SVG(22px, primary) + `제주얼마꽈`(bold 20px).

---

## 6. 화면 명세

### 6.1 `/` MainPage — 단일 페이지, 3단계(phase)
`phase`: `landing` → `loading` → `results`. URL은 `/`(landing) 또는 `/?q=<질의>`(results). 제출 시 `history.pushState`, 뒤로가기(`popstate`)는 landing 복귀, `/?q=` 직접 진입·새로고침은 자동 검색. `/search`는 `/`로 리다이렉트.

#### 6.1.1 landing — F-01
- **화면에는 TopBar, 제목, 입력칸만 존재한다.** (예시 칩·안내문·사진 금지)
- 중앙 컬럼 `max-width: var(--content-max)`, 세로 위치는 정중앙보다 약 40px 위. 제목(`오늘 제주 가격,` / `뭐가 궁금하세요?`, display 32px bold)과 입력칸 간격 28px.
- **LandingInput**: `<textarea>` 자동 높이(1~3줄), 최대 200자, 높이 64px, 라운드 24px, 흰 배경 + 1px 테두리 + `--shadow-input`, 포커스 시 파랑 2px 링, 자동 포커스. placeholder `예) 노형동 근처에서 우유 제일 싼 곳 알려줘`.
  - 우측 전송 버튼 44px 원형: 입력 있으면 파랑 면+흰 `ArrowUp`, 없으면 회색+`disabled`.
  - **Enter=제출, Shift+Enter=줄바꿈, IME 조합 중(`isComposing`) Enter는 무시.** 공백만 있으면 제출 불가.
  - 래퍼에 `view-transition-name: search-input`.

#### 6.1.2 loading
- 입력칸 유지, 전송 버튼은 스피너, 입력은 읽기 전용. 입력칸 아래 `찾아보고 있어요` + 점 3개 깜빡임.
- **위치 처리**: 첫 제출 직후 `navigator.geolocation`을 **한 번** 요청, 5초 안에 응답이 없거나 거부되면 `user_location:null`로 진행. 앱 시작 시에는 요청하지 않는다.
- 응답 타임아웃 70초 → 입력칸 아래 `--color-danger` 문구(`error.message`) 후 직전 phase 복귀.

#### 6.1.3 results — 전환과 레이아웃
- `startViewTransition`으로 입력칸이 TopBar의 컴팩트 입력창(pill 48px, 최대 720px)으로 이동하는 연출(400ms). 미지원 브라우저는 즉시 전환.
- 레이아웃: TopBar(64px) 아래 `좌측 패널(440px, 세로 스크롤) | 지도(남은 폭 전체)`, 본문 높이 `calc(100vh - var(--topbar-h))`, 페이지 스크롤 없음.
- 컴팩트 입력창에서 새 질의 제출 시: 이전 결과 유지 + 패널 상단 스피너 + 지도 위 반투명 오버레이 `찾아보고 있어요`.
- **지도는 results 진입 시에만 마운트**(`React.lazy`). landing에서는 지도 스크립트를 요청하지 않는다.

#### 6.1.4 좌측 패널 (위→아래)
**① AgentSummary — F-03** (배경 `--color-primary-tint`, 라운드 16px, 패딩 20px)
- 답변문 `answer`(`--fs-title`/bold, 최대 3줄 말줄임).
- 해석 칩(읽기 전용 pill): `상품 {item}`, `기준 {origin.label}`, 정렬 라벨(`추천순`/`가까운 순`/`싼 순`, 현재 `sortKey` 기준). null이면 칩 생략.
- 최저가 강조(`status==='ok'`이고 가격 있는 결과가 있을 때, **클라이언트 계산**): `가장 싼 곳` 라벨 + 이름 + 가격(`CountUp`, 28px bold, primary).
- `needs_clarification`이면 답변문만 표시하고 ②~⑤는 렌더링하지 않는다(지도는 제주 전경).

**② LocationChip** — `{label} 기준 · 변경`(14px, text 버튼). 팝오버(폭 320px, `--shadow-panel`): `현재 위치 사용`(타임아웃 8초) / 입력창 + `주소로 설정`(`/api/geocode`). 위치가 바뀌면 **AI를 재호출하지 않고** `POST /api/metrics`로 거리·시간만 재계산(재계산 중 거리 영역에 회색 스켈레톤).

**③ ViewTabs — F-12**: `목록` | `가격표`(밑줄 탭). 기본 `목록`.

**④ ClassificationBar — F-05**
- 정렬(세그먼트): `추천순` | `거리순` | `가격순`. 초기값 `view_hint.sort`(없으면 `recommend`).
- 유형 필터(칩): `전체 (n)` | `오프라인 (n)` | `온라인 (n)`. 초기값 `view_hint.type_filter`(없으면 `all`).
- 칩 높이 36px, 비활성 `--color-surface`+secondary 글자, 활성 `--color-text` 면+흰 글자.
- 필터 → 정렬 순, **클라이언트 처리**:

| 정렬 | 규칙(모두 오름차순) |
|---|---|
| 추천순 | `rank` |
| 거리순 | 오프라인: `road.distance_m`(없으면 맨 뒤) → 그 뒤 온라인을 `rank` 순 |
| 가격순 | `price.amount`, null은 맨 뒤 |

**⑤ 본문**: 선택된 탭에 따라 `ResultList`(6.2) 또는 `PriceTable`(6.3). 0건이면 `조건에 맞는 곳이 없어요.`

#### 6.1.5 패널 모드 전환
오프라인 카드의 `길안내` 버튼 → 패널 전체가 `RouteView`(6.4)로 교체(`panelMode='route'`). `← 결과로`로 복귀하며 선택·정렬·탭·지도 줌은 유지, 경로선·출발 마커만 제거.

### 6.2 ResultList / ResultCard — F-04, F-06, F-08, F-09
```
 1   예시마트 노형점  ● 약 180명         ← 순번(파랑 bold) + 이름 + CrowdBadge
     [매장]  제주시 노형동 · 2.4km · 6분   ← 도로 기준(자동차)
     2,480원 / 1L                         ← 가격 20px bold
     [ 길안내 ]                            ← 오프라인 + 선택된 카드에만
```
```
 2   쿠팡  ↗
     [사이트]  2,650원 / 1L
```
- 행 최소 높이 76px, 패딩 16px, 라운드 12px, 행 간격 4px, 선택 시 `--color-primary-tint`.
- 순번 = 현재 표시 순서(1부터). 거리 `850m`/`2.4km`, 시간 `6분`/`1시간 5분`. `road.source==='estimate'`면 `약` + `(추정)`. `road`가 없으면 거리·시간 생략.
- **오프라인 카드 클릭**: `selectedId` 설정 → 선택 스타일 + `길안내` 버튼 + 지도 해당 좌표로 부드럽게 이동(줌 16) + 마커 정보창(매장명).
- **온라인 카드 클릭**: `safeUrl(deeplink_url)` 유효 시 `window.open(url,'_blank','noopener,noreferrer')`, 유효하지 않으면 이동하지 않는다(`<a target="_blank" rel="noopener noreferrer">` 구현 권장).
- `view_hint.focus_place_id`가 있으면 결과 도착 시 해당 카드 자동 선택 + 지도 이동.
- 📚 `safeUrl`: 링크는 AI가 만든 값이므로 `https` + 허용 도메인(`ALLOWED_ONLINE_HOSTS`)만 통과시킨다.

**CrowdBadge**: 10px 색 원 + `약 {N}명`(13px/medium)을 이름 바로 오른쪽에, `title="기준 시각 {as_of}"`. `crowd` null이면 숨김.
| level | 의미 | 색 |
|---|---|---|
| `low` | 적음 | `--crowd-low`(초록) |
| `medium` | 보통 | `--crowd-medium`(노랑) |
| `high` | 많음 | `--crowd-high`(주황) |
| `very_high` | 매우 많음 | `--crowd-very-high`(빨강) |

### 6.3 PriceTable — F-12
- 폭 100%, 헤더 sticky(12px muted), 행 높이 56px, 행 구분선 1px `--color-border`.
- 열: **순위**(32px) | **이름**(아래에 작은 `매장`/`사이트` 뱃지) | **가격**(우측정렬, bold) | **거리·시간**(오프라인 `2.4km · 6분`, 온라인 `-`) | **혼잡**(색 원, 툴팁에 인원수, 온라인 `-`).
- 최저가 행: 가격 `--color-primary` bold + 이름 옆 뱃지 `최저가`.
- 행 클릭 동작은 `ResultCard`와 동일. 정렬·필터(④) 공통 적용. 헤더 아래 보조문구 `기준 {가장 이른 checked_at}`(12px muted).

### 6.4 RouteView — 도로 기반 길안내 (F-07)
```
 ← 결과로
 [ 출발 주소 입력 ...  ] [내 위치로]        ← Enter/버튼으로 안내 시작
 도착  예시마트 노형점
 ────────────────────────
 24분 · 12.4km                              ← 28px bold
 자동차 · 실시간 교통 반영                    ← 14px secondary (7번 표)
 ────────────────────────
  ⬆ 출발
  ⬅ 머내공원사거리에서 …방면으로 좌회전      350m
  ⚑ 도착
```
- **흐름**: 출발 주소 입력 → `POST /api/geocode` → `POST /api/route`. 초기 출발지는 현재 기준 위치이며 `내 위치로`로 되돌린다.
- **보조 라벨**: `provider==='naver'` → `자동차 · 실시간 교통 반영` / `osrm` → `자동차 · 교통상황 미반영 예상` / `estimate` → `(추정) 직선 기반 추정값이에요`.
- **StepList**: 단계 행(높이 56px): 좌 방향 아이콘(`actionIcon`), 중 `instruction`(16px bold, 최대 2줄) + `road_name`이 있으면 14px muted, 우 `distance`(14px). 행 클릭 → 지도 해당 `location`으로 이동(줌 17) + 행 강조.
- **지도 연동**: 경로 폴리라인(`--color-primary`, 두께 6, 아래 흰색 두께 9 외곽선), 출발 마커(파란 원+`출발`), 도착 마커(강조), 경로 전체가 보이도록 범위 맞춤(패딩 48).
- **오류**: 지오코딩 실패 `주소를 찾지 못했어요. 더 자세히 입력해 주세요.` / 경로 호출 자체 실패 `경로를 계산하지 못했어요.`(입력창 아래 14px `--color-danger`).
- **[P3]** 요약 아래 탭 `자동차` | `대중교통`. 대중교통은 `VITE_FEATURE_TRANSIT !== 'true'`이면 `disabled` + 툴팁 `준비 중`.

### 6.5 MapCanvas — F-13, F-14 (상세는 11장)
`MapCanvas.tsx`는 `useMapProvider()`가 정한 구현(`NaverMapCanvas` | `LeafletMapCanvas`)을 렌더하는 얇은 선택자다. 두 구현은 **동일한 props 계약**(11.3)을 따른다.

### 6.6 `/login`, `/signup` — F-02 (P2, UI 전용)
중앙 컬럼 400px, 위에서 120px. 제목(28px bold), 필드 간격 16px, 일반 입력창(56px), 하단 전체폭 `primary` 버튼(56px). 로그인: `아이디`,`비밀번호` / 회원가입: `아이디`,`비밀번호`,`비밀번호 확인`. 검증: 아이디 4~20자 영문·숫자, 비밀번호 8자 이상, 확인 일치(오류는 입력창 아래 12px `--color-danger`). 제출 → `POST /api/auth/*` → **501** → 폼 상단 `준비 중인 기능이에요.` **토큰/세션 저장 코드를 만들지 않는다.**

---

## 7. 에이전트 동작과 위치 처리

**기준 위치(origin) 결정 우선순위(백엔드가 최종 결정)**
1. 에이전트가 해석한 `interpretation.origin_text`(예: "노형동") → 지오코딩(질의어가 `제주`·`서귀포`를 포함하지 않으면 앞에 `제주 `를 붙여 검색) → `source:"query"`
2. 요청의 `user_location`(브라우저 GPS) → `source:"gps"`
3. 기본값 제주시청 `{33.4996, 126.5312}` → `source:"default"`

결정된 `origin`은 응답에 포함되고, 프론트는 이를 기준 위치 상태로 채택한다(LocationChip 라벨 = `origin.label`).

**화면 힌트(`view_hint`)**: 에이전트가 정한다("가장 싼"→`price`, "가까운/근처"→`distance`, "온라인에서"→`type_filter:"online"`). 프론트는 첫 렌더에만 적용하고 이후 사용자의 버튼 선택이 우선한다.

**되묻기**: 질의가 가격 탐색과 무관하거나 모호하면 `status:"needs_clarification"`, `results:[]`, `answer`에 되묻는 문장. 패널에는 AgentSummary만 보인다.

**경로 소요시간 표기 의미**: `traffic_aware:true`(네이버)는 *조회 시점의 실시간 교통*을 반영한 값이라 같은 경로도 시각에 따라 달라진다.

---

## 8. ★ AI 슬롯 (구현 금지 영역과 경계)

> 사용자가 **직접 학습시킨 모델**이 들어올 자리. 구현 AI는 **인터페이스·Mock·스텁까지만** 만든다. 모델이 다른 컴퓨터에 있어도 같은 슬롯에 연결된다(`AI_ENDPOINT`).

### 8.1 인터페이스 `backend/app/ai/base.py`
```python
from typing import Protocol
from datetime import datetime
from app.schemas import AgentSearchRequest, AgentSearchResult, CrowdInfo

class AIAgent(Protocol):
    async def search(self, req: AgentSearchRequest) -> AgentSearchResult:
        """자연어 질의를 해석(interpretation)하고 답변문(answer)·화면 힌트(view_hint)·
        후보(results: 오프라인 매장/온라인몰, 가격·순위 포함)를 반환한다.
        거리/시간(road)은 채우지 않는다(백엔드가 채움). crowd는 비워도 된다."""

    async def estimate_crowd(self, place_ids: list[str], at: datetime) -> list[CrowdInfo]:
        """오프라인 매장별 혼잡도(4단계)와 추정 인원수."""
```
`AgentSearchRequest = {query, client_time}`(위치는 넘기지 않음), `AgentSearchResult = {status, answer, interpretation, view_hint, results}`(9.1의 응답에서 `origin`, `road`, `request_id` 제외).

### 8.2 구현체 (`registry.py`가 `AI_BACKEND`로 선택)
| AI_BACKEND | 파일 | 동작 |
|---|---|---|
| `mock` **[기본값]** | `mock_agent.py` | 8.4 규칙 |
| `local` | `local_model_agent.py` | **스텁**: `NotImplementedError("AI model not connected")` → `503 AI_NOT_READY` |

`local_model_agent.py` 상단 docstring:
```
이 파일에 학습된 모델을 연결한다. (연결 절차: NAVER_AND_AI_INTEGRATION_GUIDE.md 파트 B)
- 입력 AgentSearchRequest / 출력 AgentSearchResult (9.1 계약)
- 모델이 같은 PC·다른 PC·서버 어디에 있든 settings.AI_ENDPOINT, AI_API_KEY, AI_MODEL_NAME, AI_TIMEOUT_S, AI_RETRIES 로 접속한다.
- 모델은 '이해와 문장 작성'을 맡고, 가격·좌표는 DB/조회 코드가 책임진다(모델이 숫자를 지어내지 않게 한다).
- 반출 불가 데이터는 센터 PC 안에서만 접근한다. 이 저장소에 원본 데이터를 포함하지 않는다.
- 연결 실패 시 Mock으로 조용히 대체하지 않는다(가짜 데이터가 진짜처럼 보이는 것을 막기 위해). 예외를 올리면 API가 503/504로 변환한다.
```

### 8.3 오케스트레이션 (`api/search.py`, 순서 고정)
1. `agent.search(req)` (타임아웃 `AI_TIMEOUT_S`, 초과 시 `504 AI_TIMEOUT`).
2. **응답 검증·정제**: Pydantic 실패, 좌표가 제주 범위(위도 33.1~33.65, 경도 126.1~127.0) 밖, `deeplink_url` 비허용 항목은 **그 항목만 제거**(전체 실패 아님) + 경고 로그. 최대 `MAX_RESULTS=30`개.
3. **기준 위치 결정**(7장) → `origin`.
4. `metrics_service.compute(origin, offline_places)` → 각 `place.road` 채움(10.5).
5. `crowd`가 null인 오프라인 항목을 모아 `agent.estimate_crowd(ids, now)` 1회 호출.
6. 응답 조립 → 반환.

### 8.4 Mock AI 규칙 (결정적)
- 데이터: `stores.json`(오프라인 10), `online_malls.json`(온라인 4).
- **해석**: `intent` — `싼|저렴|최저`→`cheapest`, `가까|근처|주변`→`nearest`, 그 외 `compare`. `item` — 불용어(`알려줘|제일|가장|근처|에서|어디|싼|곳|…`) 제거 후 남은 구문(없으면 null). `origin_text` — 정규식 `([가-힣]+(?:동|읍|면|리))\s*(?:에서|근처|쪽|주변)` 첫 매치.
- **view_hint**: cheapest→`price`, nearest→`distance`, 그 외 `recommend`. `type_filter`: `온라인|쇼핑몰` 포함→`online`, `마트|매장|오프라인` 포함→`offline`, 아니면 `all`. `focus_place_id`=정렬 1위 id.
- **answer**(해요체): `{item} 가격을 비교해 봤어요. {1위 이름}이(가) 가장 저렴해요.` (item이 null이면 `찾은 곳을 가격 순으로 보여드려요.`)
- **되묻기**: 정규화 질의가 `{"안녕","hi","hello","ㅎㅇ"}`이거나 한글/영문/숫자가 없으면 `needs_clarification` + `어떤 상품의 가격이 궁금하세요? 예를 들어 '우유 1L'처럼 말해 주세요.`
- **가격**: `base = 1500 + (sha256(query) % 4000)`(10원 단위 반올림), 매장별 `base * price_factor(0.9~1.15)`. **rank**는 가격 오름차순(오프라인·온라인 혼합).
- **혼잡도**: `ratio = capacity_index * hour_profile(hour)`(11~13시·17~19시 피크 종 모양 0.15~1.0), `estimated_people = round(ratio*max_people)`, level `<.25 low`, `<.5 medium`, `<.75 high`, 그 이상 `very_high`, `source:"mock"`.
- 온라인 `deeplink_url`(`urllib.parse.quote` 적용): 쿠팡 `https://www.coupang.com/np/search?q={q}` / 네이버쇼핑 `https://search.shopping.naver.com/search/all?query={q}` / 11번가 `https://search.11st.co.kr/Search.tmall?kwd={q}` / G마켓 `https://browse.gmarket.co.kr/search?keyword={q}` (README에 "외부 URL은 바뀔 수 있어 실제 동작 확인 필요" 명시).
- `stores.json` 필드: `id,name,address,lat,lng,price_factor,capacity_index,max_people`. **좌표는 예시값**(README에 "실제 매장 위치 아님" 명시): 노형동(33.4846,126.4783), 연동(33.4890,126.4930), 이도동(33.4960,126.5470), 애월(33.4619,126.3311), 한림(33.4120,126.2640), 조천(33.5440,126.6370), 서귀포(33.2541,126.5601), 성산(33.4580,126.9420), 대정(33.2270,126.2520), 표선(33.3260,126.8310).

---

## 9. API 계약 (프론트 `types/api.ts` ↔ 백엔드 `schemas.py` 동일)

공통: JSON. 오류 `{ "error": { "code": "STRING", "message": "한국어 문장" } }`. **모든 좌표는 `[lat, lng]` / `{lat,lng}`** (외부 API의 경도,위도 순은 `providers/` 안에서만 다루고 바깥으로 내보내지 않는다).

### 9.1 `POST /api/search`
**Request**
```json
{ "query": "노형동 근처에서 우유 제일 싼 곳 알려줘",
  "user_location": { "lat": 33.4996, "lng": 126.5312 },
  "client_time": "2026-11-12T14:30:00+09:00" }
```
`query` 1~200자(공백 제거 후), `user_location` null 허용.

**Response 200**
```json
{
  "request_id": "uuid4",
  "status": "ok",
  "answer": "우유 1L 가격을 비교해 봤어요. 예시마트 노형점이 가장 저렴해요.",
  "interpretation": { "item": "우유 1L", "origin_text": "노형동", "intent": "cheapest" },
  "view_hint": { "sort": "price", "type_filter": "all", "focus_place_id": "store_001" },
  "origin": { "lat": 33.4846, "lng": 126.4783, "label": "노형동", "source": "query" },
  "results": [
    { "id": "store_001", "type": "offline", "rank": 1, "name": "예시마트 노형점",
      "price": { "amount": 2480, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": { "address": "제주시 노형동 (예시)", "lat": 33.4846, "lng": 126.4783 },
      "online": null,
      "road": { "distance_m": 2400, "duration_s": 360, "source": "naver", "traffic_aware": true },
      "crowd": { "level": "high", "estimated_people": 180, "as_of": "2026-11-12T14:00:00+09:00", "source": "mock" } },
    { "id": "online_001", "type": "online", "rank": 2, "name": "쿠팡",
      "price": { "amount": 2650, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": null,
      "online": { "site_name": "쿠팡", "deeplink_url": "https://www.coupang.com/np/search?q=%EC%9A%B0%EC%9C%A0" },
      "road": null, "crowd": null }
  ]
}
```
- `status` ∈ `ok | needs_clarification`. `interpretation.intent` ∈ `cheapest|nearest|compare|other`. `view_hint.sort` ∈ `recommend|distance|price`, `type_filter` ∈ `all|offline|online`.
- `type="offline"` ⇒ `offline` 필수·`online` null (online은 반대). `road.source` ∈ `naver|osrm|estimate`. `crowd.level` ∈ `low|medium|high|very_high`, `crowd.source` ∈ `model|mock`. `price`·`road`·`crowd` null 허용. `origin.source` ∈ `gps|query|default`.

### 9.2 `POST /api/metrics` — F-11
Req `{ "origin": {lat,lng}, "destinations": [ {"id":"store_001","lat":33.48,"lng":126.47} ] }` (최대 30개)
Res `{ "metrics": [ {"id":"store_001","distance_m":2400,"duration_s":360,"source":"naver","traffic_aware":true} ] }`

### 9.3 `POST /api/geocode`
Req `{ "address": "제주시 노형동 1234" }` → Res `{ "lat":33.48, "lng":126.47, "label":"제주시 노형로 …", "provider":"naver" }` / 모든 provider 실패·결과 없음 `404 GEOCODE_NOT_FOUND`.

### 9.4 `POST /api/route` — F-07
Req `{ "origin": {lat,lng}, "destination": {lat,lng}, "mode": "driving" }`
Res
```json
{
  "distance_m": 12400, "duration_s": 1440, "traffic_aware": true,
  "geometry": [[33.4996,126.5312],[33.4990,126.5300]],
  "steps": [
    { "action":"depart", "instruction":"출발", "road_name":"", "distance_m":350, "duration_s":45, "location":[33.4996,126.5312] },
    { "action":"left", "instruction":"머내공원사거리에서 '서분당(고기)IC' 방면으로 좌회전", "road_name":"", "distance_m":1200, "duration_s":160, "location":[33.4990,126.5300] },
    { "action":"arrive", "instruction":"도착", "road_name":"", "distance_m":0, "duration_s":0, "location":[33.4846,126.4783] }
  ],
  "provider": "naver"
}
```
- `action` ∈ `depart|straight|left|right|slight_left|slight_right|sharp_left|sharp_right|uturn|roundabout|arrive`.
- **단계의 `distance_m`/`duration_s`는 "이 단계 지점에서 다음 안내 지점까지"의 값**(마지막 `arrive`는 0). 네이버 `guide`는 "이전 분기점→이 분기점" 기준이므로 파싱 시 한 칸씩 당겨 변환한다(10.2).
- `provider` ∈ `naver|osrm|estimate`. `estimate`면 `traffic_aware:false`, `geometry`는 2점, `steps`는 `[depart, arrive]` 2개.

### 9.5 `POST /api/transit` (P3, Mock)
Req `{ origin, destination, depart_at }` → Res `{ "options":[{ "total_duration_s":2280, "transfers":0, "steps":[{"mode":"walk","label":"도보","duration_s":300},{"mode":"bus","label":"402번","duration_s":1800},{"mode":"walk","label":"도보","duration_s":180}] }], "provider":"mock" }`

### 9.6 기타
`POST /api/auth/login|signup` → 항상 `501 NOT_IMPLEMENTED`.
`GET /api/health` → `{ "status":"ok", "ai_backend":"mock", "ai_reachable":null, "router_chain":["naver","osrm","estimate"], "geocoder_chain":["naver","mock"], "naver_configured":true }`
- `naver_configured`는 ID·Secret 설정 여부(boolean)만. **키 값은 절대 노출하지 않는다.**
- `ai_reachable`: `AI_BACKEND=local`일 때 `AI_ENDPOINT`+`AI_HEALTH_PATH`(기본 `/health`)에 2초 타임아웃으로 GET → true/false, mock이면 null.

### 9.7 에러 코드
| HTTP | code | 상황 | 프론트 문구 |
|---|---|---|---|
| 422 | `VALIDATION_ERROR` | 입력 검증 실패 | 서버 message |
| 404 | `GEOCODE_NOT_FOUND` | 주소 없음 | 6.4 |
| 501 | `NOT_IMPLEMENTED` | 인증 등 | `준비 중인 기능이에요.` |
| 503 | `AI_NOT_READY` | AI 미연결·접속 실패 | `AI가 아직 연결되지 않았어요.` |
| 504 | `AI_TIMEOUT` | AI 지연 | `응답이 늦어지고 있어요. 다시 시도해 주세요.` |
| 502 | `UPSTREAM_ERROR` | 외부 서비스 실패 | 서버 message |
- 경로·거리 계산은 **체인 마지막이 `estimate`라서 오류로 끝나지 않는다.**

---

## 10. 경로·지오코딩 엔진 (백엔드)

### 10.1 체인 (`providers/router_chain.py`, `geocode_chain.py`)
```
ROUTER_CHAIN=naver,osrm,estimate     # 앞에서부터 시도
GEOCODER_CHAIN=naver,mock
```
- provider는 **활성 조건**이 맞을 때만 후보가 된다: `naver` = `NAVER_CLIENT_ID`·`NAVER_CLIENT_SECRET` 모두 존재 / `osrm` = `OSRM_BASE_URL` 존재 / `estimate`·`mock` = 항상. 비활성은 **시작 시 1회 경고 로그** 후 건너뛴다.
- 호출 중 `ProviderUnavailable`(타임아웃, 401/403/429/5xx, 네이버 응답 `code` 2·3, 파싱 불가)이 나면 **다음 provider**로 넘기고 경고 로그(좌표·주소·질의는 로그에 남기지 않음). 실제로 응답한 provider를 `provider/source`에 기록.
- `ROUTER_TIMEOUT_S`(기본 5) 초과 = `ProviderUnavailable`. 429는 0.5초 후 **1회 재시도** 후 다음 provider.

### 10.2 네이버 Directions 5 (`router_naver.py`) — 응답 파싱은 이 파일에만
- **요청**: `GET {NAVER_DIRECTIONS_URL}?start={lng},{lat}&goal={lng},{lat}&option=traoptimal`
  - 헤더 `x-ncp-apigw-api-key-id: {NAVER_CLIENT_ID}`, `x-ncp-apigw-api-key: {NAVER_CLIENT_SECRET}`.
  - 기본 `NAVER_DIRECTIONS_URL=https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving` (**구현·연결 시 공식 API 가이드로 현재 주소·헤더 확인**).
- **응답 검사**: 본문 `code`가 `0`이면 성공. `1`(출발=도착) → 거리 0·`steps=[depart,arrive]`로 정상 처리. `2`(출발/도착이 도로 주변 아님)·`3`(경로 제공 불가)·`4`·`5` → `ProviderUnavailable`.
- **파싱**: `r = body.route.traoptimal[0]`
  - `distance_m = r.summary.distance` (m)
  - `duration_s = round(r.summary.duration / 1000)` (**밀리초 → 초**)
  - `geometry = [[lat,lng] for [lng,lat] in r.path]` (**경도,위도 → 위도,경도 변환**). 좌표가 3,000개를 넘으면 균등 간격으로 솎아내되 **첫 점·마지막 점은 유지**.
  - `traffic_aware = true`, `provider="naver"`.
- **steps 변환** (`r.guide`, 각 항목 `pointIndex,type,instructions,distance,duration`):
  1. 첫 단계 `depart`: `instruction="출발"`, `location=path[0]`, `distance_m=guide[0].distance`, `duration_s=guide[0].duration/1000`(guide가 없으면 전체 값).
  2. 각 `guide[i]`: `action = naver_guide.type_to_action(type)`, `instruction = instructions`(그대로), `road_name=""`, `location = path[pointIndex]`(변환 후), `distance_m = guide[i+1].distance`(마지막은 0), `duration_s = guide[i+1].duration/1000`(마지막은 0).
  3. `type==88`(목적지)은 `action="arrive"`, `instruction="도착"`으로 정규화.
- **`naver_guide.type_to_action` 표** (그 외 코드는 `straight` + 경고 로그):

| type 코드 | action |
|---|---|
| 1, 21, 91 | `straight` (21·91은 회전교차로면 `roundabout`) |
| 2, 8 | `left` |
| 3 | `right` |
| 4, 13, 41 | `slight_left` |
| 5, 14, 42 | `slight_right` |
| 11, 12 | `sharp_left` |
| 15 | `right` |
| 16 | `sharp_right` |
| 6, 22, 92 | `uturn` |
| 23~34, 93~104 | `roundabout` |
| 57~65, 76, 79, 81 | `slight_left` |
| 66~74, 77, 80, 82 | `slight_right` |
| 47~56, 75, 78, 87, 121~123 | `straight` |
| 48, 49 | `straight` |
| 88 | `arrive` |
- 📚 **네이버는 안내 문장을 이미 한국어로 줍니다.** 그래서 문장을 직접 만들지 않고, 코드(`type`)는 **아이콘을 고르는 데만** 씁니다.
- **매트릭스 없음**: 네이버 `goal`에 여러 목적지를 넣어도 *가장 적은 비용의 한 곳*으로 가는 경로만 돌아온다. 따라서 매장별 거리 계산에는 쓰지 않고 **목적지당 1회 호출**한다(10.5).

### 10.3 네이버 Geocoding (`geocode_naver.py`)
- `GET {NAVER_GEOCODE_URL}?query={address}`, 헤더는 10.2와 동일. 기본 `NAVER_GEOCODE_URL=https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode` (**공식 가이드로 확인**). 콘솔의 Application에서 **Geocoding이 체크**되어 있어야 한다.
- `addresses[0]`의 `x`(경도)·`y`(위도)를 float으로 변환 → `{lat:y, lng:x}`. `label = roadAddress or jibunAddress or 입력값`. `addresses`가 비면 `ProviderUnavailable`(→ 다음 provider, 끝까지 없으면 404).
- `geocode_mock`: `landmarks.json` 부분일치(읍면동 지명 사전), 없으면 제주시청 좌표 + label에 `(대략)`.

### 10.4 OSRM (선택·오프라인용, `router_osrm.py`)
- 경로: `GET {OSRM_BASE_URL}/route/v1/driving/{lng},{lat};{lng},{lat}?overview=full&geometries=geojson&steps=true` / 매트릭스: `GET {base}/table/v1/driving/{origin;dest1;...}?sources=0&annotations=distance,duration`.
- `traffic_aware=false`. 좌표 변환은 이 파일 안에서만. `steps`는 `routing/instructions_ko.py`로 한국어화:

| maneuver 조건 | action | instruction |
|---|---|---|
| type=`depart` / `arrive` | `depart` / `arrive` | `출발` / `도착` |
| modifier=`straight`(또는 `continue`,`new name`) | `straight` | `직진` |
| `left` / `right` | `left` / `right` | `좌회전` / `우회전` |
| `slight left` / `slight right` | `slight_left` / `slight_right` | `약간 좌회전` / `약간 우회전` |
| `sharp left` / `sharp right` | `sharp_left` / `sharp_right` | `급좌회전` / `급우회전` |
| `uturn` | `uturn` | `U턴` |
| type=`roundabout`/`rotary` | `roundabout` | `회전교차로 {exit}번째 출구` |
- 알 수 없는 조합은 `직진` + 경고 로그, `road_name`은 OSRM `name`(빈 문자열 허용).
- 준비(`scripts/osrm_prepare.sh`, `docker-compose.osrm.yml`): Geofabrik 대한민국 `.osm.pbf` → (선택) `osmium extract -b 126.10,33.10,127.00,33.65` → `osrm-extract -p /opt/car.lua` → `osrm-partition` → `osrm-customize` → `osrm-routed --algorithm mld /data/jeju.osrm --max-table-size 100`(포트 5000). 명령·이미지·다운로드 경로는 구현 시 공식 문서로 최신 여부 확인. 데이터 © OpenStreetMap contributors(ODbL).

### 10.5 거리·시간 일괄 계산 (`routing/metrics_service.py`) — F-11
입력: `origin`, 오프라인 목적지 목록(최대 30). 출력: 목적지별 `road`.
1. 목적지를 **직선거리(haversine) 오름차순**으로 정렬.
2. 체인의 **첫 번째 활성 provider**가 `supports_matrix`(OSRM)면 한 번의 `table` 호출로 전부 계산.
3. 그렇지 않으면(네이버) **상위 `ROUTE_METRICS_TOP_N`개(기본 10)만** 목적지당 `route` 1회씩 **병렬 호출**(`asyncio.Semaphore(4)`)하여 `distance_m`, `duration_s`만 사용. **나머지는 `estimate`**(`source:"estimate"`).
4. 호출 단위로 체인 폴백 적용(일부 실패는 그 목적지만 다음 provider로).
5. **캐시**: `TTLCache(maxsize=2000, ttl=ROUTE_CACHE_TTL_S(기본 300))`, 키 = `(round(origin.lat,3), round(origin.lng,3), dest_id, provider)`. 교통 반영 값이라 짧게 유지.
6. 결과 순서·길이는 입력과 동일, 누락 없이 모든 목적지에 값(실제 또는 estimate)을 채운다.
- 📚 **왜 상위 N개만?** 네이버는 "A→여러 곳 한꺼번에 계산"이 없어 매장 수만큼 호출해야 합니다. 호출은 한도·시간·비용이 드니, **가까운 후보 위주로만 정확히** 계산하고 먼 곳은 추정으로 채웁니다. 가까운 순 정렬에서 중요한 건 가까운 후보라서 영향이 작습니다.

### 10.6 estimate (`router_estimate.py`)
거리 = haversine × 1.3, 시간 = 거리 ÷ 평균 30km/h, 경로 = [출발, 도착] 2점, `traffic_aware:false`.

---

## 11. 지도 (프론트) — F-13, F-14

### 11.1 환경변수 (`frontend/.env.local`, 커밋 금지)
```
VITE_MAP_PROVIDER=naver              # naver | leaflet
VITE_NAVER_MAP_KEY_ID=               # 지도용 Key ID (Secret 아님)
VITE_NAVER_MAP_KEY_PARAM=ncpKeyId    # 스크립트 URL의 파라미터 이름 (문서에 따라 ncpClientId일 수 있음)
VITE_MAP_FALLBACK=leaflet            # leaflet | none  (naver 실패 시)
VITE_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png   # leaflet 전용
VITE_FEATURE_TRANSIT=false
```
- 📚 **왜 파라미터 이름을 설정값으로?** 네이버 지도 스크립트의 인증 파라미터 이름이 시기에 따라 `ncpClientId`와 `ncpKeyId`로 다르게 안내됩니다. 코드를 고치지 않고 `.env`로 바꿀 수 있게 합니다. **공식 "지도 API v3 로드하기" 튜토리얼의 현재 값이 기준**입니다.

### 11.2 로더 `lib/loadNaverMaps.ts`
- **싱글톤 Promise**(여러 번 호출해도 스크립트는 한 번만 삽입).
- 순서: ① `window.navermap_authFailure = () => 인증실패 처리` **먼저 등록** → ② `<script async src="https://oapi.map.naver.com/openapi/v3/maps.js?{KEY_PARAM}={KEY_ID}">` 삽입(주소는 구현 시 공식 튜토리얼로 확인) → ③ `onload` 후 `window.naver?.maps?.Map` 존재 확인 → resolve.
- 실패 조건 3가지: `onerror`, **8초 타임아웃**, `navermap_authFailure` 호출. 모두 `MapLoadError(reason)`로 reject (`reason` ∈ `script | timeout | auth`).
- 지도가 이미 뜬 뒤에 `navermap_authFailure`가 호출돼도 같은 실패 경로를 탄다.

### 11.3 공통 props 계약 (`map/mapTypes.ts`) — 두 구현 모두 동일
```ts
interface MapCanvasProps {
  origin: LatLng | null;                 // 기준(내) 위치
  places: Array<{ id:string; order:number; lat:number; lng:number; name:string; crowdLevel:CrowdLevel|null }>; // 오프라인만, order=표시 순번
  selectedId: string | null;
  route: { geometry: [number,number][]; } | null;
  routeOrigin: LatLng | null;
  activeStep: { location: [number,number] } | null;
  fitSignal: number;                     // 값이 바뀔 때 places+origin 범위 맞춤
  routeFitSignal: number;                // 값이 바뀔 때 경로 전체 범위 맞춤
}
```

### 11.4 `NaverMapCanvas` 동작 (네이버 JS v3 API 기준; 메서드명은 공식 레퍼런스로 확인)
- **생성**: `new naver.maps.Map(el, { center: new naver.maps.LatLng(33.38,126.55), zoom: 10, zoomControl: true, zoomControlOptions:{ position: naver.maps.Position.TOP_RIGHT } })`. 로고·저작권 컨트롤은 기본값 유지(숨기지 않음).
- **마커**: `new naver.maps.Marker({ position, map, zIndex, icon: { content: markerHtml(...), size: new naver.maps.Size(28,28), anchor: new naver.maps.Point(14,14) } })`. `markerHtml`은 지름 28px 원, 배경=혼잡도 색(없으면 primary), 흰 순번 숫자, 흰 테두리 2px+그림자(선택 시 36px, `zIndex` 상향). `Map<id, Marker>`로 보관해 **변경분만 갱신**하고 제거 시 `setMap(null)`.
- **기준 위치 마커**: 파란 점 14px + 반투명 후광 32px(HTML 아이콘).
- **선택 시 이동**: `map.morph(latlng, 16)`(없으면 `setCenter`+`setZoom`), 정보창 `new naver.maps.InfoWindow({content: 매장명})`을 열고 이전 정보창은 닫는다. 정보창 content는 **이스케이프된 텍스트**로만 만든다(AI 문자열 HTML 삽입 금지).
- **범위 맞춤**: `new naver.maps.LatLngBounds()`에 `extend` 후 `map.fitBounds(bounds, {top:48,right:48,bottom:48,left:48})`. 결과 도착 시 맞춘 뒤 줌이 15를 넘으면 15로 낮춘다.
- **경로선**: `naver.maps.Polyline` 2개 — 아래 흰색(두께 9) + 위 `--color-primary`(두께 6, 불투명도 .9), `path`는 `LatLng` 배열(`geometry`의 `[lat,lng]` 사용). 경로 제거 시 `setMap(null)`. 출발·도착 마커는 HTML 아이콘.
- **단계 이동**: `activeStep` 변경 시 `morph(location, 17)`.
- **크기 변화**: `ResizeObserver`로 컨테이너 변화(phase 전환·패널 모드 변경) 감지 → `map.autoResize()`(없으면 `naver.maps.Event.trigger(map,'resize')`).
- **정리**: 언마운트 시 모든 오버레이 `setMap(null)`, 리스너 제거, 지도 `destroy()`.

### 11.5 외부 접속 허용 목록 (센터 방화벽·README에 기재)
프론트(브라우저): `oapi.map.naver.com`, `*.map.naver.com`, `*.map.naver.net` + 개발자도구 Network 탭에서 추가로 확인되는 네이버 도메인(타일·폰트 등)을 README 목록에 반영.
백엔드(서버): `naveropenapi.apigw.ntruss.com`(Directions·Geocoding, 변경 시 `.env`의 URL 기준).

### 11.6 `LeafletMapCanvas` (P2, F-14) · `useMapProvider`
- `useMapProvider()`: `VITE_MAP_PROVIDER==='naver'`이면 `loadNaverMaps()` 시도 → 성공 `naver`, 실패(`MapLoadError`)이고 `VITE_MAP_FALLBACK==='leaflet'`이면 `leaflet`, `none`이면 `error`. 스토어 `mapProvider`에 저장, 이미 `leaflet`/`error`면 재시도하지 않는다.
- `leaflet` 대체 시 지도 좌상단에 작은 안내 `네이버 지도를 불러오지 못해 기본 지도로 보여드려요.`(12px, 흰 배경 pill). `error`면 지도 영역에 `지도를 불러오지 못했어요.` + 목록·길안내 텍스트는 정상 동작.
- Leaflet 구현: 11.3 계약 그대로. 타일 `VITE_TILE_URL`, attribution `© OpenStreetMap contributors` **반드시 표시**. 마커·경로선 스타일은 11.4와 동일한 값. 좌표는 `[lat,lng]` 그대로 사용.

---

## 12. 백엔드·보안 공통

### 12.1 `.env.example` (루트, **값은 모두 비워 둔다**)
```
# --- AI 슬롯 ---
AI_BACKEND=mock            # mock | local
AI_ENDPOINT=               # 예: http://127.0.0.1:11434 또는 원격 주소
AI_API_KEY=                # 원격 모델 서버가 Bearer 키를 요구할 때
AI_MODEL_NAME=
AI_HEALTH_PATH=/health
AI_TIMEOUT_S=60
AI_RETRIES=1

# --- 네이버 Maps (백엔드 전용) ---
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_DIRECTIONS_URL=https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving
NAVER_GEOCODE_URL=https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode

# --- 경로/지오코딩 체인 ---
ROUTER_CHAIN=naver,osrm,estimate
GEOCODER_CHAIN=naver,mock
OSRM_BASE_URL=             # 비워 두면 osrm 비활성
ROUTER_TIMEOUT_S=5
ROUTE_METRICS_TOP_N=10
ROUTE_CACHE_TTL_S=300

# --- 보안/동작 ---
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_ONLINE_HOSTS=www.coupang.com,search.shopping.naver.com,search.11st.co.kr,browse.gmarket.co.kr
MAX_RESULTS=30
LOG_LEVEL=INFO
```
`frontend/.env.example`은 11.1의 항목(값 비움). 루트·프론트 모두 `.env`, `.env.local`을 `.gitignore`에 포함.

### 12.2 보안·개인정보
- 사용자의 **질의·주소·좌표를 로그에 남기지 않는다**(요청 ID·상태 코드·소요시간·사용된 provider만). 위치는 메모리에만, `localStorage` 등 저장 금지.
- 외부 API 응답·AI 응답의 문자열은 `dangerouslySetInnerHTML`로 렌더링하지 않는다.
- CORS는 `ALLOWED_ORIGINS`만. 입력 길이는 Pydantic 제약.
- 키가 유출됐다고 판단되면 **콘솔에서 재발급**하고 `.env`만 교체한다(코드 수정 불필요하도록 설계).
- 제출물에 `.env`, 키, 반출 불가 원본 데이터를 포함하지 않는다. 테스트는 **가짜 값**(`test-id`, `test-secret`)과 HTTP 모킹만 사용한다.

---

## 13. 프론트 세부

### 13.1 상태 (`useAppStore`, zustand)
```ts
{
  phase: 'landing'|'loading'|'results'; errorMessage: string|null; query: string;
  status: 'ok'|'needs_clarification'|null; answer: string; interpretation: Interpretation|null;
  origin: { lat:number; lng:number; label:string; source:'gps'|'query'|'default' }|null;
  results: Place[];
  sortKey: 'recommend'|'distance'|'price'; typeFilter: 'all'|'offline'|'online';
  viewTab: 'list'|'table'; panelMode: 'results'|'route';
  selectedId: string|null; route: RouteResult|null; routeOrigin: LatLng|null; activeStepIndex: number|null;
  metricsLoading: boolean; mapProvider: 'naver'|'leaflet'|'error'|'pending';
  fitSignal: number; routeFitSignal: number;
  visibleResults(): Place[]; lowestPrice(): Place|null;
}
```
- 새 검색 성공 시: `view_hint`를 `sortKey/typeFilter/selectedId`에 반영, `panelMode='results'`, `route=null`, `viewTab='list'`, `fitSignal++`.
- 위치 변경: `/api/metrics`로 `results[].road`만 갱신(AI 재호출 없음).

### 13.2 유틸
```ts
formatDistance(m): '850m'|'2.4km'   formatDuration(sec): '6분'|'1시간 5분'   formatPrice(n): '2,480원'
crowdMeta(level): { color:string; label:string }
safeUrl(raw, allowedHosts): string|null            // https + 허용 도메인만
actionIcon(action): LucideIcon                     // depart→Navigation, left→CornerUpLeft, … arrive→Flag
runWithTransition(fn): void                        // startViewTransition 있으면 사용, 없으면 즉시
```
거리 정렬·표시에 클라이언트 직선거리 계산을 **쓰지 않는다**(폴백은 백엔드 `estimate`만).

### 13.3 API 클라이언트
`fetch` 래퍼, 타임아웃 70초(`AbortController`), 오류를 `{code,message}`로 throw. 개발 프록시 `server.proxy: { '/api': 'http://127.0.0.1:8000' }`.

---

## 14. 비기능 / 테스트

**비기능**: 최신 Chrome·Edge(데스크톱). 센터 PC(i7-8700 / GTX1060 / RAM 32GB)에서 프론트+백엔드가 AI 모델과 함께 동작. 초기 JS(gzip) 300KB 이하 목표(지도는 `React.lazy`). 접근성 최소선: 시맨틱 태그, 입력 `<label>`(시각적 숨김 가능), 포커스 링, 색만으로 정보 전달 금지(혼잡도는 `약 N명` 병기).

**백엔드(pytest, 외부 호출은 모킹)**
- `router_naver`: `fixtures/naver_directions_sample.json`(공식 가이드 응답 예시와 같은 구조로 작성) 파싱 → **밀리초→초 변환**, **`[lng,lat]`→`[lat,lng]` 변환**, `guide` 거리·시간 **한 칸 당김**, `type 88→arrive`, 미정의 type→`straight`+경고, 응답 `code` 1(정상 0m)·2(ProviderUnavailable).
- `router_chain`: naver 실패(401/429/타임아웃) → osrm/estimate 순 폴백, `provider`에 실제 응답자 기록, 429 1회 재시도, 키 없으면 naver 건너뜀.
- `metrics_service`: 목적지 12개·TOP_N=10 → 가까운 10개만 provider 호출·나머지 `estimate`, 동시성 ≤4, 캐시 적중 시 재호출 없음, 입력 순서 보존.
- `geocode_naver`: `x→lng`, `y→lat` 변환, 빈 결과 → 다음 provider → 404.
- `/api/search`: 정상 / 빈 query 422 / `needs_clarification` / 비허용 deeplink 제거 / `road` 채워짐 / `AI_BACKEND=local` 503 / `origin_text` 있으면 `origin.source=='query'`.
- `/api/health`: 키 값이 응답 어디에도 없음.
- `instructions_ko`(OSRM): 10.4 표의 모든 행. `mock_agent`: 같은 입력 → 같은 출력.

**프론트(vitest)**
- `formatDistance/Duration/Price`, `safeUrl`(비허용 도메인·`javascript:` 차단).
- `visibleResults` 정렬·필터 조합(거리순은 `road.distance_m`, road 없는 항목 후순위).
- `LandingInput`: Enter 제출 / Shift+Enter 줄바꿈 / **IME 조합 중 Enter 무시** / 공백 제출 불가.
- `MainPage`: landing에 입력칸 외 요소 없음 / 제출 후 results 전환 / `needs_clarification`이면 AgentSummary만.
- `ResultCard`: `사이트`/`매장` 뱃지, 선택 시에만 `길안내` 버튼.
- `loadNaverMaps`: 여러 번 호출해도 스크립트 1회 삽입(가짜 DOM), `onerror`/타임아웃/`navermap_authFailure` → `MapLoadError`.
- `useMapProvider`: 실패 + `fallback=leaflet` → `leaflet`, `none` → `error`. (테스트는 `window.naver` 테스트 더블 사용, 실제 네이버 접속 금지)
- `runWithTransition`: `startViewTransition` 없는 환경에서 즉시 실행.

---

## 15. 구현 순서와 검증

| 단계 | 작업 | 검증 |
|---|---|---|
| 1 | 폴더·`.env.example`·`.gitignore`·FastAPI `main.py`·`/api/health` | `curl localhost:8000/api/health` |
| 2 | `schemas.py`, `ai/*`(mock·스텁), `/api/search`(road 임시 null) | `pytest test_search.py test_mock_agent.py` |
| 3 | `providers/*`, `naver_guide`, `instructions_ko`, `router_chain`, `geocode_chain`, `metrics_service`, `/api/metrics·route·geocode` | `pytest` (provider·chain·metrics) |
| 4 | search 오케스트레이션에 origin 결정·metrics·crowd 연결 | 응답에 `origin`, `road` 존재 |
| 5 | `scripts/check_naver.py`(키 점검: 샘플 좌표로 Directions·Geocoding 1회 호출, 키 값은 출력 금지, 성공/실패 원인 요약만 출력) | 키 입력 후 `python scripts/check_naver.py` |
| 6 | 프론트 스캐폴드, 토큰, `TopBar/Logo/Button` | 화면 확인 |
| 7 | `types/api.ts`, `lib/*`, 스토어, 단위 테스트 | `npm run test` |
| 8 | MainPage landing + LandingInput + 제출 흐름(loading) (F-01) | landing에 입력칸만 존재 |
| 9 | 결과 레이아웃 + View Transition + **`loadNaverMaps` + `NaverMapCanvas`(lazy)** (F-13) | 네이버 지도 표시, 로고 보임 |
| 10 | AgentSummary·CountUp·LocationChip·ViewTabs (F-03) | 답변문·칩·최저가 |
| 11 | ResultList/Card/Badges, ClassificationBar, PriceTable (F-04,05,09,11,12) | 정렬·필터 테스트 통과 |
| 12 | 카드↔지도 연동, 온라인 새 탭(`safeUrl`) (F-06,08) | 카드 클릭 시 지도 이동, 비허용 URL 차단 |
| 13 | **RouteView + StepList + 네이버 경로선 (F-07)** | 주소 입력 → 도로 위 경로선·단계 목록, `provider:"naver"` |
| 14 | `useMapProvider` + `LeafletMapCanvas` 대체 (F-14, P2) | 키를 일부러 비워 폴백 동작 확인 |
| 15 | Login/Signup UI (F-02), (P3) transit Mock·비활성 탭 (F-10), `build_and_serve.sh`, README, docs 템플릿 | `npm run build` 후 단일 프로세스 실행 |

**완료 기준(DoD)**: F-01·03~09·11~13 동작 / 키가 있으면 도로를 따라가는 경로선과 단계 안내가 나오고, 키가 없거나 네트워크가 막혀도 앱이 죽지 않으며 `(추정)` 표기로 폴백 / `pytest`·`vitest` 통과 / 저장소·프론트 빌드 산출물에 Secret 없음 / **부록 B 항목 미구현**.

---

## 16. 대회 제출 문서 템플릿 (`docs/`, 목차만)
`DATA_USAGE.md`(사용 데이터명·출처·이용조건·전처리/분석 흐름·외부 데이터·오픈소스 — **네이버 Maps API, (사용 시) OpenStreetMap/OSRM 포함**), `AI_DISCLOSURE.md`(사용 AI 모델·활용 범위·외부 API·외부 코드), `USER_MANUAL.md`(설치·실행·사용법·오류·제약). `README.md`에는 설치·실행 절차, 의존성, 환경변수, **외부 서비스 의존성**(네이버 지도 스크립트, 네이버 Directions·Geocoding, 원격 AI 서버 사용 시 해당 서버)과 11.5의 허용 도메인 목록, 폴백 동작 설명을 명시.

---

# 부록 A. 결정이 필요한 사항 (현재 `[기본값]`으로 처리 중)

| # | 항목 | 현재 기본값 | 이유 |
|---|---|---|---|
| A1 | **가격 데이터 출처** | AI 슬롯 담당(Mock은 가짜) | 센터 데이터에 상품 가격 없음 |
| A2 | **매장 위치(좌표) 출처** | AI 슬롯 담당(Mock은 예시 좌표) | 지도 마커의 근거 |
| A3 | **센터 PC의 인터넷 접속·방화벽 허용** | 접속 가능하다고 가정 | 네이버 지도·API는 외부 접속 필수. 불가 시 `VITE_MAP_PROVIDER=leaflet` + OSRM(오프라인) 구성으로 전환 |
| A4 | 네이버 **이용약관·한도** | 무료 이용량 범위 가정 | 경로 결과 임시 캐시(5분) 허용 여부, 월 한도, 결제수단 요구 여부 확인 |
| A5 | 혼잡도 `인원수` 정의 | 해당 시각 매장 내 추정 인원 | 카드 데이터로 직접 산출 어려움 |
| A6 | 로그인 | UI만(서버 501) | 실제 인증 필요 여부 |
| A7 | 첫 제출 시 위치 권한 요청(5초 후 제주시청 기본) | 사용 | 개인정보·UX |
| A8 | 홈 풍경 사진 삭제 / 랜딩 상단 `로그인` 유지 | 삭제 / 유지 | GPT형 랜딩 취지 |
| A9 | 토스 스타일 적용 범위 | 토큰·랜딩·카드·문구 톤 | "약간"의 해석 |
| A10 | Leaflet 대체(F-14) 유지 | 유지(P2) | 지도 로딩 실패 대비. 불필요하면 삭제 |
| A11 | `ROUTE_METRICS_TOP_N` | 10 | 검색 1회당 네이버 호출 수 = 최대 10 |

# 부록 B. 승인 대기 제안 — **승인 전 구현 금지**

| ID | 제안 | 한 줄 이유 |
|---|---|---|
| B-01 | 진행 단계 표시(`질문 이해 → 매장 탐색 → 경로 계산`, 스트리밍) | 로컬 모델은 느림 |
| B-02 | 지도 혼잡도 범례 | 색 의미 설명 |
| B-03 | 마커 클릭 → 패널 카드 강조·스크롤 | 지도→목록 연동 |
| B-05 | 랜딩 예시 질문 칩 | 첫 사용자 안내(※ "입력칸만" 취지와 상충) |
| B-06 | 혼잡도순 정렬 | 표시만 되고 정렬 불가 |
| B-07 | "AI 추정치·기준 시각·데이터 출처" 안내 | 대회의 출처·사실관계 요구 |
| B-08 | 모바일 반응형(바텀시트형 패널) | 현재 데스크톱 전용 |
| B-09 | 푸터(출처·문의) | 공공 서비스 관례 |
| B-10 | 최근 검색어·즐겨찾기 | 재사용성 |
| B-11 | 도보·대중교통 확장(반출 가능 버스 데이터 활용) | F-10 구체화 |
| B-12 | 영업시간·전화번호 | 매장 정보 보강 |
| B-13 | 멀티턴 대화("더 가까운 곳은?" 후속 질문, 대화 기록) | GPT형 경험 확장 |
| B-14 | 실시간 내비 모드(위치 추적·다음 안내 자동 전환) | 진짜 내비게이션 |
| B-16 | 랜딩 배경 제주 일러스트 | 제주 정체성 |
| **B-17** | **구간별 혼잡 색상 경로선**(네이버 `section.congestion` 활용) | 막히는 구간 시각화 |
| **B-18** | **경로 옵션 선택**(빠른 길·편한 길·무료 우선 등) | 네이버가 지원 |
| **B-19** | **통행료·택시요금·유류비 표시**(네이버 `summary` 활용) | 비용 판단 |
