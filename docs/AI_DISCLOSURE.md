# AI 활용 및 공개 명세서 (AI_DISCLOSURE)

> 본 문서는 대회 규정에 따른 AI 기술 활용 범위와 모델 및 외부 코드 사용 내역을 공개하는 명세서입니다.

## 1. 사용한 AI 모델 및 슬롯 구조

- **현재 백엔드 AI 엔진**: `MockAgent` (`AI_BACKEND=mock`)
  - 규칙 기반 결정적(deterministic) 가짜 AI 엔진으로 개발 및 데모 테스트 수행
- **로컬 학습 모델 슬롯 (`LocalModelAgent`)**:
  - 파일 위치: `backend/app/ai/local_model_agent.py`
  - 연결 방식: 센터 PC 내부의 로컬 LLM / 자체 학습 모델 또는 로컬 HTTP 서빙 엔드포인트(`AI_ENDPOINT`)
  - 미연결 시 `503 AI_NOT_READY` 반환 처리

## 2. AI 활용 범위

1. **자연어 질의 분석 (Search Agent)**:
   - 사용자가 입력한 일상 한국어 질의("우유 1L 어디가 싸?")로부터 상품명, 규격, 검색 의도를 파악하고 최적의 매장 및 온라인 상품을 순위별로 도출.
2. **매장 혼잡도 추정 (Crowd Estimation Agent)**:
   - 시간대별 매장 이용 패턴과 수용 인원을 바탕으로 4단계 혼잡도(여유/보통/혼잡/매우 혼잡) 및 추정 인원수 도출.
3. **코드 개발 보조**:
   - 아키텍처 스캐폴딩 및 인터페이스/테스트 코드 작성 시 생성형 AI 보조 도구 활용.

## 3. 외부 API 및 서비스 연동

- **지도 타일**: OpenStreetMap 타일 서버
- **주소 지오코딩 / 경로 안내**:
  - 기본: 내장 Mock 및 도로거리 추정(`estimate`) 알고리즘
  - 선택(환경변수 설정 시): Nominatim / Naver Maps API / OSRM

## 4. 외부 코드 및 오픈소스 라이브러리

- 백엔드: FastAPI, Uvicorn, Pydantic, HTTPX, Pytest
- 프론트엔드: React, Vite, React Router, TanStack Query, Zustand, Leaflet, React-Leaflet, Pretendard
