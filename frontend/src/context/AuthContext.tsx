import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { verifyUser, type UserProfile } from '../lib/api'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function handleSession() {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      try {
        const profile = await verifyUser()
        setUser(profile)
      } catch {
        // Not on allowlist or token invalid — sign out
        await supabase.auth.signOut()
        setUser(null)
      }
    } else {
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    handleSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        verifyUser()
          .then(setUser)
          .catch(async () => {
            await supabase.auth.signOut()
            setUser(null)
          })
      } else {
        setUser(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
