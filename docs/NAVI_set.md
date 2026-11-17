# 네이버 지도 · AI 모델 연결 가이드 (사람이 직접 하는 일)

> 짝 문서: `JEJU_EOLMAKKWA_SPEC_v0.3.md` (코드 구현 명세)
> 이 문서는 **코드를 짜는 AI가 아니라, 사용자가 직접 해야 하는 작업**을 순서대로 적었습니다.
> 각 단계에는 ✅ **확인 방법**이 있습니다. 확인을 통과한 뒤 다음 단계로 가세요.
> 💡 `📚 왜?`는 공부용 설명입니다.

---

## 0. 전체 그림 (두 작업은 서로 독립입니다)

```
[파트 A] 네이버 지도·길찾기 연결   → 지도가 뜨고 도로 위에 경로선이 그려진다
[파트 B] 내 AI 모델 연결           → Mock(가짜) 결과 대신 진짜 모델 결과가 나온다
```
- 파트 A만 먼저 해도 서비스는 완전히 동작합니다(AI는 Mock).
- 파트 B만 먼저 해도 됩니다(지도는 대체 지도 또는 네이버).
- **둘 다 `.env` 파일 값만 바꾸면 전환**되도록 설계되어 있습니다.

### 준비물 체크
- [ ] 코드가 구현되어 로컬에서 실행되는 상태 (`/api/health`가 응답)
- [ ] 네이버 계정 (네이버 클라우드 플랫폼 가입용)
- [ ] 휴대폰/본인 인증 수단 (가입 과정에서 필요할 수 있음)
- [ ] 결제수단이 필요할 수 있음 → 가입 중 요구 여부와 **무료 이용량**을 반드시 확인
- [ ] 모델이 어디에서 돌아가는지 파악 (파트 B 0단계)

---

# 파트 A. 네이버 지도 연결

## A-1. 네이버 클라우드 플랫폼 가입·접속
1. `https://www.ncloud.com` 에서 회원가입(또는 로그인) 후 콘솔(`https://console.ncloud.com`)에 들어갑니다.
2. 가입 과정에서 개인/법인, 결제수단 등록을 요구할 수 있습니다. **무료 이용량 범위에서만 쓸 것**이라면 요금 안내를 꼼꼼히 읽으세요.

✅ 콘솔 메인 화면이 보이면 완료.

## A-2. Application 등록 (지도·길찾기용 "열쇠" 만들기)
1. 콘솔에서 `AI·NAVER API` → `Application` 메뉴로 이동합니다. (메뉴 이름·위치는 개편될 수 있으니 안 보이면 콘솔 검색창에 "Application"을 입력)
2. **Application 등록**을 누르고 이름을 정합니다(10자 이내 권장, 예: `jejuapp`).
3. 사용할 API를 선택합니다.
   - ☑ **Dynamic Map** (웹에 지도 표시)
   - ☑ **Directions 5** (자동차 길찾기)
   - ☑ **Geocoding** (주소 → 좌표)
   - ☐ Directions 15, Static Map 등은 **불필요**
4. **서비스 환경 → Web 서비스 URL**에 다음을 등록합니다(아래 A-3 규칙 참고).

📚 **왜 Application이 필요한가?** "이 서비스는 이 주소에서 우리 지도를 쓸 것"이라고 네이버에 미리 신고하는 절차입니다. 신고한 주소가 아닌 곳에서 지도가 열리면 인증 오류로 막습니다.

## A-3. Web 서비스 URL 등록 규칙 (가장 흔한 실패 원인)
| 규칙 | 설명 |
|---|---|
| **포트 번호·경로는 빼고 도메인만** | `http://localhost:5173` ❌ → `http://localhost` ✅ |
| `localhost`와 `127.0.0.1`은 **다른 주소** | 둘 다 등록 (브라우저 주소창에 실제로 쓰는 쪽이 맞아야 함) |
| 시연/센터에서 접속할 주소도 등록 | 예: 센터 PC의 IP·도메인의 **호스트 부분** |
| 최대 10개까지 등록 가능 | 개발·시연·센터 주소를 나눠 관리 |

