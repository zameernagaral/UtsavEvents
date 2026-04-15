import { useState, useEffect } from "react";
import { getScores, addScore, deleteScore } from "../api";

export default function RoundTab({ round }) {
  const [scores, setScores] = useState([]);
  const [r1Teams, setR1Teams] = useState([]); 
  const [team, setTeam] = useState("");
  const [score, setScore] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchScores = async () => {
    const res = await getScores(round);
    setScores(res.data);
    if (round === 2) {
      const r1Res = await getScores(1);
      setR1Teams(r1Res.data.map((s) => s.team));
    }
  };

  useEffect(() => {
    fetchScores();
  }, [round]);

  const handleAdd = async () => {
    if (!team.trim() || score === "") return;
    setLoading(true);
    await addScore(team.trim(), round, Number(score));
    setTeam("");
    setScore("");
    await fetchScores();
    setLoading(false);
  };

  const handleDelete = async (teamName) => {
    await deleteScore(round, teamName);
    await fetchScores();
  };

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const scoredTeams = new Set(scores.map((s) => s.team.toLowerCase()));
  const availableTeams = r1Teams.filter(
    (t) => !scoredTeams.has(t.toLowerCase())
  );

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={h3}>Add / Update Score — Round {round}</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px auto",
            gap: 8,
          }}
        >
          {round === 2 ? (
            <select
              style={inputStyle}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="">Select team</option>
              {availableTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <input
              style={inputStyle}
              placeholder="Team name"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          )}
          <input
            style={inputStyle}
            type="number"
            placeholder="Score"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
          <button onClick={handleAdd} disabled={loading} style={addBtnStyle}>
            {loading ? "..." : "Add"}
          </button>
        </div>
        {round === 2 && availableTeams.length === 0 && scores.length > 0 && (
          <p style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
            All Round 1 teams have been scored.
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={h3}>Round {round} Scores</h3>
        {sorted.length === 0 ? (
          <p
            style={{
              color: "#999",
              fontSize: 14,
              textAlign: "center",
              padding: "1.5rem 0",
            }}
          >
            No scores yet
          </p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <th style={th}>#</th>
                <th style={th}>Team</th>
                <th style={{ ...th, textAlign: "right" }}>Score</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s._id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={td}>
                    <RankBadge rank={i + 1} />
                  </td>
                  <td style={td}>{s.team}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 500 }}>
                    {s.score}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => handleDelete(s.team)}
                      style={delBtnStyle}
                    >
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const colors = {
    1: ["#FEF3C7", "#92400E"],
    2: ["#F3F4F6", "#374151"],
    3: ["#FEE2E2", "#7F1D1D"],
  };
  const [bg, color] = colors[rank] || ["#F9FAFB", "#6B7280"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        color,
      }}
    >
      {rank}
    </span>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 12,
  padding: "1.25rem",
  marginBottom: "1.25rem",
};
const h3 = { fontSize: 15, fontWeight: 600, marginBottom: "1rem" };
const inputStyle = {
  padding: "7px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};
const addBtnStyle = {
  padding: "7px 14px",
  background: "#EBF4FF",
  border: "1px solid #93C5FD",
  borderRadius: 8,
  color: "#1D4ED8",
  cursor: "pointer",
  fontSize: 14,
  whiteSpace: "nowrap",
};
const delBtnStyle = {
  padding: "3px 8px",
  background: "transparent",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  color: "#666",
};
const th = {
  textAlign: "left",
  padding: "6px 8px",
  fontWeight: 500,
  fontSize: 12,
  color: "#888",
};
const td = { padding: "8px", verticalAlign: "middle" };