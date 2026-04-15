import { useState } from 'react'
import { login, setToken } from '../api'
import { useToast } from '../ToastContext'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!username || !password) { setError('Fill in all fields'); return }
    setLoading(true)
    setError('')
    try {
      const data = await login(username, password)
      setToken(data.token)
      toast('Logged in successfully')
      onLogin(data.token)
    } catch (err) {
      setError(err.message || 'Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f5f5f0]">
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-[40%] bg-black flex-col justify-center px-16">
        <div className="font-extrabold text-[3.2rem] text-[#f5f5f0] leading-none tracking-tight mb-6">
          DUOS<br />DASH
        </div>

        <div className="font-mono text-[10px] text-gray-500 tracking-[3px] uppercase mb-12 border-t border-[#222] pt-4">
          Admin Control Panel
        </div>

        <div className="flex flex-col gap-3">
          {['Bomb Diffusal', 'Fliptionary', 'Draw & Dare', 'Emoji Enigma'].map(g => (
            <div key={g} className="text-[11px] text-gray-600 font-mono flex items-center gap-2">
              <span className="w-[6px] h-[6px] bg-gray-600 rounded-full shrink-0" />
              {g}
            </div>
          ))}
        </div>
      </div>
      <div className="ml-0 md:ml-[40%] w-full md:w-[60%] flex items-center justify-center p-8">
        <div className="bg-white border border-[#d8d8d0] rounded-2xl px-11 py-13 w-full max-w-[420px] shadow-[0_8px_40px_rgba(0,0,0,0.10)] animate-[fadeUp_.5s_ease]">

          <div className="font-extrabold text-xl tracking-tight mb-1 text-black">
            Welcome back
          </div>

          <div className="text-[10px] text-gray-400 tracking-[2px] uppercase mb-10">
            Sign in to your admin account
          </div>
          <label className="block text-[10px] tracking-[2px] uppercase text-gray-400 mb-2">
            Username
          </label>
          <input
            className="w-full bg-[#f9f9f5] border border-[#d8d8d0] rounded-lg px-4 py-3 text-sm text-black outline-none mb-5 focus:border-black transition"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <label className="block text-[10px] tracking-[2px] uppercase text-gray-400 mb-2">
            Password
          </label>
          <input
            className="w-full bg-[#f9f9f5] border border-[#d8d8d0] rounded-lg px-4 py-3 text-sm text-black outline-none mb-7 focus:border-black transition"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full bg-black text-[#f5f5f0] rounded-lg py-3 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition ${
              loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#222]'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
          {error && (
            <div className="mt-4 text-red-600 text-xs text-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}