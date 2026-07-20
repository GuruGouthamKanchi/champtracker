import random
import time
import logging
import itertools
import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

from app.models.championship import Championship, Registration, Group, Standing, Podium
from app.models.match import Match
from app.models.track import Track
from app.repositories import (
    ChampionshipsRepository, RegistrationsRepository, 
    GroupsRepository, StandingsRepository, PodiumsRepository,
    DriversRepository, MatchesRepository, TracksRepository
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Championships"])

# Dependency Providers
def get_champs_repo(): return ChampionshipsRepository()
def get_regs_repo(): return RegistrationsRepository()
def get_groups_repo(): return GroupsRepository()
def get_standings_repo(): return StandingsRepository()
def get_podiums_repo(): return PodiumsRepository()
def get_drivers_repo(): return DriversRepository()
def get_matches_repo(): return MatchesRepository()
def get_tracks_repo(): return TracksRepository()

@router.get("/championships", response_model=List[Championship])
def get_championships(repo: ChampionshipsRepository = Depends(get_champs_repo)):
    return repo.get_all()

@router.post("/championships", response_model=Championship, status_code=status.HTTP_201_CREATED)
def create_championship(champ: Championship, repo: ChampionshipsRepository = Depends(get_champs_repo)):
    champs = repo.get_all()
    if any(c.championship_id == champ.championship_id for c in champs):
        raise HTTPException(status_code=400, detail="Championship ID already exists.")
    return repo.create(champ)

@router.get("/registrations", response_model=List[Registration])
def get_registrations(repo: RegistrationsRepository = Depends(get_regs_repo)):
    return repo.get_all()

@router.post("/registrations", response_model=Registration, status_code=status.HTTP_201_CREATED)
def create_registration(
    reg: Registration, 
    repo: RegistrationsRepository = Depends(get_regs_repo),
    drivers_repo: DriversRepository = Depends(get_drivers_repo),
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo)
):
    drivers = drivers_repo.get_all()
    championships = champs_repo.get_all()
    
    if not any(d.driver_id == reg.driver_id for d in drivers):
        raise HTTPException(status_code=404, detail="Driver not found.")
    if not any(c.championship_id == reg.championship_id for c in championships):
        raise HTTPException(status_code=404, detail="Championship not found.")
        
    regs = repo.get_all()
    if any(r.championship_id == reg.championship_id and r.driver_id == reg.driver_id for r in regs):
        raise HTTPException(status_code=400, detail="Driver is already registered for this tournament.")
        
    return repo.create(reg)

@router.get("/groups", response_model=List[Group])
def get_groups(repo: GroupsRepository = Depends(get_groups_repo)):
    return repo.get_all()

@router.post("/groups", response_model=Group, status_code=status.HTTP_201_CREATED)
def create_group(
    group: Group, 
    repo: GroupsRepository = Depends(get_groups_repo),
    drivers_repo: DriversRepository = Depends(get_drivers_repo),
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo)
):
    drivers = drivers_repo.get_all()
    championships = champs_repo.get_all()
    
    if not any(d.driver_id == group.driver_id for d in drivers):
        raise HTTPException(status_code=404, detail="Driver not found.")
    if not any(c.championship_id == group.championship_id for c in championships):
        raise HTTPException(status_code=404, detail="Championship not found.")
        
    return repo.create(group)

@router.get("/standings", response_model=List[Standing])
def get_standings(repo: StandingsRepository = Depends(get_standings_repo)):
    return repo.get_all()

@router.get("/podiums", response_model=List[Podium])
def get_podiums(repo: PodiumsRepository = Depends(get_podiums_repo)):
    return repo.get_all()

@router.post("/podiums", response_model=Podium, status_code=status.HTTP_201_CREATED)
def create_podium(pod: Podium, repo: PodiumsRepository = Depends(get_podiums_repo)):
    return repo.create(pod)

# ----------------- DRAW GROUPS ENDPOINT -----------------

