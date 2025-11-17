import { render, screen, fireEvent } from '@testing-library/react'
import DashboardGrid from './DashboardGrid'
import { Account } from '@/types'

const mockAccounts: Account[] = [
  {
    account_id: 'act_1234567890',
    vendor_name: 'Agency Alpha',
    spend_today: 247.80,
    daily_limit_display: 250.00,
    spend_progress_percent: '99.1',
    account_status: 1,
    cpc: 0.34,
    outbound_clicks: 4287,
    active_ads_count: 12,
    total_ads_count: 18,
    account_balance: 1847.50,
    snapshot_time: '2024-11-17T15:42:00Z'
  },
  {
    account_id: 'act_2345678901',
    vendor_name: 'Agency Beta',
    spend_today: 125.50,
    daily_limit_display: 200.00,
    spend_progress_percent: '62.8',
    account_status: 1,
    cpc: 0.28,
    outbound_clicks: 2156,
    active_ads_count: 8,
    total_ads_count: 15,
    account_balance: 3250.00,
    snapshot_time: '2024-11-17T15:30:00Z'
  },
  {
    account_id: 'act_3456789012',
    vendor_name: 'Agency Gamma',
    spend_today: 0,
    daily_limit_display: 150.00,
    spend_progress_percent: '0.0',
    account_status: 100,
    cpc: null,
    outbound_clicks: 0,
    active_ads_count: 0,
    total_ads_count: 5,
    account_balance: 500.00,
    snapshot_time: '2024-11-17T14:20:00Z'
  }
]

describe('DashboardGrid', () => {
  test('renders account cards in bento grid layout', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  test('displays loading state when accounts are empty', () => {
    render(<DashboardGrid accounts={[]} loading={true} />)
    
    expect(screen.getByText('Loading accounts...')).toBeInTheDocument()
  })

  test('displays empty state when no accounts', () => {
    render(<DashboardGrid accounts={[]} loading={false} />)
    
    expect(screen.getByText('No accounts found')).toBeInTheDocument()
    expect(screen.getByText('Get started by adding your first Facebook ad account')).toBeInTheDocument()
  })

  test('displays error state when error provided', () => {
    render(<DashboardGrid accounts={[]} error="Failed to load accounts" />)
    
    expect(screen.getByText('Error loading accounts')).toBeInTheDocument()
    expect(screen.getByText('Failed to load accounts')).toBeInTheDocument()
  })

  test('filters suspended accounts correctly', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    // Click suspended filter button - use getAllByText and get the button
    const suspendedButtons = screen.getAllByText('Suspended')
    const suspendedButton = suspendedButtons.find(btn => btn.tagName === 'BUTTON')
    fireEvent.click(suspendedButton)
    
    const suspendedCards = screen.getAllByTestId('account-card')
    expect(suspendedCards).toHaveLength(1)
    expect(screen.getByText('🚨 SUSPENDED')).toBeInTheDocument()
  })

  test('filters active accounts correctly', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    // Click active filter button - use getAllByText and get the button
    const activeButtons = screen.getAllByText('Active')
    const activeButton = activeButtons.find(btn => btn.tagName === 'BUTTON')
    expect(activeButton).toBeDefined()
    activeButton && fireEvent.click(activeButton)
    
    const activeCards = screen.getAllByTestId('account-card')
    expect(activeCards).toHaveLength(2)
    expect(screen.getAllByText('● ACTIVE')).toHaveLength(2)
  })

  test('displays account statistics', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Total Accounts')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // Use getAllByText for Active since it appears in both stats and filter
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getAllByText('Suspended')).toHaveLength(2)
    expect(screen.getByText('$373.30')).toBeInTheDocument()
    expect(screen.getByText('Total Daily Spend')).toBeInTheDocument()
  })

  test('applies correct bento grid classes', () => {
    const { container } = render(<DashboardGrid accounts={mockAccounts} />)
    
    const grid = screen.getByTestId('dashboard-grid')
    expect(grid).toHaveClass('bento-grid', 'm-6')
  })

  test('shows search functionality', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    expect(screen.getByPlaceholderText('Search accounts...')).toBeInTheDocument()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })

  test('shows filter buttons', () => {
    render(<DashboardGrid accounts={mockAccounts} />)
    
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2) // One in stats, one in filter
    expect(screen.getAllByText('Suspended')).toHaveLength(2) // One in stats, one in filter
  })
})