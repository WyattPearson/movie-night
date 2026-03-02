import json
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import VoteCreate, VoteResult
from services.irv import run_irv

router = APIRouter(prefix="/votes", tags=["votes"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def cast_vote(
    body: VoteCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Verify voting is open
    mn = supabase.table("movie_nights").select("status").eq("id", body.movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    if mn.data["status"] != "voting_open":
        raise HTTPException(status_code=400, detail="Voting is not currently open")

    # Validate all ranked choices are valid nominations for this movie night
    noms = (
        supabase.table("nominations")
        .select("id")
        .eq("movie_night_id", body.movie_night_id)
        .execute()
    )
    valid_ids = {n["id"] for n in (noms.data or [])}
    for choice in body.ranked_choices:
        if choice not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Invalid nomination id: {choice}")

    # One vote per user per movie night (upsert)
    existing = (
        supabase.table("votes")
        .select("id")
        .eq("movie_night_id", body.movie_night_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    row = {
        "movie_night_id": body.movie_night_id,
        "user_id": current_user["id"],
        "ranked_choices": body.ranked_choices,
    }

    if existing.data:
        supabase.table("votes").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("votes").insert(row).execute()

    return {"detail": "Vote recorded"}


@router.get("/my/{movie_night_id}")
def get_my_vote(
    movie_night_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Returns the current user's ballot (so they can see/edit their choices during voting)."""
    result = (
        supabase.table("votes")
        .select("ranked_choices")
        .eq("movie_night_id", movie_night_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        return {"ranked_choices": None}
    return {"ranked_choices": result.data[0]["ranked_choices"]}


@router.get("/results/{movie_night_id}", response_model=VoteResult)
def get_results(
    movie_night_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """IRV results — only available once the movie night is completed or archived."""
    mn = supabase.table("movie_nights").select("status").eq("id", movie_night_id).single().execute()
    if not mn.data:
        raise HTTPException(status_code=404, detail="Movie night not found")
    if mn.data["status"] not in ("voting_closed", "completed", "archived"):
        raise HTTPException(status_code=400, detail="Results are not yet available")

    # Fetch all ballots
    votes = (
        supabase.table("votes")
        .select("ranked_choices")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    ballots = [v["ranked_choices"] for v in (votes.data or [])]

    # Fetch all nominations
    noms = (
        supabase.table("nominations")
        .select("id, tmdb_data, user_id, profiles(display_name)")
        .eq("movie_night_id", movie_night_id)
        .execute()
    )
    nom_map = {n["id"]: n for n in (noms.data or [])}
    candidates = list(nom_map.keys())

    if not candidates:
        raise HTTPException(status_code=400, detail="No nominations found")

    irv = run_irv(ballots, candidates)

    winner_id = irv["winner"]
    if not winner_id:
        raise HTTPException(status_code=500, detail="Could not determine winner")

    winner_nom = nom_map[winner_id]
    nominator_profile = winner_nom.get("profiles") or {}

    # Enrich final_ranking with movie data.
    # nominated_by is only revealed for the winner — everyone else stays anonymous.
    final_ranking = []
    for entry in irv["final_ranking"]:
        nom = nom_map.get(entry["candidate"], {})
        is_winner = entry["candidate"] == winner_id
        final_ranking.append({
            "rank": entry["rank"],
            "nomination_id": entry["candidate"],
            "movie": nom.get("tmdb_data", {}),
            "nominated_by": (nom.get("profiles") or {}).get("display_name", "Unknown") if is_winner else None,
        })

    return VoteResult(
        winner_nomination_id=winner_id,
        winner_movie=winner_nom["tmdb_data"],
        nominated_by=nominator_profile.get("display_name", "Unknown"),
        nominated_by_user_id=winner_nom["user_id"],
        rounds=irv["rounds"],
        final_ranking=final_ranking,
    )
