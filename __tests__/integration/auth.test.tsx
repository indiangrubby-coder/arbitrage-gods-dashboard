import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/auth'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'

// Mock the router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock Supabase auth
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      refreshSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    }
  }
}))

describe('Authentication Integration Tests', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: {},
      pathname: '/login'
    })
  })

  describe('Login Page', () => {
    test('renders login form correctly', () => {
      render(<Login />)
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    test('handles successful sign in', async () => {
      const mockSignIn = jest.fn()
      jest.mock('@/lib/auth', () => ({
        useAuth: () => ({
          signIn: mockSignIn
        })
      }))
      
      render(<Login />)
      
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      fireEvent.change(usernameInput, { target: { value: 'snafu' } })
      fireEvent.change(passwordInput, { target: { value: 'random@123' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('snafu', 'random@123')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('handles sign in error', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Invalid credentials'))
      jest.mock('@/lib/auth', () => ({
        useAuth: () => ({
          signIn: mockSignIn
        })
      }))
      
      render(<Login />)
      
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    test('shows password reset disabled message', () => {
      render(<Login />)
      
      // Should show system notice about disabled password reset
      expect(screen.getByText(/Password reset is disabled/i)).toBeInTheDocument()
      expect(screen.getByText(/System Notice:/i)).toBeInTheDocument()
      expect(screen.getByText(/strict two-user authentication/i)).toBeInTheDocument()
    })
  })

  describe('Dashboard Authentication', () => {
    test('redirects unauthenticated users to login', async () => {
      // Mock useAuth to return no user
      jest.doMock('@/lib/auth', () => ({
        useAuth: () => ({
          user: null,
          loading: false,
          signIn: jest.fn(),
          signOut: jest.fn()
        })
      }))

      render(<Dashboard />)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    test('shows dashboard for authenticated users', async () => {
      // Mock useAuth to return authenticated user
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User', role: 'viewer' }
      }
      
      jest.doMock('@/lib/auth', () => ({
        useAuth: () => ({
          user: mockUser,
          loading: false,
          signIn: jest.fn(),
          signOut: jest.fn()
        })
      }))

      render(<Dashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument()
        expect(screen.getByText(/account dashboard/i)).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    test('handles sign out correctly', async () => {
      const mockSignOut = jest.fn()
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User', role: 'viewer' }
      }
      
      jest.doMock('@/lib/auth', () => ({
        useAuth: () => ({
          user: mockUser,
          loading: false,
          signIn: jest.fn(),
          signOut: mockSignOut
        })
      }))

      render(<Dashboard />)
      
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument()
      })
      
      const signOutButton = screen.getByText(/sign out/i)
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })
  })

  describe('Role-Based Access Control', () => {
    test('admin users have all permissions', () => {
      const mockUser = {
        id: '123',
        email: 'admin@example.com',
        user_metadata: { name: 'Admin User', role: 'admin' }
      }
      
      jest.doMock('@/lib/auth', () => ({
        useAuth: () => ({
          user: mockUser,
          loading: false,
          signIn: jest.fn(),
          signOut: jest.fn(),
          hasPermission: (action: string) => true, // Admin has all permissions
          isAdmin: () => true,
          canManageUsers: () => true,
          canManageAccounts: () => true,
          canExport: () => true,
          canArchive: () => true
        })
      }))

      const { result } = renderHook(() => useAuth(), { wrapper: ({ children }) => children })
      
      expect(result.current.isAdmin()).toBe(true)
      expect(result.current.canManageUsers()).toBe(true)
      expect(result.current.canManageAccounts()).toBe(true)
      expect(result.current.canExport()).toBe(true)
      expect(result.current.canArchive()).toBe(true)
    })

    test('viewer users have limited permissions', () => {
      const mockUser = {
        id: '456',
        email: 'viewer@example.com',
        user_metadata: { name: 'Viewer User', role: 'viewer' }
      }
      
      jest.doMock('@/lib/auth', () => ({
        useAuth: () => ({
          user: mockUser,
          loading: false,
          signIn: jest.fn(),
          signOut: jest.fn(),
          hasPermission: (action: string) => action === 'view', // Only view permission
          isAdmin: () => false,
          canManageUsers: () => false,
          canManageAccounts: () => false,
          canExport: () => false,
          canArchive: () => false
        })
      }))

      const { result } = renderHook(() => useAuth(), { wrapper: ({ children }) => children })
      
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.canManageUsers()).toBe(false)
      expect(result.current.canManageAccounts()).toBe(false)
      expect(result.current.canExport()).toBe(false)
      expect(result.current.canArchive()).toBe(false)
      expect(result.current.hasPermission('view')).toBe(true)
      expect(result.current.hasPermission('add')).toBe(false)
    })
  })

  describe('Session Persistence', () => {
    test('refreshes session automatically', async () => {
      const mockRefreshSession = require('@/lib/supabase').supabase.auth.refreshSession
      mockRefreshSession.mockResolvedValue({
        data: { 
          session: {
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: { name: 'Test User', role: 'viewer' }
            }
          }
        },
        error: null
      })
      
      // Test session refresh logic
      const { result } = renderHook(() => useAuth(), { wrapper: ({ children }) => children })
      
      const refreshResult = await result.current.refreshSession()
      
      expect(refreshResult).toBe(true)
      expect(mockRefreshSession).toHaveBeenCalled()
    })

    test('handles session refresh failure', async () => {
      const mockRefreshSession = require('@/lib/supabase').supabase.auth.refreshSession
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
      })
      
      const { result } = renderHook(() => useAuth(), { wrapper: ({ children }) => children })
      
      const refreshResult = await result.current.refreshSession()
      
      expect(refreshResult).toBe(false)
      expect(mockRefreshSession).toHaveBeenCalled()
    })
  })
})

// Helper function to render hooks in tests
function renderHook<T, R>(hook: () => T, { wrapper }: { wrapper?: ({ children }: { children: React.ReactNode }) => React.ReactElement } = {}): { result: { current: R } } {
  const result = { current: {} as R }
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    const hookResult = hook()
    Object.assign(result, { current: hookResult })
    return wrapper ? wrapper({ children }) : <>{children}</>
  }
  
  render(<Wrapper><div /></Wrapper>)
  
  return { result }
}