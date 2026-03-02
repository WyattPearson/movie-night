import random
from services.tmdb import ALLOWED_GENRE_IDS, get_genres


async def pick_random_genre() -> dict:
    """Returns a random genre dict from the allowed curated list."""
    genres = await get_genres()
    return random.choice(genres)
