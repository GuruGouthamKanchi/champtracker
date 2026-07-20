from typing import List
from app.models.championship import Group
from app.sheets.client import db, GROUPS
from app.sheets.cache import sheets_cache

class GroupsRepository:
    def get_all(self) -> List[Group]:
        records = sheets_cache.get_records(GROUPS, "groups")
        groups = []
        for r in records:
            try:
                groups.append(Group(
                    championship_id=str(r.get("championship_id", "")),
                    group_id=str(r.get("group_id", "")),
                    group_name=str(r.get("group_name", "")),
                    driver_id=str(r.get("driver_id", ""))
                ))
            except Exception:
                continue
        return groups

    def create(self, group: Group) -> Group:
        row = {
            "championship_id": group.championship_id,
            "group_id": group.group_id,
            "group_name": group.group_name,
            "driver_id": group.driver_id
        }
        db.append_row(GROUPS, "groups", row)
        
        # Patch Cache
        try:
            cached = sheets_cache.get_records(GROUPS, "groups")
            cached.append(row)
            sheets_cache.patch_cache(GROUPS, "groups", cached)
        except Exception:
            sheets_cache.clear(GROUPS, "groups")
            
        return group

    def create_batch(self, groups: List[Group]) -> List[Group]:
        """Writes all group assignments in a single spreadsheet batch update, patching cache immediately"""
        if not groups:
            return []
            
        # 1. Fetch current cached records
        cached = sheets_cache.get_records(GROUPS, "groups")
        
        # 2. Format new rows
        new_rows = []
        for g in groups:
            new_rows.append({
                "championship_id": g.championship_id,
                "group_id": g.group_id,
                "group_name": g.group_name,
                "driver_id": g.driver_id
            })
            
        merged = cached + new_rows
        
        # 3. Perform batch update in database
        db.update_records(GROUPS, "groups", merged)
        
        # 4. Patch cache
        sheets_cache.patch_cache(GROUPS, "groups", merged)
        
        return groups
