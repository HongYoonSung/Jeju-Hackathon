from typing import Protocol, List
from datetime import datetime
from app.schemas import SearchRequest, SearchResponse, CrowdInfo


class AIAgent(Protocol):
    async def search(self, req: SearchRequest) -> SearchResponse:
        """자연어 질의 → 오프라인 매장/온라인몰 결과(순위·가격 포함). crowd는 비워도 됨."""
        ...

    async def estimate_crowd(
        self, place_ids: List[str], at: datetime
    ) -> List[CrowdInfo]:
        """오프라인 매장별 혼잡도(4단계)와 추정 인원수."""
        ...
