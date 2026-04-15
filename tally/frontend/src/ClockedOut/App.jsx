import { useState } from "react";
import Login from "./components/Login";
import RoundTab from "./components/RoundTab";
import FinalsTab from "./components/FinalsTab";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [activeRound, setActiveRound] = useState(1);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "1.5rem 1rem",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #eee",
          paddingBottom: "1rem",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Game Leaderboard</h1>
        <button onClick={() => setAuthed(false)} style={btnStyle("secondary")}>
          Sign out
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {[1, 2, 3].map((r) => (
          <button
            key={r}
            onClick={() => setActiveRound(r)}
            style={btnStyle(activeRound === r ? "active" : "default")}
          >
            {r === 3 ? "Round 3 — Finals" : `Round ${r}`}
          </button>
        ))}
      </div>

      {activeRound === 1 && <RoundTab round={1} />}
      {activeRound === 2 && <RoundTab round={2} />}
      {activeRound === 3 && <FinalsTab />}
    </div>
  );
}

function btnStyle(type) {
  const base = {
    padding: "7px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    border: "1px solid",
  };
  if (type === "active")
    return {
      ...base,
      background: "#EBF4FF",
      borderColor: "#93C5FD",
      color: "#1D4ED8",
    };
  if (type === "secondary")
    return {
      ...base,
      background: "transparent",
      borderColor: "#ddd",
      color: "#555",
    };
  return {
    ...base,
    background: "transparent",
    borderColor: "#ddd",
    color: "#333",
  };
}
