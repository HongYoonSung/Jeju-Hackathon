from abc import ABC, abstractmethod
from typing import Optional
from app.schemas import GeocodeResponse


class BaseGeocoder(ABC):
    @abstractmethod
    async def geocode(self, address: str) -> Optional[GeocodeResponse]:
        pass
