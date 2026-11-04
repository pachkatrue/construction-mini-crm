import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, type UserProfile } from './supabase'

interface AuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: UserProfile | null
  error: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!supabase) return

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        setProfile(null)
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(data as UserProfile)
      setError(null)
    } catch (profileError) {
      setProfile(null)
      setError(profileError instanceof Error ? profileError.message : 'Не удалось загрузить профиль')
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      if (data.session) await refreshProfile()
      if (active) setLoading(false)
    }).catch((sessionError: unknown) => {
      if (!active) return
      setError(sessionError instanceof Error ? sessionError.message : 'Не удалось проверить авторизацию')
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)

      if (!nextSession) {
        setProfile(null)
        setError(null)
        setLoading(false)
        return
      }

      // Keep the auth screen in its loading state while the profile is fetched.
      // Defer the request until the Supabase auth callback has completed.
      setLoading(true)
      window.setTimeout(() => {
        if (!active) return
        void refreshProfile().finally(() => {
          if (active) setLoading(false)
        })
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }, [])

  return {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    error,
    signOut,
    refreshProfile,
  }
}
