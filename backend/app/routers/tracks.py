from fastapi import APIRouter, Depends
from typing import List
from app.models.track import Track, TrackRecord
from app.repositories.tracks_repo import TracksRepository

router = APIRouter(tags=["Tracks"])

def get_tracks_repo():
    return TracksRepository()

@router.get("/tracks", response_model=List[Track])
def get_tracks(repo: TracksRepository = Depends(get_tracks_repo)):
    return repo.get_all()

@router.get("/track-records", response_model=List[TrackRecord])
def get_track_records(repo: TracksRepository = Depends(get_tracks_repo)):
    return repo.get_records()