등록할 목록 예:
```
http://localhost
http://127.0.0.1
(센터/시연 PC 접속 주소의 호스트 — 나중에 추가)
```
✅ 저장 후 Application 목록에 상태가 정상으로 보이면 완료.

## A-4. 인증 정보 확인 (Key 두 개)
Application의 **인증 정보** 버튼을 눌러 다음 두 값을 확인합니다.

| 이름 | 용도 | 어디에 넣나 | 공개 여부 |
|---|---|---|---|
| **Client ID** (= API Key ID) | 지도 스크립트 로드 + 백엔드 API 호출 | 프론트 `.env.local` **그리고** 백엔드 `.env` | 도메인 제한이 있어 브라우저에 노출돼도 되지만, **GitHub에는 올리지 않음** |
| **Client Secret** | 백엔드가 길찾기·지오코딩 호출할 때만 | **백엔드 `.env` 에만** | ❌ 절대 비공개. 프론트·GitHub·문서·스크린샷에 넣지 말 것 |

📚 **왜 Secret은 백엔드에만?** 브라우저에 들어간 값은 누구나 개발자도구로 볼 수 있습니다. Secret이 보이면 남이 내 한도를 마음대로 써 버립니다. 그래서 길찾기·주소검색은 **우리 서버(백엔드)가 대신 호출**하게 만든 것입니다.

## A-5. `.env` 설정
**① 백엔드: 프로젝트 루트의 `.env`** (`.env.example`을 복사해서 만든 뒤 값 채우기)
```
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret
ROUTER_CHAIN=naver,osrm,estimate
GEOCODER_CHAIN=naver,mock
```
**② 프론트: `frontend/.env.local`**
```
VITE_MAP_PROVIDER=naver
VITE_NAVER_MAP_KEY_ID=발급받은_Client_ID
VITE_NAVER_MAP_KEY_PARAM=ncpKeyId
VITE_MAP_FALLBACK=leaflet
```
- `VITE_NAVER_MAP_KEY_PARAM`: 네이버 지도 스크립트가 요구하는 **인증 파라미터 이름**입니다. 자료에 따라 `ncpKeyId` 또는 `ncpClientId`로 안내되므로, **A-8에서 인증 오류가 나면 이 값을 다른 쪽으로 바꿔서** 다시 시도하세요. 정답은 공식 "지도 API v3 로드하기" 문서의 현재 값입니다.
- 프론트 `.env.local`은 **값을 바꾼 뒤 개발 서버를 재시작**해야 반영됩니다.
- 두 파일 모두 `.gitignore`에 들어 있는지 확인:
  ```bash
  git check-ignore -v .env frontend/.env.local   # 둘 다 무시 규칙이 출력되어야 함
  ```

✅ 두 파일이 모두 git에서 무시되면 완료.

## A-6. 키 점검 (서버 쪽 먼저)
```bash
python scripts/check_naver.py
```
기대 결과(예):
```
[Directions] OK  (거리 12.4km, 소요 24분, 응답 시간 0.4s)
[Geocoding ] OK  (제주시 … → 33.xx, 126.xx)
```
| 출력 | 원인 | 조치 |
|---|---|---|
| `인증 실패(401/403)` | ID/Secret 오타, Application에 API 미선택 | A-2·A-4 재확인 |
| `Geocoding 권한 없음` | Application에서 Geocoding 미체크 | 콘솔에서 Application 수정 → Geocoding 체크 → 저장 |
| `429` | 호출 한도/속도 제한 | 잠시 후 재시도, 한도 확인 |
| `연결 실패` | 인터넷·방화벽 | 네트워크 확인(센터라면 허용 목록 요청, A-11) |

✅ Directions·Geocoding 모두 OK면 완료.

## A-7. 백엔드 기동 확인
```bash
uvicorn app.main:app --reload --port 8000
curl http://127.0.0.1:8000/api/health
```
✅ 응답에 `"naver_configured": true`, `router_chain`에 `naver`가 있으면 완료. (키 값 자체는 응답에 보이지 않는 것이 정상)

