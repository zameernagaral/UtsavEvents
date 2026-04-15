import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Tournament } from '@/components/tournament'
import { Footer } from '@/components/footer'
import { API_BASE_URL } from '@/lib/api'

export default function Home() {
  const [serverOnline, setServerOnline] = useState(false)
  const [checked, setChecked] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false

    const ping = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`, { cache: 'no-store' })
        if (!cancelled) {
          setServerOnline(response.ok)
          setChecked(true)
        }
      } catch {
        if (!cancelled) {
          setServerOnline(false)
          setChecked(true)
        }
      }
    }

    ping()
    const intervalId = setInterval(ping, 5000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    const target = document.getElementById(id)
    if (!target) return
    const header = document.querySelector('header')
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0
    const y = target.getBoundingClientRect().top + window.scrollY - headerHeight - 32
    window.scrollTo({ top: y, behavior: 'smooth' })
  }, [location.hash])

  return (
    <main className="min-h-screen bg-background">
      <Header />
      {checked && !serverOnline && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Waiting for the server to connect...
          </div>
        </div>
      )}
      <Hero />
      <Tournament />
    </main>
  )
}
  