import { clearToken } from '../api'

export default function Topbar({ activeTab, onTabChange, onLogout }) {
  const tabs = [
    { id: 'teams', label: 'Teams' },
    { id: 'game1', label: 'Bomb Diffusal' },
    { id: 'game2', label: 'Fliptionary' },
    { id: 'game3', label: 'Draw & Dare' },
    { id: 'game4', label: 'Emoji Enigma' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  function handleLogout() {
    clearToken()
    onLogout()
  }

  return (
    <div className="sticky top-0 z-50 bg-[rgba(245,245,240,0.92)] backdrop-blur-md border-b border-[#d8d8d0]">

      <div className="px-8 h-[58px] flex items-center justify-between border-b border-[#ebebeb]">

        <div className="font-extrabold text-[1.15rem] tracking-tight text-black">
          DUOS DASH
        </div>

        <div className="flex items-center gap-3">

          <span className="bg-black text-[#f5f5f0] rounded-md px-3 py-[3px] text-[10px] tracking-[2px] uppercase font-mono">
            Admin
          </span>

          <button
            onClick={handleLogout}
            className="bg-transparent border border-[#d8d8d0] rounded-md px-3 py-[5px] text-[11px] text-gray-500 font-mono transition hover:border-black hover:text-black"
          >
            Logout
          </button>

        </div>
      </div>

      
      <div className="px-8 flex overflow-x-auto">

        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-[13px] font-bold whitespace-nowrap transition border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? 'text-black border-black'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}

      </div>
    </div>
  )
}