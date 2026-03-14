from pydantic_settings import BaseSettings
from pydantic import model_validator
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
    youtube_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    sentry_dsn: str = ""
    rate_limit: str = "10/minute"
    debug: bool = False  # When True, 500 responses include the actual error

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def fix_database_url(self):
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
