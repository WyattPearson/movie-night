import { Film } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login({ notAllowed = false }: { notAllowed?: boolean }) {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-600 p-4 rounded-2xl">
            <Film size={36} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Movie Night</h1>
        <p className="text-gray-400 text-sm mb-8">Monthly films with your favourite people.</p>

        {notAllowed ? (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">
            Your Google account isn't on the guest list. Ask the host to add your email.
          </div>
        ) : null}

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
          Continue with Google
        </button>
      </div>
    </div>
  )
}
