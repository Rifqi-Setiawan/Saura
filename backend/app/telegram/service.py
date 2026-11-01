import logging
from typing import Any

from app.config import settings
from app.db.session import SessionLocal
from app.telegram.handlers import (
    handle_callback_query,
    handle_photo_upload,
    handle_start,
    handle_text_message,
)

logger = logging.getLogger(__name__)


class TelegramMockClient:
    """Mock test harness for executing Telegram conversations end-to-end."""

    def __init__(self, db_session):
        self.db = db_session
        self.sent_messages: list[dict[str, Any]] = []

    async def send_start(self, user_id: int) -> dict[str, Any]:
        res = await handle_start(telegram_user_id=user_id, db=self.db)
        self.sent_messages.append({"type": "start", "response": res})
        return res

    async def upload_photo(
        self, user_id: int, photo_bytes_or_path: bytes | str, target_date=None
    ) -> dict[str, Any]:
        res = await handle_photo_upload(
            telegram_user_id=user_id,
            image_bytes_or_path=photo_bytes_or_path,
            db=self.db,
            target_date=target_date,
        )
        self.sent_messages.append({"type": "photo", "response": res})
        return res

    async def click_button(self, user_id: int, callback_data: str) -> dict[str, Any]:
        res = await handle_callback_query(
            telegram_user_id=user_id,
            callback_data=callback_data,
            db=self.db,
        )
        self.sent_messages.append({"type": "callback", "data": callback_data, "response": res})
        return res

    async def send_text(self, user_id: int, text: str) -> dict[str, Any]:
        res = await handle_text_message(
            telegram_user_id=user_id,
            text=text,
            db=self.db,
        )
        self.sent_messages.append({"type": "text", "text": text, "response": res})
        return res


def create_telegram_app():
    """Create python-telegram-bot Application instance if token configured."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("TELEGRAM_BOT_TOKEN not configured; live bot disabled.")
        return None

    try:
        from telegram.ext import (
            Application,
            CommandHandler,
        )

        app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()

        async def tg_start(update, context):
            user_id = update.effective_user.id
            db = SessionLocal()
            try:
                res = await handle_start(user_id, db)
                await update.message.reply_text(res["text"])
            finally:
                db.close()

        app.add_handler(CommandHandler("start", tg_start))
        return app

    except Exception as e:
        logger.error(f"Failed to create telegram app: {e}")
        return None
