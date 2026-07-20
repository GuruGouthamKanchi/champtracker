from pydantic import BaseModel, Field

class Driver(BaseModel):
    driver_id: str
    name: str
    avatar_color: str = Field("#D72638", description="Hex color representing the driver")
    first_registered: str
    total_championships_won: int = 0
    career_race_wins: int = 0
