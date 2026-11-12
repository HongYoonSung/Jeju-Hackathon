import pytest
from app.ai.mock_agent import MockAgent
from app.schemas import SearchRequest, LatLng


@pytest.mark.asyncio
async def test_mock_agent_deterministic():
    agent = MockAgent()
    req1 = SearchRequest(
        query="우유 1L 제일 싼 곳",
        user_location=LatLng(lat=33.4996, lng=126.5312),
    )
    req2 = SearchRequest(
        query="우유 1L 제일 싼 곳",
        user_location=LatLng(lat=33.4996, lng=126.5312),
    )

    res1 = await agent.search(req1)
    res2 = await agent.search(req2)

    assert len(res1.results) == len(res2.results)
    for p1, p2 in zip(res1.results, res2.results):
        assert p1.id == p2.id
        assert p1.name == p2.name
        assert p1.price is not None and p2.price is not None
        assert p1.price.amount == p2.price.amount
