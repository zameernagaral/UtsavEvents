import { useState } from 'react'
import { apiCall } from '../api'
import { useToast } from '../ToastContext'
import { SectionTitle, Card, FormGroup, NumberInput, Toggle, Btn, ResultBox, SelectWrap } from './UI'

export default function Game1({ teams, onRefresh }) {
  const [teamId, setTeamId] = useState('')
  const [defused, setDefused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [modulesFirst, setModulesFirst] = useState(0)
  const [noStrikes, setNoStrikes] = useState(false)
  const [strikes, setStrikes] = useState(0)
  const [modulesCompleted, setModulesCompleted] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function submit() {
    if (!teamId) { toast('Select a team', 'err'); return }
    setLoading(true)
    try {
      const res = await apiCall(`/score/${teamId}/game/1`, {
        method: 'POST',
        body: JSON.stringify({ defused, timeRemaining, modulesFirst, noStrikes, strikes, modulesCompleted }),
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

  const teamOptions = teams.map(t => ({ value: t._id, label: t.name }))

  return (
    <div className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Game 1: Bomb Diffusal</SectionTitle>

      <Card>
        <h3 className="font-bold text-sm mb-6 text-black">
          Score Calculator
        </h3>

        <div className="mb-6">
          <FormGroup label="Select Team">
            <SelectWrap
              value={teamId}
              onChange={setTeamId}
              options={teamOptions}
              placeholder="Choose a team"
            />
          </FormGroup>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 mb-5">
          <FormGroup label="Outcome">
            <Toggle
              checked={defused}
              onChange={setDefused}
              label={{ yes: 'Defused', no: 'Exploded' }}
            />
          </FormGroup>

          <FormGroup label="Time Remaining (seconds)">
            <NumberInput value={timeRemaining} onChange={setTimeRemaining} placeholder="e.g. 75" min={0} max={600} />
          </FormGroup>

          <FormGroup label="Modules Solved on First Try">
            <NumberInput value={modulesFirst} onChange={setModulesFirst} placeholder="0–5" min={0} max={5} disabled={!defused} />
          </FormGroup>

          <FormGroup label="Strikes">
            <NumberInput value={strikes} onChange={setStrikes} placeholder="0" min={0} />
          </FormGroup>

          <FormGroup label="Modules Completed (if exploded)">
            <NumberInput value={modulesCompleted} onChange={setModulesCompleted} placeholder="0" min={0} max={5} disabled={defused} />
          </FormGroup>

          <FormGroup label="No Strikes? (Perfect Run)">
            <Toggle
              checked={noStrikes}
              onChange={setNoStrikes}
              label={{ yes: 'Perfect', no: 'Had strikes' }}
              bonus="+40 bonus"
            />
          </FormGroup>
        </div>

        <ScorePreview
          defused={defused}
          timeRemaining={timeRemaining}
          modulesFirst={modulesFirst}
          noStrikes={noStrikes}
          strikes={strikes}
          modulesCompleted={modulesCompleted}
        />

        <Btn onClick={submit} disabled={loading || !teamId}>
          {loading ? 'Saving...' : 'Calculate & Save Score →'}
        </Btn>

        <ResultBox points={result?.points ?? null} breakdown={result?.breakdown ?? {}} />
      </Card>
    </div>
  )
}

function ScorePreview({ defused, timeRemaining, modulesFirst, noStrikes, strikes, modulesCompleted }) {
  let pts = 0
  if (defused) {
    pts += 150
    pts += Math.floor(timeRemaining / 10) * 10
    pts += modulesFirst * 15
    if (noStrikes) pts += 40
  } else {
    pts += modulesCompleted * 20
  }
  pts -= strikes * 20

  return (
    <div className="bg-[#f9f9f5] border border-dashed border-[#d8d8d0] rounded-lg px-4 py-3 mb-5 flex items-center gap-4">
      <span className="text-[10px] text-gray-400 uppercase tracking-widest">
        Live Preview
      </span>
      <span className={`font-extrabold text-2xl tracking-tight ${pts < 0 ? 'text-red-600' : 'text-black'}`}>
        {pts >= 0 ? '+' : ''}{pts}
      </span>
      <span className="text-xs text-gray-400">pts (estimated)</span>
    </div>
  )
}