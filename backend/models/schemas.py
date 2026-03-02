from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import date, time, datetime
from enum import Enum


class MovieNightStatus(str, Enum):
    pending = "pending"
    nominations_open = "nominations_open"
    voting_open = "voting_open"
    voting_closed = "voting_closed"
    completed = "completed"
    archived = "archived"


class RSVPStatus(str, Enum):
    attending = "attending"
    not_attending = "not_attending"
    maybe = "maybe"


# Auth
class VerifyResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    avatar_url: Optional[str]
    is_admin: bool


# Movie Nights
class MovieNightCreate(BaseModel):
    month: int
    year: int
    genre_tmdb_id: int
    genre_name: str
    event_date: date
    event_time: time
    event_location: Optional[str] = None


class MovieNightUpdate(BaseModel):
    genre_tmdb_id: Optional[int] = None
    genre_name: Optional[str] = None
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    event_location: Optional[str] = None
    status: Optional[MovieNightStatus] = None
    nominations_close_at: Optional[datetime] = None
    voting_close_at: Optional[datetime] = None


class MovieNightResponse(BaseModel):
    id: str
    month: int
    year: int
    genre_tmdb_id: int
    genre_name: str
    event_date: date
    event_time: time
    event_location: Optional[str]
    status: MovieNightStatus
    created_at: str
    nominations_close_at: Optional[str] = None
    voting_close_at: Optional[str] = None


# Nominations
class NominationCreate(BaseModel):
    movie_night_id: str
    tmdb_movie_id: int
    tmdb_data: dict[str, Any]


class NominationResponse(BaseModel):
    id: str
    movie_night_id: str
    user_id: str
    tmdb_movie_id: int
    tmdb_data: dict[str, Any]
    created_at: str
    nominator_name: Optional[str] = None


# Votes
class VoteCreate(BaseModel):
    movie_night_id: str
    ranked_choices: list[str]  # ordered list of nomination IDs


# Results
class VoteResult(BaseModel):
    winner_nomination_id: str
    winner_movie: dict[str, Any]
    nominated_by: str
    nominated_by_user_id: str
    rounds: list[dict[str, Any]]
    final_ranking: list[dict[str, Any]]


# Post-watch ratings
class RatingCreate(BaseModel):
    movie_night_id: str
    rating: int  # 1-5
    review: Optional[str] = None


class RatingResponse(BaseModel):
    id: str
    movie_night_id: str
    user_id: str
    rating: int
    review: Optional[str]
    created_at: str


# RSVP
class RSVPCreate(BaseModel):
    movie_night_id: str
    status: RSVPStatus


class RSVPResponse(BaseModel):
    id: str
    movie_night_id: str
    user_id: str
    display_name: str
    avatar_url: Optional[str]
    status: RSVPStatus
    created_at: str


# Snacks
class SnackCreate(BaseModel):
    movie_night_id: str
    item: str


class SnackResponse(BaseModel):
    id: str
    movie_night_id: str
    user_id: str
    display_name: str
    item: str
    created_at: str


# Allowlist
class AllowlistEntry(BaseModel):
    email: EmailStr


class AllowlistResponse(BaseModel):
    email: str
    added_at: str


# TMDB
class TMDBMovie(BaseModel):
    id: int
    title: str
    overview: str
    release_date: Optional[str]
    poster_path: Optional[str]
    vote_average: float
    genre_ids: list[int]


class TMDBGenre(BaseModel):
    id: int
    name: str
