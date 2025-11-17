import { render, screen } from '@testing-library/react'
import SpendProgressBar from './SpendProgressBar'

describe('SpendProgressBar', () => {
  test('displays spend percentage correctly', () => {
    render(
      <SpendProgressBar 
        spent={75.50} 
        cap={100.00} 
      />
    )
    
    expect(screen.getByText('75.5%')).toBeInTheDocument()
  })
  
  test('shows green color when spend 70-110% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={85} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar-fill')
    expect(bar).toHaveClass('bg-success-500')
  })
  
  test('shows amber color when spend <70% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={60} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar-fill')
    expect(bar).toHaveClass('bg-warning-500')
  })
  
  test('shows red color when spend >110% of cap', () => {
    const { container } = render(
      <SpendProgressBar spent={115} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar-fill')
    expect(bar).toHaveClass('bg-danger-500')
  })
  
  test('handles cap of $0 gracefully', () => {
    render(<SpendProgressBar spent={50} cap={0} />)
    expect(screen.getByText('Cap unavailable')).toBeInTheDocument()
  })
  
  test('handles null values gracefully', () => {
    render(<SpendProgressBar spent={null} cap={null} />)
    expect(screen.getByText('Data loading...')).toBeInTheDocument()
  })

  test('clips progress bar at 100% width', () => {
    const { container } = render(
      <SpendProgressBar spent={150} cap={100} />
    )
    
    const bar = container.querySelector('.progress-bar-fill')
    expect(bar).toHaveStyle('width: 100%')
  })

  test('displays correct percentage for edge case exactly 70%', () => {
    render(<SpendProgressBar spent={70} cap={100} />)
    expect(screen.getByText('70.0%')).toBeInTheDocument()
  })

  test('displays correct percentage for edge case exactly 110%', () => {
    render(<SpendProgressBar spent={110} cap={100} />)
    expect(screen.getByText('110.0%')).toBeInTheDocument()
  })
})