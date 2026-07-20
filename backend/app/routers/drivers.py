from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.driver import Driver
from app.repositories import (
    DriversRepository, RegistrationsRepository, 
    PodiumsRepository, MatchesRepository, TracksRepository
)

router = APIRouter(prefix="/drivers", tags=["Drivers"])

# Dependency Providers
def get_drivers_repo(): return DriversRepository()
def get_regs_repo(): return RegistrationsRepository()
def get_podiums_repo(): return PodiumsRepository()
def get_matches_repo(): return MatchesRepository()
def get_tracks_repo(): return TracksRepository()

# Response Models
class DriverProfile(BaseModel):
    driver_id: str
    name: str
    avatar_color: str
    championships_entered: int
    championships_won: int
    total_race_wins: int
    total_matches_played: int
    win_percentage: float
    average_time_gap_margin: str
    best_track_id: Optional[str] = None
    best_track_name: Optional[str] = None
    best_track_wins: int = 0
    fastest_recorded_lap: Optional[str] = None
    fastest_lap_track_name: Optional[str] = None

class HeadToHead(BaseModel):
    matches_played: int
    wins_a: int
    wins_b: int
    draws: int
    average_signed_gap_a_vs_b: str

class DriverComparison(BaseModel):
    profile_a: DriverProfile
    profile_b: DriverProfile
    head_to_head: HeadToHead

# Helper function
def parse_time_to_seconds(time_str: str) -> float:
    """Helper to convert MM:SS.mmm time strings to float seconds"""
    if not time_str or ":" not in time_str:
        return float('inf')
    try:
        parts = time_str.split(":")
        minutes = int(parts[0])
        sec_parts = parts[1].split(".")
        seconds = int(sec_parts[0])
        millis = int(sec_parts[1]) if len(sec_parts) > 1 else 0
        return minutes * 60 + seconds + millis / 1000.0
    except Exception:
        return float('inf')

def aggregate_driver_profile(
    driver: Driver,
    regs_repo: RegistrationsRepository,
    podiums_repo: PodiumsRepository,
    matches_repo: MatchesRepository,
    tracks_repo: TracksRepository
) -> DriverProfile:
    """Aggregates and computes career analytics for a target driver"""
    driver_id = driver.driver_id
    target_id = str(driver_id).strip().lower()
    
    # 1. Championships Entered
    regs = regs_repo.get_all()
    matches = matches_repo.get_all()
    
    entered_champs = set(str(r.championship_id).strip() for r in regs if str(r.driver_id).strip().lower() == target_id)
    for m in matches:
        if str(m.driver_a_id).strip().lower() == target_id or str(m.driver_b_id).strip().lower() == target_id:
            if m.championship_id:
                entered_champs.add(str(m.championship_id).strip())
                
    championships_entered = len(entered_champs)
    
    # 2. Championships Won
    podiums = podiums_repo.get_all()
    championships_won = sum(1 for p in podiums if str(p.gold_driver_id).strip().lower() == target_id)
    
    # 3. Matches aggregation
    played_matches = [
        m for m in matches 
        if str(m.status).strip().lower() == "played" 
        and (str(m.driver_a_id).strip().lower() == target_id or str(m.driver_b_id).strip().lower() == target_id)
    ]
    
    total_matches_played = len(played_matches)
    total_race_wins = sum(1 for m in played_matches if str(m.winner_id).strip().lower() == target_id)
    
    # Win %
    win_percentage = round((total_race_wins / total_matches_played) * 100, 1) if total_matches_played > 0 else 0.0
    
    # Signed Time Gaps & Tracks Won
    signed_gaps = []
    track_wins = {}
    
    # Fastest Lap overall
    min_lap_seconds = float('inf')
    fastest_lap_str = None
    fastest_lap_track_id = None
    
    for m in played_matches:
        # Sign combined gap
        try:
            gap_val = float(m.combined_gap) if m.combined_gap else 0.0
        except ValueError:
            gap_val = 0.0
            
        if str(m.winner_id).strip().lower() == target_id:
            signed_gaps.append(gap_val)
            if m.track_id:
                track_wins[m.track_id] = track_wins.get(m.track_id, 0) + 1
        elif m.winner_id and str(m.winner_id).strip().lower() not in ["none", "", "null"]:
            # Lost
            signed_gaps.append(-gap_val)
        else:
            # Draw
            signed_gaps.append(0.0)
            
        # Check lap times
        laps = []
        if str(m.driver_a_id).strip().lower() == target_id:
            if m.race_fastest_lap_a: laps.append(m.race_fastest_lap_a)
        else:
            if m.race_fastest_lap_b: laps.append(m.race_fastest_lap_b)
            
        for lap in laps:
            sec = parse_time_to_seconds(lap)
            if sec < min_lap_seconds:
                min_lap_seconds = sec
                fastest_lap_str = lap
                fastest_lap_track_id = m.track_id

    # Average gap margin
    avg_gap = sum(signed_gaps) / len(signed_gaps) if signed_gaps else 0.0
    if avg_gap > 0.0:
        average_time_gap_margin = f"+{avg_gap:.3f}"
    elif avg_gap < 0.0:
        average_time_gap_margin = f"{avg_gap:.3f}"
    else:
        average_time_gap_margin = "0.000"
        
    # Best Track details
    best_track_id = None
    best_track_name = None
    best_track_wins = 0
    
    tracks = tracks_repo.get_all()
    if track_wins:
        best_track_id = max(track_wins, key=track_wins.get)
        best_track_wins = track_wins[best_track_id]
        track_obj = next((t for t in tracks if t.track_id == best_track_id), None)
        if track_obj:
            best_track_name = track_obj.name
            
    # Fastest lap track name
    fastest_lap_track_name = None
    if fastest_lap_track_id:
        track_obj = next((t for t in tracks if t.track_id == fastest_lap_track_id), None)
        if track_obj:
            fastest_lap_track_name = track_obj.name

    return DriverProfile(
        driver_id=driver_id,
        name=driver.name,
        avatar_color=driver.avatar_color,
        championships_entered=championships_entered,
        championships_won=championships_won,
        total_race_wins=total_race_wins,
        total_matches_played=total_matches_played,
        win_percentage=win_percentage,
        average_time_gap_margin=average_time_gap_margin,
        best_track_id=best_track_id,
        best_track_name=best_track_name,
        best_track_wins=best_track_wins,
        fastest_recorded_lap=fastest_lap_str,
        fastest_lap_track_name=fastest_lap_track_name
    )

