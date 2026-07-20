import logging
from app.sheets.client import db, MATCHES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fix_headers")

def run():
    spreadsheet = db.spreadsheets[MATCHES]
    ws = spreadsheet.worksheet("matches")
    
    first_row = ws.row_values(1)
    logger.info(f"Current headers in matches sheet: {first_row}")
    
    # We want exactly these 18 headers
    expected = ["match_id", "championship_id", "stage", "group_id", "round", "track_id", "driver_a_id", "driver_b_id", "race_time_a", "race_time_b", "race_fastest_lap_a", "race_fastest_lap_b", "combined_gap", "winner_id", "points_a", "points_b", "status", "played_at"]
    
    if len(first_row) > len(expected):
        logger.info(f"Sheet has {len(first_row)} columns. Obsolete trailing columns present. Clearing obsolete columns...")
        # Overwrite first row completely up to the current column count
        padded = expected + [""] * (len(first_row) - len(expected))
        ws.update("A1", [padded])
        
        # Verify
        updated_row = ws.row_values(1)
        logger.info(f"Updated headers in matches sheet: {updated_row}")
    else:
        logger.info("No obsolete trailing columns found.")

if __name__ == "__main__":
    run()
