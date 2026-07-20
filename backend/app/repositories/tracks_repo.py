from typing import List, Dict, Any, Optional
from app.models.track import Track, TrackRecord
from app.models.match import Match
from app.sheets.client import db, CHAMPIONSHIPS
from app.sheets.cache import sheets_cache

class TracksRepository:
    def get_all(self) -> List[Track]:
        records = sheets_cache.get_records(CHAMPIONSHIPS, "tracks")
        tracks = []
        for r in records:
            try:
                tracks.append(Track(
                    track_id=str(r.get("track_id", "")),
                    name=str(r.get("name", "")),
                    country=str(r.get("country", "")),
                    real_world_inspiration=str(r.get("real_world_inspiration", "")),
                    difficulty=str(r.get("difficulty", "medium"))
                ))
            except Exception:
                continue
        return tracks

    def get_records(self) -> List[TrackRecord]:
        records = sheets_cache.get_records(CHAMPIONSHIPS, "track_records")
        t_records = []
        for r in records:
            try:
                t_records.append(TrackRecord(
                    track_id=str(r.get("track_id", "")),
                    record_time_value=str(r.get("record_time_value", "")) if r.get("record_time_value") else None,
                    record_time_driver_id=str(r.get("record_time_driver_id", "")) if r.get("record_time_driver_id") else None,
                    fastest_lap_value=str(r.get("fastest_lap_value", "")) if r.get("fastest_lap_value") else None,
                    fastest_lap_driver_id=str(r.get("fastest_lap_driver_id", "")) if r.get("fastest_lap_driver_id") else None,
                    most_wins_driver_id=str(r.get("most_wins_driver_id", "")) if r.get("most_wins_driver_id") else None,
                    most_wins_count=int(r.get("most_wins_count", 0)),
                    undefeated_driver_id=str(r.get("undefeated_driver_id", "")) if r.get("undefeated_driver_id") else None,
                    track_champion_driver_id=str(r.get("track_champion_driver_id", "")) if r.get("track_champion_driver_id") else None,
                    track_champion_count=int(r.get("track_champion_count", 0))
                ))
            except Exception:
                continue
        return t_records

    def recompute_and_save(self, matches: List[Match]) -> List[TrackRecord]:
        """Runs derived analytics from the list of matches, saves cache and sheets"""
        tracks = self.get_all()
        played_matches = [m for m in matches if m.status.lower() == "played"]
        
        # Build mapping of track_id -> record dicts
        records_by_track: Dict[str, Dict[str, Any]] = {}
        for track in tracks:
            t_id = track.track_id
            records_by_track[t_id] = {
                "track_id": t_id,
                "record_time_value": "",
                "record_time_driver_id": "",
                "fastest_lap_value": "",
                "fastest_lap_driver_id": "",
                "most_wins_driver_id": "",
                "most_wins_count": 0,
                "undefeated_driver_id": "",
                "track_champion_driver_id": "",
                "track_champion_count": 0
            }
            
        # Group played matches by track
        matches_by_track: Dict[str, List[Match]] = {}
        for m in played_matches:
            t_id = m.track_id
            if t_id not in matches_by_track:
                matches_by_track[t_id] = []
            matches_by_track[t_id].append(m)
            
        # Helper to convert race times (MM:SS.mmm) to float seconds
        def time_str_to_seconds(time_str: Optional[str]) -> float:
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
                
        for t_id, track_matches in matches_by_track.items():
            if t_id not in records_by_track:
                continue
                
            best_race_seconds = float('inf')
            best_race_time_val = ""
            best_race_driver = ""
            
            best_lap_seconds = float('inf')
            best_lap_time_val = ""
            best_lap_driver = ""
            
            driver_stats: Dict[str, Dict[str, int]] = {}
            
            for m in track_matches:
                d_a = m.driver_a_id
                d_b = m.driver_b_id
                winner = m.winner_id
                
                for d in [d_a, d_b]:
                    if d not in driver_stats:
                        driver_stats[d] = {"wins": 0, "played": 0, "points": 0}
                    driver_stats[d]["played"] += 1
                
                if winner in [d_a, d_b]:
                    driver_stats[winner]["wins"] += 1
                    driver_stats[winner]["points"] += 3
                    loser = d_b if winner == d_a else d_a
                    driver_stats[loser]["points"] += 1
                else:
                    driver_stats[d_a]["points"] += 1
                    driver_stats[d_b]["points"] += 1
                
                # Check race times
                times = [
                    (m.race_time_a, d_a),
                    (m.race_time_b, d_b)
                ]
                for t_val, d_id in times:
                    if t_val:
                        sec = time_str_to_seconds(t_val)
                        if sec < best_race_seconds:
                            best_race_seconds = sec
                            best_race_time_val = t_val
                            best_race_driver = d_id
                            
                # Check lap times
                laps = [
                    (m.race_fastest_lap_a, d_a),
                    (m.race_fastest_lap_b, d_b)
                ]
                for l_val, d_id in laps:
                    if l_val:
                        sec = time_str_to_seconds(l_val)
                        if sec < best_lap_seconds:
                            best_lap_seconds = sec
                            best_lap_time_val = l_val
                            best_lap_driver = d_id
            
            most_wins_dr = ""
            most_wins_cnt = 0
            champion_dr = ""
            champion_pts = 0
            undefeated_dr = ""
            undefeated_max_played = 0
            
            for d_id, stats in driver_stats.items():
                if stats["wins"] > most_wins_cnt:
                    most_wins_cnt = stats["wins"]
                    most_wins_dr = d_id
                if stats["points"] > champion_pts:
                    champion_pts = stats["points"]
                    champion_dr = d_id
                if stats["wins"] == stats["played"] and stats["played"] > 0:
                    if stats["played"] > undefeated_max_played:
                        undefeated_max_played = stats["played"]
                        undefeated_dr = d_id
            
            records_by_track[t_id] = {
                "track_id": t_id,
                "record_time_value": best_race_time_val,
                "record_time_driver_id": best_race_driver,
                "fastest_lap_value": best_lap_time_val,
                "fastest_lap_driver_id": best_lap_driver,
                "most_wins_driver_id": most_wins_dr,
                "most_wins_count": most_wins_cnt,
                "undefeated_driver_id": undefeated_dr,
                "track_champion_driver_id": champion_dr,
                "track_champion_count": champion_pts
            }
            
        merged_list = list(records_by_track.values())
        
        # Save to sheet
        db.update_records(CHAMPIONSHIPS, "track_records", merged_list)
        # Patch Cache
        sheets_cache.patch_cache(CHAMPIONSHIPS, "track_records", merged_list)
        
        return self.get_records()
