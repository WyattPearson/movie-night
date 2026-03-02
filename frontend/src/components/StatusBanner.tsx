import type { MovieNight } from '../lib/api'

const STATUS_CONFIG = {
  pending: { label: 'Coming Soon', color: 'bg-gray-700 text-gray-300' },
  nominations_open: { label: 'Nominate a Movie', color: 'bg-blue-900 text-blue-200' },
  voting_open: { label: 'Voting Open', color: 'bg-green-900 text-green-200' },
  voting_closed: { label: 'Voting Closed', color: 'bg-orange-900 text-orange-200' },
  completed: { label: 'Watch Complete', color: 'bg-purple-900 text-purple-200' },
  archived: { label: 'Archived', color: 'bg-gray-800 text-gray-400' },
}

export default function StatusBanner({ movieNight }: { movieNight: MovieNight }) {
  const cfg = STATUS_CONFIG[movieNight.status]
  const date = new Date(`${movieNight.event_date}T${movieNight.event_time}`)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="bg-gray-800 rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color} mb-2`}>
            {cfg.label}
          </span>
          <h2 className="text-xl font-bold text-white">
            {movieNight.genre_name} Night
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {dateStr} at {timeStr}
            {movieNight.event_location && ` · ${movieNight.event_location}`}
          </p>
        </div>
      </div>
    </div>
  )
}
