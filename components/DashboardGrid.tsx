import React, { useState, useMemo } from 'react'
import AccountCard from './AccountCard'
import { Account } from '@/types'

interface Props {
  accounts: Account[]
  loading?: boolean
  error?: string | null
  filterSuspended?: boolean
}

export default function DashboardGrid({
  accounts,
  loading = false,
  error = null,
  filterSuspended
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Determine initial filter based on props
  const initialFilter = filterSuspended === true ? 'suspended' :
                        filterSuspended === false ? 'active' : 'all'
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>(initialFilter)

  // Filter accounts based on search and filter
  const filteredAccounts = useMemo(() => {
    let filtered = accounts

    // Apply suspended/active filter
    if (filter === 'active') {
      filtered = filtered.filter(account => account.account_status !== 100)
    } else if (filter === 'suspended') {
      filtered = filtered.filter(account => account.account_status === 100)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.account_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [accounts, searchTerm, filter])

  // Calculate statistics
  const statistics = useMemo(() => {
    const activeAccounts = accounts.filter(account => account.account_status !== 100)
    const suspendedAccounts = accounts.filter(account => account.account_status === 100)
    const totalSpend = accounts.reduce((sum, account) => 
      sum + (account.spend_today || 0), 0
    )

    return {
      total: accounts.length,
      active: activeAccounts.length,
      suspended: suspendedAccounts.length,
      totalSpend
    }
  }, [accounts])

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="bento-tile-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Loading accounts...</h2>
          <p className="text-text-secondary">Please wait while we fetch your account data</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="bento-tile-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-danger-800 mb-2">Error loading accounts</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="bento-tile-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">No accounts found</h2>
          <p className="text-text-secondary mb-6">Get started by adding your first Facebook ad account</p>
          <button className="btn btn-primary">
            Add Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header with Statistics */}
      <div className="bento-tile-lg m-6 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Account Dashboard</h1>
            <p className="text-text-secondary">Monitor your Facebook ad accounts in real-time</p>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 lg:mt-0">
            <div className="bento-tile p-4 text-center hover-scale">
              <div className="text-2xl font-bold text-text-primary">{statistics.total}</div>
              <div className="text-sm text-text-muted">Total Accounts</div>
            </div>
            <div className="bento-tile p-4 text-center hover-scale">
              <div className="text-2xl font-bold text-success-600">{statistics.active}</div>
              <div className="text-sm text-text-muted">Active</div>
            </div>
            <div className="bento-tile p-4 text-center hover-scale">
              <div className="text-2xl font-bold text-danger-600">{statistics.suspended}</div>
              <div className="text-sm text-text-muted">Suspended</div>
            </div>
            <div className="bento-tile p-4 text-center hover-scale">
              <div className="text-2xl font-bold text-primary-600">${statistics.totalSpend.toFixed(2)}</div>
              <div className="text-sm text-text-muted">Total Daily Spend</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              data-testid="search-input"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`btn btn-sm ${filter === 'suspended' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Account Grid */}
      <div className="bento-grid m-6" data-testid="dashboard-grid">
        {filteredAccounts.map((account) => (
          <AccountCard key={account.account_id} account={account} />
        ))}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredAccounts.length === 0 && (
        <div className="bento-tile-lg m-6 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">No accounts found</h3>
          <p className="text-text-secondary">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </div>
  )
}