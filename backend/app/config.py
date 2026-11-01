import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite:///./saura.db"
    SIMULATION_MODE: bool = True
    DEFAULT_TARIFF_IDR_PER_KWH: int = 1500
    DEFAULT_PR: float = 0.79
    DEFAULT_TIMEZONE: str = "Asia/Jakarta"
    REMINDER_TIME: str = "16:00"
    PHOTO_STORAGE_DIR: str = "./data/photos"
    WEB_BASE_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"
    JWT_SECRET: str = "saura-development-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""
    TELEGRAM_MODE: str = "polling"
    TELEGRAM_WEBHOOK_SECRET: str = "saura-telegram-secret"

    LLM_PROVIDER: str = "mock"
    LLM_MODEL: str = "mock-model"
    LLM_API_KEY: str = ""


settings = Settings()

# Ensure photo storage dir exists
os.makedirs(settings.PHOTO_STORAGE_DIR, exist_ok=True)
