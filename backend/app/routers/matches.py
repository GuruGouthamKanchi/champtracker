import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel, Field

from app.models.match import Match
from app.repositories import (
    MatchesRepository, StandingsRepository, 
    TracksRepository, GroupsRepository
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matches", tags=["Matches"])

# Dependency Providers
def get_matches_repo(): return MatchesRepository()
def get_standings_repo(): return StandingsRepository()
def get_tracks_repo(): return TracksRepository()
def get_groups_repo(): return GroupsRepository()

class MatchResultPayload(BaseModel):
    race_time_a: str = Field(..., description="Race completion time for Driver A (MM:SS.mmm)")
    race_time_b: str = Field(..., description="Race completion time for Driver B (MM:SS.mmm)")
    race_fastest_lap_a: str = Field(..., description="Race fastest lap for Driver A (MM:SS.mmm)")
    race_fastest_lap_b: str = Field(..., description="Race fastest lap for Driver B (MM:SS.mmm)")

def parse_time_to_seconds(time_str: str) -> float:
    """Helper to convert MM:SS.mmm time strings to float seconds"""
    if not time_str or ":" not in time_str:
        raise ValueError(f"Invalid time format '{time_str}'. Must be MM:SS.mmm")
    try:
        parts = time_str.split(":")
        minutes = int(parts[0])
        sec_parts = parts[1].split(".")
        seconds = int(sec_parts[0])
        millis = int(sec_parts[1]) if len(sec_parts) > 1 else 0
        return minutes * 60 + seconds + millis / 1000.0
    except Exception:
        raise ValueError(f"Could not parse time string '{time_str}'")

@router.get("", response_model=List[Match])
def get_matches(repo: MatchesRepository = Depends(get_matches_repo)):
    return repo.get_all()

@router.post("", response_model=Match, status_code=status.HTTP_201_CREATED)
def create_match(m: Match, repo: MatchesRepository = Depends(get_matches_repo)):
    matches = repo.get_all()
    if any(x.match_id == m.match_id for x in matches):
        raise HTTPException(status_code=400, detail="Match ID already exists.")
    return repo.create(m)

@router.post("/{match_id}/result", response_model=Match)
@router.put("/{match_id}/result", response_model=Match)
def submit_match_result(
    match_id: str,
    payload: MatchResultPayload,
    repo: MatchesRepository = Depends(get_matches_repo),
    standings_repo: StandingsRepository = Depends(get_standings_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo)
):
    """Processes raw match telemetry times, computes winners and points server-side, and triggers standings & track record refreshes"""
    # 1. Fetch scheduled match
    matches = repo.get_all()
    match_obj = next((m for m in matches if m.match_id == match_id), None)
    if not match_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match '{match_id}' not found."
        )
        
    if match_obj.status == "played":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Match '{match_id}' has already been played."
        )

    # 2. Parse times to float seconds for math
    try:
        t_a = parse_time_to_seconds(payload.race_time_a)
        t_b = parse_time_to_seconds(payload.race_time_b)
        
        # Verify fastest lap formats parse correctly
        parse_time_to_seconds(payload.race_fastest_lap_a)
        parse_time_to_seconds(payload.race_fastest_lap_b)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 3. Calculate gaps and total times
    combined_gap_seconds = abs(t_a - t_b)
    combined_gap_str = f"{combined_gap_seconds:.3f}"

    # 4. Allocate points and winner ID based on tiebreak logic
    winner_id = None
    points_a = 0
    points_b = 0
    
    if t_a < t_b:
        winner_id = match_obj.driver_a_id
        points_a = 3
        points_b = 0
    elif t_b < t_a:
        winner_id = match_obj.driver_b_id
        points_a = 0
        points_b = 3
    else:
        # Genuine Draw
        winner_id = None
        points_a = 1
        points_b = 1

    # 5. Populate and save Match details
    match_obj.race_time_a = payload.race_time_a
    match_obj.race_time_b = payload.race_time_b
    match_obj.race_fastest_lap_a = payload.race_fastest_lap_a
    match_obj.race_fastest_lap_b = payload.race_fastest_lap_b
    match_obj.combined_gap = combined_gap_str
    match_obj.winner_id = winner_id
    match_obj.points_a = points_a
    match_obj.points_b = points_b
    match_obj.status = "played"
    match_obj.played_at = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    try:
        updated_match = repo.update_result(match_id, match_obj)
        
        # 6. Pull latest listings to trigger recalculations
        latest_matches = repo.get_all()
        groups = groups_repo.get_all()
        
        # Recalculate Standings sheet for the affected group
        standings_repo.recompute_and_save(match_obj.championship_id, groups, latest_matches)
        
        # Recalculate TrackRecords sheet
        tracks_repo.recompute_and_save(latest_matches)
        
        return updated_match
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
