import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentMovieNight, searchMovies, discoverMovies, nominate, listNominations, deleteNomination, type TmdbMovie, type MovieNight, type Nomination } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import MovieCard from '../components/MovieCard'
import { Search, X, CheckCircle } from 'lucide-react'

export default function Nominate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false
  const [movieNight, setMovieNight] = useState<MovieNight | null>(null)
  const [myNominations, setMyNominations] = useState<Nomination[]>([])
  const [allNominations, setAllNominations] = useState<Nomination[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [popular, setPopular] = useState<TmdbMovie[]>([])
  const [filterByGenre, setFilterByGenre] = useState(true)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myNominatedIds = new Set(myNominations.map(n => n.tmdb_movie_id))

  useEffect(() => {
    getCurrentMovieNight().then(mn => {
      if (!mn || mn.status !== 'nominations_open') {
        navigate('/')
        return
      }
      setMovieNight(mn)
      discoverMovies(1, mn.genre_tmdb_id).then(d => setPopular(d.results.slice(0, 12)))
      listNominations(mn.id).then(noms => {
        setAllNominations(noms)
        setMyNominations(noms.filter(n => n.user_id === user?.user_id))
      })
    })
  }, [navigate])

  // Re-fetch popular when genre filter toggles (no query active)
  useEffect(() => {
    if (!movieNight || query) return
    const genreId = filterByGenre ? movieNight.genre_tmdb_id : undefined
    discoverMovies(1, genreId).then(d => setPopular(d.results.slice(0, 12)))
  }, [filterByGenre, movieNight, query])

  async function handleSearch() {
    if (!movieNight || !query.trim()) return
    setSearching(true)
    try {
      const genreId = filterByGenre ? movieNight.genre_tmdb_id : undefined
      const data = await searchMovies(query.trim(), 1, genreId)
      setResults(data.results)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  // Re-run search when filter toggles mid-query
  useEffect(() => {
    if (query) handleSearch()
  }, [filterByGenre]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleNominate(movie: TmdbMovie) {
    if (!movieNight) return
    setSubmitting(true)
    setError(null)
    try {
      const nom = await nominate({
        movie_night_id: movieNight.id,
        tmdb_movie_id: movie.id,
        tmdb_data: movie,
      })
      setMyNominations(prev => [...prev, nom])
      setAllNominations(prev => [...prev, nom])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to nominate')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetract(nom: Nomination) {
    setSubmitting(true)
    try {
      await deleteNomination(nom.id)
      setMyNominations(prev => prev.filter(n => n.id !== nom.id))
      setAllNominations(prev => prev.filter(n => n.id !== nom.id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to retract')
    } finally {
      setSubmitting(false)
    }
  }

  const displayMovies = query ? results : popular

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Nominate a Movie</h1>
      {movieNight && (
        <p className="text-gray-400 text-sm mb-4">
          Genre: <span className="text-white font-medium">{movieNight.genre_name}</span>
          {' · '}{allNominations.length} nominations so far
        </p>
      )}

      {/* My nominations — single banner for regular users, list for admins */}
      {myNominations.length > 0 && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-3 mb-4 flex flex-col gap-2">
          {myNominations.map(nom => (
            <div key={nom.id} className="flex items-center gap-3">
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <p className="text-green-300 font-medium text-sm flex-1 min-w-0 truncate">
                {nom.tmdb_data.title}
              </p>
              <button
                onClick={() => handleRetract(nom)}
                disabled={submitting}
                className="text-green-500 hover:text-red-400 flex-shrink-0"
                title="Retract nomination"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Search + genre filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder={filterByGenre ? `Search ${movieNight?.genre_name ?? ''} movies...` : 'Search all movies...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {/* Genre filter toggle */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
        <div
          onClick={() => setFilterByGenre(f => !f)}
          className={`w-9 h-5 rounded-full transition-colors relative ${filterByGenre ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${filterByGenre ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs text-gray-400">
          {filterByGenre ? `${movieNight?.genre_name ?? 'Genre'} only` : 'All genres'}
        </span>
      </label>

      {!query && (
        <p className="text-gray-500 text-xs mb-3 uppercase tracking-wide">
          {filterByGenre ? `Popular in ${movieNight?.genre_name ?? 'this genre'}` : 'Popular movies'}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {displayMovies.map(movie => (
          <MovieCard
            key={movie.id}
            movie={movie}
            action={
              myNominatedIds.has(movie.id) ? (
                <span className="text-xs text-green-400 font-medium">Your pick ✓</span>
              ) : (isAdmin || myNominations.length === 0) ? (
                <button
                  onClick={() => handleNominate(movie)}
                  disabled={submitting}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Nominate
                </button>
              ) : null
            }
          />
        ))}
        {query && results.length === 0 && !searching && (
          <p className="text-center text-gray-500 py-8 text-sm">
            No results {filterByGenre ? `in ${movieNight?.genre_name}` : 'found'}
          </p>
        )}
      </div>
    </div>
  )
}
