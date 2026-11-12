from app.config import settings
from app.ai.base import AIAgent
from app.ai.mock_agent import MockAgent
from app.ai.local_model_agent import LocalModelAgent

_mock_instance = None
_local_instance = None


def get_ai_agent() -> AIAgent:
    global _mock_instance, _local_instance
    backend_type = settings.AI_BACKEND.lower().strip()
    if backend_type == "local":
        if _local_instance is None:
            _local_instance = LocalModelAgent()
        return _local_instance
    else:
        if _mock_instance is None:
            _mock_instance = MockAgent()
        return _mock_instance
