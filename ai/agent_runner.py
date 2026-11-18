import os
import json
import logging
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

if __package__:
    from .tonghap import run_jeju_smart_cart, META_CACHE_FILE
else:
    from tonghap import run_jeju_smart_cart, META_CACHE_FILE

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
]
GEMINI_REQUEST_TIMEOUT_S = 8


class GeminiAPIError(RuntimeError):
    def __init__(self, status_code: int, code: str, user_message: str):
        self.status_code = status_code
        self.code = code
        self.user_message = user_message
        super().__init__(code)


def _call_gemini(prompt: str, json_mode: bool = False) -> str:
    """실시간 진행 로그 출력 + 빠른 실패 전환(Fail-fast) Gemini 호출 래퍼"""
    if not GEMINI_API_KEY:
        raise ValueError(".env 파일에 GEMINI_API_KEY를 추가해 주세요.")

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    }

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
        },
    }
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    errors: list[int | str] = []

    for model_name in FALLBACK_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        logger.info("Trying configured Gemini model %s", model_name)

        try:
            res = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=GEMINI_REQUEST_TIMEOUT_S,
            )
            if res.status_code in (429, 503):
                logger.warning(
                    "Gemini model %s is busy (HTTP %s); trying the next model",
                    model_name,
                    res.status_code,
                )
                errors.append(res.status_code)
                time.sleep(1)
                continue
            res.raise_for_status()

            try:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (IndexError, KeyError, TypeError, ValueError) as error:
                raise GeminiAPIError(
                    502,
                    "AI_INVALID_RESPONSE",
                    "AI 서비스에서 올바른 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
                ) from error
            logger.info("Gemini model %s returned a response", model_name)
            return text
        except requests.Timeout:
            logger.warning("Gemini model %s timed out", model_name)
            errors.append("timeout")
        except requests.HTTPError as error:
            status_code = error.response.status_code if error.response is not None else 502
            logger.error("Gemini model %s returned HTTP %s", model_name, status_code)
            raise GeminiAPIError(
                502,
                "AI_PROVIDER_ERROR",
                "AI 서비스 설정 또는 API 키를 확인해 주세요.",
            ) from error
        except requests.RequestException as error:
            logger.warning(
                "Gemini model %s failed (%s); trying the next model",
                model_name,
                type(error).__name__,
            )
            errors.append("network")

    if 429 in errors:
        raise GeminiAPIError(
            429,
            "AI_RATE_LIMITED",
            "AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
        )
    if 503 in errors:
        raise GeminiAPIError(
            503,
            "AI_SERVICE_UNAVAILABLE",
            "AI 서비스가 혼잡해 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
        )
    if "timeout" in errors:
        raise GeminiAPIError(
            504,
            "AI_TIMEOUT",
            "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
        )
    raise GeminiAPIError(
        502,
        "AI_PROVIDER_ERROR",
        "AI 서비스 연결에 실패했습니다. 네트워크 상태를 확인해 주세요.",
    )


