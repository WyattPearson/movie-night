import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL as string

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────
export const verifyUser = () => request<UserProfile>('/auth/verify', { method: 'POST' })

// ── Movie Nights ──────────────────────────────────────────────
export const getCurrentMovieNight = () => request<MovieNight | null>('/movie-nights/current')
export const getMovieNight = (id: string) => request<MovieNight>(`/movie-nights/${id}`)
export const listMovieNights = () => request<MovieNight[]>('/movie-nights/')

// ── TMDB ──────────────────────────────────────────────────────
export const getGenres = () => request<Genre[]>('/tmdb/genres')
export const searchMovies = (query: string, page = 1, genreId?: number) => {
  const params = new URLSearchParams({ query, page: String(page) })
  if (genreId != null) params.set('genre_id', String(genreId))
  return request<{ results: TmdbMovie[]; total_results: number }>(`/tmdb/search?${params}`)
}
export const discoverMovies = (page = 1, genreId?: number) => {
  const params = new URLSearchParams({ page: String(page) })
  if (genreId != null) params.set('genre_id', String(genreId))
  return request<{ results: TmdbMovie[] }>(`/tmdb/discover?${params}`)
}

// ── Nominations ───────────────────────────────────────────────
export const nominate = (body: { movie_night_id: string; tmdb_movie_id: number; tmdb_data: TmdbMovie }) =>
  request<Nomination>('/nominations/', { method: 'POST', body: JSON.stringify(body) })
export const listNominations = (movieNightId: string) =>
  request<Nomination[]>(`/nominations/${movieNightId}`)
export const deleteNomination = (id: string) =>
  request<void>(`/nominations/${id}`, { method: 'DELETE' })

// ── Votes ─────────────────────────────────────────────────────
export const castVote = (body: { movie_night_id: string; ranked_choices: string[] }) =>
  request('/votes/', { method: 'POST', body: JSON.stringify(body) })
export const getMyVote = (movieNightId: string) =>
  request<{ ranked_choices: string[] | null }>(`/votes/my/${movieNightId}`)
export const getResults = (movieNightId: string) =>
  request<VoteResult>(`/votes/results/${movieNightId}`)

// ── RSVP ──────────────────────────────────────────────────────
export const upsertRsvp = (body: { movie_night_id: string; status: 'attending' | 'not_attending' | 'maybe' }) =>
  request<Rsvp>('/rsvp', { method: 'POST', body: JSON.stringify(body) })
export const listRsvps = (movieNightId: string) =>
  request<Rsvp[]>(`/rsvp/${movieNightId}`)

// ── Snacks ────────────────────────────────────────────────────
export const addSnack = (body: { movie_night_id: string; item: string }) =>
  request<Snack>('/snacks', { method: 'POST', body: JSON.stringify(body) })
export const deleteSnack = (id: string) => request<void>(`/snacks/${id}`, { method: 'DELETE' })
export const listSnacks = (movieNightId: string) => request<Snack[]>(`/snacks/${movieNightId}`)

// ── Ratings ───────────────────────────────────────────────────
export const submitRating = (body: { movie_night_id: string; rating: number; review?: string }) =>
  request('/ratings/', { method: 'POST', body: JSON.stringify(body) })
export const getRatings = (movieNightId: string) =>
  request<{ average: number | null; count: number; reviews: { rating: number; review: string }[] }>(`/ratings/${movieNightId}`)
export const getMyRating = (movieNightId: string) =>
  request<{ rating: number | null; review: string | null }>(`/ratings/my/${movieNightId}`)

// ── Admin ─────────────────────────────────────────────────────
export const createMovieNight = (body: CreateMovieNightBody) =>
  request<MovieNight>('/admin/movie-nights', { method: 'POST', body: JSON.stringify(body) })
export const updateMovieNight = (id: string, body: Partial<CreateMovieNightBody & { status: string; nominations_close_at: string; voting_close_at: string }>) =>
  request<MovieNight>(`/admin/movie-nights/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteMovieNight = (id: string) =>
  request<void>(`/admin/movie-nights/${id}`, { method: 'DELETE' })
export const getRandomGenre = () => request<Genre>('/admin/movie-nights/random-genre')
export const listAllowlist = () => request<AllowlistEntry[]>('/admin/allowlist')
export const addToAllowlist = (email: string) =>
  request<AllowlistEntry>('/admin/allowlist', { method: 'POST', body: JSON.stringify({ email }) })
export const removeFromAllowlist = (email: string) =>
  request<void>(`/admin/allowlist/${encodeURIComponent(email)}`, { method: 'DELETE' })
export const adminViewNominations = (movieNightId: string) =>
  request<Nomination[]>(`/admin/nominations/${movieNightId}`)
export const adminVoteSummary = (movieNightId: string) =>
  request<{ vote_count: number; nomination_count: number }>(`/admin/votes/summary/${movieNightId}`)

// ── Types ─────────────────────────────────────────────────────
export interface UserProfile {
  user_id: string
  email: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
}

export interface MovieNight {
  id: string
  month: number
  year: number
  genre_tmdb_id: number
  genre_name: string
  event_date: string
  event_time: string
  event_location: string | null
  status: 'pending' | 'nominations_open' | 'voting_open' | 'voting_closed' | 'completed' | 'archived'
  created_at: string
  nominations_close_at: string | null
  voting_close_at: string | null
}

export interface Genre {
  id: number
  name: string
}

export interface TmdbMovie {
  id: number
  title: string
  overview: string
  release_date: string
  poster_path: string | null
  vote_average: number
  genre_ids: number[]
}

export interface Nomination {
  id: string
  movie_night_id: string
  user_id: string
  tmdb_movie_id: number
  tmdb_data: TmdbMovie
  created_at: string
  nominator_name: string | null
}

export interface VoteResult {
  winner_nomination_id: string
  winner_movie: TmdbMovie
  nominated_by: string
  nominated_by_user_id: string
  rounds: Array<{ counts: Record<string, number>; total_votes: number; eliminated?: string | null }>
  final_ranking: Array<{ rank: number; nomination_id: string; movie: TmdbMovie; nominated_by: string }>
}

export interface Rsvp {
  id: string
  movie_night_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  status: 'attending' | 'not_attending' | 'maybe'
  created_at: string
}

export interface Snack {
  id: string
  movie_night_id: string
  user_id: string
  display_name: string
  item: string
  created_at: string
}

export interface AllowlistEntry {
  email: string
  added_at: string
}

export interface CreateMovieNightBody {
  month: number
  year: number
  genre_tmdb_id: number
  genre_name: string
  event_date: string
  event_time: string
  event_location?: string
}
