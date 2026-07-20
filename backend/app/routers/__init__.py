from app.routers.drivers import router as drivers_router
from app.routers.championships import router as championships_router
from app.routers.matches import router as matches_router
from app.routers.tracks import router as tracks_router
from app.routers.health import router as health_router

__all__ = [
    "drivers_router",
    "championships_router",
    "matches_router",
    "tracks_router",
    "health_router"
]
