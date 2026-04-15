import { useState } from 'react'
import { apiCall } from '../api'
import { useToast } from '../ToastContext'
import { SectionTitle, Card, FormGroup, Toggle, Btn, ResultBox, SelectWrap } from './UI'

const CHIT_CATS = [
  { label: 'Movie', emoji: '' },
  { label: 'Festival / Cultural', emoji: '' },
  { label: 'Landmark / Character', emoji: '' },
]

function defaultChit() {
  return { guessed: false, within30: false }
}

export default function Game4({ teams, onRefresh }) {
  const [teamId, setTeamId] = useState('')
  const [chits, setChits] = useState([defaultChit(), defaultChit(), defaultChit()])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  function updateChit(i, field, value) {
    setChits(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  async function submit() {
    if (!teamId) { toast('Select a team', 'err'); return }
    setLoading(true)
    try {
      const res = await apiCall(`/score/${teamId}/game/4`, {
        method: 'POST',
        body: JSON.stringify({ chits }),
      })
      setResult(res)
      toast('Score saved!')
      onRefresh()
    } catch (err) {
      toast(err.message || 'Error saving score', 'err')
    } finally {
      setLoading(false)
    }
  }

  const preview = chits.reduce((sum, c) => {
    if (!c.guessed) return sum
    return sum + 5 + (c.within30 ? 5 : 0)
  }, 0)

  const teamOptions = teams.map(t => ({ value: t._id, label: t.name }))

  return (
    <div className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Game 4: Emoji Enigma</SectionTitle>

      <Card>
        <h3 className="font-bold text-sm mb-6">
          Score Calculator
        </h3>

        <div className="mb-6">
          <FormGroup label="Select Team">
            <SelectWrap value={teamId} onChange={setTeamId} options={teamOptions} placeholder="Choose a team" />
          </FormGroup>
        </div>

        <div className="flex flex-col gap-4 mb-5">
          {chits.map((chit, i) => (
            <div
              key={i}
              className={`bg-[#f9f9f5] border border-[#e0e0d8] rounded-xl px-5 py-4 transition ${
                chit.guessed ? 'border-l-4 border-l-black' : 'border-l-4 border-l-[#d8d8d0]'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{CHIT_CATS[i].emoji}</span>

                <span className="font-bold text-sm">
                  Chit {i + 1}
                </span>

                <span className="text-[10px] text-gray-400 tracking-wide">
                  {CHIT_CATS[i].label}
                </span>

                {chit.guessed && (
                  <span className="ml-auto text-[10px] bg-black text-[#f5f5f0] rounded px-2 py-[2px] tracking-wide">
                    +{5 + (chit.within30 ? 5 : 0)} pts
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Guessed Correctly?">
                  <Toggle
                    checked={chit.guessed}
                    onChange={v => updateChit(i, 'guessed', v)}
                    label={{ yes: 'Correct', no: 'Missed' }}
                    bonus="+5 pts"
                  />
                </FormGroup>

                <FormGroup label="Within 30 Seconds?">
                  <Toggle
                    checked={chit.within30}
                    onChange={v => updateChit(i, 'within30', v)}
                    label={{ yes: 'Fast', no: 'Slow' }}
                    bonus="+5 speed"
                  />
                </FormGroup>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#f9f9f5] border border-dashed border-[#d8d8d0] rounded-lg px-4 py-3 mb-5 flex items-center gap-4">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">
            Live Preview
          </span>
          <span className="font-extrabold text-2xl tracking-tight text-black">
            +{preview}
          </span>
          <span className="text-xs text-gray-400">
            pts (estimated)
          </span>
        </div>

        <Btn onClick={submit} disabled={loading || !teamId}>
          {loading ? 'Saving...' : 'Calculate & Save Score →'}
        </Btn>

        <ResultBox points={result?.points ?? null} breakdown={result?.breakdown ?? {}} />
      </Card>
    </div>
  )
}