@router.post("/championships/{championship_id}/draw", response_model=List[Group])
def draw_championship_groups(
    championship_id: str,
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo),
    regs_repo: RegistrationsRepository = Depends(get_regs_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo)
):
    """Shuffles registered drivers and draws tournament group assignments (Fisher-Yates round-robin)"""
    # 1. Fetch Championship Configuration
    champs = champs_repo.get_all()
    champ = next((c for c in champs if c.championship_id == championship_id), None)
    if not champ:
        raise HTTPException(status_code=404, detail=f"Championship '{championship_id}' not found.")
        
    # 2. Fetch all Registrations for this championship
    all_regs = regs_repo.get_all()
    champ_regs = [r for r in all_regs if r.championship_id == championship_id]
    N = len(champ_regs)
    if N == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot draw groups. No registered drivers found for championship '{championship_id}'."
        )

    # 3. Fisher-Yates Shuffle registered drivers
    drivers_list = [r.driver_id for r in champ_regs]
    seed = random.SystemRandom().randint(0, 10000000)
    random.seed(seed)
    
    # Audit log
    timestamp = str(time.time())
    logger.info(f"FY SHUFFLE: Shuffling {N} drivers for championship '{championship_id}' using Seed: {seed} at Timestamp: {timestamp}")
    
    # Perform shuffle
    for i in range(N - 1, 0, -1):
        j = random.randint(0, i)
        drivers_list[i], drivers_list[j] = drivers_list[j], drivers_list[i]

    assignments = []
    tournament_format = "standard"

    # 4. Edge Case: If N < min_players_for_groups, put everyone in a single group
    if N < champ.min_players_for_groups:
        logger.info(f"Tournament '{championship_id}' has {N} drivers (minimum required for groups: {champ.min_players_for_groups}). Skipping group stages, formatting to skip semifinals.")
        tournament_format = "skip_semifinals"
        
        for driver_id in drivers_list:
            assignments.append(Group(
                championship_id=championship_id,
                group_id="G1",
                group_name="Group A",
                driver_id=driver_id
            ))
    # 5. Standard round-robin distribution
    else:
        # Compute number of groups based on config
        num_groups = max(1, round(N / champ.ideal_group_size))
        logger.info(f"Distributing {N} drivers into {num_groups} groups round-robin (ideal size: {champ.ideal_group_size})")
        
        for idx, driver_id in enumerate(drivers_list):
            group_idx = idx % num_groups
            group_id = f"G{group_idx + 1}"
            group_name = f"Group {chr(65 + group_idx)}"
            
            assignments.append(Group(
                championship_id=championship_id,
                group_id=group_id,
                group_name=group_name,
                driver_id=driver_id
            ))

    # 6. Save Group Assignments in batch
    groups_repo.create_batch(assignments)
    
    # 7. Update Championship status to 'drawn' and record the format
    champs_repo.update_status_and_format(championship_id, status="drawn", tournament_format=tournament_format)
    
    return assignments

# ----------------- SCHEDULING SERVICES -----------------

def pick_track(stage: str, tracks: List[Track]) -> Track:
    """Randomly selects a track from the preseeded database based on difficulty rules per stage"""
    if stage in ("semifinal", "final", "bronze"):
        eligible_tracks = [t for t in tracks if t.difficulty in ("hard", "extreme")]
        if not eligible_tracks:
            eligible_tracks = tracks
    else:
        eligible_tracks = tracks
        
    return random.choice(eligible_tracks)

def generate_group_schedule(championship_id: str, groups: List[Group], tracks: List[Track]) -> List[Match]:
    """Generates round-robin unique driver pairings for each group and assigns tracks"""
    # Group driver IDs by group_id
    drivers_by_group: dict[str, List[str]] = {}
    for g in groups:
        if g.group_id not in drivers_by_group:
            drivers_by_group[g.group_id] = []
        drivers_by_group[g.group_id].append(g.driver_id)
        
    matches: List[Match] = []
    
    # Process each group
    for group_id, drivers in drivers_by_group.items():
        # Generate unique round-robin pairings
        pairings = list(itertools.combinations(drivers, 2))
        
        for pair in pairings:
            track = pick_track("group", tracks)
            match_id = f"m-{str(uuid.uuid4())[:8]}"
            matches.append(Match(
                match_id=match_id,
                championship_id=championship_id,
                stage="group",
                group_id=group_id,
                round=1, # Default round-robin round
                track_id=track.track_id,
                driver_a_id=pair[0],
                driver_b_id=pair[1],
                status="scheduled"
            ))
            
    return matches

