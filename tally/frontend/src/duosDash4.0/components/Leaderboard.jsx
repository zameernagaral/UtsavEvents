import { SectionTitle, Card } from './UI'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const RANK_STYLE = [
  { bg: '#0a0a0a', color: '#f5f5f0', border: '2px solid #0a0a0a' },
  { bg: '#e8e8e8', color: '#0a0a0a', border: '1px solid #ccc' },
  { bg: '#f0ede6', color: '#8b6914', border: '1px solid #d4b483' },
]

export default function Leaderboard({ teams }) {
  const sorted = [...teams]
    .map(t => ({ ...t, total: Object.values(t.scores).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)

  const topTotal = sorted[0]?.total || 1
function exportCSV(data) {
  const headers = ['Team', 'Bomb', 'Flipt.', 'Draw', 'Emoji', 'Total']

  const rows = data.map(t => [
    t.name,
    t.scores.game1,
    t.scores.game2,
    t.scores.game3,
    t.scores.game4,
    t.total,
  ])

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'leaderboard.csv'
  a.click()
}

async function exportPDF() {
  const original = document.getElementById('leaderboard')

  // 🔥 Clone the element
  const clone = original.cloneNode(true)

  // 🔥 Force safe styles on clone
  clone.style.background = '#ffffff'
  clone.style.color = '#000000'

  // Remove problematic styles (IMPORTANT)
  clone.querySelectorAll('*').forEach(el => {
    el.style.backgroundColor = '#ffffff'
    el.style.color = '#000000'
    el.style.borderColor = '#cccccc'
    el.style.boxShadow = 'none'
  })

  // Hide it offscreen
  clone.style.position = 'fixed'
  clone.style.left = '-9999px'
  document.body.appendChild(clone)

  const canvas = await html2canvas(clone, {
    backgroundColor: '#ffffff',
    scale: 2
  })

  document.body.removeChild(clone)

  const img = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'a4')
  const width = 210
  const height = (canvas.height * width) / canvas.width

  pdf.addImage(img, 'PNG', 0, 0, width, height)
  pdf.save('leaderboard.pdf')
}
  return (
    <div id="leaderboard" className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Leaderboard</SectionTitle>

      {/* Podium */}
      {sorted.length >= 3 && (
        <div className="flex justify-center items-end gap-3 mb-9">
          <PodiumBlock team={sorted[1]} rank={2} height={80} />
          <PodiumBlock team={sorted[0]} rank={1} height={110} />
          <PodiumBlock team={sorted[2]} rank={3} height={60} />
        </div>
      )}
<div className="flex gap-3 mb-4">
  <button
    onClick={() => exportCSV(sorted)}
    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold"
  >
    Export CSV
  </button>

  <button
    onClick={exportPDF}
    className="px-4 py-2 border rounded-lg text-sm"
  >
    Export PDF
  </button>
</div>
      <Card>
        {sorted.length === 0 ? (
          <div className="text-gray-400 text-sm py-3">
            No teams yet.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Rank', 'Team', 'Bomb', 'Flipt.', 'Draw', 'Emoji', 'Total', 'Progress'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-2 text-[10px] tracking-widest uppercase text-gray-400 border-b font-mono"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sorted.map((team, i) => {
                const rank = i + 1
                const rs = RANK_STYLE[rank - 1] || { bg: '#f5f5f0', color: '#555', border: '1px solid #d8d8d0' }
                const pct = Math.round((team.total / topTotal) * 100)

                return (
                  <tr
                    key={team._id}
                    className="transition hover:bg-[#f9f9f5]"
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 border-b">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs"
                        style={{ background: rs.bg, color: rs.color, border: rs.border }}
                      >
                        {rank}
                      </div>
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3 border-b font-bold text-sm">
                      {team.name}
                    </td>

                    {/* Scores */}
                    {['game1', 'game2', 'game3', 'game4'].map(g => (
                      <td key={g} className="px-4 py-3 border-b text-sm text-gray-700">
                        {team.scores[g]}
                      </td>
                    ))}

                    {/* Total */}
                    <td className="px-4 py-3 border-b">
                      <span className="font-extrabold text-base text-black">
                        {team.total}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3 border-b min-w-[120px]">
                      <div className="bg-[#f0f0ea] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: rank === 1 ? '#0a0a0a' : '#888',
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {pct}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function PodiumBlock({ team, rank, height }) {
  const total = team.total || 0
  const rankEmoji = ['🥇', '🥈', '🥉'][rank - 1]

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xl">{rankEmoji}</div>

      <div className="font-extrabold text-xs text-black text-center max-w-[90px] break-words">
        {team.name}
      </div>

      <div className="text-xs text-gray-400">
        {total} pts
      </div>

      <div
        className={`w-20 flex items-center justify-center rounded-t-lg font-extrabold text-lg ${
          rank === 1
            ? 'bg-black text-[#f5f5f0]'
            : rank === 2
            ? 'bg-[#d8d8d0] text-gray-600'
            : 'bg-[#e8e4d8] text-gray-500'
        }`}
        style={{ height }}
      >
        {rank}
      </div>
    </div>
  )
}