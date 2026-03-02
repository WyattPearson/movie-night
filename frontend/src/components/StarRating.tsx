import { Star } from 'lucide-react'

interface Props {
  value: number | null
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}

export default function StarRating({ value, onChange, size = 24, readonly = false }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`transition-transform ${!readonly ? 'hover:scale-110 active:scale-95' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={n <= (value ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
          />
        </button>
      ))}
    </div>
  )
}