@router.post("/championships/{championship_id}/schedule", response_model=List[Match])
def schedule_championship_matches(
    championship_id: str,
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo)
):
    """Generates the full group-stage round-robin match schedule and sets championship status to in_progress"""
    # 1. Fetch and validate Championship
    champs = champs_repo.get_all()
    champ = next((c for c in champs if c.championship_id == championship_id), None)
    if not champ:
        raise HTTPException(status_code=404, detail=f"Championship '{championship_id}' not found.")
        
    if champ.status != "drawn":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Championship must be in 'drawn' status to schedule matches. Current status: '{champ.status}'."
        )
        
    # 2. Fetch Group assignments
    all_groups = groups_repo.get_all()
    champ_groups = [g for g in all_groups if g.championship_id == championship_id]
    if not champ_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No group assignments found for championship '{championship_id}'. Run draw first."
        )
        
    # 3. Fetch preseeded tracks list
    tracks = tracks_repo.get_all()
    if not tracks:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Preseeded tracks list is empty. Run init_sheets.py to seed."
        )
        
    # 4. Generate schedule
    scheduled_matches = generate_group_schedule(championship_id, champ_groups, tracks)
    
    # 5. Persist schedule in batch
    matches_repo.create_batch(scheduled_matches)
    
    # 6. Transition Championship status to 'in_progress'
    champs_repo.update_status_and_format(championship_id, status="in_progress", tournament_format=champ.format)
    
    return scheduled_matches

# ----------------- PROGRESSION BRACKETS & PODIUMS -----------------

def compute_seed_scores(championship_id: str, standings: List[Standing], groups: List[Group]) -> List[tuple[str, float]]:
    """Calculates Buchholz-style seeding scores for all drivers based on group rank, strength, and average margins"""
    # Filter standings for this championship
    champ_standings = [s for s in standings if s.championship_id == championship_id]
    
    # Group standings by group_id
    standings_by_group: dict[str, List[Standing]] = {}
    for s in champ_standings:
        if s.group_id not in standings_by_group:
            standings_by_group[s.group_id] = []
        standings_by_group[s.group_id].append(s)
        
    seeds: List[tuple[str, float]] = []
    
    for group_id, g_standings in standings_by_group.items():
        total_group_points = sum(s.points for s in g_standings)
        
        for s in g_standings:
            # Rank weight: Rank 1 gets 900, Rank 2 gets 800, etc.
            group_rank_weight = (10 - s.rank) * 100
            
            # Strength of Group: Sum of points of everyone else in the group
            strength_of_group = total_group_points - s.points
            
            # Parse average time gap margin (strip signs)
            try:
                avg_time_gap = float(s.time_gap_margin.replace("+", "").strip())
            except ValueError:
                avg_time_gap = 0.0
                
            seed_score = group_rank_weight + strength_of_group + avg_time_gap
            seeds.append((s.driver_id, seed_score))
            
    # Sort seeds descending by score
    seeds.sort(key=lambda x: x[1], reverse=True)
    return seeds

