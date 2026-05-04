"use client";

interface Whale {
  walletAddress: string;
  realizedPnl: number;
  unrealizedPnl: number;
  totalBuyUsd: number;
  totalSellUsd: number;
  tradesCount: number;
  score: number;
  tier?: string;
  token?: string;
  balance?: string;
  label?: string;
  network?: string;
}

export default function WhaleCard({
  whale,
  onWatch,
  onView,
  isWatched,
}: {
  whale: Whale;
  onWatch: (w: string) => void;
  onView: () => void;
  isWatched?: boolean;
}) {
  const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const scoreColor =
    whale.score >= 70
      ? "var(--success)"
      : whale.score >= 40
      ? "var(--warning)"
      : "var(--danger)";

  const isBase = whale.network?.includes("base");

  const balanceDisplay =
  typeof whale.totalBuyUsd === "number" && whale.totalBuyUsd > 0
    ? whale.totalBuyUsd >= 1_000_000_000_000  // 1 Trillion — clearly wrong
      ? "—"  // Hide unrealistic values
      : whale.totalBuyUsd >= 1_000_000_000
      ? `$${(whale.totalBuyUsd / 1_000_000_000).toFixed(2)}B`
      : whale.totalBuyUsd >= 1_000_000
      ? `$${(whale.totalBuyUsd / 1_000_000).toFixed(2)}M`
      : whale.totalBuyUsd >= 1_000
      ? `$${(whale.totalBuyUsd / 1_000).toFixed(1)}K`
      : `$${whale.totalBuyUsd.toFixed(0)}`
    : "—";

  return (
    <div
      className="card animate-fade-in"
      onClick={onView}
      style={{
        padding: "16px",
        borderLeft: `3px solid ${scoreColor}`,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span style={{ fontSize: "1rem" }}>{whale.tier?.split(" ")[0] || "🐋"}</span>
            <p className="mono" style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
              {short(whale.walletAddress)}
            </p>
          </div>

          {/* Label for named wallets */}
          {whale.label && (
            <p style={{
              fontSize: "0.65rem", color: "var(--accent)", fontFamily: "Space Mono",
              marginBottom: "4px", marginLeft: "26px",
            }}>
              {whale.label}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              background: `${scoreColor}20`, color: scoreColor,
              padding: "2px 8px", borderRadius: "20px",
              fontSize: "0.65rem", fontWeight: 700, fontFamily: "Space Mono",
            }}>
              SCORE {whale.score}
            </span>
            {whale.tier && (
              <span style={{
                background: "var(--bg)", color: "var(--text-secondary)",
                padding: "2px 8px", borderRadius: "20px", fontSize: "0.65rem",
                fontFamily: "Space Mono", border: "1px solid var(--border)",
              }}>
                {whale.tier.split(" ").slice(1).join(" ")}
              </span>
            )}
            {/* Chain badge */}
            <span style={{
              background: isBase ? "#0052ff20" : "#627eea20",
              color: isBase ? "#0052ff" : "#627eea",
              padding: "2px 8px", borderRadius: "20px", fontSize: "0.6rem",
              fontFamily: "Space Mono",
              border: `1px solid ${isBase ? "#0052ff40" : "#627eea40"}`,
            }}>
              {isBase ? "BASE" : "ETH"}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onWatch(whale.walletAddress); }}
          style={{
            background: isWatched ? "var(--accent)" : "var(--accent-dim)",
            border: "1px solid var(--accent)",
            color: isWatched ? "var(--bg)" : "var(--accent)",
            padding: "6px 12px", borderRadius: "6px", fontSize: "0.72rem",
            fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}
        >
          {isWatched ? "✓ SHADOWING" : "SHADOW"}
        </button>
      </div>

      {/* Balance highlight */}
      <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "12px", marginBottom: "12px", textAlign: "center" }}>
        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
          {whale.token || "TOKEN"} HOLDINGS
        </p>
        <p style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "Space Mono", color: "var(--text-primary)" }}>
          {balanceDisplay}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "2px", fontFamily: "Space Mono" }}>
            REALIZED PnL
          </p>
          <p style={{
            fontSize: "0.85rem", fontWeight: 700,
            color: whale.realizedPnl >= 0 ? "var(--success)" : "var(--danger)",
            fontFamily: "Space Mono",
          }}>
            {whale.realizedPnl > 0
              ? `+$${whale.realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
        </div>
        <div style={{ background: "var(--bg)", padding: "8px", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "2px", fontFamily: "Space Mono" }}>
            TOTAL TRADES
          </p>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "Space Mono" }}>
            {whale.tradesCount || "—"}
          </p>
        </div>
      </div>

      {/* View hint */}
      <p style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "10px", fontFamily: "Space Mono" }}>
        click to view full profile →
      </p>
    </div>
  );
}