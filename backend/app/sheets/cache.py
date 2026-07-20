import time
import logging
import threading
from typing import List, Dict, Any
from app.sheets.client import db

logger = logging.getLogger(__name__)

class SheetsCache:
    def __init__(self, ttl_seconds: int = 10):
        self.ttl = ttl_seconds
        self._cache: Dict[tuple, tuple] = {} # Key: (spreadsheet_key, worksheet_name) -> (data, expiry)
        self._lock = threading.Lock()

    def get_records(self, spreadsheet_key: str, worksheet_name: str) -> List[Dict[str, Any]]:
        """Read-through cache wrapper. Fetches all sheet records in one API call if expired/missing."""
        cache_key = (spreadsheet_key, worksheet_name)
        now = time.time()
        
        with self._lock:
            if cache_key in self._cache:
                data, expiry = self._cache[cache_key]
                if now < expiry:
                    logger.debug(f"Cache HIT for {spreadsheet_key}/{worksheet_name}")
                    # Return a copy to prevent mutation issues
                    return [dict(r) for r in data]
            
        # Cache MISS: fetch from Sheets (or local DB fallback)
        logger.info(f"Cache MISS for {spreadsheet_key}/{worksheet_name}. Fetching from database...")
        data = db.get_all_records(spreadsheet_key, worksheet_name)
        
        # Update cache
        with self._lock:
            self._cache[cache_key] = (data, now + self.ttl)
            
        return [dict(r) for r in data]

    def patch_cache(self, spreadsheet_key: str, worksheet_name: str, new_data: List[Dict[str, Any]]):
        """Write-patch caching. Patches cache directly immediately after successful writes."""
        cache_key = (spreadsheet_key, worksheet_name)
        now = time.time()
        with self._lock:
            self._cache[cache_key] = (new_data, now + self.ttl)
            logger.info(f"Patched cache for {spreadsheet_key}/{worksheet_name} with {len(new_data)} records")

    def clear(self, spreadsheet_key: str, worksheet_name: str):
        """Invalidate cache key"""
        cache_key = (spreadsheet_key, worksheet_name)
        with self._lock:
            self._cache.pop(cache_key, None)

# Global cache singleton
sheets_cache = SheetsCache(ttl_seconds=10)