## A-8. 프론트 기동 → 지도 확인
```bash
cd frontend && npm run dev
```
1. 브라우저에서 `http://localhost:5173` 접속(→ 서비스 URL에 `http://localhost`가 등록되어 있어야 함).
2. 아무 질문이나 보내 결과 화면으로 넘어가면 **네이버 지도**가 보여야 합니다. 화면 구석에 네이버 로고·저작권 표기가 보이는 것이 정상입니다.
3. 개발자도구(F12) → **Network** 탭에서 `maps.js` 요청이 `200`인지 확인합니다.

| 증상 | 원인 | 조치 |
|---|---|---|
| 지도 대신 "기본 지도로 보여드려요" 안내 + OSM 지도 | 네이버 로딩 실패로 **폴백 동작 중** | 아래 표로 원인 제거 |
| 콘솔에 인증 오류(`navermap_authFailure`) | ① Web 서비스 URL 미등록/불일치 ② 파라미터 이름 불일치 ③ 포트를 넣어 등록 | A-3 재확인 → `VITE_NAVER_MAP_KEY_PARAM` 값을 `ncpKeyId`↔`ncpClientId`로 교체 후 재시작 |
| 지도가 흰 화면 | `file://`로 직접 열었거나 주소 불일치 | 반드시 `http://localhost…`로 접속 |
| 스크립트 요청 자체가 실패 | 인터넷·방화벽·광고차단 확장프로그램 | 시크릿 창/확장 끄기, 네트워크 확인 |
| 로컬은 되는데 다른 PC에서 안 됨 | 그 PC의 접속 주소가 미등록 | A-3에 해당 호스트 추가 |

✅ 네이버 지도가 보이면 완료.

## A-9. 길찾기 확인 (도로 위 경로선)
1. 결과 목록에서 매장 카드 클릭 → `길안내` → 출발 주소 입력(예: `제주시청`) → 실행.
2. 지도에 **도로를 따라 굽이치는 파란 선**이 그려지고, 아래에 `24분 · 12.4km`와 단계별 안내가 나와야 합니다.
3. 개발자도구 Network에서 `/api/route` 응답을 열어 확인합니다.

| 응답 값 | 의미 |
|---|---|
| `"provider": "naver"` + `geometry` 길이가 수십~수백 | ✅ 정상(도로 기반) |
| `"provider": "estimate"` + `geometry`가 2개 | ❌ 직선 폴백 중 → 서버 로그에서 naver 실패 사유 확인(키·한도·출발/도착이 도로에서 먼 경우 등) |
| 선이 바다·엉뚱한 곳에 그려짐 | 위도·경도 뒤집힘 → 백엔드 `router_naver.py`의 좌표 변환 확인(명세 10.2) |

✅ `provider: "naver"` 선이 도로 위에 보이면 파트 A 완료.

## A-10. 보안·제출 점검 (커밋 전 매번)
```bash
git status                                   # .env 류가 목록에 없어야 함
git grep -n "NAVER_CLIENT_SECRET"            # 값이 아니라 '변수 이름'만 나와야 함
git grep -nE "[A-Za-z0-9]{30,}" -- . ':!package-lock.json'   # 긴 키 문자열이 박혀 있지 않은지 대략 점검
```
- Secret이 한 번이라도 커밋·공유됐다면 **콘솔 Application의 인증 정보에서 재발급**하고 `.env`를 교체하세요(코드 수정 불필요).
- 프론트 빌드 산출물(`frontend/dist`)에 Secret이 없는지 `grep -r "서비스 Secret 일부" frontend/dist`로 확인(Secret의 앞 6글자 정도로 검색).
- 스크린샷·발표자료·영상에 키가 찍히지 않았는지 확인(대회 규정).

## A-11. 센터 PC(또는 시연 환경)로 옮길 때
1. 센터 PC가 **인터넷에 접속되는지** 담당자에게 확인합니다. 아래 도메인 접속이 필요합니다.
   - 브라우저: `oapi.map.naver.com`, `*.map.naver.com`, `*.map.naver.net` (+ Network 탭에서 추가로 보이는 네이버 도메인)
   - 서버: `naveropenapi.apigw.ntruss.com`
