import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Mock gtag
const mockGtag = jest.fn()
global.gtag = mockGtag

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    (console.error as jest.Mock).mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument()
  })

  it('displays reload button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    expect(reloadButton).toBeInTheDocument()
  })

  it('displays retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('resets error state when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)

    // After retry, re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument()
  })

  it('reloads page when reload button is clicked', () => {
    // Mock window.location.reload
    delete (window as any).location
    window.location = { reload: jest.fn() } as any

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    fireEvent.click(reloadButton)

    expect(window.location.reload).toHaveBeenCalled()
  })

  it('sends error to Google Analytics if gtag is available', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
      description: 'Test error message',
      fatal: true
    })
  })

  it('shows error stack in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // In development, component info should be displayed
    expect(screen.getByText(/Error Details/i)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error stack in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // In production, detailed error info should not be shown
    expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('displays user-friendly message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Please try refreshing the page or contact support/i)).toBeInTheDocument()
  })

  it('maintains error boundary across multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <ThrowError shouldThrow={true} />
        <div>Child 3</div>
      </ErrorBoundary>
    )

    // When error occurs, all children are replaced with error UI
    expect(screen.queryByText('Child 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Child 3')).not.toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })
})
