import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useRouter } from 'next/router'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'
import { useSimpleAuth, SimpleAuthProvider } from '@/lib/simple-auth'

// Mock router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Authentication Integration Tests', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      query: {},
      pathname: '/login'
    })
  })

  describe('Login Page', () => {
    test('renders login form correctly', () => {
      render(
        <SimpleAuthProvider>
          <Login />
        </SimpleAuthProvider>
      )
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    test('handles successful sign in', async () => {
      render(
        <SimpleAuthProvider>
          <Login />
        </SimpleAuthProvider>
      )
      
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await act(async () => {
        await userEvent.type(usernameInput, 'snafu')
        await userEvent.type(passwordInput, 'random@123')
        await userEvent.click(submitButton)
      })
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('handles sign in error', async () => {
      render(
        <SimpleAuthProvider>
          <Login />
        </SimpleAuthProvider>
      )
      
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(usernameInput, 'wronguser')
      await userEvent.type(passwordInput, 'wrongpass')
      await userEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('Dashboard Authentication', () => {
    test('redirects unauthenticated users to login', () => {
      render(
        <SimpleAuthProvider>
          <Dashboard />
        </SimpleAuthProvider>
      )
      
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
      expect(screen.getByText(/Please sign in to view your dashboard/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument()
    })

    test('shows dashboard for authenticated users', async () => {
      // Mock authenticated user
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: { id: '1', username: 'snafu', role: 'admin' },
        token: 'mock-token'
      }))

      render(
        <SimpleAuthProvider>
          <Dashboard />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
        expect(screen.getByText(/Account Dashboard/i)).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })

    test('handles sign out correctly', async () => {
      // Mock authenticated user
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: { id: '1', username: 'snafu', role: 'admin' },
        token: 'mock-token'
      }))

      render(
        <SimpleAuthProvider>
          <Dashboard />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
      })
      
      const signOutButton = screen.getByText(/Sign Out/i)
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('arbitrage_gods_user')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Role-Based Access Control', () => {
    test('admin users have all permissions', async () => {
      const TestComponent = () => {
        const { user, isAdmin, hasPermission } = useSimpleAuth()
        return (
          <div>
            <div data-testid="user-role">{user?.role}</div>
            <div data-testid="is-admin">{isAdmin().toString()}</div>
            <div data-testid="can-read">{hasPermission('view').toString()}</div>
            <div data-testid="can-write">{hasPermission('add').toString()}</div>
            <div data-testid="can-delete">{hasPermission('remove').toString()}</div>
          </div>
        )
      }

      // Mock admin user
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        id: 'user-1',
        username: 'snafu',
        name: 'Snafu User',
        role: 'admin'
      }))

      render(
        <SimpleAuthProvider>
          <TestComponent />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
        expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
        expect(screen.getByTestId('can-read')).toHaveTextContent('true')
        expect(screen.getByTestId('can-write')).toHaveTextContent('true')
        expect(screen.getByTestId('can-delete')).toHaveTextContent('true')
      })
    })

    test('viewer users have limited permissions', async () => {
      const TestComponent = () => {
        const { user, isAdmin, hasPermission } = useSimpleAuth()
        return (
          <div>
            <div data-testid="user-role">{user?.role}</div>
            <div data-testid="is-admin">{isAdmin().toString()}</div>
            <div data-testid="can-read">{hasPermission('view').toString()}</div>
            <div data-testid="can-write">{hasPermission('add').toString()}</div>
            <div data-testid="can-delete">{hasPermission('remove').toString()}</div>
          </div>
        )
      }

      // Mock viewer user
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        id: 'user-2',
        username: 'sid',
        name: 'Sid User',
        role: 'viewer'
      }))

      render(
        <SimpleAuthProvider>
          <TestComponent />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('user-role')).toHaveTextContent('viewer')
        expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
        expect(screen.getByTestId('can-read')).toHaveTextContent('true')
        expect(screen.getByTestId('can-write')).toHaveTextContent('false')
        expect(screen.getByTestId('can-delete')).toHaveTextContent('false')
      })
    })
  })

  describe('Session Persistence', () => {
    test('persists user session to localStorage', async () => {
      render(
        <SimpleAuthProvider>
          <Login />
        </SimpleAuthProvider>
      )
      
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(usernameInput, 'snafu')
      await userEvent.type(passwordInput, 'random@123')
      await userEvent.click(submitButton)
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'arbitrage_gods_user',
          expect.stringContaining('snafu')
        )
      })
    })

    test('loads session from localStorage on mount', async () => {
      const TestComponent = () => {
        const { user } = useSimpleAuth()
        return (
          <div data-testid="loaded-user">
            {user ? `${user.username} - ${user.role}` : 'No user'}
          </div>
        )
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        id: 'user-1',
        username: 'snafu',
        name: 'Snafu User',
        role: 'admin'
      }))

      render(
        <SimpleAuthProvider>
          <TestComponent />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('loaded-user')).toHaveTextContent('snafu - admin')
      })
    })

    test('clears session on sign out', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        id: 'user-1',
        username: 'snafu',
        name: 'Snafu User',
        role: 'admin'
      }))

      render(
        <SimpleAuthProvider>
          <Dashboard />
        </SimpleAuthProvider>
      )
      
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
      })
      
      const signOutButton = screen.getByText(/Sign Out/i)
      fireEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('arbitrage_gods_user')
      })
    })
  })
})