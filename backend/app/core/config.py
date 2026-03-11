from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "PainPoint AI"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/painpoint"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "PainPointAI/1.0"
    g2_api_key: str = ""
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
