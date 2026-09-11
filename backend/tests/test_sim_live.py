import asyncio, aiosqlite, sys
sys.path.insert(0, 'D:/project/mybot/backend')
from app.api.simulator import dispatch_simulation_event
from app.models.schemas import SimulatorEventRequest

async def t():
    async with aiosqlite.connect('D:/project/mybot/backend/data/mybot.db') as db:
        db.row_factory = aiosqlite.Row
        for ev, pl in [('command','/start'), ('callback','btn_claim')]:
            req = SimulatorEventRequest(bot_id=1, event_type=ev, payload=pl)
            res = await dispatch_simulation_event(req, db)
            print('OK', ev, 'msgs:', len(res.messages), 'state:', res.user_state)

asyncio.run(t())