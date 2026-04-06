from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AEGIS O2O Backend"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/aegis_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672//"
    
    # LLM
    GEMINI_API_KEY: str = ""
    
    # CORS — Production: thay bằng domain thật, KHÔNG DÙNG ["*"]
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # Upload constraints
    MAX_UPLOAD_SIZE_MB: int = 10  # Giới hạn 10 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Lock TTL (giây)
    INVENTORY_LOCK_TTL: int = 900  # 15 phút

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
