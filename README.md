# 제주얼마꽈 (Jeju-Eolmakkwa) 🍊

> **"오늘 값 얼마인지 한 번에 알앙 갑서~"**  
> 제주도민을 위한 AI 기반 온·오프라인 상품 가격 비교 및 지도/길찾기/혼잡도 안내 서비스

---

## 1. 프로젝트 소개

**제주얼마꽈**는 자연어 질의(예: *"우유 1L 제일 싼 곳"*)를 입력하면 AI가 오프라인 매장과 온라인몰을 찾아 가격순으로 보여주고, 지도(우측)와 목록 사이드바(좌측)를 통해 거리·가격·혼잡도를 한눈에 비교하며 길찾기까지 제공하는 웹 애플리케이션입니다.

---

## 2. 기술 스택

- **프론트엔드**: Vite, React 18, TypeScript, React Router v6, TanStack Query v5, Zustand v4, Leaflet 1.9, React-Leaflet 4, Pretendard 폰트 (셀프호스팅 번들)
- **백엔드**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, HTTPX
- **테스트**: Pytest (백엔드), Vitest + React Testing Library (프론트엔드)
- **배포 형태**: `npm run build` 산출물을 FastAPI가 정적 서빙하여 **단일 프로세스**로 구동

---

## 3. 설치 및 실행 절차

### 3.1 요구 사항
- Python 3.11 이상
- Node.js 18 이상 및 npm

### 3.2 환경 설정
```bash
# 환경변수 예시 파일 복사
cp .env.example .env
```

### 3.3 의존성 설치
```bash
# 백엔드 의존성 설치
pip install -r backend/requirements.txt

# 프론트엔드 의존성 설치
cd frontend
npm install
cd ..
```

### 3.4 실행 방법

#### 방법 A: 개발 모드 (동시 구동)
```bash
bash scripts/dev.sh
```
- 프론트엔드: `http://localhost:5173`
- 백엔드 API: `http://localhost:8000`

#### 방법 B: 프로덕션 모드 (프론트 빌드 후 FastAPI 단독 서빙)
```bash
bash scripts/build_and_serve.sh
```
- 통합 서비스: `http://localhost:8000`

---

## 4. 환경변수 설명 (`.env`)

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `AI_BACKEND` | `local` | 사용할 AI 백엔드 (`local` 또는 `mock`) |
| `AI_TIMEOUT_S` | `110` | AI 검색 요청 타임아웃 (초; Gemini 모델 재시도 포함) |
| `GEOCODER` | `mock` | 주소 검색 제공자 (`mock`, `nominatim`, `naver`) |
| `ROUTER` | `osrm` | 경로 계산 제공자 (`osrm`, `naver`, `estimate`) |
| `OSRM_BASE_URL` | `http://127.0.0.1:5000` | 자체 OSRM 서버 URL |
| `ROUTER_TIMEOUT_S` | `5` | 도로 경로 요청 타임아웃 (초) |
| `AUTH_DB_PATH` | `backend/data/auth.sqlite3` | 회원 및 세션 SQLite 저장 경로 |
| `AUTH_COOKIE_SECURE` | `false` | HTTPS 배포에서는 `true`로 설정 |
| `AUTH_SESSION_TTL_HOURS` | `168` | 로그인 세션 유지 시간 |
| `NAVER_CLIENT_ID` | `""` | 네이버 클라우드 플랫폼 Client ID |
| `NAVER_CLIENT_SECRET` | `""` | 네이버 클라우드 플랫폼 Client Secret |
| `ALLOWED_ORIGINS` | `http://localhost:5173...` | CORS 허용 오리진 목록 |
| `ALLOWED_ONLINE_HOSTS` | `www.coupang.com...` | 허용된 온라인몰 도메인 화이트리스트 |
| `VITE_TILE_URL` | `https://tile.openstreetmap...` | Leaflet 지도 타일 주소 |
| `VITE_FEATURE_TRANSIT` | `false` | 대중교통 탭 활성화 여부 (P3 기능) |

---

## 5. 외부 서비스 의존성 및 참고사항

- **지도 타일**: 기본값으로 OpenStreetMap 타일을 사용합니다 (`&copy; OpenStreetMap contributors`). 폐쇄망 환경에서는 로컬 타일 캐시 서버 주소로 변경하여 구동할 수 있습니다.
- **지도 전환**: `frontend/.env.local`에 `VITE_MAP_PROVIDER=naver`와 `VITE_NAVER_MAP_KEY_ID`를 설정하면 네이버 Dynamic Map을 우선 사용합니다. 키 또는 지도 로딩이 실패하면 `VITE_MAP_FALLBACK=leaflet`에 따라 OpenStreetMap 기반 Leaflet 지도로 전환합니다. 인증 파라미터 이름은 `VITE_NAVER_MAP_KEY_PARAM`으로 지정하며 기본값은 `ncpKeyId`입니다.
- **도로 거리·시간**: `ROUTER=osrm`과 로컬 OSRM 서버(`OSRM_BASE_URL`)를 사용합니다. OSRM에 연결할 수 없는 경우 직선거리 기반 추정값으로 폴백하고 결과에 `(추정)`으로 표시합니다. OSRM 미설치 상태에서 실제 도로 경로를 얻을 수는 없습니다.
- **회원 계정**: 회원가입 계정은 SQLite에 저장하며 비밀번호는 PBKDF2 해시로 보관합니다. 로그인 세션은 HttpOnly 쿠키로 유지됩니다. HTTPS 배포 시 `AUTH_COOKIE_SECURE=true`로 설정하세요.
- **매장 데이터 좌표 안내**: `backend/app/data/mock/stores.json`에 포함된 매장 좌표는 기능 검증 및 시연을 위한 **예시 좌표**이며, 실제 매장 위치가 아닙니다.
- **온라인몰 딥링크**: 온라인 쇼핑몰(쿠팡, 네이버, 11번가, G마켓 등)의 검색 URL 템플릿은 외부 사이트 정책 변경에 따라 달라질 수 있으므로 **구현 시 실제 동작 확인이 필요**합니다.
- **AI 연동**: `AI_BACKEND=local`은 `ai/agent_runner.py`의 제주 장바구니 에이전트를 사용합니다. 현재 질의 해석·요약은 Gemini API 기반이므로 `ai/.env`에 `GEMINI_API_KEY`가 필요하며, 검색 질의가 Gemini로 전달됩니다. 매장·가격 입력은 `ai/data/`의 CSV 및 참가격 메타데이터/API를 사용합니다. `AI_BACKEND=mock`으로 예시 결과를 선택할 수 있습니다.

---

## 6. 테스트 실행

```bash
# 백엔드 테스트 (pytest)
pytest backend/tests -v

# 프론트엔드 테스트 (vitest)
npm --prefix frontend test
```

---

## 7. 제출 문서 목록 (`docs/`)
- [DATA_USAGE.md](file:///c:/Kwak/Projects/JEJU_AIagent/docs/DATA_USAGE.md): 데이터 활용 명세서
- [AI_DISCLOSURE.md](file:///c:/Kwak/Projects/JEJU_AIagent/docs/AI_DISCLOSURE.md): AI 기술 및 오픈소스 공개 명세서
- [USER_MANUAL.md](file:///c:/Kwak/Projects/JEJU_AIagent/docs/USER_MANUAL.md): 사용자 매뉴얼
- [JEJU_first_set.md](file:///c:/Kwak/Projects/JEJU_AIagent/docs/JEJU_first_set.md): 원본 구현 명세서
