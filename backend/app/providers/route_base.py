from abc import ABC, abstractmethod
from typing import Optional
from app.schemas import LatLng, RouteResponse


class BaseRouter(ABC):
    @abstractmethod
    async def route(
        self, origin: LatLng, destination: LatLng, mode: str = "driving"
    ) -> Optional[RouteResponse]:
        pass
