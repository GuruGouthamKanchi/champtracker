from typing import List
from app.models.championship import Podium
from app.sheets.client import db, PODIUMS
from app.sheets.cache import sheets_cache

class PodiumsRepository:
    def get_all(self) -> List[Podium]:
        records = sheets_cache.get_records(PODIUMS, "podiums")
        podiums = []
        for r in records:
            try:
                podiums.append(Podium(
                    championship_id=str(r.get("championship_id", "")),
                    gold_driver_id=str(r.get("gold_driver_id", "")),
                    silver_driver_id=str(r.get("silver_driver_id", "")),
                    bronze_driver_id=str(r.get("bronze_driver_id", "")),
                    completed_at=str(r.get("completed_at", ""))
                ))
            except Exception:
                continue
        return podiums

    def create(self, pod: Podium) -> Podium:
        row = {
            "championship_id": pod.championship_id,
            "gold_driver_id": pod.gold_driver_id,
            "silver_driver_id": pod.silver_driver_id,
            "bronze_driver_id": pod.bronze_driver_id,
            "completed_at": pod.completed_at
        }
        db.append_row(PODIUMS, "podiums", row)
        
        # Patch Cache
        try:
            cached = sheets_cache.get_records(PODIUMS, "podiums")
            cached.append(row)
            sheets_cache.patch_cache(PODIUMS, "podiums", cached)
        except Exception:
            sheets_cache.clear(PODIUMS, "podiums")
            
        return pod
