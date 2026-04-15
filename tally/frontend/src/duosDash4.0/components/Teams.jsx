import { useState } from 'react'
import { apiCall } from '../api'
import { useToast } from '../ToastContext'
import { SectionTitle, Card, Btn, LoadingDots } from './UI'

export default function Teams({ teams, loading, onRefresh }) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  async function addTeam() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await apiCall('/teams', { method: 'POST', body: JSON.stringify({ name }) })
      setNewName('')
      toast(`Team "${name}" added!`)
      onRefresh()
    } catch (err) {
      toast(err.message || 'Error adding team', 'err')
    } finally {
      setAdding(false)
    }
  }

  async function deleteTeam(id, name) {
    if (!confirm(`Delete team "${name}"?`)) return
    try {
      await apiCall(`/teams/${id}`, { method: 'DELETE' })
      toast('Team deleted')
      onRefresh()
    } catch (err) {
      toast('Error deleting team', 'err')
    }
  }

  const sorted = [...teams].sort((a, b) => {
    const ta = Object.values(a.scores).reduce((s, v) => s + v, 0)
    const tb = Object.values(b.scores).reduce((s, v) => s + v, 0)
    return tb - ta
  })

  return (
    <div className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Manage Teams</SectionTitle>
      <Card className="mb-7">
        <div className="flex gap-3 items-center">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTeam()}
            placeholder="Enter team name..."
            className="flex-1 bg-[#f9f9f5] border border-[#d8d8d0] rounded-lg px-4 py-2 text-sm text-black outline-none font-mono focus:border-black transition"
          />
          <Btn onClick={addTeam} disabled={adding || !newName.trim()}>
            {adding ? 'Adding...' : '+ Add Team'}
          </Btn>
        </div>
      </Card>
      {loading ? (
        <LoadingDots />
      ) : sorted.length === 0 ? (
        <div className="text-gray-400 text-sm py-5">
          No teams yet. Add one above.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {sorted.map((team, i) => {
            const total = Object.values(team.scores).reduce((a, b) => a + b, 0)
            return (
              <TeamCard
                key={team._id}
                team={team}
                total={total}
                rank={i + 1}
                onDelete={() => deleteTeam(team._id, team.name)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, total, rank, onDelete }) {
  const rankBg = ['bg-black', 'bg-gray-200', 'bg-[#f0f0ea]']
  const rankText = ['text-[#f5f5f0]', 'text-black', 'text-gray-500']

  return (
    <div className="relative bg-white border border-[#d8d8d0] rounded-xl p-5 shadow-sm transition hover:border-black hover:shadow-lg">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-black" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-base text-black">
          {team.name}
        </div>

        {rank <= 3 && (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border ${
            rank === 1 ? 'border-black' : 'border-[#d8d8d0]'
          } ${rankBg[rank - 1]} ${rankText[rank - 1]}`}>
            {rank}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Bomb', key: 'game1' },
          { label: 'Flipt.', key: 'game2' },
          { label: 'Draw', key: 'game3' },
          { label: 'Emoji', key: 'game4' },
        ].map(g => (
          <div key={g.key} className="bg-[#f9f9f5] border border-[#ebebeb] rounded-md px-3 py-2">
            <div className="font-extrabold text-sm text-black">
              {team.scores[g.key]}
            </div>
            <div className="text-[10px] text-gray-400 mt-[2px]">
              {g.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-1">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
            Total
          </span>
          <div className="font-extrabold text-2xl text-black tracking-tight">
            {total} <span className="text-sm text-gray-400">pts</span>
          </div>
        </div>

        <Btn variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Btn>
      </div>
    </div>
  )
}