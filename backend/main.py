from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, movie_nights, nominations, votes, rsvps, ratings, tmdb, admin

app = FastAPI(title="Movie Night API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(movie_nights.router)
app.include_router(nominations.router)
app.include_router(votes.router)
app.include_router(rsvps.router)
app.include_router(ratings.router)
app.include_router(tmdb.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
