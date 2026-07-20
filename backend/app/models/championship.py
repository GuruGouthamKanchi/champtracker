from pydantic import BaseModel, Field
from typing import Optional

class Championship(BaseModel):
    championship_id: str
    name: str
    status: str = Field("open", description="open, drawn, in_progress, closed")
    ideal_group_size: int = 4
    min_players_for_groups: int = 4
    advance_per_group: int = 2
    created_at: str
    closed_at: Optional[str] = None
    format: str = "standard"

class Registration(BaseModel):
    championship_id: str
    driver_id: str
    team_name_for_gp: str
    registered_at: str

class Group(BaseModel):
    championship_id: str
    group_id: str
    group_name: str
    driver_id: str

class Standing(BaseModel):
    championship_id: str
    group_id: str
    driver_id: str
    matches_played: int = 0
    wins: int = 0
    losses: int = 0
    points: int = 0
    time_gap_margin: str = "0.000"
    rank: int = 0

class Podium(BaseModel):
    championship_id: str
    gold_driver_id: str
    silver_driver_id: str
    bronze_driver_id: str
    completed_at: str
