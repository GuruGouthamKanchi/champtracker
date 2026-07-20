import logging
from app.sheets.client import db, CHAMPIONSHIPS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("print_championships")

def run():
    spreadsheet = db.spreadsheets[CHAMPIONSHIPS]
    ws = spreadsheet.worksheet("championships")
    records = ws.get_all_records()
    logger.info(f"Total championships: {len(records)}")
    for r in records:
        logger.info(r)

if __name__ == "__main__":
    run()
