"use client";

interface Whale {
  walletAddress: string;
  realizedPnl: number;
  unrealizedPnl: number;
  totalBuyUsd: number;
  totalSellUsd: number;
  tradesCount: number;
  score: number;
}

export default function WhaleCard({ whale, onWatch }: { whale: Whale; onWatch: (w: string) => void }) {
  const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const pnlColor = whale.realizedPnl >= 0 ? "var(--success)" : "var(--danger)";
  const scoreColor = whale.score >= 70 ? "var(--success)" : whale.score >= 40 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="card p-4 animate-fade-in cursor-pointer" style={{ borderLeft: `3px solid ${scoreColor}` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <p className="mono" style={{ color: "var(--text-secondary)" }}>{short(whale.walletAddress)}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{
              background: `${scoreColor}20`,
              color: scoreColor,
              padding: "2px 8px",
              borderRadius: "20px",
              fontSize: "0.7rem",
              fontWeight: 700,
              fontFamily: "Space Mono"
            }}>
              SCORE {whale.score}
            </span>
          </div>
        </div>
        <button
          onClick={() => onWatch(whale.walletAddress)}
          style={{
            background: "var(--accent-dim)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Syne, sans-serif",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--accent)", e.currentTarget.style.color = "var(--bg)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--accent-dim)", e.currentTarget.style.color = "var(--accent)")}
        >
          SHADOW
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px" }}>REALIZED PnL</p>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: pnlColor, fontFamily: "Space Mono" }}>
            {whale.realizedPnl >= 0 ? "+" : ""}${whale.realizedPnl?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px" }}>TOTAL TRADES</p>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, fontFamily: "Space Mono" }}>{whale.tradesCount}</p>
        </div>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px" }}>TOTAL BOUGHT</p>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, fontFamily: "Space Mono" }}>
            ${whale.totalBuyUsd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px" }}>TOTAL SOLD</p>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, fontFamily: "Space Mono" }}>
            ${whale.totalSellUsd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}