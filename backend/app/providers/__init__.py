from app.config import settings
from app.providers.geocode_base import BaseGeocoder
from app.providers.geocode_mock import MockGeocoder
from app.providers.geocode_nominatim import NominatimGeocoder
from app.providers.geocode_naver import NaverGeocoder

from app.providers.route_base import BaseRouter
from app.providers.route_estimate import EstimateRouter
from app.providers.route_osrm import OSRMRouter
from app.providers.route_naver import NaverRouter


def get_geocoder() -> BaseGeocoder:
    gc = settings.GEOCODER.lower().strip()
    if gc == "nominatim":
        return NominatimGeocoder()
    elif gc == "naver":
        return NaverGeocoder()
    return MockGeocoder()


def get_router() -> BaseRouter:
    rt = settings.ROUTER.lower().strip()
    if rt == "osrm":
        return OSRMRouter()
    elif rt == "naver":
        return NaverRouter()
    return EstimateRouter()
