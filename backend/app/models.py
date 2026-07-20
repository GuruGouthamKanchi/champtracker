from pydantic import BaseModel, Field
from typing import Optional, List

class Driver(BaseModel):
    driver_id: str
    name: str
    avatar_color: str = Field("#D72638", description="Hex color representing the driver")
    first_registered: str
    total_championships_won: int = 0
    career_race_wins: int = 0

class Championship(BaseModel):
    championship_id: str
    name: str
    status: str = Field("open", description="open, drawn, in_progress, closed")
    ideal_group_size: int = 4
    min_players_for_groups: int = 4
    advance_per_group: int = 2
    created_at: str
    closed_at: Optional[str] = None

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
