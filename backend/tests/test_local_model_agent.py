import pytest

from ai import agent_runner
from ai.agent_runner import GeminiAPIError
from app.ai import local_model_agent
from app.ai.local_model_agent import LocalModelAgent
from app.schemas import SearchRequest


def test_gemini_overload_stops_after_two_models(monkeypatch):
    class BusyResponse:
        status_code = 503

    calls = []

    def fake_post(url, **kwargs):
        calls.append(url)
        return BusyResponse()

    monkeypatch.setattr(agent_runner, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(agent_runner.requests, "post", fake_post)
    monkeypatch.setattr(agent_runner.time, "sleep", lambda _: None)

    with pytest.raises(GeminiAPIError) as error:
        agent_runner._call_gemini("test prompt")

    assert error.value.status_code == 503
    assert error.value.code == "AI_SERVICE_UNAVAILABLE"
    assert len(calls) == 2


def test_agent_runner_progress_is_safe_for_cp949_stdout(monkeypatch, capsys):
    responses = iter(
        [
            '{"location": "연동", "ingredients": ["김치", "두부"]}',
            "연동 주변 매장과 온라인 가격을 비교했어요.",
        ]
    )
    monkeypatch.setattr(agent_runner, "_call_gemini", lambda *args, **kwargs: next(responses))
    monkeypatch.setattr(agent_runner, "run_jeju_smart_cart", lambda **kwargs: {})

    result = agent_runner.ask_jeju_cart_agent("김치찌개 먹을랭")

    assert result["agent_briefing"] == "연동 주변 매장과 온라인 가격을 비교했어요."
    assert capsys.readouterr().out == ""


@pytest.mark.asyncio
async def test_local_model_results_are_adapted_for_map_and_search(monkeypatch):
    monkeypatch.setattr(local_model_agent, "GEMINI_API_KEY", "configured")
    monkeypatch.setattr(
        local_model_agent,
        "ask_jeju_cart_agent",
        lambda query: {
            "agent_briefing": "연동마트와 온라인 가격을 비교했어요.",
            "data": {
                "offline_analysis": {
                    "all_nearby_stores": [
                        {
                            "store_name": "연동마트",
                            "address": "제주시 연동",
                            "lat": 33.49,
                            "lng": 126.50,
                            "total_final_price": 12000,
                            "items": [{"inspect_day": "2026-11-16"}],
                        }
                    ]
                },
                "online_analysis": {
                    "items": [
                        {
                            "query": "우유 1L",
                            "title": "우유 1L",
                            "item_price": 2000,
                            "indexed_date": "2026-11-16",
                        }
                    ]
                },
            }
        },
    )

    response = await LocalModelAgent().search(SearchRequest(query="우유 1L"))

    assert [result.type for result in response.results] == ["online", "offline"]
    assert response.results[1].offline is not None
    assert response.results[1].offline.lat == 33.49
    assert response.results[0].online is not None
    assert response.results[0].online.deeplink_url.startswith(
        "https://search.shopping.naver.com/"
    )
    assert response.agent_briefing == "연동마트와 온라인 가격을 비교했어요."


@pytest.mark.asyncio
async def test_local_model_requires_configured_key(monkeypatch):
    monkeypatch.setattr(local_model_agent, "GEMINI_API_KEY", "")

    with pytest.raises(NotImplementedError):
        await LocalModelAgent().search(SearchRequest(query="우유"))
