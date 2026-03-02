from fastapi import APIRouter, Depends, Query
from dependencies import get_current_user
from services import tmdb as tmdb_service

router = APIRouter(prefix="/tmdb", tags=["tmdb"])


@router.get("/genres")
async def list_genres(_: dict = Depends(get_current_user)):
    return await tmdb_service.get_genres()


@router.get("/search")
async def search_movies(
    query: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    genre_id: int | None = Query(None),
    _: dict = Depends(get_current_user),
):
    return await tmdb_service.search_movies(query, page, genre_id)


@router.get("/discover")
async def discover_movies(
    page: int = Query(1, ge=1),
    genre_id: int | None = Query(None),
    _: dict = Depends(get_current_user),
):
    """Browse popular movies, optionally filtered to a genre."""
    return await tmdb_service.discover_movies(page, genre_id)


@router.get("/movie/{tmdb_id}")
async def get_movie(tmdb_id: int, _: dict = Depends(get_current_user)):
    return await tmdb_service.get_movie(tmdb_id)
