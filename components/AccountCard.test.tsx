import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountCard from './AccountCard'
import { Account } from '@/types'

// Mock clipboard API
const mockWriteText = jest.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText
  }
})

// Mock setTimeout
jest.useFakeTimers()

const mockAccount: Account = {
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
}

describe('AccountCard', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
  })

  test('displays account information correctly', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('act_1234567890')).toBeInTheDocument()
    expect(screen.getByText('Vendor:')).toBeInTheDocument()
    expect(screen.getByTestId('vendor-name')).toHaveTextContent('Agency Alpha')
    
    const dailySpendElement = screen.getByTestId('daily-spend')
    expect(dailySpendElement).toHaveTextContent('Daily Spend: $247.80 / $250.00 (99.1%)')
  })

  test('copies account ID to clipboard on click', async () => {
    render(<AccountCard account={mockAccount} />)
    
    const accountId = screen.getByText('act_1234567890')
    fireEvent.click(accountId)
    
    expect(mockWriteText).toHaveBeenCalledWith('act_1234567890')
    
    // Check for "Copied!" message
    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument()
    })
  })

  test('displays suspended state with red background', () => {
    const suspendedAccount = { ...mockAccount, account_status: 100 }
    render(<AccountCard account={suspendedAccount} />)
    
    const card = screen.getByTestId('account-card')
    expect(card).toHaveClass('bg-danger-50', 'border-danger-200')
    expect(screen.getByText('🚨 SUSPENDED')).toBeInTheDocument()
  })

  test('handles null values gracefully', () => {
    const nullAccount: Account = {
      account_id: 'act_123',
      vendor_name: 'Test Vendor',
      spend_today: null,
      daily_limit_display: null,
      spend_progress_percent: null,
      account_status: 1,
      cpc: null,
      outbound_clicks: null,
      active_ads_count: null,
      total_ads_count: null,
      account_balance: null,
      snapshot_time: '2024-11-17T15:42:00Z'
    }
    
    render(<AccountCard account={nullAccount} />)
    expect(screen.getByText('Data loading...')).toBeInTheDocument()
  })

  test('displays spend progress bar with correct percentage', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('99.1%')).toBeInTheDocument()
  })

  test('shows active status for non-suspended accounts', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('● ACTIVE')).toBeInTheDocument()
    const statusIndicator = screen.getByTestId('status-indicator')
    expect(statusIndicator).toHaveClass('status-active')
  })

  test('displays CPC and clicks correctly', () => {
    render(<AccountCard account={mockAccount} />)
    
    const cpcElement = screen.getByTestId('avg-cpc')
    expect(cpcElement).toHaveTextContent('$0.34')
    
    const clicksElement = screen.getByTestId('clicks')
    expect(clicksElement).toHaveTextContent('4,287')
  })

  test('displays ad counts correctly', () => {
    render(<AccountCard account={mockAccount} />)
    
    const activeAdsElement = screen.getByTestId('active-ads')
    expect(activeAdsElement).toHaveTextContent('12 / 18')
  })

  test('displays account balance correctly', () => {
    render(<AccountCard account={mockAccount} />)
    
    const balanceElement = screen.getByTestId('balance')
    expect(balanceElement).toHaveTextContent('$1847.50')
  })

  test('shows last update time', () => {
    render(<AccountCard account={mockAccount} />)
    
    const lastUpdateElement = screen.getByTestId('last-update')
    expect(lastUpdateElement).toHaveTextContent(/364 days ago/)
  })

  test('hides copy ID button for suspended accounts', () => {
    const suspendedAccount = { ...mockAccount, account_status: 100 }
    render(<AccountCard account={suspendedAccount} />)
    
    expect(screen.queryByText('Copy ID')).not.toBeInTheDocument()
  })

  test('shows copy ID button for active accounts', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('Copy ID')).toBeInTheDocument()
  })

  afterAll(() => {
    jest.useRealTimers()
  })
})