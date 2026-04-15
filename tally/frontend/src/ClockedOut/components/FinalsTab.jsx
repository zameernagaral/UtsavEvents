import { useEffect, useState } from 'react';
import { getTop15 } from '../api';

export default function FinalsTab() {
  const [top15, setTop15] = useState([]);

  useEffect(() => {
    getTop15().then((res) =>
      setTop15([...res.data].sort((a, b) => b.total - a.total))
    );
  }, []);

  return (
    <div>
      <p style={{ fontSize: 13, background: '#F9FAFB', padding: '8px 12px', borderRadius: 8, marginBottom: '1.25rem', color: '#555' }}>
        Top 15 teams auto-selected by Round 1 + Round 2 combined score.
      </p>

      <div style={{ ...cardStyle, border: '1px solid #93C5FD', background: '#F0F7FF' }}>
        <h3 style={{ ...h3, color: '#1D4ED8' }}>🏆 Final Leaderboard</h3>
        {top15.length === 0
          ? <p style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '1.5rem 0' }}>No Round 1/2 data yet</p>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #BFDBFE' }}>
                  <th style={th}>Rank</th>
                  <th style={th}>Team</th>
                  <th style={{ ...th, textAlign: 'right' }}>R1 + R2 Total</th>
                </tr>
              </thead>
              <tbody>
                {top15.map((t, i) => (
                  <tr key={t.team} style={{ borderBottom: '1px solid #DBEAFE', background: i === 0 ? '#FEF9C3' : 'transparent' }}>
                    <td style={td}><RankBadge rank={i + 1} /></td>
                    <td style={{ ...td, fontWeight: i === 0 ? 700 : 400 }}>
                      {t.team}
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#DCFCE7', color: '#166534', fontWeight: 500 }}>finalist</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: 15 }}>{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const colors = { 1: ['#FEF3C7', '#92400E'], 2: ['#F3F4F6', '#374151'], 3: ['#FEE2E2', '#7F1D1D'] };
  const [bg, color] = colors[rank] || ['#F9FAFB', '#6B7280'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 500, background: bg, color }}>
      {rank}
    </span>
  );
}

const cardStyle = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' };
const h3 = { fontSize: 15, fontWeight: 600, marginBottom: '1rem' };
const th = { textAlign: 'left', padding: '6px 8px', fontWeight: 500, fontSize: 12, color: '#888' };
const td = { padding: '8px', verticalAlign: 'middle' };