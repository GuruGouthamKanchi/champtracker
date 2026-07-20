from typing import List
from app.models.championship import Championship
from app.sheets.client import db, CHAMPIONSHIPS
from app.sheets.cache import sheets_cache

class ChampionshipsRepository:
    def get_all(self) -> List[Championship]:
        records = sheets_cache.get_records(CHAMPIONSHIPS, "championships")
        champs = []
        for r in records:
            try:
                champs.append(Championship(
                    championship_id=str(r.get("championship_id", "")),
                    name=str(r.get("name", "")),
                    status=str(r.get("status", "open")),
                    ideal_group_size=int(r.get("ideal_group_size", 4)),
                    min_players_for_groups=int(r.get("min_players_for_groups", 4)),
                    advance_per_group=int(r.get("advance_per_group", 2)),
                    created_at=str(r.get("created_at", "")),
                    closed_at=str(r.get("closed_at", "")) if r.get("closed_at") else None,
                    format=str(r.get("format", "standard"))
                ))
            except Exception:
                continue
        return champs

    def create(self, champ: Championship) -> Championship:
        row = {
            "championship_id": champ.championship_id,
            "name": champ.name,
            "status": champ.status,
            "ideal_group_size": champ.ideal_group_size,
            "min_players_for_groups": champ.min_players_for_groups,
            "advance_per_group": champ.advance_per_group,
            "created_at": champ.created_at,
            "closed_at": champ.closed_at or "",
            "format": champ.format
        }
        db.append_row(CHAMPIONSHIPS, "championships", row)
        
        # Patch Cache
        try:
            cached = sheets_cache.get_records(CHAMPIONSHIPS, "championships")
            cached.append(row)
            sheets_cache.patch_cache(CHAMPIONSHIPS, "championships", cached)
        except Exception:
            sheets_cache.clear(CHAMPIONSHIPS, "championships")
            
        return champ

    def update_status_and_format(self, championship_id: str, status: str, tournament_format: str) -> bool:
        records = sheets_cache.get_records(CHAMPIONSHIPS, "championships")
        found = False
        for r in records:
            if str(r.get("championship_id")) == championship_id:
                r["status"] = status
                r["format"] = tournament_format
                found = True
                break
        
        if not found:
            raise ValueError(f"Championship '{championship_id}' not found.")
            
        db.update_records(CHAMPIONSHIPS, "championships", records)
        sheets_cache.patch_cache(CHAMPIONSHIPS, "championships", records)
        return True
