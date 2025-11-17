import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(id), 300) // Wait for exit animation
  }

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  }

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600'
  }

  return (
    <div
      className={`
        toast-notification
        ${isVisible ? 'toast-enter' : 'toast-exit'}
        ${styles[type]}
        flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg
        max-w-md w-full
      `}
      role="alert"
    >
      <div className={iconStyles[type]}>
        {icons[type]}
      </div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: Array<Omit<ToastProps, 'onClose'>>
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="toast-container fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Array<Omit<ToastProps, 'onClose'>>>([])

  const addToast = (type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const showSuccess = (message: string, duration?: number) => addToast('success', message, duration)
  const showError = (message: string, duration?: number) => addToast('error', message, duration)
  const showWarning = (message: string, duration?: number) => addToast('warning', message, duration)
  const showInfo = (message: string, duration?: number) => addToast('info', message, duration)

  return {
    toasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast
  }
}
