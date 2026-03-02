from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from dependencies import get_supabase, get_current_user
from models.schemas import VerifyResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify", response_model=VerifyResponse)
def verify_and_provision(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """
    Called by the frontend after Google OAuth. Checks the allowlist, then
    upserts the user's profile. Returns profile data.
    """
    email = current_user["email"]
    user_id = current_user["id"]

    # Check allowlist
    allowed = supabase.table("allowed_emails").select("email").eq("email", email).execute()
    if not allowed.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You're not on the guest list. Ask the host to add your email.",
        )

    # Fetch Google user metadata from auth.users via admin API
    auth_user = supabase.auth.admin.get_user_by_id(user_id)
    meta = auth_user.user.user_metadata if auth_user.user else {}
    display_name = meta.get("full_name") or meta.get("name") or email.split("@")[0]
    avatar_url = meta.get("avatar_url") or meta.get("picture")

    # Upsert profile
    profile_data = {
        "id": user_id,
        "display_name": display_name,
        "avatar_url": avatar_url,
    }
    supabase.table("profiles").upsert(profile_data, on_conflict="id").execute()

    # Fetch full profile (includes is_admin set server-side)
    profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    p = profile.data

    return VerifyResponse(
        user_id=user_id,
        email=email,
        display_name=p["display_name"],
        avatar_url=p.get("avatar_url"),
        is_admin=p.get("is_admin", False),
    )
