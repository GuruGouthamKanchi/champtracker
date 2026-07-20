import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Path to google-credentials.json or the raw JSON content
    GOOGLE_CREDENTIALS_FILE: Optional[str] = "secrets/google-credentials.json"
    GOOGLE_CREDENTIALS_JSON: Optional[str] = None

    # Google Sheets IDs for each spreadsheet
    DRIVERS_SPREADSHEET_ID: Optional[str] = None
    CHAMPIONSHIPS_SPREADSHEET_ID: Optional[str] = None
    REGISTRATIONS_SPREADSHEET_ID: Optional[str] = None
    GROUPS_SPREADSHEET_ID: Optional[str] = None
    MATCHES_SPREADSHEET_ID: Optional[str] = None
    STANDINGS_SPREADSHEET_ID: Optional[str] = None
    PODIUMS_SPREADSHEET_ID: Optional[str] = None

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
