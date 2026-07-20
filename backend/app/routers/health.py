import os
from fastapi import APIRouter
from app.sheets.client import db, SHEET_MAP

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check():
    """Confirms connectivity to all 7 spreadsheets or checks local fallback database files."""
    if db.use_local_fallback:
        local_files = {}
        all_ok = True
        for key, (filename, _) in SHEET_MAP.items():
            filepath = os.path.join(db.local_dir, f"{filename}.json")
            exists = os.path.exists(filepath)
            local_files[key] = "available" if exists else "missing"
            if not exists:
                all_ok = False
                
        return {
            "status": "healthy" if all_ok else "unhealthy",
            "mode": "local_fallback",
            "connections": local_files
        }

    # Checking Google Sheets
    connections = {}
    is_healthy = True
    for key in SHEET_MAP.keys():
        if key in db.spreadsheets:
            try:
                # Trigger a quick meta API read to verify actual connectivity
                title = db.spreadsheets[key].title
                connections[key] = f"connected ({title})"
            except Exception as e:
                connections[key] = f"disconnected: {str(e)}"
                is_healthy = False
        else:
            connections[key] = "not_configured"
            is_healthy = False

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "mode": "google_sheets",
        "connections": connections
    }
