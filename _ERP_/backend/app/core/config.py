from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List, Union


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    MEDIA_DIR: str = "media"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # OLLAMA_MODEL: str = "minimax-m2.7:cloud"
    OLLAMA_MODEL: str = "gemma3:1b-it-qat"
    
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)


    class Config:
        env_file = ".env"


settings = Settings()
