import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, CheckCircle } from 'lucide-react'
import { getCurrentMovieNight, listNominations, castVote, getMyVote, type Nomination } from '../lib/api'

function SortableItem({ nomination, rank }: { nomination: Nomination; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: nomination.id })
  const movie = nomination.tmdb_data

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-gray-800 rounded-xl p-3 ${isDragging ? 'opacity-60 shadow-2xl z-10' : ''}`}
    >
      <span className="text-gray-500 font-bold w-5 text-center text-sm">{rank}</span>
      <button {...attributes} {...listeners} className="text-gray-600 touch-none cursor-grab active:cursor-grabbing p-1">
        <GripVertical size={18} />
      </button>
      {movie.poster_path && (
        <img src={movie.poster_path} alt={movie.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm leading-snug">{movie.title}</p>
        <p className="text-gray-500 text-xs">{movie.release_date?.slice(0, 4)}</p>
      </div>
    </div>
  )
}

export default function Vote() {
  const navigate = useNavigate()
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [ordered, setOrdered] = useState<string[]>([]) // nomination IDs in ranked order
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [movieNightId, setMovieNightId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  useEffect(() => {
    async function load() {
      const mn = await getCurrentMovieNight()
      if (!mn || mn.status !== 'voting_open') { navigate('/'); return }
      setMovieNightId(mn.id)

      const [noms, myVote] = await Promise.all([
        listNominations(mn.id),
        getMyVote(mn.id),
      ])
      setNominations(noms)

      if (myVote.ranked_choices) {
        // Restore previous ballot order
        const saved = myVote.ranked_choices.filter(id => noms.some(n => n.id === id))
        const rest = noms.filter(n => !saved.includes(n.id)).map(n => n.id)
        setOrdered([...saved, ...rest])
        setSubmitted(true)
      } else {
        setOrdered(noms.map(n => n.id))
      }
      setLoading(false)
    }
    load().catch(() => navigate('/'))
  }, [navigate])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrdered(prev => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
      setSubmitted(false) // changed after submitting
    }
  }

  async function handleSubmit() {
    if (!movieNightId) return
    setSubmitting(true)
    setError(null)
    try {
      await castVote({ movie_night_id: movieNightId, ranked_choices: ordered })
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  const nomMap = Object.fromEntries(nominations.map(n => [n.id, n]))

  if (loading) return <div className="text-gray-400 text-center py-12">Loading...</div>

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Cast Your Vote</h1>
      <p className="text-gray-400 text-sm mb-5">
        Drag to rank from most to least preferred. Voting is anonymous.
      </p>

      {submitted && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-green-300 text-sm">
          <CheckCircle size={16} />
          Vote submitted! You can change your ranking anytime while voting is open.
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 mb-5">
            {ordered.map((id, i) =>
              nomMap[id] ? (
                <SortableItem key={id} nomination={nomMap[id]} rank={i + 1} />
              ) : null
            )}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {submitting ? 'Submitting...' : submitted ? 'Update Vote' : 'Submit Vote'}
      </button>
    </div>
  )
}
