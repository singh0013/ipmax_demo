from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://ipam_user:ipam_pass@db:5432/ipam"
    SECRET_KEY: str   = "change-this-in-production"
    APP_NAME: str     = "IPMAX Tool"
    VERSION: str      = "0.3.0"
    # JWT
    JWT_ALGORITHM: str       = "HS256"
    JWT_EXPIRE_MINUTES: int  = 480   # 8 hours

    class Config:
        env_file = ".env"

settings = Settings()
