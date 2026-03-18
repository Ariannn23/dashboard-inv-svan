from dotenv import load_dotenv
import os
from typing import List

load_dotenv()

class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost:5432/svan_db"
    )

    CORS_ORIGINS: List[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]

    def __init__(self):
        if not self.SECRET_KEY or len(self.SECRET_KEY.strip()) < 32:
            raise RuntimeError("❌ SECRET_KEY es obligatoria y debe tener al menos 32 caracteres en .env")


settings = Settings()
print("✅ Settings cargados correctamente")
print(f"   ENVIRONMENT: {settings.ENVIRONMENT}")
print(f"   DATABASE_URL: {settings.DATABASE_URL[:60]}...")