2. 센터 PC에서 접속할 주소(예: `http://센터PC-IP:8000`)의 **호스트를 A-3에 추가 등록**합니다.
3. 접속이 불가능하면 다음 중 하나로 전환합니다.
   - 지도: `VITE_MAP_PROVIDER=leaflet` (타일 서버 접속이 필요하면 로컬 타일 사용 검토)
   - 경로: `ROUTER_CHAIN=osrm,estimate` + OSRM 서버 구성(명세 10.4)
4. 기획서·README에 **외부 서비스 의존성**(네이버 지도·Directions·Geocoding)을 명시합니다(대회 규정).
5. 시연 직전에 한 번 더 A-6~A-9를 반복해 통과하는지 확인합니다.

## A-12. 한도와 비용 관리
- 네이버 Directions 무료 이용량은 월 단위로 안내되어 있고 정책은 바뀔 수 있으니, **콘솔의 이용량 화면에서 직접 확인**하세요.
- 이 서비스는 검색 1회당 길찾기를 **최대 `ROUTE_METRICS_TOP_N`(기본 10)번** 호출합니다. 한도가 걱정되면 이 값을 5~8로 낮추세요. 결과는 5분간 캐시되어 같은 위치에서의 반복 검색은 호출이 줄어듭니다.
- 시연·테스트 때 같은 검색을 반복하더라도 5분 이내라면 호출이 늘지 않습니다.

---

# 파트 B. 내 AI 모델 연결

## B-0. 먼저 결정할 것 (이 표가 이후 단계를 결정)
| 결정 | 선택지 | 권장 |
|---|---|---|
| 모델이 어디에 있나 | ① 같은 PC ② 다른 사람의 PC ③ 클라우드 서버 | 개발은 ①②, **제출·시연은 센터 PC(①)** |
| 모델을 어떻게 돌리나 | (a) Ollama (b) llama.cpp 서버 (c) 직접 만든 FastAPI (d) 웹서버 프로세스 안에서 직접 로드 | **(a)(b)(c) 중 하나: 별도 서버로 분리** |
| 숫자(가격·좌표)는 누가 책임지나 | 모델 / 데이터베이스 | **데이터베이스**(모델은 이해·문장 작성만) |

📚 **왜 모델이 숫자를 책임지면 안 되나?** 모델은 그럴듯한 가짜 숫자를 만들 수 있습니다. 가격·좌표는 **조회 코드가 DB에서 가져오고**, 모델은 질문을 이해하고 답변 문장을 쓰는 데만 쓰면 틀린 가격이 나갈 위험이 크게 줄어듭니다.

필요한 정보를 메모해 두세요: 모델 이름, 서버 방식, 주소·포트, 응답 형식(OpenAI 호환 `/v1/chat/completions`인지 등).

## B-1. 계약 이해: 모델 쪽에서 맞춰야 할 입출력
백엔드가 `local_model_agent.py`를 통해 요구하는 것은 다음 한 가지입니다.

**입력** `{ "query": "노형동 근처에서 우유 제일 싼 곳 알려줘", "client_time": "2026-11-12T14:30:00+09:00" }`

