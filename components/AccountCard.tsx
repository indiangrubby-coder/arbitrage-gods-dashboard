import React, { useState } from 'react'
import SpendProgressBar from './SpendProgressBar'
import { Account } from '@/types'

interface Props {
  account: Account
}

export default function AccountCard({ account }: Props) {
  const [copySuccess, setCopySuccess] = useState(false)
  
  const isSuspended = account.account_status === 100
  const isLoading = account.spend_today === null || account.daily_limit_display === null

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(account.account_id)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy account ID:', err)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  if (isLoading) {
    return (
      <div className="bento-tile">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-border-primary rounded-bento w-3/4"></div>
          <div className="h-4 bg-border-primary rounded-bento w-1/2"></div>
          <div className="h-4 bg-border-primary rounded-bento w-2/3"></div>
        </div>
        <p className="text-center text-text-muted mt-4 animate-fade-in">Data loading...</p>
      </div>
    )
  }

  return (
    <div
      className={`bento-tile-lg hover-lift ${
        isSuspended ? 'bg-danger-50 border-danger-200' : ''
      }`}
      data-testid="account-card"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={copyAccountId}
            className="font-mono text-sm font-medium text-text-primary hover:text-primary-600 transition-colors cursor-pointer focus-ring-moss rounded-bento px-2 py-1"
            title="Click to copy account ID"
          >
            {account.account_id}
          </button>
          {copySuccess && (
            <span className="badge badge-success animate-fade-in">
              ✓ Copied!
            </span>
          )}
        </div>
        <div className="text-sm text-text-secondary">
          Vendor: <span data-testid="vendor-name" className="font-medium text-text-primary">{account.vendor_name}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <div
          className={`status-indicator ${
            isSuspended
              ? 'status-suspended'
              : 'status-active'
          }`}
          data-testid="status-indicator"
        >
          {isSuspended ? '🚨 SUSPENDED' : '● ACTIVE'}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="space-y-4">
        {!isSuspended && account.spend_today !== null && account.daily_limit_display !== null && (
          <div className="bento-tile p-4 bg-surface-secondary">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-text-primary" data-testid="daily-spend">
                Daily Spend: ${account.spend_today.toFixed(2)} / ${account.daily_limit_display.toFixed(2)} ({account.spend_progress_percent}%)
              </span>
            </div>
            <SpendProgressBar
              spent={account.spend_today}
              cap={account.daily_limit_display}
            />
          </div>
        )}

        {isSuspended && (
          <div className="bento-tile p-4 bg-danger-50 border-danger-200">
            <p className="text-sm font-medium text-danger-800">
              Final Spend: ${account.spend_today?.toFixed(2) || 'N/A'} of ${account.daily_limit_display?.toFixed(2) || 'N/A'} daily cap
            </p>
            <p className="text-xs text-danger-600 mt-2">
              Lifetime Clicks: {account.outbound_clicks?.toLocaleString() || 'N/A'}
            </p>
          </div>
        )}

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bento-tile p-3 hover-scale">
            <div className="text-xs text-text-muted mb-1">Active Ads</div>
            <div className="text-lg font-semibold text-text-primary" data-testid="active-ads">
              {account.active_ads_count || 0} / {account.total_ads_count || 0}
            </div>
          </div>
          <div className="bento-tile p-3 hover-scale">
            <div className="text-xs text-text-muted mb-1">Avg CPC</div>
            <div className="text-lg font-semibold text-text-primary" data-testid="avg-cpc">
              ${account.cpc?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="bento-tile p-3 hover-scale">
            <div className="text-xs text-text-muted mb-1">Clicks</div>
            <div className="text-lg font-semibold text-text-primary" data-testid="clicks">
              {account.outbound_clicks?.toLocaleString() || 'N/A'}
            </div>
          </div>
          <div className="bento-tile p-3 hover-scale">
            <div className="text-xs text-text-muted mb-1">Balance</div>
            <div className="text-lg font-semibold text-text-primary" data-testid="balance">
              ${account.account_balance?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border-primary flex justify-between items-center">
        <div className="text-xs text-text-muted" data-testid="last-update">
          Updated: {formatTimeAgo(account.snapshot_time)}
        </div>
        {!isSuspended && (
          <button
            onClick={copyAccountId}
            className="btn btn-secondary btn-sm"
          >
            Copy ID
          </button>
        )}
      </div>
    </div>
  )
}