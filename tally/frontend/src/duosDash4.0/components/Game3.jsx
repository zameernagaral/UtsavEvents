import { useState } from 'react'
import { apiCall } from '../api'
import { useToast } from '../ToastContext'
import { SectionTitle, Card, FormGroup, NumberInput, Toggle, Btn, ResultBox, SelectWrap } from './UI'

const CARD_CATS = ['Red – Action', 'Blue – Verbal', 'Green – Expressive']

function defaultCard() {
  return { completed: false, cardNumber: 0, isSpecial: false, withinTime: false }
}

export default function Game3({ teams, onRefresh }) {
  const [teamId, setTeamId] = useState('')
  const [cards, setCards] = useState([defaultCard(), defaultCard(), defaultCard()])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  function updateCard(i, field, value) {
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  async function submit() {
    if (!teamId) { toast('Select a team', 'err'); return }
    setLoading(true)
    try {
      const res = await apiCall(`/score/${teamId}/game/3`, {
        method: 'POST',
        body: JSON.stringify({ cards }),
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

  const preview = cards.reduce((sum, c) => {
    if (!c.completed) return sum
    let pts = 10 + c.cardNumber
    if (c.withinTime) pts += 5
    if (c.isSpecial) pts += 15
    return sum + pts
  }, 0)

  const teamOptions = teams.map(t => ({ value: t._id, label: t.name }))

  return (
    <div className="animate-[fadeIn_.3s_ease]">
      <SectionTitle>Game 3: Draw & Dare</SectionTitle>

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
          {cards.map((card, i) => (
            <div
              key={i}
              className={`bg-[#f9f9f5] border border-[#e0e0d8] rounded-xl px-5 py-4 transition ${
                card.completed ? 'border-l-4 border-l-black' : 'border-l-4 border-l-[#d8d8d0]'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-sm">
                  Card {i + 1}
                </span>

                <span className="text-[10px] text-gray-400 tracking-wide">
                  {CARD_CATS[i]}
                </span>

                {card.completed && (
                  <span className="ml-auto text-[10px] bg-black text-[#f5f5f0] rounded px-2 py-[2px] tracking-wide">
                    +{10 + card.cardNumber + (card.withinTime ? 5 : 0) + (card.isSpecial ? 15 : 0)} pts
                  </span>
                )}
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                <FormGroup label="Completed?">
                  <Toggle
                    checked={card.completed}
                    onChange={v => updateCard(i, 'completed', v)}
                    label={{ yes: 'Yes', no: 'No' }}
                  />
                </FormGroup>

                <FormGroup label="Card Number (UNO 0–9)">
                  <NumberInput
                    value={card.cardNumber}
                    onChange={v => updateCard(i, 'cardNumber', v)}
                    placeholder="0–9"
                    min={0}
                    max={9}
                    disabled={!card.completed}
                  />
                </FormGroup>

                <FormGroup label="Wild / Draw 4?">
                  <Toggle
                    checked={card.isSpecial}
                    onChange={v => updateCard(i, 'isSpecial', v)}
                    label={{ yes: 'Special', no: 'Normal' }}
                    bonus="+15"
                  />
                </FormGroup>

                <FormGroup label="Within 30s?">
                  <Toggle
                    checked={card.withinTime}
                    onChange={v => updateCard(i, 'withinTime', v)}
                    label={{ yes: 'Quick', no: 'Overtime' }}
                    bonus="+5"
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