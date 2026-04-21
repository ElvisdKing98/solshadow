"use client";

interface Signal {
  id: string;
  wallet: string;
  type: string;
  summary: string;
  chain: string;
  timestamp: string;
  txHash: string;
  tokenIn?: string;
  tokenOut?: string;
  usdValue?: number;
}

export default function SignalFeed({ signals }: { signals: Signal[] }) {
  const short = (addr: string) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;
  const typeColor = (type: string) => type === "SWAP" ? "var(--accent)" : type === "TRANSFER" ? "var(--warning)" : "var(--accent-secondary)";

  if (signals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌊</div>
        <p style={{ fontFamily: "Space Mono", fontSize: "0.8rem" }}>Waiting for whale activity...</p>
        <p style={{ fontSize: "0.75rem", marginTop: "8px" }}>Discover and shadow wallets to see live signals</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {signals.map((signal) => (
        <div
          key={signal.id}
          className="animate-slide-in"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderLeft: `3px solid ${typeColor(signal.type)}`,
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                background: `${typeColor(signal.type)}20`,
                color: typeColor(signal.type),
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: 700,
                fontFamily: "Space Mono"
              }}>
                {signal.type}
              </span>
              <span className="mono" style={{ color: "var(--text-secondary)" }}>
                {short(signal.wallet)}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {signal.summary}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
              {new Date(signal.timestamp).toLocaleTimeString()}
            </p>
            <a
              href={`https://basescan.org/tx/${signal.txHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.65rem", color: "var(--accent)", fontFamily: "Space Mono" }}
            >
              view tx →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}