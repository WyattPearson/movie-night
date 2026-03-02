import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentMovieNight, listNominations, getResults, type MovieNight, type Nomination, type VoteResult } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StatusBanner from '../components/StatusBanner'
import CountdownTimer from '../components/CountdownTimer'
import { ChevronRight, Popcorn, Vote, Star, Trophy } from 'lucide-react'

const WINNER_STATUSES = ['voting_closed', 'completed', 'archived'] as const

export default function Home() {
  const { user } = useAuth()
  const [movieNight, setMovieNight] = useState<MovieNight | null | undefined>(undefined)
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [result, setResult] = useState<VoteResult | null>(null)

  useEffect(() => {
    getCurrentMovieNight()
      .then(mn => {
        setMovieNight(mn)
        if (!mn) return
        if (['nominations_open', 'voting_open'].includes(mn.status)) {
          listNominations(mn.id).then(setNominations).catch(() => {})
        }
        if ((WINNER_STATUSES as readonly string[]).includes(mn.status)) {
          getResults(mn.id).then(setResult).catch(() => {})
        }
      })
      .catch(() => setMovieNight(null))
  }, [])

  if (movieNight === undefined) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Hey, {user?.display_name} 👋</p>

      {movieNight ? (
        <>
          <StatusBanner movieNight={movieNight} />

          {/* Countdown timers */}
          {movieNight.status === 'nominations_open' && movieNight.nominations_close_at && (
            <CountdownTimer
              label="Nominations close in"
              target={new Date(movieNight.nominations_close_at)}
              color="blue"
            />
          )}
          {movieNight.status === 'voting_open' && movieNight.voting_close_at && (
            <CountdownTimer
              label="Voting closes in"
              target={new Date(movieNight.voting_close_at)}
              color="green"
            />
          )}
          {(movieNight.status === 'pending' || movieNight.status === 'voting_closed' ||
            (movieNight.status === 'nominations_open' && !movieNight.nominations_close_at) ||
            (movieNight.status === 'voting_open' && !movieNight.voting_close_at)) && (
            <CountdownTimer
              label="Movie night in"
              target={new Date(`${movieNight.event_date}T${movieNight.event_time}`)}
              color={movieNight.status === 'voting_closed' ? 'orange' : 'blue'}
            />
          )}

          {/* Winner card — shown once voting closes */}
          {result && (WINNER_STATUSES as readonly string[]).includes(movieNight.status) && (
            <WinnerCard result={result} movieNightId={movieNight.id} status={movieNight.status} />
          )}

          <div className="grid gap-3">
            {movieNight.status === 'nominations_open' && (
              <ActionCard
                to="/nominate"
                icon={<Popcorn size={20} className="text-blue-400" />}
                title="Nominate a Movie"
                description={`Pick your best ${movieNight.genre_name} film`}
              />
            )}
            {movieNight.status === 'voting_open' && (
              <ActionCard
                to="/vote"
                icon={<Vote size={20} className="text-green-400" />}
                title="Cast Your Vote"
                description="Rank the nominated movies"
              />
            )}
            {(movieNight.status === 'completed' || movieNight.status === 'archived') && (
              <ActionCard
                to={`/results/${movieNight.id}`}
                icon={<Star size={20} className="text-yellow-400" />}
                title="See Full Results"
                description="Full ranking + rate the movie"
              />
            )}
            <ActionCard
              to="/rsvp"
              icon={<span className="text-xl">🎟️</span>}
              title="RSVP & Snacks"
              description="Let everyone know you're coming"
            />
          </div>

          {['nominations_open', 'voting_open'].includes(movieNight.status) && (
            <div className="mt-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Nominations · {nominations.length}
              </p>
              {nominations.length === 0 ? (
                <p className="text-gray-600 text-sm">No nominations yet — be the first!</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  {nominations.map(nom => (
                    <div key={nom.id} className="flex-shrink-0 w-[72px]">
                      {nom.tmdb_data.poster_path ? (
                        <img
                          src={nom.tmdb_data.poster_path}
                          alt={nom.tmdb_data.title}
                          className="w-[72px] h-[108px] object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-[72px] h-[108px] bg-gray-700 rounded-xl flex items-center justify-center p-1">
                          <span className="text-gray-500 text-xs text-center leading-tight">{nom.tmdb_data.title}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5 leading-tight line-clamp-2">{nom.tmdb_data.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <Popcorn size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-400">No movie night scheduled yet</p>
          <p className="text-sm mt-1">Check back soon.</p>
        </div>
      )}
    </div>
  )
}

function WinnerCard({ result, movieNightId, status }: {
  result: VoteResult
  movieNightId: string
  status: MovieNight['status']
}) {
  const movie = result.winner_movie
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null

  return (
    <div className="relative rounded-2xl overflow-hidden mb-6">
      {/* Blurred poster background */}
      {movie.poster_path && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: `url(${movie.poster_path})`, filter: 'blur(20px) brightness(0.3)' }}
        />
      )}
      {!movie.poster_path && <div className="absolute inset-0 bg-gray-800" />}

      <div className="relative flex gap-4 p-4">
        {/* Poster */}
        {movie.poster_path ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            className="w-[100px] h-[150px] object-cover rounded-xl flex-shrink-0 shadow-2xl"
          />
        ) : (
          <div className="w-[100px] h-[150px] bg-gray-700 rounded-xl flex-shrink-0" />
        )}

        {/* Info */}
        <div className="flex flex-col justify-between min-w-0 py-1">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy size={14} className="text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">This Month's Pick</span>
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">{movie.title}</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {year}
              {movie.vote_average > 0 && ` · ★ ${movie.vote_average.toFixed(1)}`}
            </p>
            {result.nominated_by && (
              <p className="text-gray-400 text-xs mt-2">
                Nominated by <span className="text-white font-medium">{result.nominated_by}</span>
              </p>
            )}
          </div>

          {(status === 'completed' || status === 'archived') && (
            <Link
              to={`/results/${movieNightId}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-yellow-400 font-medium hover:text-yellow-300"
            >
              See full results <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionCard({ to, icon, title, description }: {
  to: string; icon: React.ReactNode; title: string; description: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 bg-gray-800 hover:bg-gray-750 rounded-2xl p-4 transition-colors active:scale-98 group"
    >
      <div className="bg-gray-700 rounded-xl p-2.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{title}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
    </Link>
  )
}
