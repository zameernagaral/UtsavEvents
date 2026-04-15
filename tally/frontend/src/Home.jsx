import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
 
const events = [
  {
    id: "clockedout",
    label: "ClockedOut",
    sub: "Individual Time Trial",
    accent: "#FF4D00",
    number: "01",
  },
  {
    id: "duosdash",
    label: "DuosDash",
    sub: "2v2 Sprint Series",
    accent: "#00D1FF",
    number: "02",
  },
];
 
export default function Home() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [mounted, setMounted] = useState(false);
 
  useEffect(() => {
    setMounted(true);
  }, []);
 
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 24px",
        fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
 
        .event-card {
          transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .event-card:hover {
          transform: translateY(-4px);
        }
        .event-card:active {
          transform: translateY(0px) scale(0.98);
        }
        .card-inner {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .arrow-icon {
          transition: transform 0.2s ease;
        }
        .event-card:hover .arrow-icon {
          transform: translateX(5px);
        }
        .noise-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up-0 { animation: fadeUp 0.55s cubic-bezier(0.23,1,0.32,1) 0.05s both; }
        .fade-up-1 { animation: fadeUp 0.55s cubic-bezier(0.23,1,0.32,1) 0.18s both; }
        .fade-up-2 { animation: fadeUp 0.55s cubic-bezier(0.23,1,0.32,1) 0.30s both; }
      `}</style>
 
      <div className="noise-overlay" />
 
      {/* Ambient glow blobs */}
      <div style={{
        position: "absolute", top: "-120px", left: "-80px",
        width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(255,77,0,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", right: "-60px",
        width: "360px", height: "360px",
        background: "radial-gradient(circle, rgba(0,209,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
 
      {/* Header */}
      <div
        className="fade-up-0"
        style={{
          textAlign: "center",
          marginBottom: "56px",
        }}
      >
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.22em",
          color: "#555",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}>
          Select your event
        </p>
        <h1 style={{
          fontSize: "clamp(52px, 10vw, 88px)",
          lineHeight: 0.9,
          color: "#F0F0F0",
          letterSpacing: "0.01em",
          margin: 0,
        }}>
          RACE<br />
          <span style={{ color: "#333", WebkitTextStroke: "1px #444" }}>
            DAY
          </span>
        </h1>
      </div>
 
      {/* Cards */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        maxWidth: "480px",
      }}>
        {events.map((event, i) => (
          <div
            key={event.id}
            className={`event-card fade-up-${i + 1}`}
            onClick={() => navigate(`/${event.id}`)}
            onMouseEnter={() => setHovered(event.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="card-inner"
              style={{
                background: "#111",
                border: `1px solid ${hovered === event.id ? event.accent + "55" : "#222"}`,
                borderRadius: "12px",
                padding: "28px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: hovered === event.id
                  ? `0 0 40px ${event.accent}18, inset 0 0 0 1px ${event.accent}22`
                  : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Number watermark */}
              <span style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "96px",
                fontFamily: "'Bebas Neue', sans-serif",
                color: "#1A1A1A",
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
                transition: "color 0.2s ease",
              }}>
                {event.number}
              </span>
 
              {/* Left accent bar */}
              <div style={{
                position: "absolute",
                left: 0,
                top: "20%",
                bottom: "20%",
                width: "3px",
                background: event.accent,
                borderRadius: "0 2px 2px 0",
                opacity: hovered === event.id ? 1 : 0.35,
                transition: "opacity 0.2s ease",
              }} />
 
              <div style={{ paddingLeft: "16px" }}>
                <div style={{
                  fontSize: "clamp(30px, 6vw, 42px)",
                  color: "#F0F0F0",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}>
                  {event.label.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#555",
                  letterSpacing: "0.05em",
                  marginTop: "6px",
                }}>
                  {event.sub}
                </div>
              </div>
 
              {/* Arrow */}
              <div
                className="arrow-icon"
                style={{
                  color: event.accent,
                  fontSize: "22px",
                  position: "relative",
                  zIndex: 1,
                  marginLeft: "16px",
                  flexShrink: 0,
                  opacity: hovered === event.id ? 1 : 0.5,
                  transition: "opacity 0.2s ease",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
 
      {/* Footer */}
      <p
        className="fade-up-2"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          color: "#333",
          letterSpacing: "0.12em",
          marginTop: "48px",
          textTransform: "uppercase",
        }}
      >
        2 events · choose one to begin
      </p>
    </div>
  );
}
 