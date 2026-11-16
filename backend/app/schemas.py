from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class LatLng(BaseModel):
    lat: float
    lng: float


class PriceInfo(BaseModel):
    amount: int
    unit_label: str
    checked_at: str


class OfflinePlace(BaseModel):
    address: str
    lat: float
    lng: float


class OnlinePlace(BaseModel):
    site_name: str
    deeplink_url: str


class CrowdInfo(BaseModel):
    level: Literal["low", "medium", "high", "very_high"]
    estimated_people: int
    as_of: str
    source: Literal["model", "mock"]


class RoadMetric(BaseModel):
    distance_m: int
    duration_s: int
    source: Literal["osrm", "naver", "estimate"]


class PlaceResult(BaseModel):
    id: str
    type: Literal["offline", "online"]
    rank: int
    name: str
    price: Optional[PriceInfo] = None
    offline: Optional[OfflinePlace] = None
    online: Optional[OnlinePlace] = None
    road: Optional[RoadMetric] = None
    crowd: Optional[CrowdInfo] = None


class SearchRequest(BaseModel):
    query: str
    user_location: Optional[LatLng] = None
    client_time: Optional[str] = None

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("검색어를 입력해 주세요.")
        if len(stripped) > 200:
            raise ValueError("검색어는 최대 200자까지 가능합니다.")
        return stripped


class SearchResponse(BaseModel):
    request_id: str
    query: str
    generated_at: str
    results: List[PlaceResult]


class GeocodeRequest(BaseModel):
    address: str

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("주소를 입력해 주세요.")
        return stripped


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    label: str
    provider: str


class RouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    mode: str = "driving"


class RouteResponse(BaseModel):
    distance_m: int
    duration_s: int
    geometry: List[List[float]]  # [[lat, lng], ...]
    provider: Literal["estimate", "osrm", "naver"]


class MetricDestination(LatLng):
    id: str


class MetricsRequest(BaseModel):
    origin: LatLng
    destinations: List[MetricDestination] = Field(max_length=30)


class MetricResult(RoadMetric):
    id: str


class MetricsResponse(BaseModel):
    metrics: List[MetricResult]


class LoginRequest(BaseModel):
    id: str = Field(min_length=4, max_length=20, pattern=r"^[a-zA-Z0-9]+$")
    password: str = Field(min_length=8, max_length=128)


class SignupRequest(LoginRequest):
    password_confirm: str = Field(alias="passwordConfirm", min_length=8, max_length=128)
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_password_confirmation(self):
        if self.password != self.password_confirm:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        return self


class AuthResponse(BaseModel):
    id: str


class TransitStep(BaseModel):
    mode: Literal["walk", "bus"]
    label: str
    duration_s: int


class TransitOption(BaseModel):
    total_duration_s: int
    transfers: int
    steps: List[TransitStep]


class TransitRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    depart_at: Optional[str] = None


class TransitResponse(BaseModel):
    options: List[TransitOption]
    provider: str = "mock"


class HealthResponse(BaseModel):
    status: str = "ok"
    ai_backend: str
    geocoder: str
    router: str
