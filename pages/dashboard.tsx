import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSimpleAuth } from '@/lib/simple-auth'
import DashboardGrid from '@/components/DashboardGrid'
import { ToastContainer, useToast } from '@/components/Toast'
import type { Account } from '@/types'

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useSimpleAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const { toasts, showWarning, showError, removeToast } = useToast()

  // Track suspended accounts to show alerts
  const [suspendedAccounts, setSuspendedAccounts] = useState<Set<string>>(new Set())

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch account data
  useEffect(() => {
    if (user) {
      fetchAccounts()
      // Refresh every 30 seconds
      const interval = setInterval(fetchAccounts, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true)
      setAccountsError(null)
      
      const response = await fetch('/api/get-accounts')
      const data = await response.json()
      
      if (data.success) {
        const newAccounts = data.accounts || []
        
        // Check for newly suspended accounts
        newAccounts.forEach((account: Account) => {
          if (account.account_status === 100 && !suspendedAccounts.has(account.account_id)) {
            showWarning(
              `Account ${account.vendor_name} (${account.account_id}) has been suspended!`,
              8000
            )
            setSuspendedAccounts(prev => new Set(prev).add(account.account_id))
          }
        })
        
        setAccounts(newAccounts)
      } else {
        const errorMsg = data.message || 'Failed to fetch accounts'
        setAccountsError(errorMsg)
        showError(errorMsg, 5000)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      const errorMsg = 'Failed to load account data'
      setAccountsError(errorMsg)
      showError(errorMsg, 5000)
    } finally {
      setAccountsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="bento-tile-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Loading Dashboard</h2>
          <p className="text-text-secondary">Please wait while we authenticate...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="bento-tile-xl p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h2>
          <p className="text-text-secondary mb-6">Please sign in to view your dashboard</p>
          <button 
            onClick={() => router.push('/login')}
            className="btn btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="bento-tile-lg m-6 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Account Dashboard</h1>
            <p className="text-text-secondary">Welcome back, {user?.name || 'User'}!</p>
          </div>
          
          {/* User Info */}
          <div className="bento-tile p-4 bg-surface-secondary">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-primary-600">{user?.username?.charAt(0).toUpperCase()}</div>
              <div>
                <div className="text-sm text-text-primary font-medium">{user?.name || 'User'}</div>
                <div className="text-xs text-text-muted capitalize">{user?.role || 'viewer'}</div>
              </div>
            </div>
            <button
              onClick={() => {
                signOut()
                router.push('/login')
              }}
              className="btn btn-secondary btn-sm mt-3 w-full"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <DashboardGrid 
        accounts={accounts} 
        loading={accountsLoading}
        error={accountsError}
      />
    </div>
  )
}