import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMovieNights, getResults, getRatings, type MovieNight } from '../lib/api'
import StarRating from '../components/StarRating'
import { ChevronRight } from 'lucide-react'

interface HistoryEntry {
  movieNight: MovieNight
  winnerTitle?: string
  winnerPoster?: string | null
  nominatedBy?: string
  avgRating?: number | null
  ratingCount?: number
}

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const nights = await listMovieNights()
      const completed = nights.filter(n => n.status === 'completed' || n.status === 'archived')

      const enriched = await Promise.all(
        completed.map(async mn => {
          const entry: HistoryEntry = { movieNight: mn }
          try {
            const [res, ratings] = await Promise.all([getResults(mn.id), getRatings(mn.id)])
            entry.winnerTitle = res.winner_movie.title
            entry.winnerPoster = res.winner_movie.poster_path
            entry.nominatedBy = res.nominated_by
            entry.avgRating = ratings.average
            entry.ratingCount = ratings.count
          } catch {
            // Results not available
          }
          return entry
        })
      )
      setEntries(enriched)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-center py-12">Loading...</div>

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium text-gray-400">No history yet</p>
        <p className="text-sm mt-1">Completed movie nights will appear here.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">History</h1>
      <div className="flex flex-col gap-3">
        {entries.map(({ movieNight, winnerTitle, winnerPoster, nominatedBy, avgRating, ratingCount }) => (
          <Link
            key={movieNight.id}
            to={`/results/${movieNight.id}`}
            className="bg-gray-800 rounded-2xl p-4 flex gap-3 items-center hover:bg-gray-750 transition-colors"
          >
            {winnerPoster ? (
              <img src={winnerPoster} alt={winnerTitle} className="w-14 h-20 object-cover rounded-xl flex-shrink-0" />
            ) : (
              <div className="w-14 h-20 bg-gray-700 rounded-xl flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">
                {new Date(movieNight.event_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {' · '}{movieNight.genre_name}
              </p>
              <p className="font-semibold text-white leading-snug">{winnerTitle ?? 'TBD'}</p>
              {nominatedBy && <p className="text-xs text-gray-400 mt-0.5">by {nominatedBy}</p>}
              {avgRating != null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StarRating value={Math.round(avgRating)} size={13} readonly />
                  <span className="text-xs text-gray-500">{avgRating.toFixed(1)} ({ratingCount})</span>
                </div>
              )}
            </div>
            <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