**출력(`AgentSearchResult`)**
```json
{
  "status": "ok",
  "answer": "우유 1L 가격을 비교해 봤어요. 예시마트 노형점이 가장 저렴해요.",
  "interpretation": { "item": "우유 1L", "origin_text": "노형동", "intent": "cheapest" },
  "view_hint": { "sort": "price", "type_filter": "all", "focus_place_id": "store_001" },
  "results": [
    { "id": "store_001", "type": "offline", "rank": 1, "name": "예시마트 노형점",
      "price": { "amount": 2480, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": { "address": "제주시 노형동", "lat": 33.4846, "lng": 126.4783 }, "online": null, "crowd": null },
    { "id": "online_001", "type": "online", "rank": 2, "name": "쿠팡",
      "price": { "amount": 2650, "unit_label": "1L", "checked_at": "2026-11-12T09:00:00+09:00" },
      "offline": null, "online": { "site_name": "쿠팡", "deeplink_url": "https://www.coupang.com/np/search?q=..." }, "crowd": null }
  ]
}
```
- **모델이 채우지 않는 것**: `road`(거리·시간) → 백엔드가 네이버로 계산. `origin` → 백엔드가 `origin_text`·GPS로 결정.
- 모호한 질문(가격과 무관, 대상 불명)이면 `"status":"needs_clarification"`, `"results":[]`, `answer`에 되묻는 문장.
- 정확한 필드 정의는 명세 9.1, 검증은 백엔드의 Pydantic(`schemas.py`)이 합니다. 형식이 틀리면 해당 항목이 제거되거나 오류가 납니다.

## B-2. 데이터 준비: 가격 DB와 매장 DB
모델이 "우유 1L 제일 싼 곳"을 답하려면 **사실 데이터**가 있어야 합니다. 센터 데이터에는 상품 가격·마트 위치가 없습니다.

### B-2-1. 데이터 출처 정하기
| 필요 데이터 | 후보 | 주의 |
|---|---|---|
| 상품 가격 | 공공 가격정보(공공데이터포털 등), 직접 조사, 제휴 | **크롤링은 사이트 약관·저작권 확인 필수**(대회 규정: 적법하게 사용 가능한 자료만) |
| 매장 이름·주소·좌표 | 공공데이터(상가·대형마트 현황 등), 직접 구축 | 주소만 있으면 네이버 Geocoding으로 좌표 변환 가능 |
| 온라인몰 검색 URL | 각 몰의 검색 주소 규칙 | URL 규칙은 바뀔 수 있으니 테스트 |

출처·이용조건은 `docs/DATA_USAGE.md`에 기록합니다.

### B-2-2. SQLite 예시 구조 (가장 간단)
```sql
CREATE TABLE stores   (id TEXT PRIMARY KEY, name TEXT, chain TEXT, address TEXT, lat REAL, lng REAL, eupmyeondong TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, unit_label TEXT, keywords TEXT);   -- keywords: 쉼표로 구분한 동의어("우유,흰우유,1L우유")
CREATE TABLE prices   (store_id TEXT, product_id INTEGER, amount INTEGER, checked_at TEXT,
                       PRIMARY KEY (store_id, product_id));
CREATE TABLE malls    (id TEXT PRIMARY KEY, name TEXT, search_url_template TEXT);            -- 예: https://.../search?q={q}
```
- 매장의 `eupmyeondong`(읍면동)은 **혼잡도 조회 연결용**(B-6)이라 미리 채워 두면 좋습니다.
- 조회 함수 예: `lookup_candidates(item, origin_text) -> list[Candidate]` — 상품 동의어 매칭 → 매장별 가격 조회 → 지역 우선순위 정렬.

✅ SQL로 `우유`를 조회했을 때 매장 3곳 이상의 가격이 나오면 완료.

## B-3. 모델 서버 준비
### 같은 PC에서 돌리는 경우
- 모델 서버를 **웹 서버와 별도 프로세스**로 실행하고, 주소를 `AI_ENDPOINT=http://127.0.0.1:포트`로 지정합니다.
- 상태 확인용 주소(`/health` 등)가 있으면 `AI_HEALTH_PATH`로 지정(서버에 없으면 간단한 응답을 주는 경로를 하나 만들어 두세요).

### 다른 사람의 PC에서 돌리는 경우 (개발 단계용)
1. **VPN형 도구(예: Tailscale)로 양쪽을 같은 가상망에 연결**하는 방식을 권장합니다. 공유기 포트 개방이 필요 없습니다.
2. 상대 PC의 모델 서버 주소를 `AI_ENDPOINT=http://<가상망 주소>:포트`로 지정합니다.
3. **인증 없는 모델 서버를 인터넷에 직접 공개하지 마세요.** 주소만 알면 누구나 상대 GPU를 쓸 수 있습니다. 공개해야 하면 앞단에 API 키 검사(Bearer)와 HTTPS를 두고, 키는 `AI_API_KEY`에 넣습니다.
4. 상대 PC가 꺼지면 서비스도 멈춥니다. **제출·시연에는 의존하지 마세요**(대회는 센터에서 실행·검증).

