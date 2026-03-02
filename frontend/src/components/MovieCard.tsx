import { Star } from 'lucide-react'
import type { TmdbMovie } from '../lib/api'

interface Props {
  movie: TmdbMovie
  action?: React.ReactNode
  badge?: React.ReactNode
}

export default function MovieCard({ movie, action, badge }: Props) {
  return (
    <div className="flex gap-3 bg-gray-800 rounded-xl p-3 relative">
      {badge && (
        <div className="absolute top-2 right-2">{badge}</div>
      )}
      {movie.poster_path ? (
        <img
          src={movie.poster_path}
          alt={movie.title}
          className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-24 bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 text-xs text-center px-1">
          No poster
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white leading-snug line-clamp-2">{movie.title}</h3>
        <p className="text-gray-400 text-xs mt-0.5">
          {movie.release_date ? movie.release_date.slice(0, 4) : '—'}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-400">{movie.vote_average.toFixed(1)}</span>
        </div>
        {movie.overview && (
          <p className="text-gray-400 text-xs mt-1.5 line-clamp-2">{movie.overview}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
