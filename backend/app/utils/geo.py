import math
from app.schemas import LatLng


def haversine(p1: LatLng, p2: LatLng) -> float:
    """두 좌표 사이의 직선거리(m)를 반환합니다."""
    earth_radius_m = 6371000.0
    lat1_rad = math.radians(p1.lat)
    lat2_rad = math.radians(p2.lat)
    d_lat = math.radians(p2.lat - p1.lat)
    d_lng = math.radians(p2.lng - p1.lng)

    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lng / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c
