import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthContextType, User as AppUser } from '@/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const appUser: AppUser = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata as any
        }
        setUser(appUser)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (session?.user) {
          const appUser: AppUser = {
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata as any
          }
          setUser(appUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      // Strict validation against hardcoded credentials
      const validCredentials = [
        { username: 'snafu', password: 'random@123' },
        { username: 'sid', password: 'random@1234' }
      ]

      const isValid = validCredentials.some(cred =>
        email === cred.username && password === cred.password
      )

      if (!isValid) {
        throw new Error('Invalid credentials')
      }

      // Create mock user session for valid credentials
      const mockUser = {
        id: email === 'snafu' ? 'user-1' : 'user-2',
        email: email,
        user_metadata: {
          name: email === 'snafu' ? 'Snafu User' : 'Sid User',
          role: email === 'snafu' ? 'admin' : 'viewer'
        }
      }

      setUser(mockUser)

      // Log sign in event
      if (typeof window !== 'undefined') {
        await logAuditEvent('sign_in', 'user', email, null, null)
      }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string, role: 'admin' | 'viewer' = 'viewer') => {
    // Explicitly prevent user creation
    throw new Error('User registration is disabled. Please contact system administrator.')
  }

  const resetPassword = async (email: string) => {
    // Explicitly prevent password reset
    throw new Error('Password reset is disabled. Please contact system administrator.')
  }

  const updatePassword = async (newPassword: string) => {
    // Explicitly prevent password updates
    throw new Error('Password updates are disabled. Please contact system administrator.')
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Log sign out event
      if (typeof window !== 'undefined' && user) {
        await logAuditEvent('sign_out', 'user', user.email, null, null)
      }

      await supabase.auth.signOut()
      setUser(null)
      
      // Clear any local storage items if needed
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
        return false
      }
      
      if (session?.user) {
        const appUser: AppUser = {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata as any
        }
        setUser(appUser)
        return true
      }
      return false
    } catch (error) {
      console.error('Error refreshing session:', error)
      return false
    }
  }

  const updateUserRole = async (newRole: 'admin' | 'viewer') => {
    if (!user) {
      throw new Error('No authenticated user found')
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          user_metadata: {
            ...user.user_metadata,
            role: newRole
          }
        }
      })
      
      if (error) {
        throw error
      }

      // Update local state
      const updatedUser: AppUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          role: newRole
        }
      }
      setUser(updatedUser)

      // Log role change
      if (typeof window !== 'undefined') {
        await logAuditEvent('role_change', 'user', user.email,
          { role: user.user_metadata?.role },
          { role: newRole })
      }
      
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }

  const logAuditEvent = async (action: string, resourceType: string, resourceId: string | null, oldValues: any, newValues: any) => {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id || null,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          old_values: oldValues,
          new_values: newValues,
          ip_address: null, // Could be enhanced with client IP detection
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
        })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }

  const hasPermission = (action: string): boolean => {
    if (!user) return false
    
    const role = user.user_metadata?.role || 'viewer'
    const permissions = {
      admin: ['view', 'add', 'remove', 'export', 'archive', 'manage_users', 'manage_accounts'],
      viewer: ['view']
    }
    
    return permissions[role as keyof typeof permissions]?.includes(action) || false
  }

  const isAdmin = (): boolean => {
    return user?.user_metadata?.role === 'admin'
  }

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users')
  }

  const canManageAccounts = (): boolean => {
    return hasPermission('manage_accounts')
  }

  const canExport = (): boolean => {
    return hasPermission('export')
  }

  const canArchive = (): boolean => {
    return hasPermission('archive')
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    updateUserRole,
    hasPermission,
    isAdmin,
    canManageUsers,
    canManageAccounts,
    canExport,
    canArchive
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}