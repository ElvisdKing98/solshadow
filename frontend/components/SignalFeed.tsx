"use client";

import { useState } from "react";

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
  amountIn?: number;
  isDemo?: boolean;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function SignalFeed({ signals }: { signals: Signal[] }) {
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [explaining, setExplaining] = useState<string | null>(null);

  const short = (addr: string) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;

  const typeColor = (type: string) =>
    type === "SWAP"
      ? "var(--accent)"
      : type === "TRANSFER"
      ? "var(--warning)"
      : "var(--accent-secondary)";

  const chainColor = (chain: string) =>
    chain?.includes("BASE") ? "#0052ff" : "#627eea";

  const explainSignal = async (signal: Signal) => {
    if (explanations[signal.id]) return;
    setExplaining(signal.id);
    try {
      const res = await fetch(`${BACKEND}/api/whales/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      setExplanations((prev) => ({ ...prev, [signal.id]: data.explanation }));
    } catch {
      setExplanations((prev) => ({
        ...prev,
        [signal.id]: "Analysis unavailable at this time.",
      }));
    } finally {
      setExplaining(null);
    }
  };

  if (signals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🌊</div>
        <p style={{ fontFamily: "Space Mono", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Waiting for whale activity...
        </p>
        <p style={{ fontSize: "0.75rem", marginTop: "8px" }}>
          Discover and shadow wallets to see live signals
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {signals.map((signal, index) => (
        <div
          key={signal.id}
          className="animate-slide-in"
          style={{
            background: "var(--bg-card)",
            borderTop: `1px solid ${index === 0 ? "var(--accent)" : "var(--border)"}`,
            borderRight: `1px solid ${index === 0 ? "var(--accent)" : "var(--border)"}`,
            borderBottom: `1px solid ${index === 0 ? "var(--accent)" : "var(--border)"}`,
            borderLeft: `3px solid ${typeColor(signal.type)}`,
            borderRadius: "10px",
            padding: "14px 16px",
            gap: "12px",
            transition: "all 0.3s",
          }}
        >
          {/* Main row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              {/* Top row — badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                {/* Live badge */}
                {index === 0 && (
                  <span style={{
                    background: "var(--accent-dim)", border: "1px solid var(--accent)",
                    color: "var(--accent)", padding: "1px 6px", borderRadius: "4px",
                    fontSize: "0.6rem", fontWeight: 700, fontFamily: "Space Mono",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>
                    <span className="pulse-dot" style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: "var(--accent)", display: "inline-block",
                    }} />
                    LIVE
                  </span>
                )}

                {/* Type badge */}
                <span style={{
                  background: `${typeColor(signal.type)}20`,
                  color: typeColor(signal.type),
                  padding: "2px 8px", borderRadius: "4px",
                  fontSize: "0.65rem", fontWeight: 700, fontFamily: "Space Mono",
                }}>
                  {signal.type}
                </span>

                {/* Chain badge */}
                <span style={{
                  background: `${chainColor(signal.chain)}20`,
                  color: chainColor(signal.chain),
                  padding: "2px 8px", borderRadius: "4px",
                  fontSize: "0.6rem", fontFamily: "Space Mono",
                  border: `1px solid ${chainColor(signal.chain)}40`,
                }}>
                  {signal.chain?.includes("BASE") ? "BASE" : "ETH"}
                </span>

                {/* Wallet */}
                <span className="mono" style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                  {short(signal.wallet)}
                </span>
              </div>

              {/* Summary */}
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                {signal.summary}
              </p>

              {/* Amount */}
              {signal.amountIn && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "Space Mono" }}>
                  ${typeof signal.amountIn === "number"
                    ? signal.amountIn.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : signal.amountIn}{" "}
                  moved on-chain
                </p>
              )}
            </div>

            {/* Right side — time + tx link */}
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
                {new Date(signal.timestamp).toLocaleTimeString()}
              </p>
              {!signal.isDemo && (
                <a
                  href={
                    signal.chain?.includes("BASE")
                      ? `https://basescan.org/tx/${signal.txHash}`
                      : `https://etherscan.io/tx/${signal.txHash}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.65rem", color: "var(--accent)", fontFamily: "Space Mono" }}
                >
                  view tx →
                </a>
              )}
            </div>
          </div>

          {/* AI Explanation section */}
          <div style={{ marginTop: "10px" }}>
            {explanations[signal.id] ? (
              <div style={{
                background: "var(--bg)",
                borderRadius: "8px",
                padding: "10px 12px",
                borderLeft: "2px solid var(--accent)",
              }}>
                <p style={{
                  fontSize: "0.65rem", color: "var(--accent)", fontFamily: "Space Mono",
                  marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px",
                }}>
                  ✨ AI ANALYSIS
                </p>
                <p style={{
                  fontSize: "0.78rem", color: "var(--text-secondary)",
                  lineHeight: "1.6", margin: 0,
                }}>
                  {explanations[signal.id]}
                </p>
              </div>
            ) : (
              <button
                onClick={() => explainSignal(signal)}
                disabled={explaining === signal.id}
                style={{
                  background: explaining === signal.id ? "var(--bg)" : "transparent",
                  border: "1px solid var(--border)",
                  color: explaining === signal.id ? "var(--accent)" : "var(--text-muted)",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.68rem",
                  cursor: explaining === signal.id ? "not-allowed" : "pointer",
                  fontFamily: "Space Mono",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  if (explaining !== signal.id) {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.color = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (explaining !== signal.id) {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }
                }}
              >
                {explaining === signal.id ? (
                  <>
                    <span className="pulse-dot" style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "var(--accent)", display: "inline-block",
                    }} />
                    Analyzing...
                  </>
                ) : (
                  <>✨ AI Explain this signal</>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}