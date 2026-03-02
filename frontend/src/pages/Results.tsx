import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getResults, getMyRating, submitRating, type VoteResult } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import { Trophy } from 'lucide-react'

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [result, setResult] = useState<VoteResult | null>(null)
  const [myRating, setMyRating] = useState<number | null>(null)
  const [myReview, setMyReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getResults(id), getMyRating(id)])
      .then(([res, mine]) => {
        setResult(res)
        setMyRating(mine.rating)
        setMyReview(mine.review ?? '')
        if (mine.rating) setRatingSubmitted(true)
      })
      .catch(() => navigate('/'))
  }, [id, navigate])

  async function handleRatingSubmit() {
    if (!id || !myRating) return
    setSubmittingRating(true)
    setError(null)
    try {
      await submitRating({ movie_night_id: id, rating: myRating, review: myReview || undefined })
      setRatingSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (!result) return <div className="text-gray-400 text-center py-12">Loading...</div>

  const isWinnerNominator = result.nominated_by_user_id === user?.user_id

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Results</h1>

      {/* Winner card */}
      <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/30 border border-yellow-700/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-yellow-400" />
          <span className="text-yellow-300 font-semibold text-sm">Winner</span>
        </div>
        <div className="flex gap-3">
          {result.winner_movie.poster_path && (
            <img
              src={result.winner_movie.poster_path}
              alt={result.winner_movie.title}
              className="w-20 h-28 object-cover rounded-xl flex-shrink-0"
            />
          )}
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">{result.winner_movie.title}</h2>
            <p className="text-gray-400 text-xs mt-0.5">{result.winner_movie.release_date?.slice(0, 4)}</p>
            <p className="text-yellow-300 text-sm mt-2 font-medium">
              Nominated by {result.nominated_by}
              {isWinnerNominator && " 🎉 (that's you!)"}
            </p>
          </div>
        </div>
      </div>

      {/* Full ranking */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Full Ranking</h2>
      <div className="flex flex-col gap-2 mb-6">
        {result.final_ranking.map(entry => (
          <div key={entry.nomination_id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
            <span className="text-gray-500 font-bold w-5 text-center text-sm">
              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}`}
            </span>
            {entry.movie.poster_path && (
              <img src={entry.movie.poster_path} alt={entry.movie.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{entry.movie.title}</p>
              <p className="text-gray-500 text-xs">by {entry.nominated_by}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rate the movie */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-semibold text-white mb-3">Rate the Movie</h2>
        <StarRating value={myRating} onChange={v => { setMyRating(v); setRatingSubmitted(false) }} size={32} />
        <textarea
          value={myReview}
          onChange={e => setMyReview(e.target.value)}
          placeholder="Leave a quick review (optional)"
          className="w-full mt-3 bg-gray-700 text-white placeholder-gray-500 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        {ratingSubmitted && <p className="text-green-400 text-sm mt-2">Rating saved!</p>}
        <button
          onClick={handleRatingSubmit}
          disabled={!myRating || submittingRating}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {submittingRating ? 'Saving...' : ratingSubmitted ? 'Update Rating' : 'Submit Rating'}
        </button>
      </div>
    </div>
  )
}