### 서버 응답 형식을 정하세요 (권장: OpenAI 호환)
Ollama·llama.cpp 서버는 모두 OpenAI 호환 주소(`/v1/chat/completions`)를 제공하는 설정이 있습니다. 이 형식이면 아래 B-5 예시 코드를 거의 그대로 쓸 수 있습니다. 직접 만든 서버라면 입출력 JSON 형식을 자유롭게 정하되 B-5의 파싱 부분만 맞추면 됩니다.

✅ `curl`로 모델 서버에 간단한 질문을 보내 답이 오면 완료.

## B-4. 프롬프트와 JSON 강제 (가장 중요한 품질 장치)
모델에게 **의도 해석만** 시키고 JSON으로 답하게 합니다.

**의도 추출 프롬프트 예시**
```
당신은 제주 지역 가격 비교 서비스의 질의 해석기입니다.
사용자 질문을 읽고 아래 JSON만 출력하세요. 설명·마크다운·코드블록 없이 JSON만.
{
  "valid": true|false,                      // 상품 가격을 찾는 질문이면 true
  "item": "상품명과 규격 (예: 우유 1L) 또는 null",
  "origin_text": "질문에 나온 지역(읍·면·동) 또는 null",
  "intent": "cheapest" | "nearest" | "compare" | "other",
  "type_filter": "all" | "offline" | "online",
  "clarify": "valid가 false일 때 사용자에게 되물을 한 문장(해요체) 또는 null"
}
```
- **JSON 강제**: 서버가 지원하는 옵션을 쓰세요(예: OpenAI 호환의 `response_format`, llama.cpp의 grammar/JSON 스키마). 지원이 약하면 "JSON만 출력" 지시 + 파싱 실패 시 **1회 재시도**.
- **검증**: 받은 문자열을 `json.loads` → Pydantic으로 검증. 실패하면 재시도 → 그래도 실패하면 `needs_clarification`으로 처리하세요(가짜 결과를 만들지 않기).
- **답변문 프롬프트**(2차 호출): 조회된 사실(상품, 최저가 매장, 가격, 매장 수)만 주고 "이 사실만 사용해 해요체 두 문장 이내로 요약"을 시킵니다. **사실에 없는 숫자를 쓰지 말라**고 명시하세요.
- 질문 내용은 **로그에 남기지 마세요**(개인정보 규정).

📚 **왜 호출을 두 번(해석 → 답변문)?** 한 번에 "찾아서 가격까지 말해"라고 시키면 모델이 가격을 지어냅니다. 해석과 문장 작성만 맡기고, 가운데(조회)는 코드가 하면 사실과 말이 어긋나지 않습니다.

## B-5. `local_model_agent.py` 채우기 (구현 AI에게 맡기거나 직접)
위치: `backend/app/ai/local_model_agent.py`. 기존 스텁(`NotImplementedError`)을 아래 흐름으로 바꿉니다.

