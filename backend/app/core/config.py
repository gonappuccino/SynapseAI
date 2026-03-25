from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings

# Path to the .env file at the project root
_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://synapse:synapse@localhost:5432/synapse"
    GEMINI_API_KEY: str = ""
    VERTEX_AI_PROJECT: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    model_config = {"env_file": str(_ENV_FILE)}


@lru_cache
def get_settings() -> Settings:
    return Settings()