@router.post("/championships/{championship_id}/semifinal", response_model=List[Match])
def generate_semifinal_bracket(
    championship_id: str,
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo),
    standings_repo: StandingsRepository = Depends(get_standings_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo)
):
    """Computes seed scores and snake-seeds semifinal matches (avoiding group rematches if alternatives exist)"""
    # 1. Fetch and validate Championship
    champs = champs_repo.get_all()
    champ = next((c for c in champs if c.championship_id == championship_id), None)
    if not champ:
        raise HTTPException(status_code=404, detail=f"Championship '{championship_id}' not found.")
        
    if champ.format == "skip_semifinals":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This championship is formatted to skip semifinals. Please schedule the finals directly via /finals."
        )

    # 2. Check if all group stage matches are complete
    matches = matches_repo.get_all()
    group_matches = [m for m in matches if m.championship_id == championship_id and m.stage == "group"]
    if not group_matches:
        raise HTTPException(status_code=400, detail="No group matches found for this championship.")
        
    if any(m.status == "scheduled" for m in group_matches):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate semifinal bracket. Some group-stage matches are still scheduled."
        )

    # 3. Check if semifinals are already generated
    semifinal_matches = [m for m in matches if m.championship_id == championship_id and m.stage == "semifinal"]
    if semifinal_matches:
        return semifinal_matches

    # 4. Compute Seedings
    standings = standings_repo.get_all()
    groups = groups_repo.get_all()
    seeds = [s[0] for s in compute_seed_scores(championship_id, standings, groups)]
    
    # Calculate advancing seeds N (must be power of 2)
    unique_groups = set(g.group_id for g in groups if g.championship_id == championship_id)
    num_groups = len(unique_groups)
    advancing_count = champ.advance_per_group * num_groups
    
    if advancing_count < 2:
        N = 2
    else:
        # Round down to nearest power of 2
        N = 2 ** int(math.log2(advancing_count))
        
    top_seeds = seeds[:N]
    if len(top_seeds) < N:
         raise HTTPException(status_code=400, detail="Insufficient drivers to populate semifinal brackets.")
         
    # 5. Snake pairing: (i) vs (N - i - 1)
    pairings = []
    for i in range(N // 2):
        pairings.append([top_seeds[i], top_seeds[N - i - 1]])
        
    # Rematch avoidance check
    group_match_pairs = set()
    for gm in group_matches:
        group_match_pairs.add(frozenset([gm.driver_a_id, gm.driver_b_id]))
        
    for i in range(len(pairings)):
        p = pairings[i]
        if frozenset([p[0], p[1]]) in group_match_pairs:
            # Attempt swap
            for j in range(len(pairings)):
                if i == j: continue
                p2 = pairings[j]
                if (frozenset([p[0], p2[1]]) not in group_match_pairs) and (frozenset([p2[0], p[1]]) not in group_match_pairs):
                    # Swap opponents
                    p[1], p2[1] = p2[1], p[1]
                    logger.info(f"FY SWAP: Swapped opponents between pairing {i} and {j} to avoid group rematch")
                    break

    # 6. Generate Match structures
    tracks = tracks_repo.get_all()
    semis_matches = []
    
    for idx, pair in enumerate(pairings):
        track = pick_track("semifinal", tracks)
        semis_matches.append(Match(
            match_id=f"m-{str(uuid.uuid4())[:8]}",
            championship_id=championship_id,
            stage="semifinal",
            group_id="",
            round=2, # Round 2 represents semifinals
            track_id=track.track_id,
            driver_a_id=pair[0],
            driver_b_id=pair[1],
            status="scheduled"
        ))
        
    matches_repo.create_batch(semis_matches)
    return semis_matches

@router.post("/championships/{championship_id}/finals", response_model=List[Match])
def generate_final_and_bronze(
    championship_id: str,
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo),
    standings_repo: StandingsRepository = Depends(get_standings_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo)
):
    """Schedules the final and bronze matches once the preceding stage completes"""
    # 1. Fetch and validate Championship
    champs = champs_repo.get_all()
    champ = next((c for c in champs if c.championship_id == championship_id), None)
    if not champ:
        raise HTTPException(status_code=404, detail=f"Championship '{championship_id}' not found.")
        
    matches = matches_repo.get_all()
    tracks = tracks_repo.get_all()
    
    # 2. Check if already generated
    existing_finals = [m for m in matches if m.championship_id == championship_id and m.stage in ("final", "bronze")]
    if existing_finals:
        return existing_finals

    final_matches = []
    
    # 3. Skip Semifinals logic
    if champ.format == "skip_semifinals":
        # Group matches must be finished
        group_matches = [m for m in matches if m.championship_id == championship_id and m.stage == "group"]
        if any(m.status == "scheduled" for m in group_matches):
            raise HTTPException(status_code=400, detail="Cannot schedule finals. Group matches are not complete.")
            
        # Select top 2 seeds from standings
        standings = standings_repo.get_all()
        groups = groups_repo.get_all()
        seeds = compute_seed_scores(championship_id, standings, groups)
        if len(seeds) < 2:
            raise HTTPException(status_code=400, detail="Insufficient group stage standings to generate finals.")
            
        final_track = pick_track("final", tracks)
        final_matches.append(Match(
            match_id=f"m-{str(uuid.uuid4())[:8]}",
            championship_id=championship_id,
            stage="final",
            group_id="",
            round=2, # Straight to finals
            track_id=final_track.track_id,
            driver_a_id=seeds[0][0],
            driver_b_id=seeds[1][0],
            status="scheduled"
        ))
    else:
        # Standard Semifinal Bracket progression
        semis = [m for m in matches if m.championship_id == championship_id and m.stage == "semifinal"]
        if not semis:
            raise HTTPException(status_code=400, detail="Semifinal bracket must be generated first.")
            
        if any(m.status == "scheduled" for m in semis):
            raise HTTPException(status_code=400, detail="Cannot schedule finals. Semifinal matches are not complete.")
            
        # Identify Winners and Losers from Semifinals
        winners = []
        losers = []
        for m in semis:
            winner = m.winner_id
            loser = m.driver_b_id if winner == m.driver_a_id else m.driver_a_id
            winners.append(winner)
            losers.append(loser)
            
        if len(winners) < 2:
             raise HTTPException(status_code=400, detail="Semifinal matches are missing clear winners.")
             
        # Create Final Match
        final_track = pick_track("final", tracks)
        final_matches.append(Match(
            match_id=f"m-{str(uuid.uuid4())[:8]}",
            championship_id=championship_id,
            stage="final",
            group_id="",
            round=3,
            track_id=final_track.track_id,
            driver_a_id=winners[0],
            driver_b_id=winners[1],
            status="scheduled"
        ))
        
        # Create Bronze Match
        bronze_track = pick_track("semifinal", tracks)
        final_matches.append(Match(
            match_id=f"m-{str(uuid.uuid4())[:8]}",
            championship_id=championship_id,
            stage="bronze",
            group_id="",
            round=3,
            track_id=bronze_track.track_id,
            driver_a_id=losers[0],
            driver_b_id=losers[1],
            status="scheduled"
        ))

    matches_repo.create_batch(final_matches)
    return final_matches

