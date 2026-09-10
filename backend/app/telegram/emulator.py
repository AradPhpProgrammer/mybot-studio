import logging
from typing import Any, Dict, Optional

import aiosqlite
from app.engine.dag_runner import DAGRunner

logger = logging.getLogger(__name__)

class EmulatorClient:
    """Mock Telegram client for in-browser interactive testing."""
    def __init__(self):
        self.actions_log = []

    async def send_chat_action(self, chat_id: int, action: str):
        self.actions_log.append({"chat_id": chat_id, "action": action})


async def run_simulation(
    bot_id: int,
    event_type: str,
    payload: str,
    user_info: Dict[str, Any],
    db: aiosqlite.Connection
) -> Dict[str, Any]:
    """
    Executes a simulated event through the DAG engine for live testing inside the floating mockup.
    """
    mock_client = EmulatorClient()
    runner = DAGRunner(bot_id=bot_id, db=db)
    
    result = await runner.execute_flow(
        event_type=event_type,
        payload=payload,
        user_info=user_info,
        bot_client=mock_client,
        chat_id=user_info.get("id", 99999999)
    )
    
    return result
