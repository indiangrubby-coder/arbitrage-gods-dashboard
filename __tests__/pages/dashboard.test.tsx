import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Dashboard from '@/pages/dashboard'
import { useRouter } from 'next/router'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock simple-auth
jest.mock('@/lib/simple-auth', () => ({
  useSimpleAuth: jest.fn()
}))

// Mock DashboardGrid component
jest.mock('@/components/DashboardGrid', () => {
  return function MockDashboardGrid({ accounts, loading, error }: any) {
    if (loading) return <div>Loading accounts...</div>
    if (error) return <div>Error: {error}</div>
    return <div data-testid="dashboard-grid">Accounts: {accounts.length}</div>
  }
})

// Mock Toast component
jest.mock('@/components/Toast', () => ({
  ToastContainer: ({ toasts }: any) => <div data-testid="toast-container">{toasts.length} toasts</div>,
  useToast: () => ({
    toasts: [],
    showWarning: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    removeToast: jest.fn()
  })
}))

const { useSimpleAuth } = require('@/lib/simple-auth')
const mockPush = jest.fn()
const mockRouter = { push: mockPush }

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    global.fetch = jest.fn()
  })

  it('shows loading state while authenticating', () => {
    useSimpleAuth.mockReturnValue({
      user: null,
      loading: true,
      signOut: jest.fn()
    })

    render(<Dashboard />)

    expect(screen.getByText('Loading Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we authenticate...')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', async () => {
    useSimpleAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: jest.fn()
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('shows access denied UI when user is null after loading', () => {
    useSimpleAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: jest.fn()
    })

    render(<Dashboard />)

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('Please sign in to view your dashboard')).toBeInTheDocument()
  })

  it('renders dashboard when user is authenticated', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        accounts: [
          {
            account_id: 'act_123',
            vendor_name: 'Test Agency',
            spend_today: 100,
            daily_limit_display: 200
          }
        ]
      })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Account Dashboard')).toBeInTheDocument()
    })

    expect(screen.getByText(/Welcome back, Test User!/i)).toBeInTheDocument()
  })

  it('displays user information in header', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'snafu',
      name: 'Snafu User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, accounts: [] })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Snafu User')).toBeInTheDocument()
    })

    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('calls signOut and redirects on sign out button click', async () => {
    const mockSignOut = jest.fn()
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, accounts: [] })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Account Dashboard')).toBeInTheDocument()
    })

    const signOutButton = screen.getByRole('button', { name: /sign out/i })
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('fetches accounts on mount', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    const mockAccounts = [
      { account_id: 'act_123', vendor_name: 'Agency A' },
      { account_id: 'act_456', vendor_name: 'Agency B' }
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        accounts: mockAccounts
      })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/get-accounts')
    })

    await waitFor(() => {
      expect(screen.getByText('Accounts: 2')).toBeInTheDocument()
    })
  })

  it('displays error when account fetch fails', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: false,
        message: 'Database error'
      })
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error: Database error')).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'admin'
    }

    useSimpleAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: jest.fn()
    })

    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load account data')).toBeInTheDocument()
    })
  })
})
