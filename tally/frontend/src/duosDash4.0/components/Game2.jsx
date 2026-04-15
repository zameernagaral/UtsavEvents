import { useState } from 'react'
import { apiCall } from '../api'
import { useToast } from '../ToastContext'
import { SectionTitle, Card, FormGroup, NumberInput, Toggle, Btn, ResultBox, SelectWrap } from './UI'

export default function Game2({ teams, onRefresh }) {
  const [teamId, setTeamId] = useState('')
  const [guessed, setGuessed] = useState(false)
  const [correctWords, setCorrectWords] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [streak3, setStreak3] = useState(false)
  const [noSkips, setNoSkips] = useState(false)
  const [skips, setSkips] = useState(0)
  const [violations, setViolations] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function submit() {
    if (!teamId) { toast('Select a team', 'err'); return }
    setLoading(true)
    try {
      const res = await apiCall(`/score/${teamId}/game/2`, {
        method: 'POST',
        body: JSON.stringify({ guessed, correctWords, timeRemaining, streak3, noSkips, skips, violations }),
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

  let preview = 0
  if (guessed) preview += 50
  preview += correctWords * 25
  preview += Math.floor(timeRemaining / 30) * 10
  if (streak3) preview += 20
  if (noSkips && guessed) preview += 40
  preview -= skips * 10
  preview -= violations * 20

  const teamOptions = teams.map(t => ({ value: t._id, label: t.name }))

  return (
    <div className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Game 2: Fliptionary</SectionTitle>

      <Card>
        <h3 className="font-bold text-sm mb-6 text-black">
          Score Calculator
        </h3>

        <div className="mb-6">
          <FormGroup label="Select Team">
            <SelectWrap value={teamId} onChange={setTeamId} options={teamOptions} placeholder="Choose a team" />
          </FormGroup>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 mb-5">
          <FormGroup label="At Least One Word Guessed?">
            <Toggle checked={guessed} onChange={setGuessed} label={{ yes: 'Yes', no: 'No' }} bonus="+50 base" />
          </FormGroup>

          <FormGroup label="Correct Words Guessed">
            <NumberInput value={correctWords} onChange={setCorrectWords} placeholder="0" min={0} />
          </FormGroup>

          <FormGroup label="Time Remaining (seconds)">
            <NumberInput value={timeRemaining} onChange={setTimeRemaining} placeholder="e.g. 90" min={0} max={240} />
          </FormGroup>

          <FormGroup label="3 Consecutive Correct? (Streak)">
            <Toggle checked={streak3} onChange={setStreak3} label={{ yes: 'Streak', no: 'No streak' }} bonus="+20 bonus" />
          </FormGroup>

          <FormGroup label="No Skips + No Violations?">
            <Toggle checked={noSkips} onChange={setNoSkips} label={{ yes: 'Perfect', no: 'Had skips/violations' }} bonus="+40 bonus" />
          </FormGroup>

          <FormGroup label="Skips Used">
            <NumberInput value={skips} onChange={setSkips} placeholder="0" min={0} />
          </FormGroup>

          <FormGroup label="Rule Violations">
            <NumberInput value={violations} onChange={setViolations} placeholder="0" min={0} />
          </FormGroup>
        </div>

        {/* Live preview */}
        <div className="bg-[#f9f9f5] border border-dashed border-[#d8d8d0] rounded-lg px-4 py-3 mb-5 flex items-center gap-4">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest">
            Live Preview
          </span>
          <span className={`font-extrabold text-2xl tracking-tight ${preview < 0 ? 'text-red-600' : 'text-black'}`}>
            {preview >= 0 ? '+' : ''}{preview}
          </span>
          <span className="text-xs text-gray-400">pts (estimated)</span>
        </div>

        <Btn onClick={submit} disabled={loading || !teamId}>
          {loading ? 'Saving...' : 'Calculate & Save Score →'}
        </Btn>

        <ResultBox points={result?.points ?? null} breakdown={result?.breakdown ?? {}} />
      </Card>
    </div>
  )
}