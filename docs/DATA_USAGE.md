# 데이터 활용 명세서 (DATA_USAGE)

> 본 문서는 제주 해커톤 대회 규정에 따른 데이터 활용 명세서 템플릿입니다.

## 1. 사용 데이터 목록

| 데이터명 | 출처 (제공기관) | 데이터 형태 | 이용 조건 / 라이선스 | 비고 |
|---|---|---|---|---|
| 제주 매장/온라인 예시 데이터 | 자체 Mock 생성 | JSON | 내부 테스트용 | `backend/app/data/mock/stores.json` |
| 제주 지명/랜드마크 사전 | 자체 Mock 생성 | JSON | 내부 테스트용 | `backend/app/data/mock/landmarks.json` |
| 온라인몰 연동 템플릿 | 공개 쇼핑몰 검색 URL | JSON | 참조용 | `backend/app/data/mock/online_malls.json` |
| (추후 연동) 제주빅데이터센터 카드 이용 현황 | 제주빅데이터센터 | CSV / Parquet | 반출 불가 (센터 PC 전용) | 모델 학습용 |
| (추후 연동) 제주 대중교통/버스 정보 | 제주데이터허브 | CSV / API | 공공데이터 오픈 라이선스 | 길찾기 연동용 |

## 2. 데이터 수집 및 전처리 흐름

1. **오프라인 매장 데이터 수집 및 정제**:
   - 제주 전역 매장 정보 및 좌표 정규화
   - 품목별 가격 및 판매 단위 표준화
2. **혼잡도 산출 데이터 연계**:
   - 카드 결제 현황 및 유동인구 데이터 기반 시간대별 혼잡도 지수 산출
3. **지리/좌표 데이터 처리**:
   - WGS84 좌표계 기준 위경도 검증 (제주 영역: 위도 33.1~33.65, 경도 126.1~127.0)

## 3. 외부 데이터 및 오픈소스 목록

- **OpenStreetMap 타일**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (ODbL, &copy; OpenStreetMap contributors)
- **Nominatim Geocoding API**: OpenStreetMap 기반 주소 검색 (선택적)
- **OSRM (Open Source Routing Machine)**: 오픈소스 도로망 경로 계산 (선택적)
