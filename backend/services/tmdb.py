import httpx
from config import settings

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# Curated genre list — excludes Documentary, News, Talk, Reality TV
ALLOWED_GENRE_IDS = {28, 12, 16, 35, 80, 18, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37}


def poster_url(path: str | None) -> str | None:
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}{path}"


async def search_movies(query: str, page: int = 1, genre_id: int | None = None) -> dict:
    params = {
        "api_key": settings.tmdb_api_key,
        "query": query,
        "include_adult": False,
        "page": page,
    }
    if genre_id is not None:
        params["with_genres"] = genre_id
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{TMDB_BASE}/search/movie", params=params)
        r.raise_for_status()
        data = r.json()

    results = data.get("results", [])
    # When genre filter is active, enforce it (TMDB search can return off-genre results)
    if genre_id is not None:
        results = [m for m in results if genre_id in m.get("genre_ids", [])]
    for m in results:
        m["poster_path"] = poster_url(m.get("poster_path"))
    return {"results": results, "total_results": len(results), "page": page}


async def discover_movies(page: int = 1, genre_id: int | None = None) -> dict:
    """Browse popular movies, optionally filtered to a genre."""
    params = {
        "api_key": settings.tmdb_api_key,
        "include_adult": False,
        "sort_by": "popularity.desc",
        "vote_count.gte": 100,
        "page": page,
    }
    if genre_id is not None:
        params["with_genres"] = genre_id
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{TMDB_BASE}/discover/movie", params=params)
        r.raise_for_status()
        data = r.json()

    for m in data.get("results", []):
        m["poster_path"] = poster_url(m.get("poster_path"))
    return data


async def get_movie(tmdb_id: int) -> dict:
    params = {"api_key": settings.tmdb_api_key}
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{TMDB_BASE}/movie/{tmdb_id}", params=params)
        r.raise_for_status()
        data = r.json()
    data["poster_path"] = poster_url(data.get("poster_path"))
    return data


async def get_genres() -> list[dict]:
    params = {"api_key": settings.tmdb_api_key}
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{TMDB_BASE}/genre/movie/list", params=params)
        r.raise_for_status()
        data = r.json()
    return [g for g in data.get("genres", []) if g["id"] in ALLOWED_GENRE_IDS]
