import React from 'react'

interface Props {
  spent: number | null
  cap: number | null
}

export default function SpendProgressBar({ spent, cap }: Props) {
  // Validation
  if (spent === null || cap === null) {
    return <div className="text-sm text-text-muted">Data loading...</div>
  }
  
  if (cap === 0) {
    return <div className="text-sm text-text-muted">Cap unavailable</div>
  }
  
  // Calculate percentage
  const percentage = (spent / cap) * 100
  const displayPercentage = percentage.toFixed(1)
  
  // Determine color based on percentage using Moss palette
  let colorClass = 'bg-success-500'
  if (percentage < 70) colorClass = 'bg-warning-500'
  if (percentage > 110) colorClass = 'bg-danger-500'
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-text-primary">{displayPercentage}%</span>
        <span className="text-xs text-text-muted">
          ${spent.toFixed(2)} / ${cap.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-border-primary rounded-full h-3 shadow-inner">
        <div
          className={`h-full rounded-full progress-bar-fill shadow-bento ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}