from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import RatingCreate, RatingResponse

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def submit_rating(
    body: RatingCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    mn = supabase.table("movie_nights").select("status").eq("id", body.movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    if mn.data["status"] not in ("completed", "archived"):
        raise HTTPException(status_code=400, detail="Ratings open after the movie night is marked complete")

    # Upsert — allow updating rating
    row = {
        "movie_night_id": body.movie_night_id,
        "user_id": current_user["id"],
        "rating": body.rating,
        "review": body.review,
    }
    result = supabase.table("post_watch_ratings").upsert(row, on_conflict="movie_night_id,user_id").execute()
    return result.data[0]


@router.get("/{movie_night_id}")
def get_ratings(
    movie_night_id: str,
    _: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Returns aggregate rating + all individual reviews (anonymized)."""
    mn = supabase.table("movie_nights").select("status").eq("id", movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    if mn.data["status"] not in ("completed", "archived"):
        raise HTTPException(status_code=400, detail="Ratings not yet available")

    ratings = (
        supabase.table("post_watch_ratings")
        .select("rating, review")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    data = ratings.data or []
    if not data:
        return {"average": None, "count": 0, "reviews": []}

    avg = sum(r["rating"] for r in data) / len(data)
    reviews = [{"rating": r["rating"], "review": r["review"]} for r in data if r.get("review")]

    return {"average": round(avg, 1), "count": len(data), "reviews": reviews}


@router.get("/my/{movie_night_id}")
def get_my_rating(
    movie_night_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("post_watch_ratings")
        .select("rating, review")
        .eq("movie_night_id", movie_night_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        return {"rating": None, "review": None}
    return result.data[0]
