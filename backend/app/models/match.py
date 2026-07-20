from pydantic import BaseModel, Field
from typing import Optional

class Match(BaseModel):
    match_id: str
    championship_id: str
    stage: str = Field("group", description="group, semifinal, bronze, final")
    group_id: Optional[str] = None
    round: int
    track_id: str
    driver_a_id: str
    driver_b_id: str
    race_time_a: Optional[str] = None
    race_time_b: Optional[str] = None
    race_fastest_lap_a: Optional[str] = None
    race_fastest_lap_b: Optional[str] = None
    combined_gap: Optional[str] = None
    winner_id: Optional[str] = None
    points_a: Optional[int] = None
    points_b: Optional[int] = None
    status: str = Field("scheduled", description="scheduled, played")
    played_at: Optional[str] = None
