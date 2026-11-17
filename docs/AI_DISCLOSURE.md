# AI 활용 및 공개 명세서 (AI_DISCLOSURE)

> 본 문서는 대회 규정에 따른 AI 기술 활용 범위와 모델 및 외부 코드 사용 내역을 공개하는 명세서입니다.

## 1. 사용한 AI 모델 및 슬롯 구조

- **기본 백엔드 AI 엔진**: `LocalModelAgent` (`AI_BACKEND=local`)
  - `ai/agent_runner.py`의 제주 장바구니 분석을 검색 API 결과와 연결합니다.
  - 질의 해석·요약에 Gemini API를 사용하며 키는 `ai/.env`의 `GEMINI_API_KEY`에서 읽습니다. 제공된 코드는 로컬 가중치 모델 추론 방식은 아닙니다.
- **테스트용 대체 엔진**: `MockAgent` (`AI_BACKEND=mock`)
  - 규칙 기반 결정적(deterministic) 예시 결과를 반환합니다.
  - LocalModelAgent 연결 실패 시 Mock으로 조용히 대체하지 않습니다.

## 2. AI 활용 범위

1. **자연어 질의 분석 (Search Agent)**:
   - 사용자가 입력한 일상 한국어 질의("우유 1L 어디가 싸?")로부터 상품명, 규격, 검색 의도를 파악하고 최적의 매장 및 온라인 상품을 순위별로 도출.
2. **매장 혼잡도 추정 (Crowd Estimation Agent)**:
   - 시간대별 매장 이용 패턴과 수용 인원을 바탕으로 4단계 혼잡도(여유/보통/혼잡/매우 혼잡) 및 추정 인원수 도출.
3. **코드 개발 보조**:
   - 아키텍처 스캐폴딩 및 인터페이스/테스트 코드 작성 시 생성형 AI 보조 도구 활용.

## 3. 외부 API 및 서비스 연동

- **지도**: 네이버 Dynamic Map을 우선 사용하며, 키·로딩 실패 시 설정에 따라 OpenStreetMap 기반 Leaflet 지도로 전환
- **주소 지오코딩 / 경로 안내**:
  - 기본: 내장 Mock 및 도로거리 추정(`estimate`) 알고리즘
  - 선택(환경변수 설정 시): Nominatim / Naver Maps API / OSRM
- **AI 서비스**: Gemini API (질의 해석·요약). Gemini에 검색 질의가 전달됩니다.

## 4. 외부 코드 및 오픈소스 라이브러리

- 백엔드: FastAPI, Uvicorn, Pydantic, HTTPX, Requests, Pandas, Pytest
- 프론트엔드: React, Vite, React Router, TanStack Query, Zustand, Leaflet, React-Leaflet, Pretendard
