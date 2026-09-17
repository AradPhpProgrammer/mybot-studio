"""Explicit operator action: apply supplied default to all registered bots."""
import asyncio
import json
from pathlib import Path
from io import BytesIO
import aiosqlite
from fastapi import UploadFile
from aiogram import Bot
from app.config import settings
from app.api.bots import upload_bot_avatar
from app.telegram.bot_manager import bot_manager

async def main():
    report_path = Path(__file__).parent / 'data' / 'default-avatar-results.json'
    image = Path(__file__).parent / 'uploads' / 'default-bot.png'
    async with aiosqlite.connect(settings.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        # Consistent backup before modifying any existing settings.
        backup = Path(settings.DATABASE_PATH).with_name('before-default-avatar.sqlite')
        if not backup.exists():
            async with aiosqlite.connect(backup) as dest:
                await db.backup(dest)
        rows = await (await db.execute('SELECT id,username,token,settings FROM bots ORDER BY id')).fetchall()
        results = []
        for row in rows:
            result = {'id':row['id'], 'username':row['username']}
            try:
                uploaded = await upload_bot_avatar(row['id'], UploadFile(filename='default.png', file=BytesIO(image.read_bytes())), db)
                result.update(uploaded)
                cfg = json.loads(row['settings'] or '{}')
                session = bot_manager.get_api_session(cfg.get('cf_worker_url'),cfg.get('custom_proxy'))
                bot = Bot(row['token'], session=session)
                try:
                    photos = await bot.get_user_profile_photos(user_id=bot.id, limit=1, request_timeout=25)
                    result['verified_photo_count'] = photos.total_count
                    result['photo_file_id'] = photos.photos[0][-1].file_id if photos.photos else None
                finally:
                    await bot.session.close()
            except Exception as exc:
                result['error_type'] = type(exc).__name__
                result['success'] = False
            results.append(result)
            report_path.write_text(json.dumps({'expected':len(rows),'results':results}, indent=2), encoding='utf8')
        assert len(results)==len(rows)
        print(json.dumps({'expected':len(rows),'results':results}, indent=2))

if __name__=='__main__':
    asyncio.run(main())
