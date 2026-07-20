import logging
from app.sheets.client import db, MATCHES
from app.models.match import Match

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("print_matches")

def run():
    spreadsheet = db.spreadsheets[MATCHES]
    ws = spreadsheet.worksheet("matches")
    records = ws.get_all_records()
    logger.info(f"Total rows in matches worksheet: {len(records)}")
    
    for idx, r in enumerate(records):
        try:
            p_a = r.get("points_a")
            p_b = r.get("points_b")
            points_a = int(p_a) if p_a is not None and str(p_a).strip() != "" else None
            points_b = int(p_b) if p_b is not None and str(p_b).strip() != "" else None
            
            m = Match(
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
                status=str(r.get("status", "scheduled")),
                played_at=str(r.get("played_at", "")) if r.get("played_at") else None
            )
            logger.info(f"Row {idx} parsed successfully: {m}")
        except Exception as e:
            logger.error(f"Row {idx} failed to parse: {r}. Error: {e}")

if __name__ == "__main__":
    run()
