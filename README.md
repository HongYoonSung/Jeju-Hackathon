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
| `AI_BACKEND` | `mock` | 사용할 AI 백엔드 (`mock` 또는 `local`) |
| `AI_ENDPOINT` | `""` | `local` AI 모델 연동 시 엔드포인트 URL |
| `AI_TIMEOUT_S` | `60` | AI 검색 요청 타임아웃 (초) |
| `GEOCODER` | `mock` | 주소 검색 제공자 (`mock`, `nominatim`, `naver`) |
| `ROUTER` | `estimate` | 경로 계산 제공자 (`estimate`, `osrm`, `naver`) |
| `OSRM_BASE_URL` | `""` | 자체 OSRM 서버 URL (사용 시) |
| `NAVER_CLIENT_ID` | `""` | 네이버 클라우드 플랫폼 Client ID |
| `NAVER_CLIENT_SECRET` | `""` | 네이버 클라우드 플랫폼 Client Secret |
| `ALLOWED_ORIGINS` | `http://localhost:5173...` | CORS 허용 오리진 목록 |
| `ALLOWED_ONLINE_HOSTS` | `www.coupang.com...` | 허용된 온라인몰 도메인 화이트리스트 |
| `VITE_TILE_URL` | `https://tile.openstreetmap...` | Leaflet 지도 타일 주소 |
| `VITE_FEATURE_TRANSIT` | `false` | 대중교통 탭 활성화 여부 (P3 기능) |

---

## 5. 외부 서비스 의존성 및 참고사항

- **지도 타일**: 기본값으로 OpenStreetMap 타일을 사용합니다 (`&copy; OpenStreetMap contributors`). 폐쇄망 환경에서는 로컬 타일 캐시 서버 주소로 변경하여 구동할 수 있습니다.
- **매장 데이터 좌표 안내**: `backend/app/data/mock/stores.json`에 포함된 매장 좌표는 기능 검증 및 시연을 위한 **예시 좌표**이며, 실제 매장 위치가 아닙니다.
- **온라인몰 딥링크**: 온라인 쇼핑몰(쿠팡, 네이버, 11번가, G마켓 등)의 검색 URL 템플릿은 외부 사이트 정책 변경에 따라 달라질 수 있으므로 **구현 시 실제 동작 확인이 필요**합니다.
- **AI 슬롯 확장**: 사용자가 직접 학습시킨 로컬 모델은 `backend/app/ai/local_model_agent.py`의 `LocalModelAgent` 클래스에 연결할 수 있습니다.

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
