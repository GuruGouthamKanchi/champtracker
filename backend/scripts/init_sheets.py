import os
import sys
import logging

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.sheets import (
    db, SHEET_MAP, DRIVERS, CHAMPIONSHIPS, REGISTRATIONS, 
    GROUPS, MATCHES, STANDINGS, PODIUMS
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_sheets")

def run():
    if db.use_local_fallback:
        logger.info("Using local fallback JSON database files. Running local seed of tracks...")
        # Tracks are already initialized locally on SheetsManager instantiation if files are missing.
        logger.info("Local fallback database initialized successfully in backend/data/!")
        return

    logger.info("Initializing multi-spreadsheet Google Sheets schemas...")

    # Mapping of Spreadsheet Keys -> Worksheet Name -> Headers
    schemas = {
        DRIVERS: {
            "drivers": ["driver_id", "name", "avatar_color", "first_registered", "total_championships_won", "career_race_wins"]
        },
        CHAMPIONSHIPS: {
            "championships": ["championship_id", "name", "status", "ideal_group_size", "min_players_for_groups", "advance_per_group", "created_at", "closed_at", "format"],
            "tracks": ["track_id", "name", "country", "real_world_inspiration", "difficulty"],
            "track_records": ["track_id", "record_time_value", "record_time_driver_id", "fastest_lap_value", "fastest_lap_driver_id", "most_wins_driver_id", "most_wins_count", "undefeated_driver_id", "track_champion_driver_id", "track_champion_count"]
        },
        REGISTRATIONS: {
            "registrations": ["championship_id", "driver_id", "team_name_for_gp", "registered_at"]
        },
        GROUPS: {
            "groups": ["championship_id", "group_id", "group_name", "driver_id"]
        },
        MATCHES: {
            "matches": ["match_id", "championship_id", "stage", "group_id", "round", "track_id", "driver_a_id", "driver_b_id", "race_time_a", "race_time_b", "race_fastest_lap_a", "race_fastest_lap_b", "combined_gap", "winner_id", "points_a", "points_b", "status", "played_at"]
        },
        STANDINGS: {
            "standings": ["championship_id", "group_id", "driver_id", "matches_played", "wins", "losses", "points", "time_gap_margin", "rank"]
        },
        PODIUMS: {
            "podiums": ["championship_id", "gold_driver_id", "silver_driver_id", "bronze_driver_id", "completed_at"]
        }
    }

    # Verify we have open spreadsheets for all targets
    for key, spec in schemas.items():
        if key not in db.spreadsheets:
            logger.error(f"Spreadsheet ID for target '{key}' is missing or could not be loaded. Please check your .env configuration.")
            continue
            
        spreadsheet = db.spreadsheets[key]
        logger.info(f"Setting up worksheets for spreadsheet: {spreadsheet.title} ({key})...")
        
        for ws_name, headers in spec.items():
            try:
                # Check if worksheet exists
                ws = spreadsheet.worksheet(ws_name)
                logger.info(f"  Worksheet '{ws_name}' already exists. Syncing headers...")
                # Pad headers with empty strings to clear trailing obsolete headers from old schemas
                padded_headers = headers + [""] * max(0, ws.col_count - len(headers))
                ws.update("A1", [padded_headers])
            except Exception:
                # Create it
                logger.info(f"  Worksheet '{ws_name}' does not exist. Creating...")
                ws = spreadsheet.add_worksheet(title=ws_name, rows="100", cols=str(len(headers)))
                ws.append_row(headers)
                logger.info(f"  Worksheet '{ws_name}' created successfully with headers: {headers}")

            # Special case: pre-seed tracks in the CHAMPIONSHIPS spreadsheet
            if key == CHAMPIONSHIPS and ws_name == "tracks":
                existing_tracks = ws.get_all_records()
                if len(existing_tracks) == 0:
                    logger.info("  Pre-seeding tracks worksheet...")
                    seeded_data = db._get_seeded_tracks()
                    for track in seeded_data:
                        row_vals = []
                        for header in headers:
                            row_vals.append(str(track.get(header, "")))
                        ws.append_row(row_vals)
                    logger.info(f"  Successfully seeded {len(seeded_data)} tracks!")

    logger.info("Google Sheets initialization completed successfully!")

if __name__ == "__main__":
    run()
