import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listMovieNights, createMovieNight, updateMovieNight, deleteMovieNight, getRandomGenre, getGenres,
  listAllowlist, addToAllowlist, removeFromAllowlist, adminVoteSummary,
  type MovieNight, type AllowlistEntry, type Genre,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Trash2, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

const STATUSES: MovieNight['status'][] = ['pending', 'nominations_open', 'voting_open', 'voting_closed', 'completed', 'archived']
const STATUS_LABELS: Record<MovieNight['status'], string> = {
  pending: 'Pending',
  nominations_open: 'Nominations Open',
  voting_open: 'Voting Open',
  voting_closed: 'Voting Closed',
  completed: 'Completed',
  archived: 'Archived',
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [movieNights, setMovieNights] = useState<MovieNight[]>([])
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [suggestedGenre, setSuggestedGenre] = useState<Genre | null>(null)
  const [creating, setCreating] = useState(false)
  const [newMn, setNewMn] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), genre_tmdb_id: 0, genre_name: '', event_date: '', event_time: '19:00', event_location: '' })
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [voteSummaries, setVoteSummaries] = useState<Record<string, { vote_count: number; nomination_count: number }>>({})
  const [genres, setGenres] = useState<Genre[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, { nominations_close_at: string; voting_close_at: string }>>({})

  function getDeadlineDraft(mn: MovieNight) {
    if (deadlineDrafts[mn.id]) return deadlineDrafts[mn.id]
    return {
      nominations_close_at: mn.nominations_close_at ? mn.nominations_close_at.slice(0, 10) : '',
      voting_close_at: mn.voting_close_at ? mn.voting_close_at.slice(0, 10) : '',
    }
  }

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return }
    listMovieNights().then(setMovieNights)
    listAllowlist().then(setAllowlist)
    getGenres().then(setGenres)
  }, [user, navigate])

  async function handleRandomGenre() {
    const g = await getRandomGenre()
    setSuggestedGenre(g)
    setNewMn(prev => ({ ...prev, genre_tmdb_id: g.id, genre_name: g.name }))
  }

  function handleGenreSelect(id: number) {
    const g = genres.find(g => g.id === id)
    if (g) setNewMn(prev => ({ ...prev, genre_tmdb_id: g.id, genre_name: g.name }))
  }

  async function handleCreate() {
    setError(null)
    try {
      const mn = await createMovieNight({ ...newMn, event_location: newMn.event_location || undefined })
      setMovieNights(prev => [mn, ...prev])
      setCreating(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
  }

  async function handleStatusChange(id: string, status: MovieNight['status']) {
    try {
      const updated = await updateMovieNight(id, { status })
      setMovieNights(prev => prev.map(n => n.id === id ? updated : n))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  async function handleAddEmail() {
    if (!newEmail.trim()) return
    try {
      const entry = await addToAllowlist(newEmail.trim())
      setAllowlist(prev => [entry, ...prev])
      setNewEmail('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add email')
    }
  }

  async function handleRemoveEmail(email: string) {
    try {
      await removeFromAllowlist(email)
      setAllowlist(prev => prev.filter(e => e.email !== email))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove email')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMovieNight(id)
      setMovieNights(prev => prev.filter(n => n.id !== id))
      setExpandedId(null)
      setConfirmDeleteId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
      setConfirmDeleteId(null)
    }
  }

  async function handleSaveDeadlines(mn: MovieNight) {
    const draft = getDeadlineDraft(mn)
    try {
      const updated = await updateMovieNight(mn.id, {
        nominations_close_at: draft.nominations_close_at ? `${draft.nominations_close_at}T00:00:00` : undefined,
        voting_close_at: draft.voting_close_at ? `${draft.voting_close_at}T00:00:00` : undefined,
      })
      setMovieNights(prev => prev.map(n => n.id === mn.id ? updated : n))
      setDeadlineDrafts(prev => { const next = { ...prev }; delete next[mn.id]; return next })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save deadlines')
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!voteSummaries[id]) {
      const summary = await adminVoteSummary(id)
      setVoteSummaries(prev => ({ ...prev, [id]: summary }))
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Admin Panel</h1>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 mb-4 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Movie Nights */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Movie Nights</h2>
          <button
            onClick={() => setCreating(c => !c)}
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {creating && (
          <div className="bg-gray-800 rounded-2xl p-4 mb-4">
            <h3 className="font-medium text-white mb-3 text-sm">New Movie Night</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Month</label>
                <input type="number" min={1} max={12} value={newMn.month} onChange={e => setNewMn(p => ({ ...p, month: +e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Year</label>
                <input type="number" value={newMn.year} onChange={e => setNewMn(p => ({ ...p, year: +e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Genre</label>
              <div className="flex gap-2">
                <select
                  value={newMn.genre_tmdb_id}
                  onChange={e => handleGenreSelect(+e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0} disabled>Select a genre…</option>
                  {genres.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button onClick={handleRandomGenre} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex-shrink-0" title="Pick random genre">
                  <RefreshCw size={14} />
                </button>
              </div>
              {suggestedGenre && <p className="text-xs text-gray-500 mt-1">Randomised: {suggestedGenre.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date</label>
                <input type="date" value={newMn.event_date} onChange={e => setNewMn(p => ({ ...p, event_date: e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Time</label>
                <input type="time" value={newMn.event_time} onChange={e => setNewMn(p => ({ ...p, event_time: e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-400 mb-1 block">Location (optional)</label>
              <input type="text" value={newMn.event_location} onChange={e => setNewMn(p => ({ ...p, event_location: e.target.value }))}
                placeholder="e.g. My place"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">Create</button>
              <button onClick={() => setCreating(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {movieNights.map(mn => (
            <div key={mn.id} className="bg-gray-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleExpand(mn.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-medium text-white text-sm">
                    {new Date(mn.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    {' · '}{mn.genre_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{STATUS_LABELS[mn.status]}</p>
                </div>
                {expandedId === mn.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {expandedId === mn.id && (
                <div className="border-t border-gray-700 p-4">
                  {voteSummaries[mn.id] && (
                    <p className="text-xs text-gray-400 mb-3">
                      {voteSummaries[mn.id].nomination_count} nominations · {voteSummaries[mn.id].vote_count} votes cast
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-2">Change status:</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(mn.id, s)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          mn.status === s
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Deadline inputs for countdown timers */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Phase deadlines (for countdown timers):</p>
                    <div className="grid grid-cols-1 gap-2 mb-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Nominations close</label>
                        <input
                          type="date"
                          value={getDeadlineDraft(mn).nominations_close_at}
                          onChange={e => setDeadlineDrafts(prev => ({
                            ...prev,
                            [mn.id]: { ...getDeadlineDraft(mn), nominations_close_at: e.target.value },
                          }))}
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Voting closes</label>
                        <input
                          type="date"
                          value={getDeadlineDraft(mn).voting_close_at}
                          onChange={e => setDeadlineDrafts(prev => ({
                            ...prev,
                            [mn.id]: { ...getDeadlineDraft(mn), voting_close_at: e.target.value },
                          }))}
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveDeadlines(mn)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg font-medium"
                    >
                      Save deadlines
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700">
                    {confirmDeleteId === mn.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 flex-1">Delete this movie night and all its data?</span>
                        <button
                          onClick={() => handleDelete(mn.id)}
                          className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(mn.id)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} /> Delete movie night
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Allowlist */}
      <section>
        <h2 className="font-semibold text-white mb-3">Guest List</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            placeholder="friend@gmail.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddEmail} disabled={!newEmail.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-2.5 rounded-xl">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {allowlist.map(entry => (
            <div key={entry.email} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
              <span className="text-sm text-white">{entry.email}</span>
              <button onClick={() => handleRemoveEmail(entry.email)} className="text-gray-600 hover:text-red-400 ml-2">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