def _load_valid_catalog() -> list:
    if os.path.exists(META_CACHE_FILE):
        with open(META_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("products", [])
    return []


def _filter_catalog_candidates(user_query: str, catalog_names: list) -> list:
    """질문과 연관된 원재료 및 가공식품 후보를 추출"""
    # 요리명 -> 대표 원재료 확장 매핑
    recipe_hints = {
        "김치찌개": ["배추김치", "포기김치", "돼지고기", "삼겹살", "두부", "대파", "양파"],
        "된장찌개": ["된장", "두부", "애호박", "감자", "양파", "대파", "버섯"],
        "제육": ["돼지고기", "앞다리", "삼겹살", "양파", "대파", "고추장"],
        "카레": ["카레", "감자", "당근", "양파", "돼지고기", "소고기"],
        "알리오올리오": ["스파게티", "올리브", "식용유", "마늘", "고추"],
        "파스타": ["스파게티", "파스타", "올리브", "마늘", "양파", "베이컨", "치즈", "우유"],
        "스파게티": ["스파게티", "파스타", "올리브", "마늘", "양파", "베이컨", "치즈"],
        "까르보나라": ["스파게티", "베이컨", "계란", "우유", "치즈", "마늘"],
        "떡볶이": ["떡", "어묵", "고추장", "대파", "양배추", "계란"],
        "볶음밥": ["쌀", "햇반", "계란", "대파", "양파", "당근", "햄"],
    }

    target_words = [w for w in user_query.replace(",", " ").split() if len(w) >= 2]
    for recipe, hints in recipe_hints.items():
        if recipe in user_query:
            target_words.extend(hints)

    filtered = []
    for name in catalog_names:
        # 질문 단어나 레시피 힌트가 포함된 상품 (원재료 + 가공품 모두 후보에 올림)
        if any(tw in name for tw in target_words):
            filtered.append(name)

    return list(dict.fromkeys(filtered))[:120]



def _match_catalog_with_aliases(keyword: str, aliases: list[str], catalog_names: list[str]) -> str:
    """키워드와 LLM이 생성한 대표 상표/동의어 목록을 사용해 카탈로그의 실제 제품명을 빠르게 매칭"""
    kw = keyword.strip()
    if not kw:
        return keyword

    # 규격/수량 힌트 추출 (묶음 규격 우선)
    has_2l6 = "2L" in kw and "6" in kw
    spec_tokens: list[tuple[str, int]] = []
    if has_2l6:
        spec_tokens.append(("2L*6", -10))
    if "30롤" in kw:
        spec_tokens.append(("30롤", -10))
    if "2L" in kw and not has_2l6:
        spec_tokens.append(("2L", -5))
    if "500ml" in kw:
        spec_tokens.append(("500ml", -5))
    if "1L" in kw:
        spec_tokens.append(("1L", -5))

    noise_words = ("이유식", "진밥", "면도날", "반려", "강아지", "고양이", "마스크", "물티슈", "키친타월", "미용티슈", "주방세제", "락스")
    allow_noise = any(nw in kw for nw in noise_words)
    targets = list(dict.fromkeys([kw] + [a.strip() for a in aliases if a.strip()]))
    scored: list[tuple[int, int, int, str]] = []

    for name in catalog_names:
        base = name.split("(")[0].strip()
        if not allow_noise and any(nw in name for nw in noise_words):
            continue

        spec_bonus = sum(bonus for tok, bonus in spec_tokens if tok in name)
        for t_idx, target in enumerate(targets):
            t_base = target.split("(")[0].strip()
            if base == t_base:
                scored.append((0 + spec_bonus, t_idx, len(base), name))
            elif base.startswith(t_base):
                scored.append((1 + spec_bonus, t_idx, len(base), name))
            elif base.endswith(f" {t_base}") or base.endswith(t_base):
                scored.append((2 + spec_bonus, t_idx, len(base), name))
            elif len(t_base) >= 2 and t_base in name:
                scored.append((3 + spec_bonus, t_idx, len(base), name))

    if not scored:
        return kw
    scored.sort(key=lambda x: (x[0], x[1], x[2]))
    return scored[0][3]


def ask_jeju_cart_agent(user_query: str) -> dict:
    logger.info("Starting query interpretation")
    all_catalog_names = [p["goodName"] for p in _load_valid_catalog()]

    parse_prompt = f"""
너는 제주 도민의 장보기를 돕는 AI 에이전트다.
사용자 질문에서 '제주 지역 위치(행정동/읍면)'와 '필요한 품목 리스트'를 추출해 JSON으로 응답해라.

[핵심 규칙]
1. 요리명을 말한 경우(예: "알리오올리오", "감바스", "김치찌개"):
   - 완제품이 아니라 요리에 실제로 필요한 **핵심 원재료**만 뽑고, 요리에 안 들어가는 재료는 절대 넣지 마라.
2. 각 품목마다 `name`(원래 품목명)과 `aliases`(한국 마트 카탈로그에서 찾을 수 있는 대표 상표명·동의어 4~6개)를 함께 작성해라.
   - 예: "생수 2L 6병" -> {{"name": "생수 2L 6병", "aliases": ["삼다수", "아이시스", "백산수", "에비앙", "생수"]}}
   - 예: "세탁세제" -> {{"name": "세탁세제", "aliases": ["액체세제", "분말세제", "테크", "퍼실", "비트", "스파크"]}}
   - 예: "롤휴지 30롤" -> {{"name": "롤휴지 30롤", "aliases": ["화장지", "3겹", "크리넥스", "코디", "깨끗한나라"]}}
   - 예: "두부" -> {{"name": "두부", "aliases": ["두부", "찌개두부", "부침두부"]}}
   - 예: "올리브유" -> {{"name": "올리브유", "aliases": ["올리브유"]}} (식용유/카놀라유로 바꾸지 말 것)
3. 위치 언급이 없으면 기본값 "연동"을 사용해라.

사용자 질문: "{user_query}"

출력 JSON 형식:
{{"location": "행정동명", "items": [{{"name": "품목1", "aliases": ["검색어1", "검색어2"]}}]}}
"""
    raw_parsed = _call_gemini(parse_prompt, json_mode=True)
    cleaned_parsed = raw_parsed.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    parsed = json.loads(cleaned_parsed)

    location = parsed.get("location", "연동")
    raw_items = parsed.get("items") or []
    if not raw_items and parsed.get("ingredients"):
        raw_items = [{"name": str(ing), "aliases": []} for ing in parsed["ingredients"]]
    if not raw_items:
        raw_items = [{"name": "돼지고기", "aliases": []}, {"name": "김치", "aliases": []}, {"name": "두부", "aliases": []}]

    ingredients = list(
        dict.fromkeys(
            _match_catalog_with_aliases(
                str(item.get("name", "")),
                [str(a) for a in (item.get("aliases") or [])],
                all_catalog_names,
            )
            for item in raw_items
            if str(item.get("name", "")).strip()
        )
    )
    parsed["ingredients"] = ingredients

    logger.info("Starting offline and online price analysis")
    tool_result = run_jeju_smart_cart(location_name=location, ingredients=ingredients)
    logger.info("Price analysis completed")
    time.sleep(1)

    logger.info("Generating the result summary")
    summary_prompt = f"""
너는 제주 도민에게 가장 알뜰한 장보기 방법을 알려주는 친절한 AI 비서다.
아래 실제 데이터 분석 결과(JSON)만을 근거로(절대 숫자를 지어내지 말 것),
도민이 한눈에 이해할 수 있도록 핵심 추천 전략, 방문할 마트(또는 온라인 구매처), 예상 총액 및 절약 금액을 4줄 이내로 깔끔하게 요약해 줘.
마크다운 기호(*, **, # 등)는 절대 사용하지 말고 일반 텍스트로만 작성해라.

분석 데이터:
{json.dumps(tool_result, ensure_ascii=False)}
"""
    agent_briefing = _call_gemini(summary_prompt, json_mode=False)

    return {
        "user_query": user_query,
        "parsed_intent": parsed,
        "agent_briefing": agent_briefing,
        "data": tool_result,
    }


if __name__ == "__main__":
    sample_q = "오늘 자취방에서 간편하게 먹을 김치볶음밥이랑 냉동만두 노형동 근처로 알아봐줘"
    result = ask_jeju_cart_agent(sample_q)
    print("Final result:")
    print(json.dumps(result, ensure_ascii=True, indent=2))
