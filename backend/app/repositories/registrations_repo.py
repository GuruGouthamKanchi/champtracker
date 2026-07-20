from typing import List
from app.models.championship import Registration
from app.sheets.client import db, REGISTRATIONS
from app.sheets.cache import sheets_cache

class RegistrationsRepository:
    def get_all(self) -> List[Registration]:
        records = sheets_cache.get_records(REGISTRATIONS, "registrations")
        registrations = []
        for r in records:
            try:
                registrations.append(Registration(
                    championship_id=str(r.get("championship_id", "")),
                    driver_id=str(r.get("driver_id", "")),
                    team_name_for_gp=str(r.get("team_name_for_gp", "")),
                    registered_at=str(r.get("registered_at", ""))
                ))
            except Exception:
                continue
        return registrations

    def create(self, reg: Registration) -> Registration:
        row = {
            "championship_id": reg.championship_id,
            "driver_id": reg.driver_id,
            "team_name_for_gp": reg.team_name_for_gp,
            "registered_at": reg.registered_at
        }
        db.append_row(REGISTRATIONS, "registrations", row)
        
        # Patch Cache
        try:
            cached = sheets_cache.get_records(REGISTRATIONS, "registrations")
            cached.append(row)
            sheets_cache.patch_cache(REGISTRATIONS, "registrations", cached)
        except Exception:
            sheets_cache.clear(REGISTRATIONS, "registrations")
            
        return reg
