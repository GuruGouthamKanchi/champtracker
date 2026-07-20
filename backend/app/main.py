from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import gspread.exceptions

from app.config import settings
from app.routers import (
    drivers_router, championships_router, 
    matches_router, tracks_router, health_router
)

app = FastAPI(
    title="MonoPosto Esports Championship Tracker API",
    description="Refactored Clean Architecture F1-style backend with Repository & Cache layers",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Set up CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" in origins or not origins:
    allow_origins = ["*"]
else:
    allow_origins = origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global gspread exception handlers to return clean JSON errors
@app.exception_handler(gspread.exceptions.APIError)
async def gspread_api_error_handler(request: Request, exc: gspread.exceptions.APIError):
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "Google Sheets API Error",
            "message": "The backend encountered an issue communicating with Google Spreadsheets.",
            "detail": exc.response.text if hasattr(exc, "response") else str(exc)
        }
    )

@app.exception_handler(gspread.exceptions.SpreadsheetNotFound)
async def gspread_spreadsheet_not_found_handler(request: Request, exc: gspread.exceptions.SpreadsheetNotFound):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Spreadsheet Not Found",
            "message": "One of the configured Google Spreadsheet IDs was not found. Verify your ID keys in .env."
        }
    )

@app.exception_handler(gspread.exceptions.WorksheetNotFound)
async def gspread_worksheet_not_found_handler(request: Request, exc: gspread.exceptions.WorksheetNotFound):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Worksheet Not Found",
            "message": "A required worksheet tab was not found. Run scripts/init_sheets.py to reinitialize templates."
        }
    )

@app.exception_handler(gspread.exceptions.GSpreadException)
async def gspread_generic_error_handler(request: Request, exc: gspread.exceptions.GSpreadException):
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "Google Sheets Integration Error",
            "message": str(exc)
        }
    )

# Include routers
app.include_router(drivers_router, prefix="/api")
app.include_router(championships_router, prefix="/api")
app.include_router(matches_router, prefix="/api")
app.include_router(tracks_router, prefix="/api")
app.include_router(health_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "message": "MonoPosto Championship Tracker API v2 is running.",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=True
    )
