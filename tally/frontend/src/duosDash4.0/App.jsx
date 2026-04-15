import { useState, useEffect, useCallback } from 'react'
import { getToken, clearToken } from './api'
import { apiCall } from './api'
import { ToastProvider } from './ToastContext'
import Login from './components/Login'
import Topbar from './components/Topbar'
import Teams from './components/Teams'
import Game1 from './components/Game1'
import Game2 from './components/Game2'
import Game3 from './components/Game3'
import Game4 from './components/Game4'
import Leaderboard from './components/Leaderboard'

export default function App() {
  return (
    <ToastProvider>
      <Main />
    </ToastProvider>
  )
}

function Main() {
  const [token, setToken] = useState(getToken())
  const [activeTab, setActiveTab] = useState('teams')
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(false)

  const loadTeams = useCallback(async () => {
    if (!token) return
    setTeamsLoading(true)
    try {
      const data = await apiCall('/teams')
      setTeams(data)
    } catch (err) {
      console.error('Failed to load teams:', err)
    } finally {
      setTeamsLoading(false)
    }
  }, [token])

useEffect(() => {
  if (token) loadTeams()
}, [token, loadTeams])
useEffect(() => {
  if (!token || activeTab !== 'leaderboard') return

  const interval = setInterval(() => {
    loadTeams()
  }, 3000)

  return () => clearInterval(interval)
}, [token, loadTeams, activeTab])

  function handleLogin(newToken) {
    setToken(newToken)
  }

  function handleLogout() {
    clearToken()
    setToken('')
    setTeams([])
    setActiveTab('teams')
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  const tabComponents = {
    teams: <Teams teams={teams} loading={teamsLoading} onRefresh={loadTeams} />,
    game1: <Game1 teams={teams} onRefresh={loadTeams} />,
    game2: <Game2 teams={teams} onRefresh={loadTeams} />,
    game3: <Game3 teams={teams} onRefresh={loadTeams} />,
    game4: <Game4 teams={teams} onRefresh={loadTeams} />,
    leaderboard: <Leaderboard teams={teams} />,
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Topbar
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab)
          if (tab === 'leaderboard') loadTeams()
        }}
        onLogout={handleLogout}
      />

      <div className="px-8 py-9 max-w-[1300px] mx-auto">
        {tabComponents[activeTab]}
      </div>
    </div>
  )
}