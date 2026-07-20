from typing import List
from app.models.match import Match
from app.sheets.client import db, MATCHES
from app.sheets.cache import sheets_cache

class MatchesRepository:
    def get_all(self) -> List[Match]:
        records = sheets_cache.get_records(MATCHES, "matches")
        matches = []
        for r in records:
            try:
                # Helper to convert to integer safely
                p_a = r.get("points_a")
                p_b = r.get("points_b")
                points_a = int(p_a) if p_a is not None and str(p_a).strip() != "" else None
                points_b = int(p_b) if p_b is not None and str(p_b).strip() != "" else None
                
                matches.append(Match(
                    match_id=str(r.get("match_id", "")),
                    championship_id=str(r.get("championship_id", "")),
                    stage=str(r.get("stage", "group")),
                    group_id=str(r.get("group_id", "")) if r.get("group_id") else None,
                    round=int(r.get("round", 1)),
                    track_id=str(r.get("track_id", "")),
                    driver_a_id=str(r.get("driver_a_id", "")),
                    driver_b_id=str(r.get("driver_b_id", "")),
                    race_time_a=str(r.get("race_time_a", "")) if r.get("race_time_a") else None,
                    race_time_b=str(r.get("race_time_b", "")) if r.get("race_time_b") else None,
                    race_fastest_lap_a=str(r.get("race_fastest_lap_a", "")) if r.get("race_fastest_lap_a") else None,
                    race_fastest_lap_b=str(r.get("race_fastest_lap_b", "")) if r.get("race_fastest_lap_b") else None,
                    combined_gap=str(r.get("combined_gap", "")) if r.get("combined_gap") else None,
                    winner_id=str(r.get("winner_id", "")) if r.get("winner_id") else None,
                    points_a=points_a,
                    points_b=points_b,
                    status=str(r.get("status", "")).strip() if str(r.get("status", "")).strip() in ["scheduled", "played"] else "scheduled",
                    played_at=str(r.get("played_at", "")) if r.get("played_at") else None
                ))
            except Exception:
                continue
        return matches

    def create(self, m: Match) -> Match:
        row = {
            "match_id": m.match_id,
            "championship_id": m.championship_id,
            "stage": m.stage,
            "group_id": m.group_id or "",
            "round": m.round,
            "track_id": m.track_id,
            "driver_a_id": m.driver_a_id,
            "driver_b_id": m.driver_b_id,
            "race_time_a": m.race_time_a or "",
            "race_time_b": m.race_time_b or "",
            "race_fastest_lap_a": m.race_fastest_lap_a or "",
            "race_fastest_lap_b": m.race_fastest_lap_b or "",
            "combined_gap": m.combined_gap or "",
            "winner_id": m.winner_id or "",
            "points_a": m.points_a if m.points_a is not None else "",
            "points_b": m.points_b if m.points_b is not None else "",
            "status": m.status,
            "played_at": m.played_at or ""
        }
        db.append_row(MATCHES, "matches", row)
        
        # Patch Cache
        try:
            cached = sheets_cache.get_records(MATCHES, "matches")
            cached.append(row)
            sheets_cache.patch_cache(MATCHES, "matches", cached)
        except Exception:
            sheets_cache.clear(MATCHES, "matches")
            
        return m

    def create_batch(self, matches: List[Match]) -> List[Match]:
        """Appends all matches in a single batch operation, minimizing gspread API hits"""
        if not matches:
            return []
            
        cached = sheets_cache.get_records(MATCHES, "matches")
        
        new_rows = []
        for m in matches:
            new_rows.append({
                "match_id": m.match_id,
                "championship_id": m.championship_id,
                "stage": m.stage,
                "group_id": m.group_id or "",
                "round": m.round,
                "track_id": m.track_id,
                "driver_a_id": m.driver_a_id,
                "driver_b_id": m.driver_b_id,
                "race_time_a": m.race_time_a or "",
                "race_time_b": m.race_time_b or "",
                "race_fastest_lap_a": m.race_fastest_lap_a or "",
                "race_fastest_lap_b": m.race_fastest_lap_b or "",
                "combined_gap": m.combined_gap or "",
                "winner_id": m.winner_id or "",
                "points_a": m.points_a if m.points_a is not None else "",
                "points_b": m.points_b if m.points_b is not None else "",
                "status": m.status,
                "played_at": m.played_at or ""
            })
            
        merged = cached + new_rows
        db.update_records(MATCHES, "matches", merged)
        sheets_cache.patch_cache(MATCHES, "matches", merged)
        return matches

    def update_result(self, match_id: str, result: Match) -> Match:
        # Load from cache (which falls back to sheets if expired/missing)
        records = sheets_cache.get_records(MATCHES, "matches")
        match_found = False
        
        for r in records:
            if str(r.get("match_id")) == match_id:
                r["race_time_a"] = result.race_time_a or ""
                r["race_time_b"] = result.race_time_b or ""
                r["race_fastest_lap_a"] = result.race_fastest_lap_a or ""
                r["race_fastest_lap_b"] = result.race_fastest_lap_b or ""
                r["combined_gap"] = result.combined_gap or ""
                r["winner_id"] = result.winner_id or ""
                r["points_a"] = result.points_a if result.points_a is not None else ""
                r["points_b"] = result.points_b if result.points_b is not None else ""
                r["status"] = "played"
                r["played_at"] = result.played_at or ""
                match_found = True
                break
                
        if not match_found:
            raise ValueError(f"Match '{match_id}' not found.")
            
        # Write to Google Sheets
        db.update_records(MATCHES, "matches", records)
        
        # Patch Cache immediately
        sheets_cache.patch_cache(MATCHES, "matches", records)
        return result
