import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.models.schemas import SimulatorEventRequest, SimulatorResponse
from app.telegram.emulator import run_simulation

router = APIRouter(prefix="/api/simulator", tags=["simulator"])

@router.post("/dispatch", response_model=SimulatorResponse)
async def dispatch_simulation_event(
    req: SimulatorEventRequest,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Executes a simulated event through the DAG engine for live testing inside the floating mockup.
    """
    user_info = {
        "id": req.user_id or 99999999,
        "username": req.username or "tester",
        "first_name": req.first_name or "Tester",
        "language_code": "fa"
    }

    try:
        result = await run_simulation(
            bot_id=req.bot_id,
            event_type=req.event_type,
            payload=req.payload,
            user_info=user_info,
            db=db
        )

        alerts_list = []
        for a in result.get("alerts", []):
            if isinstance(a, dict):
                alerts_list.append(a.get("text", ""))
            else:
                alerts_list.append(str(a))

        return SimulatorResponse(
            success=result.get("success", False),
            messages=result.get("messages", []),
            alerts=alerts_list,
            chat_actions=result.get("chat_actions", []),
            user_state=result.get("user_state", {}),
            logs=[f"Executed steps: {result.get('steps_executed', [])}"]
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
