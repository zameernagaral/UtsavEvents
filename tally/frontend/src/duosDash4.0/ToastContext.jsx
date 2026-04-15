import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'ok') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2.5">
        {toasts.map(t => (
          <Toast key={t.id} msg={t.msg} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ msg, type }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-5 py-3 text-sm font-mono rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[slideIn_.3s_ease] min-w-[220px] max-w-[360px] ${
        type === 'err'
          ? 'bg-black text-[#ff6b6b] border border-[#c0392b]'
          : 'bg-black text-[#f5f5f0] border border-[#333]'
      }`}
    >
      <span>{type === 'err' ? '✗' : '✓'}</span>
      {msg}
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}