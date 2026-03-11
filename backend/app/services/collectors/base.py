from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class CollectedPost:
    source: str
    title: Optional[str]
    text: str
    author: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[datetime] = None


class BaseCollector(ABC):
    @abstractmethod
    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        pass
