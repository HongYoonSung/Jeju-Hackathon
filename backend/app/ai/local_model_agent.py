"""
이 파일에 학습된 모델을 연결한다.
- 입력: SearchRequest (query, user_location, client_time)
- 출력: SearchResponse (7.1 계약 준수)
- 연결 방식 예: (a) 같은 프로세스에서 모델 로드  (b) AI_ENDPOINT 의 로컬 HTTP 서버(Ollama/llama.cpp/자체 서버) 호출
- 반출 불가 데이터(카드·유동인구 등)는 센터 PC 안에서만 접근한다. 이 저장소에 원본 데이터를 포함하지 않는다.
"""

from datetime import datetime
from typing import List
from app.schemas import SearchRequest, SearchResponse, CrowdInfo


class LocalModelAgent:
    async def search(self, req: SearchRequest) -> SearchResponse:
        raise NotImplementedError("AI model not connected")

    async def estimate_crowd(
        self, place_ids: List[str], at: datetime
    ) -> List[CrowdInfo]:
        raise NotImplementedError("AI model not connected")
