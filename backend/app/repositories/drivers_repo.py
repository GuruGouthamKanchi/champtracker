from typing import List
from app.models.driver import Driver
from app.sheets.client import db, DRIVERS
from app.sheets.cache import sheets_cache

class DriversRepository:
    def get_all(self) -> List[Driver]:
        records = sheets_cache.get_records(DRIVERS, "drivers")
        drivers = []
        for r in records:
            try:
                drivers.append(Driver(
                    driver_id=str(r.get("driver_id", "")),
                    name=str(r.get("name", "")),
                    avatar_color=str(r.get("avatar_color", "#D72638")),
                    first_registered=str(r.get("first_registered", "")),
                    total_championships_won=int(r.get("total_championships_won", 0)),
                    career_race_wins=int(r.get("career_race_wins", 0))
                ))
            except Exception:
                continue
        return drivers

    def create(self, driver: Driver) -> Driver:
        row = {
            "driver_id": driver.driver_id,
            "name": driver.name,
            "avatar_color": driver.avatar_color,
            "first_registered": driver.first_registered,
            "total_championships_won": driver.total_championships_won,
            "career_race_wins": driver.career_race_wins
        }
        db.append_row(DRIVERS, "drivers", row)
        
        # Patch Cache: retrieve current cached and append the new row
        try:
            cached = sheets_cache.get_records(DRIVERS, "drivers")
            cached.append(row)
            sheets_cache.patch_cache(DRIVERS, "drivers", cached)
        except Exception:
            sheets_cache.clear(DRIVERS, "drivers")
            
        return driver

    def increment_championship_win(self, driver_id: str) -> bool:
        """Increments total_championships_won for the target driver in Sheets and patches the cache"""
        records = sheets_cache.get_records(DRIVERS, "drivers")
        found = False
        for r in records:
            if str(r.get("driver_id")) == driver_id:
                try:
                    wins = int(r.get("total_championships_won", 0))
                except ValueError:
                    wins = 0
                r["total_championships_won"] = wins + 1
                found = True
                break
                
        if not found:
            raise ValueError(f"Driver '{driver_id}' not found.")
            
        db.update_records(DRIVERS, "drivers", records)
        sheets_cache.patch_cache(DRIVERS, "drivers", records)
        return True
