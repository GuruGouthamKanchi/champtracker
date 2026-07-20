from typing import List, Dict, Any
from app.models.championship import Standing, Group
from app.models.match import Match
from app.sheets.client import db, STANDINGS
from app.sheets.cache import sheets_cache

class StandingsRepository:
    def get_all(self) -> List[Standing]:
        records = sheets_cache.get_records(STANDINGS, "standings")
        standings = []
        for r in records:
            try:
                standings.append(Standing(
                    championship_id=str(r.get("championship_id", "")),
                    group_id=str(r.get("group_id", "")),
                    driver_id=str(r.get("driver_id", "")),
                    matches_played=int(r.get("matches_played", 0)),
                    wins=int(r.get("wins", 0)),
                    losses=int(r.get("losses", 0)),
                    points=int(r.get("points", 0)),
                    time_gap_margin=str(r.get("time_gap_margin", "0.000")),
                    rank=int(r.get("rank", 0))
                ))
            except Exception:
                continue
        return standings

    def recompute_and_save(self, championship_id: str, groups: List[Group], matches: List[Match]) -> List[Standing]:
        """Calculates group standings, average gap margins, and ranks, then writes to Standings Spreadsheet and patches cache"""
        # Filter for current championship
        champ_groups = [g for g in groups if g.championship_id == championship_id]
        champ_matches = [
            m for m in matches 
            if m.championship_id == championship_id 
            and m.status.lower() == "played" 
            and m.stage.lower() == "group"
        ]
        
        # Map group_id -> driver_id -> Standing statistics
        standings_map: Dict[tuple, Standing] = {}
        driver_gaps: Dict[str, List[float]] = {}
        
        for cg in champ_groups:
            standings_map[(cg.group_id, cg.driver_id)] = Standing(
                championship_id=championship_id,
                group_id=cg.group_id,
                driver_id=cg.driver_id,
                matches_played=0,
                wins=0,
                losses=0,
                points=0,
                time_gap_margin="0.000",
                rank=0
            )
            driver_gaps[cg.driver_id] = []
            
        # Process matches
        for m in champ_matches:
            d_a = m.driver_a_id
            d_b = m.driver_b_id
            g_id = m.group_id or "G1"
            winner = m.winner_id
            
            key_a = (g_id, d_a)
            key_b = (g_id, d_b)
            
            # Increment matches played
            if key_a in standings_map:
                standings_map[key_a].matches_played += 1
            if key_b in standings_map:
                standings_map[key_b].matches_played += 1
                
            # Parse combined gap
            try:
                gap_val = float(m.combined_gap) if m.combined_gap else 0.0
            except ValueError:
                gap_val = 0.0
                
            # Points allocation & Wins/Losses
            if m.points_a is not None and m.points_b is not None:
                if key_a in standings_map: standings_map[key_a].points += m.points_a
                if key_b in standings_map: standings_map[key_b].points += m.points_b
                
                if winner == d_a:
                    if key_a in standings_map: standings_map[key_a].wins += 1
                    if key_b in standings_map: standings_map[key_b].losses += 1
                    if d_a in driver_gaps: driver_gaps[d_a].append(gap_val)
                    if d_b in driver_gaps: driver_gaps[d_b].append(-gap_val)
                elif winner == d_b:
                    if key_b in standings_map: standings_map[key_b].wins += 1
                    if key_a in standings_map: standings_map[key_a].losses += 1
                    if d_b in driver_gaps: driver_gaps[d_b].append(gap_val)
                    if d_a in driver_gaps: driver_gaps[d_a].append(-gap_val)
                else:
                    # Draw
                    if d_a in driver_gaps: driver_gaps[d_a].append(0.0)
                    if d_b in driver_gaps: driver_gaps[d_b].append(0.0)
            else:
                # Fallback to standard wins/losses/points rules
                if winner == d_a:
                    if key_a in standings_map:
                        standings_map[key_a].wins += 1
                        standings_map[key_a].points += 3
                    if key_b in standings_map:
                        standings_map[key_b].losses += 1
                    if d_a in driver_gaps: driver_gaps[d_a].append(gap_val)
                    if d_b in driver_gaps: driver_gaps[d_b].append(-gap_val)
                elif winner == d_b:
                    if key_b in standings_map:
                        standings_map[key_b].wins += 1
                        standings_map[key_b].points += 3
                    if key_a in standings_map:
                        standings_map[key_a].losses += 1
                    if d_b in driver_gaps: driver_gaps[d_b].append(gap_val)
                    if d_a in driver_gaps: driver_gaps[d_a].append(-gap_val)
                else:
                    if key_a in standings_map: standings_map[key_a].points += 1
                    if key_b in standings_map: standings_map[key_b].points += 1
                    if d_a in driver_gaps: driver_gaps[d_a].append(0.0)
                    if d_b in driver_gaps: driver_gaps[d_b].append(0.0)
                    
        # Compute average time gap margin
        for (g_id, d_id), standing in standings_map.items():
            gaps = driver_gaps.get(d_id, [])
            if gaps:
                avg_gap = sum(gaps) / len(gaps)
                if avg_gap > 0.0:
                    standing.time_gap_margin = f"+{avg_gap:.3f}"
                elif avg_gap < 0.0:
                    standing.time_gap_margin = f"{avg_gap:.3f}"
                else:
                    standing.time_gap_margin = "0.000"
            else:
                standing.time_gap_margin = "0.000"
                    
        # Group driver standings to sort and assign ranks
        grouped_standings: Dict[str, List[Standing]] = {}
        for (g_id, d_id), standing in standings_map.items():
            if g_id not in grouped_standings:
                grouped_standings[g_id] = []
            grouped_standings[g_id].append(standing)
            
        # Sort and rank within each group
        final_standings: List[Standing] = []
        for g_id, g_standings in grouped_standings.items():
            # Sort by: points (desc), wins (desc), driver_id
            g_standings.sort(key=lambda s: (-s.points, -s.wins, s.driver_id))
            for idx, s in enumerate(g_standings):
                s.rank = idx + 1
                final_standings.append(s)
                
        # Load all standings from sheet, filter out this championship, and merge
        all_records = sheets_cache.get_records(STANDINGS, "standings")
        other_records = [r for r in all_records if str(r.get("championship_id")) != championship_id]
        
        # Convert final_standings to dict rows
        new_rows = []
        for s in final_standings:
            new_rows.append({
                "championship_id": s.championship_id,
                "group_id": s.group_id,
                "driver_id": s.driver_id,
                "matches_played": s.matches_played,
                "wins": s.wins,
                "losses": s.losses,
                "points": s.points,
                "time_gap_margin": s.time_gap_margin,
                "rank": s.rank
            })
            
        merged_records = other_records + new_rows
        
        # Write to Google Sheets
        db.update_records(STANDINGS, "standings", merged_records)
        
        # Patch Cache immediately
        sheets_cache.patch_cache(STANDINGS, "standings", merged_records)
        
        return final_standings
