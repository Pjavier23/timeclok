import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose?: () => void
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const colors = {
    success: { bg: 'rgba(100, 200, 100, 0.2)', border: 'rgba(100, 200, 100, 0.5)', text: '#64c864' },
    error: { bg: 'rgba(255, 0, 110, 0.2)', border: 'rgba(255, 0, 110, 0.5)', text: '#ff006e' },
    info: { bg: 'rgba(0, 217, 255, 0.2)', border: 'rgba(0, 217, 255, 0.5)', text: '#00d9ff' },
  }

  const color = colors[type]

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      background: color.bg,
      border: `1px solid ${color.border}`,
      color: color.text,
      padding: '1rem 1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
    }}>
      {message}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
