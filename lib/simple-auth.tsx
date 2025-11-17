import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SimpleUser {
  id: string
  username: string
  name: string
  role: 'admin' | 'viewer'
}

interface SimpleAuthContextType {
  user: SimpleUser | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
  hasPermission: (action: string) => boolean
  isAdmin: () => boolean
  canManageUsers: () => boolean
  canManageAccounts: () => boolean
  canExport: () => boolean
  canArchive: () => boolean
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

// Hardcoded user credentials
const VALID_USERS = [
  {
    username: 'snafu',
    password: 'random@123',
    name: 'Snafu User',
    role: 'admin' as const,
    id: 'user-1'
  },
  {
    username: 'sid',
    password: 'random@1234',
    name: 'Sid User',
    role: 'viewer' as const,
    id: 'user-2'
  }
]

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('arbitrage_gods_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('arbitrage_gods_user')
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (username: string, password: string) => {
    setLoading(true)
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const validUser = VALID_USERS.find(
      u => u.username === username && u.password === password
    )
    
    if (validUser) {
      const userToStore = {
        id: validUser.id,
        username: validUser.username,
        name: validUser.name,
        role: validUser.role
      }
      setUser(userToStore)
      // Persist session to localStorage
      localStorage.setItem('arbitrage_gods_user', JSON.stringify(userToStore))
    } else {
      setLoading(false)
      throw new Error('Invalid credentials')
    }
    
    setLoading(false)
  }

  const signOut = () => {
    setUser(null)
    // Clear session from localStorage
    localStorage.removeItem('arbitrage_gods_user')
  }

  const hasPermission = (action: string): boolean => {
    if (!user) return false
    
    const permissions = {
      admin: ['view', 'add', 'remove', 'export', 'archive', 'manage_users', 'manage_accounts'],
      viewer: ['view']
    }
    
    return permissions[user.role]?.includes(action) || false
  }

  const isAdmin = (): boolean => {
    return user?.role === 'admin'
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

  const value: SimpleAuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    hasPermission,
    isAdmin,
    canManageUsers,
    canManageAccounts,
    canExport,
    canArchive
  }

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  )
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}