@router.post("/championships/{championship_id}/podium", response_model=Podium)
def declare_podium(
    championship_id: str,
    champs_repo: ChampionshipsRepository = Depends(get_champs_repo),
    matches_repo: MatchesRepository = Depends(get_matches_repo),
    standings_repo: StandingsRepository = Depends(get_standings_repo),
    groups_repo: GroupsRepository = Depends(get_groups_repo),
    podiums_repo: PodiumsRepository = Depends(get_podiums_repo),
    drivers_repo: DriversRepository = Depends(get_drivers_repo),
    tracks_repo: TracksRepository = Depends(get_tracks_repo)
):
    """Declares tournament winners, closes championship, and updates driver statistics"""
    # 1. Fetch and validate Championship
    champs = champs_repo.get_all()
    champ = next((c for c in champs if c.championship_id == championship_id), None)
    if not champ:
        raise HTTPException(status_code=404, detail=f"Championship '{championship_id}' not found.")
        
    if champ.status == "closed":
        # Return existing podium
        podiums = podiums_repo.get_all()
        existing = next((p for p in podiums if p.championship_id == championship_id), None)
        if existing:
            return existing
        raise HTTPException(status_code=400, detail="Championship is already closed but no podium details exist.")

    # 2. Verify Final and Bronze matches are completed
    matches = matches_repo.get_all()
    final_match = next((m for m in matches if m.championship_id == championship_id and m.stage == "final"), None)
    if not final_match or final_match.status != "played":
        raise HTTPException(status_code=400, detail="Final match must be played to close the championship.")

    gold_driver = final_match.winner_id
    silver_driver = final_match.driver_b_id if gold_driver == final_match.driver_a_id else final_match.driver_a_id
    bronze_driver = "N/A"

    if champ.format == "skip_semifinals":
        # Fetch 3rd place from standings
        standings = standings_repo.get_all()
        groups = groups_repo.get_all()
        seeds = compute_seed_scores(championship_id, standings, groups)
        if len(seeds) >= 3:
            bronze_driver = seeds[2][0]
    else:
        # Standard: Winner of Bronze Match
        bronze_match = next((m for m in matches if m.championship_id == championship_id and m.stage == "bronze"), None)
        if not bronze_match or bronze_match.status != "played":
            raise HTTPException(status_code=400, detail="Bronze match must be played to close standard format championships.")
        bronze_driver = bronze_match.winner_id

    if not gold_driver or gold_driver == "None" or gold_driver == "":
        raise HTTPException(status_code=400, detail="Gold podium finish requires a clear final winner.")

    # 3. Create Podium
    pod = Podium(
        championship_id=championship_id,
        gold_driver_id=gold_driver,
        silver_driver_id=silver_driver,
        bronze_driver_id=bronze_driver,
        completed_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )
    podiums_repo.create(pod)

    # 4. Close Championship
    champs_repo.update_status_and_format(championship_id, status="closed", tournament_format=champ.format)

    # 5. Increment gold driver's championships wins count
    drivers_repo.increment_championship_win(gold_driver)
    
    # 6. Recompute track records to update final's track record cache
    tracks_repo.recompute_and_save(matches)

    return pod
