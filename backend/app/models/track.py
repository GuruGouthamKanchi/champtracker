from pydantic import BaseModel, Field
from typing import Optional

class Track(BaseModel):
    track_id: str
    name: str
    country: str
    real_world_inspiration: Optional[str] = ""
    difficulty: str = Field("medium", description="easy, medium, hard, extreme")

class TrackRecord(BaseModel):
    track_id: str
    record_time_value: Optional[str] = None
    record_time_driver_id: Optional[str] = None
    fastest_lap_value: Optional[str] = None
    fastest_lap_driver_id: Optional[str] = None
    most_wins_driver_id: Optional[str] = None
    most_wins_count: int = 0
    undefeated_driver_id: Optional[str] = None
    track_champion_driver_id: Optional[str] = None
    track_champion_count: int = 0