@router.get("", response_model=List[Driver])
def get_drivers(repo: DriversRepository = Depends(get_drivers_repo)):
    return repo.get_all()

@router.post("", response_model=Driver, status_code=status.HTTP_201_CREATED)
def create_driver(driver: Driver, repo: DriversRepository = Depends(get_drivers_repo)):
    drivers = repo.get_all()
    if any(d.driver_id == driver.driver_id for d in drivers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver ID '{driver.driver_id}' already exists."
        )
    return repo.create(driver)

# Compare drivers endpoint (registered before /{driver_id} to avoid conflicts)
@router.get("/compare", response_model=DriverComparison)
def compare_drivers(
    a: str,
    b: str,
    drivers_repo: DriversRepository = Depends(get_drivers_repo),
    regs_repo: RegistrationsRepository = Depends(get_regs_repo),
    podiums_repo: PodiumsRepository = Depends(get_podiums_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo)
):
    """Generates side-by-side career stats and head-to-head matchup breakdowns for two drivers"""
    drivers = drivers_repo.get_all()
    driver_a = next((d for d in drivers if d.driver_id == a), None)
    driver_b = next((d for d in drivers if d.driver_id == b), None)
    
    if not driver_a:
        raise HTTPException(status_code=404, detail=f"Driver A '{a}' not found.")
    if not driver_b:
        raise HTTPException(status_code=404, detail=f"Driver B '{b}' not found.")
        
    profile_a = aggregate_driver_profile(driver_a, regs_repo, podiums_repo, matches_repo, tracks_repo)
    profile_b = aggregate_driver_profile(driver_b, regs_repo, podiums_repo, matches_repo, tracks_repo)
    
    # Head-to-Head calculations
    matches = matches_repo.get_all()
    h2h_matches = [
        m for m in matches 
        if m.status.lower() == "played" 
        and ((m.driver_a_id == a and m.driver_b_id == b) or (m.driver_a_id == b and m.driver_b_id == a))
    ]
    
    matches_played = len(h2h_matches)
    wins_a = sum(1 for m in h2h_matches if m.winner_id == a)
    wins_b = sum(1 for m in h2h_matches if m.winner_id == b)
    draws = sum(1 for m in h2h_matches if not m.winner_id or m.winner_id == "None" or m.winner_id == "")
    
    # Compute average signed gap from A's perspective (Tb - Ta)
    match_gaps = []
    for m in h2h_matches:
        try:
            gap = float(m.combined_gap) if m.combined_gap else 0.0
        except ValueError:
            gap = 0.0
            
        if m.winner_id == a:
            match_gaps.append(gap)
        elif m.winner_id == b:
            match_gaps.append(-gap)
        else:
            match_gaps.append(0.0)
            
    avg_h2h_gap = sum(match_gaps) / len(match_gaps) if match_gaps else 0.0
    if avg_h2h_gap > 0.0:
        h2h_gap_str = f"+{avg_h2h_gap:.3f}"
    elif avg_h2h_gap < 0.0:
        h2h_gap_str = f"{avg_h2h_gap:.3f}"
    else:
        h2h_gap_str = "0.000"
        
    return DriverComparison(
        profile_a=profile_a,
        profile_b=profile_b,
        head_to_head=HeadToHead(
            matches_played=matches_played,
            wins_a=wins_a,
            wins_b=wins_b,
            draws=draws,
            average_signed_gap_a_vs_b=h2h_gap_str
        )
    )

# Individual driver profile endpoint
@router.get("/{driver_id}", response_model=DriverProfile)
def get_driver_profile(
    driver_id: str,
    drivers_repo: DriversRepository = Depends(get_drivers_repo),
    regs_repo: RegistrationsRepository = Depends(get_regs_repo),
    podiums_repo: PodiumsRepository = Depends(get_podiums_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo)
):
    """Retrieves computed career profile statistics for a target driver"""
    drivers = drivers_repo.get_all()
    driver = next((d for d in drivers if d.driver_id == driver_id), None)
    if not driver:
         raise HTTPException(status_code=404, detail=f"Driver '{driver_id}' not found.")
         
    return aggregate_driver_profile(driver, regs_repo, podiums_repo, matches_repo, tracks_repo)
