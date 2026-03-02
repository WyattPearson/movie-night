import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Film, Calendar, History, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Home', icon: Film },
  { to: '/rsvp', label: 'RSVP', icon: Calendar },
  { to: '/history', label: 'History', icon: History },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top nav */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <Film size={20} className="text-red-500" />
            Movie Night
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Admin
              </Link>
            )}
            <button
              onClick={signOut}
              className="ml-2 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-gray-400"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-800 bg-gray-900 px-4 py-3 flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-400"
              >
                <Settings size={16} />
                Admin
              </Link>
            )}
            <button
              onClick={() => { setMenuOpen(false); signOut() }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-400 text-left"
            >
              <LogOut size={16} />
              Sign out ({user?.display_name})
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