```python
import json, asyncio, httpx
from datetime import datetime
from app.config import settings
from app.schemas import AgentSearchRequest, AgentSearchResult, CrowdInfo
from app.errors import AINotReady, AITimeout          # → 각각 503 / 504로 변환됨

class LocalModelAgent:
    def _headers(self):
        h = {"Content-Type": "application/json"}
        if settings.AI_API_KEY:
            h["Authorization"] = f"Bearer {settings.AI_API_KEY}"
        return h

    async def _chat(self, system: str, user: str) -> str:
        payload = {"model": settings.AI_MODEL_NAME, "temperature": 0,
                   "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        last_err = None
        for _ in range(settings.AI_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_S, headers=self._headers()) as c:
                    r = await c.post(f"{settings.AI_ENDPOINT}/v1/chat/completions", json=payload)
                    r.raise_for_status()
                    return r.json()["choices"][0]["message"]["content"]   # 서버 형식에 맞게 수정
            except httpx.TimeoutException as e:
                last_err = AITimeout()
            except httpx.HTTPError as e:
                last_err = AINotReady()
        raise last_err

    async def search(self, req: AgentSearchRequest) -> AgentSearchResult:
        # 1) 의도 해석 (JSON)
        intent = await self._parse_intent(req.query)               # 실패/무효 시 아래에서 needs_clarification
        if not intent.valid:
            return AgentSearchResult(status="needs_clarification", answer=intent.clarify or "어떤 상품의 가격이 궁금하세요?",
                                     interpretation=..., view_hint=..., results=[])
        # 2) DB 조회 (가격·좌표는 여기서만 나온다)
        candidates = lookup_candidates(intent.item, intent.origin_text)   # B-2-2
        # 3) 순위(rank) 부여: 가격 오름차순, 오프라인·온라인 혼합
        results = build_results(candidates)
        # 4) 답변문 생성 (사실만 전달)
        answer = await self._write_answer(intent, results)
        # 5) 화면 힌트
        hint = make_view_hint(intent, results)                     # cheapest→price, nearest→distance …
        return AgentSearchResult(status="ok", answer=answer, interpretation=..., view_hint=hint, results=results)

    async def estimate_crowd(self, place_ids: list[str], at: datetime) -> list[CrowdInfo]:
        return crowd_lookup(place_ids, at)                         # B-6
```
- `...`와 헬퍼(`_parse_intent`, `lookup_candidates`, `build_results`, `make_view_hint`)는 명세 8.1·9.1의 필드 정의대로 채웁니다.
- **절대 하지 말 것**: 연결 실패 시 Mock으로 조용히 대체. (가짜 데이터가 진짜처럼 보임) → 예외를 올려 화면이 "AI가 아직 연결되지 않았어요"를 보여주게 하세요.
- 서버 응답 JSON 형식이 다르면 `_chat`의 파싱 줄만 바꾸면 됩니다.

✅ 단독 실행 스크립트로 `search`를 호출해 B-1 형식의 JSON이 나오면 완료.

## B-6. 혼잡도 모델(`estimate_crowd`) 연결
- 역할: 매장 목록과 시각을 받아 `level`(`low|medium|high|very_high`)과 `estimated_people`을 반환.
- **권장 구조: 미리 계산해 둔 표를 조회**합니다(요청마다 모델을 돌리지 않음).
  1. 센터 PC 안에서 카드 이용·교통량·날씨 데이터로 `읍면동 × 요일 × 시간대` 혼잡 지수 표를 만들어 둡니다(**반출 불가 데이터 원본은 센터 밖으로 가져가지 않기**, 표는 집계값만).
  2. 매장 → 읍면동 매핑(B-2-2의 `eupmyeondong`)으로 표를 조회합니다.
  3. 지수를 인원수로 바꾸는 기준(예: 매장 규모별 최대 인원)과 4단계 임계값(예: 0.25/0.5/0.75)을 정해 문서화합니다.
- 반환 형식: `{ "level": "high", "estimated_people": 180, "as_of": "시각", "source": "model" }`
- 개발 중에는 Mock 값을 그대로 둬도 서비스는 동작합니다.

✅ 매장 몇 곳에 대해 시간대를 바꿔 호출했을 때 값이 합리적으로 변하면 완료.

## B-7. 연결 스위치 켜기 (`.env`)
```
AI_BACKEND=local
AI_ENDPOINT=http://127.0.0.1:포트          # 원격이면 해당 주소
AI_API_KEY=                                 # 원격 서버가 키를 요구할 때만
AI_MODEL_NAME=내_모델_이름
AI_HEALTH_PATH=/health
AI_TIMEOUT_S=60                             # 느린 GPU면 늘리기
AI_RETRIES=1
```
백엔드를 재시작하고 확인합니다.
```bash
curl http://127.0.0.1:8000/api/health
```
✅ `"ai_backend":"local"`, `"ai_reachable":true`가 나오면 완료. `false`면 모델 서버 주소·실행 여부·키를 확인하세요.

