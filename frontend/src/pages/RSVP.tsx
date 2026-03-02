import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentMovieNight, upsertRsvp, listRsvps, addSnack, deleteSnack, listSnacks,
  type MovieNight, type Rsvp, type Snack,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StatusBanner from '../components/StatusBanner'
import { Trash2, Plus } from 'lucide-react'

const RSVP_OPTIONS: { value: Rsvp['status']; label: string; emoji: string }[] = [
  { value: 'attending', label: "I'm in", emoji: '✅' },
  { value: 'maybe', label: 'Maybe', emoji: '🤔' },
  { value: 'not_attending', label: "Can't make it", emoji: '❌' },
]

export default function RSVPPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [movieNight, setMovieNight] = useState<MovieNight | null>(null)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [snacks, setSnacks] = useState<Snack[]>([])
  const [myRsvpStatus, setMyRsvpStatus] = useState<Rsvp['status'] | null>(null)
  const [newSnack, setNewSnack] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentMovieNight().then(mn => {
      if (!mn) { navigate('/'); return }
      setMovieNight(mn)
      Promise.all([listRsvps(mn.id), listSnacks(mn.id)]).then(([r, s]) => {
        setRsvps(r)
        setSnacks(s)
        const mine = r.find(rv => rv.user_id === user?.user_id)
        if (mine) setMyRsvpStatus(mine.status)
      })
    })
  }, [navigate, user])

  async function handleRsvp(status: Rsvp['status']) {
    if (!movieNight) return
    setSubmitting(true)
    try {
      const updated = await upsertRsvp({ movie_night_id: movieNight.id, status })
      setMyRsvpStatus(status)
      setRsvps(prev => {
        const existing = prev.findIndex(r => r.user_id === user?.user_id)
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = { ...next[existing], ...updated }
          return next
        }
        return [...prev, updated]
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to RSVP')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddSnack() {
    if (!movieNight || !newSnack.trim()) return
    setSubmitting(true)
    try {
      const snack = await addSnack({ movie_night_id: movieNight.id, item: newSnack.trim() })
      setSnacks(prev => [...prev, snack])
      setNewSnack('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add snack')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteSnack(id: string) {
    try {
      await deleteSnack(id)
      setSnacks(prev => prev.filter(s => s.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove snack')
    }
  }

  const attending = rsvps.filter(r => r.status === 'attending')
  const maybe = rsvps.filter(r => r.status === 'maybe')

  if (!movieNight) return <div className="text-gray-400 text-center py-12">Loading...</div>

  return (
    <div>
      <StatusBanner movieNight={movieNight} />

      {/* RSVP buttons */}
      <h2 className="font-semibold text-white mb-3">Are you coming?</h2>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {RSVP_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleRsvp(opt.value)}
            disabled={submitting}
            className={`py-3 rounded-xl font-medium text-sm transition-all active:scale-95 ${
              myRsvpStatus === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="text-xl mb-0.5">{opt.emoji}</div>
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Who's coming */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-white mb-3">
          Who's coming <span className="text-gray-500 font-normal">({attending.length})</span>
        </h2>
        {attending.length === 0 ? (
          <p className="text-gray-500 text-sm">No RSVPs yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attending.map(r => (
              <AvatarChip key={r.id} rsvp={r} />
            ))}
          </div>
        )}
        {maybe.length > 0 && (
          <>
            <p className="text-gray-500 text-xs mt-3 mb-2">Maybe ({maybe.length})</p>
            <div className="flex flex-wrap gap-2">
              {maybe.map(r => <AvatarChip key={r.id} rsvp={r} muted />)}
            </div>
          </>
        )}
      </div>

      {/* Snack signup */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-semibold text-white mb-3">Snacks & Drinks</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="What are you bringing?"
            value={newSnack}
            onChange={e => setNewSnack(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSnack()}
            className="flex-1 bg-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddSnack}
            disabled={!newSnack.trim() || submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-2.5 rounded-xl"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {snacks.length === 0 && <p className="text-gray-500 text-sm">Nothing claimed yet</p>}
          {snacks.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-white">{s.item}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{s.display_name}</span>
                {s.user_id === user?.user_id && (
                  <button onClick={() => handleDeleteSnack(s.id)} className="text-gray-600 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AvatarChip({ rsvp, muted = false }: { rsvp: Rsvp; muted?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 bg-gray-700 rounded-full px-2.5 py-1 ${muted ? 'opacity-60' : ''}`}>
      {rsvp.avatar_url ? (
        <img src={rsvp.avatar_url} alt="" className="w-5 h-5 rounded-full" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
          {rsvp.display_name[0]?.toUpperCase()}
        </div>
      )}
      <span className="text-xs text-gray-300">{rsvp.display_name}</span>
    </div>
  )
}
