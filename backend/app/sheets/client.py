import os
import json
import logging
from typing import List, Dict, Any, Optional
import gspread
from google.oauth2.service_account import Credentials
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants for Spreadsheet Keys
DRIVERS = "DRIVERS"
CHAMPIONSHIPS = "CHAMPIONSHIPS"
REGISTRATIONS = "REGISTRATIONS"
GROUPS = "GROUPS"
MATCHES = "MATCHES"
STANDINGS = "STANDINGS"
PODIUMS = "PODIUMS"

# Sheet structures mapping
# (Spreadsheet Key, Worksheet Name)
SHEET_MAP = {
    DRIVERS: ("drivers", ["drivers"]),
    CHAMPIONSHIPS: ("championships", ["championships", "tracks", "track_records"]),
    REGISTRATIONS: ("registrations", ["registrations"]),
    GROUPS: ("groups", ["groups"]),
    MATCHES: ("matches", ["matches"]),
    STANDINGS: ("standings", ["standings"]),
    PODIUMS: ("podiums", ["podiums"]),
}

class MultiSheetsManager:
    def __init__(self):
        self.client = None
        self.spreadsheets = {}
        self.use_local_fallback = False
        self.local_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
            "data"
        )
        self._init_client()

    def _init_client(self):
        try:
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
            
            creds = None
            if settings.GOOGLE_CREDENTIALS_JSON:
                logger.info("Initializing gspread from JSON string in environment")
                creds_dict = json.loads(settings.GOOGLE_CREDENTIALS_JSON)
                creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
            elif settings.GOOGLE_CREDENTIALS_FILE and os.path.exists(settings.GOOGLE_CREDENTIALS_FILE):
                logger.info(f"Initializing gspread from credentials file: {settings.GOOGLE_CREDENTIALS_FILE}")
                creds = Credentials.from_service_account_file(settings.GOOGLE_CREDENTIALS_FILE, scopes=scopes)
            
            if creds:
                self.client = gspread.authorize(creds)
                
                sheet_ids = {
                    DRIVERS: settings.DRIVERS_SPREADSHEET_ID,
                    CHAMPIONSHIPS: settings.CHAMPIONSHIPS_SPREADSHEET_ID,
                    REGISTRATIONS: settings.REGISTRATIONS_SPREADSHEET_ID,
                    GROUPS: settings.GROUPS_SPREADSHEET_ID,
                    MATCHES: settings.MATCHES_SPREADSHEET_ID,
                    STANDINGS: settings.STANDINGS_SPREADSHEET_ID,
                    PODIUMS: settings.PODIUMS_SPREADSHEET_ID,
                }
                
                for key, doc_id in sheet_ids.items():
                    if doc_id and doc_id != f"your_{key.lower()}_spreadsheet_id":
                        try:
                            self.spreadsheets[key] = self.client.open_by_key(doc_id)
                        except Exception as e:
                            logger.warning(f"Could not open spreadsheet ID '{doc_id}' for {key}: {e}")
                            
                if len(self.spreadsheets) < len(sheet_ids):
                    logger.warning("Not all 7 spreadsheet IDs were successfully loaded. Falling back to local JSON database.")
                    self.use_local_fallback = True
                    self._init_local_db()
            else:
                logger.warning("Credentials not configured. Falling back to local JSON database.")
                self.use_local_fallback = True
                self._init_local_db()

        except Exception as e:
            logger.warning(f"Failed to connect to Google Sheets: {e}. Falling back to local JSON database.")
            self.use_local_fallback = True
            self._init_local_db()

    def _init_local_db(self):
        os.makedirs(self.local_dir, exist_ok=True)
        for key, (filename, worksheets) in SHEET_MAP.items():
            filepath = os.path.join(self.local_dir, f"{filename}.json")
            if not os.path.exists(filepath):
                default_data = {ws: [] for ws in worksheets}
                
                if key == DRIVERS:
                    default_data["drivers"] = [
                        {"driver_id": "max_v", "name": "Max Verstappen", "avatar_color": "#1E41FF", "first_registered": "2026-01-01", "total_championships_won": 3, "career_race_wins": 54},
                        {"driver_id": "lewis_h", "name": "Lewis Hamilton", "avatar_color": "#E80020", "first_registered": "2026-01-02", "total_championships_won": 7, "career_race_wins": 103},
                        {"driver_id": "lando_n", "name": "Lando Norris", "avatar_color": "#FF8000", "first_registered": "2026-01-03", "total_championships_won": 0, "career_race_wins": 12},
                        {"driver_id": "charles_l", "name": "Charles Leclerc", "avatar_color": "#F60000", "first_registered": "2026-01-04", "total_championships_won": 0, "career_race_wins": 8}
                    ]
                elif key == CHAMPIONSHIPS:
                    default_data["championships"] = [
                        {"championship_id": "c1", "name": "MonoPosto Pro Season 1", "status": "in_progress", "ideal_group_size": 4, "min_players_for_groups": 4, "advance_per_group": 2, "created_at": "2026-07-01", "closed_at": "", "format": "standard"}
                    ]
                    default_data["tracks"] = self._get_seeded_tracks()
                    default_data["track_records"] = [
                        {
                            "track_id": "1",
                            "record_time_value": "01:21.046",
                            "record_time_driver_id": "max_v",
                            "fastest_lap_value": "01:19.402",
                            "fastest_lap_driver_id": "max_v",
                            "most_wins_driver_id": "max_v",
                            "most_wins_count": 1,
                            "undefeated_driver_id": "max_v",
                            "track_champion_driver_id": "max_v",
                            "track_champion_count": 3
                        }
                    ]
                elif key == REGISTRATIONS:
                    default_data["registrations"] = [
                        {"championship_id": "c1", "driver_id": "max_v", "team_name_for_gp": "Red Bull Racing", "registered_at": "2026-07-01T12:00:00Z"},
                        {"championship_id": "c1", "driver_id": "lewis_h", "team_name_for_gp": "Ferrari", "registered_at": "2026-07-01T12:05:00Z"},
                        {"championship_id": "c1", "driver_id": "lando_n", "team_name_for_gp": "McLaren", "registered_at": "2026-07-01T12:10:00Z"},
                        {"championship_id": "c1", "driver_id": "charles_l", "team_name_for_gp": "Ferrari", "registered_at": "2026-07-01T12:15:00Z"}
                    ]
                elif key == GROUPS:
                    default_data["groups"] = [
                        {"championship_id": "c1", "group_id": "G1", "group_name": "Group A", "driver_id": "max_v"},
                        {"championship_id": "c1", "group_id": "G1", "group_name": "Group A", "driver_id": "lewis_h"},
                        {"championship_id": "c1", "group_id": "G1", "group_name": "Group A", "driver_id": "lando_n"},
                        {"championship_id": "c1", "group_id": "G1", "group_name": "Group A", "driver_id": "charles_l"}
                    ]
                elif key == MATCHES:
                    default_data["matches"] = [
                        {
                            "match_id": "m1",
                            "championship_id": "c1",
                            "stage": "group",
                            "group_id": "G1",
                            "round": 1,
                            "track_id": "1",
                            "driver_a_id": "max_v",
                            "driver_b_id": "lewis_h",
                            "race_time_a": "01:21.046",
                            "race_time_b": "01:21.846",
                            "race_fastest_lap_a": "01:19.402",
                            "race_fastest_lap_b": "01:20.150",
                            "combined_gap": "0.800",
                            "winner_id": "max_v",
                            "points_a": 3,
                            "points_b": 0,
                            "status": "played",
                            "played_at": "2026-07-18T12:00:00Z"
                        }
                    ]
                elif key == STANDINGS:
                    default_data["standings"] = [
                        {"championship_id": "c1", "group_id": "G1", "driver_id": "max_v", "matches_played": 1, "wins": 1, "losses": 0, "points": 3, "time_gap_margin": "1.104", "rank": 1},
                        {"championship_id": "c1", "group_id": "G1", "driver_id": "lewis_h", "matches_played": 1, "wins": 0, "losses": 1, "points": 0, "time_gap_margin": "-1.104", "rank": 2},
                        {"championship_id": "c1", "group_id": "G1", "driver_id": "lando_n", "matches_played": 0, "wins": 0, "losses": 0, "points": 0, "time_gap_margin": "0.000", "rank": 3},
                        {"championship_id": "c1", "group_id": "G1", "driver_id": "charles_l", "matches_played": 0, "wins": 0, "losses": 0, "points": 0, "time_gap_margin": "0.000", "rank": 4}
                    ]
                with open(filepath, "w") as f:
                    json.dump(default_data, f, indent=4)

    def _get_seeded_tracks(self) -> List[Dict[str, Any]]:
        tracks_raw = [
            ("1", "Desert Ring", "Bahrain", "medium"),
            ("2", "Sand Kingdom", "Saudi Arabia", "hard"),
            ("3", "Southern Isles", "Australia", "easy"),
            ("4", "Jade River", "China", "medium"),
            ("5", "Caspian City", "Azerbaijan", "hard"),
            ("6", "Daylight Park", "USA", "medium"),
            ("7", "Dark Valley", "Italy", "extreme"),
            ("8", "Royal Gardens", "Monaco", "extreme"),
            ("9", "Iberian Circuit", "Spain", "medium"),
            ("10", "Maple Land", "Canada", "hard"),
            ("11", "Summit Ring", "Australia", "easy"),
            ("12", "Oakshire", "United Kingdom", "hard"),
            ("13", "Danube Park", "Hungary", "hard"),
            ("14", "Firdite Circuit", "Belgium", "extreme"),
            ("15", "Dune Coast", "Netherlands", "hard"),
            ("16", "Green Park", "Italy", "medium"),
            ("17", "Lion City", "Singapore", "extreme"),
            ("18", "Cypress Hills", "Japan", "extreme"),
            ("19", "Sand Moon", "Qatar", "hard"),
            ("20", "Lone Star", "USA", "easy"),
            ("21", "Aztec Land", "Mexico", "medium"),
            ("22", "Emerald Hills", "Brazil", "hard"),
            ("23", "Electric District", "USA", "easy"),
            ("24", "Sunset Harbor", "United Arab Emirates", "easy"),
            ("25", "Atlantic Cliffs", "Portugal", "hard"),
            ("26", "Black Forest", "Germany", "extreme"),
            ("27", "Monsoon Park", "Malaysia", "medium"),
            ("28", "Bosphor", "Turkey", "hard"),
            ("29", "Wind Yard Circuit", "Italy", "hard"),
            ("30", "Union Park", "Europe", "easy"),
            ("31", "Royal Avenue", "Spain", "easy"),
            ("32", "Azur Plains", "France", "medium"),
            ("33", "Sunset Ridge", "Spain", "easy"),
            ("34", "Baobab Circuit", "South Africa", "medium"),
            ("35", "Heartland Circuit", "USA", "medium"),
            ("36", "Castle Ridge", "Spain", "easy")
        ]
        return [
            {
                "track_id": t[0],
                "name": t[1],
                "country": t[2],
                "real_world_inspiration": "",
                "difficulty": t[3]
            } for t in tracks_raw
        ]

    def _read_local_table(self, filename: str, worksheet_name: str) -> List[Dict[str, Any]]:
        filepath = os.path.join(self.local_dir, f"{filename}.json")
        try:
            if os.path.exists(filepath):
                with open(filepath, "r") as f:
                    data = json.load(f)
                return data.get(worksheet_name, [])
        except Exception as e:
            logger.error(f"Error reading local file {filename}.json: {e}")
        return []

    def _write_local_table(self, filename: str, worksheet_name: str, rows: List[Dict[str, Any]]):
        filepath = os.path.join(self.local_dir, f"{filename}.json")
        try:
            data = {}
            if os.path.exists(filepath):
                with open(filepath, "r") as f:
                    data = json.load(f)
            data[worksheet_name] = rows
            with open(filepath, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            logger.error(f"Error writing local file {filename}.json: {e}")

    def get_all_records(self, spreadsheet_key: str, worksheet_name: str) -> List[Dict[str, Any]]:
        filename, _ = SHEET_MAP[spreadsheet_key]
        if self.use_local_fallback or spreadsheet_key not in self.spreadsheets:
            return self._read_local_table(filename, worksheet_name)
        
        try:
            ws = self.spreadsheets[spreadsheet_key].worksheet(worksheet_name)
            return ws.get_all_records()
        except Exception as e:
            logger.error(f"Error reading from Google Sheet {spreadsheet_key}/{worksheet_name}: {e}")
            raise e

    def append_row(self, spreadsheet_key: str, worksheet_name: str, row_dict: Dict[str, Any]):
        filename, _ = SHEET_MAP[spreadsheet_key]
        if self.use_local_fallback or spreadsheet_key not in self.spreadsheets:
            rows = self._read_local_table(filename, worksheet_name)
            rows.append(row_dict)
            self._write_local_table(filename, worksheet_name, rows)
            return
        
        try:
            ws = self.spreadsheets[spreadsheet_key].worksheet(worksheet_name)
            headers = ws.row_values(1)
            row_values = []
            for header in headers:
                row_values.append(str(row_dict.get(header, "")))
            ws.append_row(row_values)
        except Exception as e:
            logger.error(f"Error appending to Google Sheet {spreadsheet_key}/{worksheet_name}: {e}")
            raise e

    def update_records(self, spreadsheet_key: str, worksheet_name: str, records: List[Dict[str, Any]]):
        filename, _ = SHEET_MAP[spreadsheet_key]
        if self.use_local_fallback or spreadsheet_key not in self.spreadsheets:
            self._write_local_table(filename, worksheet_name, records)
            return

        try:
            ws = self.spreadsheets[spreadsheet_key].worksheet(worksheet_name)
            headers = ws.row_values(1)
            data = [headers]
            for record in records:
                row = []
                for header in headers:
                    row.append(str(record.get(header, "")))
                data.append(row)
            ws.clear()
            ws.update("A1", data)
        except Exception as e:
            logger.error(f"Error updating Google Sheet {spreadsheet_key}/{worksheet_name}: {e}")
            raise e

db = MultiSheetsManager()