## B-8. 검증 (이 단계를 건너뛰지 마세요)
**① 대표 질문 20개를 파일로 만들어 두고** 돌려 봅니다. 예:
- 가격 질문 12개(지역 포함 4, 포함 안 함 4, 온라인 지정 2, 가까운 곳 2)
- 모호/무관 질문 4개(`안녕`, `날씨 알려줘` …) → `needs_clarification`이어야 함
- 이상 입력 4개(빈 칸 직전 길이, 특수문자, 200자 근처, 영어)

**② 체크표**
| 항목 | 기준 |
|---|---|
| JSON 형식 오류율 | 20개 중 0~1개 이하(재시도 포함 후) |
| 답변문 | 조회 결과에 없는 가격·매장명이 없어야 함(눈으로 전수 확인) |
| 응답 시간 | 평균·최대 측정(센터 GPU 기준으로도 측정) → `AI_TIMEOUT_S` 설정 근거 |
| 모델 서버 중단 | 서버를 끄고 검색 → 화면에 "AI가 아직 연결되지 않았어요", 앱은 살아 있어야 함 |
| 되묻기 | 모호한 질문에서 결과를 억지로 만들지 않음 |

**③ 화면에서 end-to-end**: 랜딩 입력 → 지도·가격표 전환 → 정렬·필터 → 길안내까지 한 번 통과.

## B-9. 센터 PC로 옮길 때
1. 센터 PC에서 **모델과 서버를 로컬로 실행**할 수 있는지(GPU GTX 1060, VRAM 한계)를 확인합니다. 7~8B급 모델이면 4비트 양자화 등 경량화가 필요하고, 응답이 느릴 수 있으니 `AI_TIMEOUT_S`를 조정하세요.
2. 모델 파일·가격 DB를 센터에 **반입하는 방법**과 허용 여부를 문의합니다.
3. `AI_ENDPOINT`를 `http://127.0.0.1:포트`로 되돌립니다(다른 PC 의존 제거).
4. 센터에서 센터 데이터(반출 불가)로 만든 혼잡도 표를 사용합니다. 원본·학습 데이터가 센터 밖으로 나가지 않았는지 점검하세요.
5. 파트 A의 A-11을 함께 수행합니다.
6. 처음부터 끝까지 한 번 더 B-8을 돌립니다.

## B-10. 제출 문서에 기록할 것
- `docs/AI_DISCLOSURE.md`: 사용한 **베이스 모델과 라이선스**, 학습 방식·데이터, AI 코딩 도구 사용 범위, 외부 API(네이버 Maps), 외부 코드·오픈소스
- `docs/DATA_USAGE.md`: 사용 데이터명·출처·이용조건, 전처리·분석 흐름(센터 데이터 사용 내역 포함), 가격·매장 데이터 출처
- `README.md`: 설치·실행, 환경변수, 외부 서비스 의존성과 한계(실시간 교통 반영 여부, 가격 데이터 기준 시각 등)
- 모든 문서에 **키·비밀번호·개인정보를 넣지 않았는지** 최종 확인

---

# 부록. 막혔을 때 보내 주면 좋은 정보
| 상황 | 알려 주세요 |
|---|---|
| 지도가 안 뜬다 | 브라우저 콘솔 오류 문구, Network의 `maps.js` 상태 코드, 접속 주소(포트 포함), `.env.local`의 `VITE_NAVER_MAP_KEY_PARAM` 값(키 값 자체는 가리고) |
| 경로선이 직선이다 | `/api/route` 응답의 `provider`, 백엔드 로그의 경고 문구 |
| 모델이 JSON을 못 낸다 | 모델 이름·서버 방식(Ollama 등), 실제로 받은 응답 원문(질문 내용이 민감하면 가공) |
| 연결이 안 된다 | `/api/health` 응답(키 값 제외), 모델 서버 `curl` 결과 |
