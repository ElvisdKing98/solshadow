"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import WhaleCard from "@/components/WhaleCard";
import SignalFeed from "@/components/SignalFeed";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// Popular Solana tokens for quick search
const QUICK_TOKENS = [
  { symbol: "SOL", address: "So11111111111111111111111111111111111111112" },
  { symbol: "JUP", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "BONK", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
];

export default function Home() {
  const [whales, setWhales] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [watchedWallets, setWatchedWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "signals">("discover");

  // Poll for signals every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND}/api/whales/signals`);
        if (res.data.signals) setSignals(res.data.signals);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const discoverWhales = useCallback(async (tokenAddress: string) => {
    if (!tokenAddress) return;
    setLoading(true);
    setError("");
    setWhales([]);
    try {
      const res = await axios.get(`${BACKEND}/api/whales/discover?token=${tokenAddress}`);
      setWhales(res.data.whales || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to discover whales. Check your API key.");
    } finally {
      setLoading(false);
    }
  }, []);

  const shadowWallet = async (walletAddress: string) => {
    try {
      await axios.post(`${BACKEND}/api/whales/watch`, { wallets: [walletAddress] });
      setWatchedWallets((prev) => [...new Set([...prev, walletAddress])]);
      setActiveTab("signals");
    } catch {
      setError("Failed to start watching wallet.");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Background grid */}
      <div className="bg-grid" style={{
        position: "fixed", inset: 0, opacity: 0.3, pointerEvents: "none", zIndex: 0
      }} />

      {/* Glow orb */}
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, #00f5a015 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <header style={{ padding: "32px 0 24px", borderBottom: "1px solid var(--border)", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🌊</span>
                <h1 style={{
                  fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg, #00f5a0, #0066ff)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  SolShadow
                </h1>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px", marginLeft: "44px" }}>
                Shadow the smartest wallets on Solana
              </p>
            </div>

            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {watchedWallets.length > 0 && (
                <span style={{
                  background: "var(--accent-dim)", border: "1px solid var(--accent)",
                  color: "var(--accent)", padding: "4px 10px", borderRadius: "20px",
                  fontSize: "0.7rem", fontFamily: "Space Mono", fontWeight: 700
                }}>
                  {watchedWallets.length} SHADOWED
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "6px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                padding: "6px 12px", borderRadius: "20px"
              }}>
                <div className="pulse-dot" style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: signals.length > 0 ? "var(--success)" : "var(--text-muted)"
                }} />
                <span style={{ fontSize: "0.7rem", fontFamily: "Space Mono", color: "var(--text-secondary)" }}>
                  {signals.length > 0 ? "LIVE" : "IDLE"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Token Search */}
        <section style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono",
            letterSpacing: "0.1em", marginBottom: "12px" }}>
            SELECT TOKEN TO DISCOVER WHALE TRADERS
          </p>

          {/* Quick tokens */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {QUICK_TOKENS.map((t) => (
              <button
                key={t.address}
                onClick={() => { setSelectedToken(t.address); discoverWhales(t.address); }}
                style={{
                  background: selectedToken === t.address ? "var(--accent)" : "var(--bg-card)",
                  border: `1px solid ${selectedToken === t.address ? "var(--accent)" : "var(--border)"}`,
                  color: selectedToken === t.address ? "var(--bg)" : "var(--text-primary)",
                  padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.85rem", fontFamily: "Syne, sans-serif",
                  transition: "all 0.2s"
                }}
              >
                {t.symbol}
              </button>
            ))}
          </div>

          {/* Custom token input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Or paste any Solana token address..."
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              style={{
                flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "10px 16px", color: "var(--text-primary)",
                fontFamily: "Space Mono", fontSize: "0.8rem", outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
              onKeyDown={(e) => e.key === "Enter" && discoverWhales(customToken)}
            />
            <button
              onClick={() => discoverWhales(customToken)}
              disabled={!customToken || loading}
              style={{
                background: "var(--accent)", color: "var(--bg)", border: "none",
                padding: "10px 20px", borderRadius: "8px", fontWeight: 700,
                fontSize: "0.85rem", cursor: "pointer", fontFamily: "Syne, sans-serif",
                opacity: !customToken || loading ? 0.5 : 1, transition: "opacity 0.2s"
              }}
            >
              {loading ? "..." : "SCAN"}
            </button>
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "8px", fontFamily: "Space Mono" }}>
              ⚠ {error}
            </p>
          )}
        </section>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "24px",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "10px", padding: "4px", width: "fit-content"
        }}>
          {(["discover", "signals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "var(--bg)" : "var(--text-secondary)",
                border: "none", padding: "8px 20px", borderRadius: "7px",
                fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                fontFamily: "Syne, sans-serif", transition: "all 0.2s",
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}
            >
              {tab === "signals" && signals.length > 0
                ? `Signals (${signals.length})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "discover" && (
          <section>
            {loading && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: "160px", borderRadius: "12px" }} />
                ))}
              </div>
            )}

            {!loading && whales.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🐋</div>
                <p style={{ fontFamily: "Space Mono", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Select a token above to discover whale traders
                </p>
                <p style={{ fontSize: "0.75rem", marginTop: "8px" }}>
                  SolShadow ranks wallets by realized PnL and win rate
                </p>
              </div>
            )}

            {!loading && whales.length > 0 && (
              <>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono",
                  marginBottom: "16px" }}>
                  FOUND {whales.length} WHALE TRADERS — SORTED BY REALIZED PnL
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                  {whales.map((whale) => (
                    <WhaleCard key={whale.walletAddress} whale={whale} onWatch={shadowWallet} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "signals" && (
          <section>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono",
              marginBottom: "16px" }}>
              LIVE TRADE SIGNALS FROM SHADOWED WALLETS
            </p>
            <SignalFeed signals={signals} />
          </section>
        )}

        {/* Footer */}
        <footer style={{ borderTop: "1px solid var(--border)", marginTop: "60px", padding: "24px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
            Powered by GoldRush × Covalent
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
            SolShadow — Hackathon Build 2025
          </p>
        </footer>
      </div>
    </main>
  );
}