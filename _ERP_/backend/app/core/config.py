from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    MEDIA_DIR: str = "media"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # OLLAMA_MODEL: str = "minimax-m2.7:cloud"
    OLLAMA_MODEL: str = "gemma4:e2b"
    BACKEND_CORS_ORIGINS: str = "*"


    class Config:
        env_file = ".env"


settings = Settings()
