"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import WhaleCard from "@/components/WhaleCard";
import SignalFeed from "@/components/SignalFeed";
import RiskScore from "@/components/RiskScore";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const QUICK_TOKENS = [
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    chain: "ETH_MAINNET",
    network: "eth-mainnet",
    logo: "🔵",
  },
  {
    symbol: "PEPE",
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    chain: "ETH_MAINNET",
    network: "eth-mainnet",
    logo: "🐸",
  },
  {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    chain: "ETH_MAINNET",
    network: "eth-mainnet",
    logo: "⚡",
  },
  {
    symbol: "USDC/Base",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chain: "BASE_MAINNET",
    network: "base-mainnet",
    logo: "🔵",
  },
  {
    symbol: "Brett",
    address: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
    chain: "BASE_MAINNET",
    network: "base-mainnet",
    logo: "🎩",
  },
  {
    symbol: "AERO",
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    chain: "BASE_MAINNET",
    network: "base-mainnet",
    logo: "🚀",
  },
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
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [walletProfile, setWalletProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState("eth-mainnet");

  // Poll for signals every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND}/api/whales/signals`);
        if (res.data.signals) setSignals(res.data.signals);
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const discoverWhales = useCallback(
    async (tokenAddress: string, chain = "ETH_MAINNET", network = "eth-mainnet") => {
      if (!tokenAddress) return;
      setLoading(true);
      setError("");
      setWhales([]);
      setCurrentNetwork(network);
      try {
        const res = await axios.get(
          `${BACKEND}/api/whales/discover?token=${tokenAddress}&chain=${chain}&network=${network}`
        );
        setWhales(res.data.whales || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to discover whales.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const shadowWallet = async (walletAddress: string) => {
    try {
      await axios.post(`${BACKEND}/api/whales/watch`, { wallets: [walletAddress] });
      setWatchedWallets((prev) => [...new Set([...prev, walletAddress])]);
      setActiveTab("signals");
    } catch {
      setError("Failed to start watching wallet.");
    }
  };

  const viewWalletProfile = async (whale: any) => {
  setSelectedWallet(whale);
  setProfileLoading(true);
  setWalletProfile(null);
  try {
    const chainParam = whale.network?.includes("base") ? "BASE_MAINNET" : "ETH_MAINNET";
    const network = whale.network || currentNetwork;
 
    // Fetch profile + risk in parallel
    const [profileRes, riskRes] = await Promise.allSettled([
      axios.get(`${BACKEND}/api/whales/profile?wallet=${whale.walletAddress}&chain=${chainParam}&network=${network}`),
      axios.get(`${BACKEND}/api/whales/risk?wallet=${whale.walletAddress}&network=${network}`),
    ]);
 
    const profile = profileRes.status === "fulfilled" ? profileRes.value.data : {};
    const risk = riskRes.status === "fulfilled" ? riskRes.value.data : null;
 
    setWalletProfile({ ...profile, risk });
  } catch {
    setWalletProfile({ error: "Could not load profile" });
  } finally {
    setProfileLoading(false);
  }
};

  const short = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Background grid */}
      <div
        className="bg-grid"
        style={{ position: "fixed", inset: 0, opacity: 0.3, pointerEvents: "none", zIndex: 0 }}
      />

      {/* Glow orb */}
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, #00f5a015 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>

        {/* Header */}
        <header style={{ padding: "32px 0 24px", borderBottom: "1px solid var(--border)", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.8rem" }}>🌊</span>
                <h1 style={{
                  fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg, #00f5a0, #0066ff)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  SolShadow
                </h1>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px", marginLeft: "44px" }}>
                Shadow the smartest wallets on Ethereum & Base
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {watchedWallets.length > 0 && (
                <span style={{
                  background: "var(--accent-dim)", border: "1px solid var(--accent)",
                  color: "var(--accent)", padding: "4px 10px", borderRadius: "20px",
                  fontSize: "0.7rem", fontFamily: "Space Mono", fontWeight: 700,
                }}>
                  {watchedWallets.length} SHADOWED
                </span>
              )}
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                padding: "6px 12px", borderRadius: "20px",
              }}>
                <div className="pulse-dot" style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: signals.length > 0 ? "var(--success)" : "var(--text-muted)",
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
          <p style={{
            fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono",
            letterSpacing: "0.1em", marginBottom: "8px",
          }}>
            SELECT TOKEN TO DISCOVER WHALE TRADERS
          </p>

          {/* Chain labels */}
          <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.65rem", color: "#627eea", fontFamily: "Space Mono", letterSpacing: "0.1em" }}>
              ◆ ETHEREUM
            </span>
            <span style={{ fontSize: "0.65rem", color: "#0052ff", fontFamily: "Space Mono", letterSpacing: "0.1em" }}>
              ◆ BASE
            </span>
          </div>

          {/* Quick tokens */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            {QUICK_TOKENS.map((t) => {
              const isBase = t.network.includes("base");
              const isSelected = selectedToken === t.address;
              return (
                <button
                  key={t.address}
                  onClick={() => { setSelectedToken(t.address); discoverWhales(t.address, t.chain, t.network); }}
                  style={{
                    background: isSelected ? (isBase ? "#0052ff" : "var(--accent)") : "var(--bg-card)",
                    border: `1px solid ${isSelected ? (isBase ? "#0052ff" : "var(--accent)") : isBase ? "#0052ff40" : "var(--border)"}`,
                    color: isSelected ? "var(--bg)" : "var(--text-primary)",
                    padding: "8px 16px", borderRadius: "8px", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.85rem", fontFamily: "Syne, sans-serif",
                    transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px",
                  }}
                >
                  <span>{t.logo}</span>
                  {t.symbol}
                  {isBase && !isSelected && (
                    <span style={{ fontSize: "0.55rem", color: "#0052ff", fontFamily: "Space Mono" }}>BASE</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom token input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Or paste any EVM token address (ETH or Base)..."
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              style={{
                flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "10px 16px", color: "var(--text-primary)",
                fontFamily: "Space Mono", fontSize: "0.8rem", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              onKeyDown={(e) => e.key === "Enter" && discoverWhales(customToken)}
            />
            <button
              onClick={() => discoverWhales(customToken)}
              disabled={!customToken || loading}
              style={{
                background: "var(--accent)", color: "var(--bg)", border: "none",
                padding: "10px 20px", borderRadius: "8px", fontWeight: 700,
                fontSize: "0.85rem", cursor: "pointer", fontFamily: "Syne, sans-serif",
                opacity: !customToken || loading ? 0.5 : 1, transition: "opacity 0.2s",
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
        <div style={{
          display: "flex", gap: "0", marginBottom: "24px",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "10px", padding: "4px", width: "fit-content",
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
                textTransform: "uppercase", letterSpacing: "0.05em",
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
                  <div key={i} className="skeleton" style={{ height: "180px", borderRadius: "12px" }} />
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
                  SolShadow ranks wallets by balance size and on-chain activity
                </p>
              </div>
            )}

            {!loading && whales.length > 0 && (
              <>
                <p style={{
                  fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "16px",
                }}>
                  FOUND {whales.length} WHALE TRADERS — CLICK A CARD TO VIEW PROFILE
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {whales.map((whale) => (
                    <WhaleCard
                      key={whale.walletAddress}
                      whale={whale}
                      onWatch={shadowWallet}
                      onView={() => viewWalletProfile(whale)}
                      isWatched={watchedWallets.includes(whale.walletAddress)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "signals" && (
          <section>
            <p style={{
              fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "16px",
            }}>
              LIVE TRADE SIGNALS FROM SHADOWED WALLETS
            </p>
            <SignalFeed signals={signals} />
          </section>
        )}

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid var(--border)", marginTop: "60px", padding: "24px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
            Powered by GoldRush × Covalent
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
            SolShadow — Hackathon Build 2025
          </p>
        </footer>
      </div>

      {/* Wallet Profile Modal */}
      {selectedWallet && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px", backdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedWallet(null)}
        >
          <div
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "600px",
              maxHeight: "80vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "1.4rem" }}>{selectedWallet.tier?.split(" ")[0] || "🐋"}</span>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                    {selectedWallet.tier || "Whale"}
                  </h2>
                  {/* Chain badge */}
                  <span style={{
                    background: selectedWallet.network?.includes("base") ? "#0052ff20" : "#627eea20",
                    color: selectedWallet.network?.includes("base") ? "#0052ff" : "#627eea",
                    padding: "2px 8px", borderRadius: "20px", fontSize: "0.65rem",
                    fontFamily: "Space Mono",
                    border: `1px solid ${selectedWallet.network?.includes("base") ? "#0052ff40" : "#627eea40"}`,
                  }}>
                    {selectedWallet.network?.includes("base") ? "BASE" : "ETH"}
                  </span>
                </div>
                <p className="mono" style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {short(selectedWallet.walletAddress)}
                </p>
              </div>
              <button
                onClick={() => setSelectedWallet(null)}
                style={{
                  background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", width: "32px", height: "32px",
                  borderRadius: "50%", cursor: "pointer", fontSize: "1rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {/* Score bar */}
            <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>WHALE SCORE</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)", fontFamily: "Space Mono" }}>
                  {selectedWallet.score}/99
                </span>
              </div>
              <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${selectedWallet.score}%`,
                  background: "linear-gradient(90deg, var(--accent), #0066ff)",
                  borderRadius: "3px", transition: "width 0.8s ease",
                }} />
              </div>
            </div>

            

            {/* Holdings balance */}
            <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "8px" }}>
                {selectedWallet.token} HOLDINGS
              </p>
              <p style={{ fontSize: "1.6rem", fontWeight: 800, fontFamily: "Space Mono", color: "var(--text-primary)" }}>
                {selectedWallet.balance}
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: "8px" }}>
                  {selectedWallet.token}
                </span>
              </p>
            </div>

            {/* Profile data */}
            {profileLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: "60px", borderRadius: "8px" }} />
                ))}
              </div>
            )}

            {walletProfile && !profileLoading && !walletProfile.error && (
              <>
                {/* Risk Score Section */}
                {walletProfile.risk && walletProfile.risk.success && (
                  <RiskScore risk={walletProfile.risk} />
                )}
            
                {/* Stats row — PnL, Total Txs, Wallet Age */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                  <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
                      REALIZED PnL
                    </p>
                    <p style={{
                      fontSize: "1rem", fontWeight: 800, fontFamily: "Space Mono",
                      color: (walletProfile.realizedPnl || 0) >= 0 ? "var(--success)" : "var(--danger)",
                    }}>
                      {walletProfile.realizedPnl > 0
                        ? `+$${walletProfile.realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : walletProfile.realizedPnl < 0
                        ? `-$${Math.abs(walletProfile.realizedPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"}
                    </p>
                  </div>
                  <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
                      TOTAL TXS
                    </p>
                    <p style={{ fontSize: "1rem", fontWeight: 800, fontFamily: "Space Mono" }}>
                      {walletProfile.totalTxs?.toLocaleString() || "—"}
                    </p>
                  </div>
                  <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
                      ON-CHAIN SINCE
                    </p>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "Space Mono" }}>
                      {walletProfile.firstTx
                        ? new Date(walletProfile.firstTx).getFullYear()
                        : "—"}
                    </p>
                  </div>
                </div>
            
                {/* Top holdings */}
                {walletProfile.topHoldings?.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "10px" }}>
                      TOP HOLDINGS
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {walletProfile.topHoldings.map((h: any, i: number) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: "var(--bg)", padding: "10px 12px", borderRadius: "8px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {h.logoUrl && (
                              <img src={h.logoUrl} width={20} height={20} style={{ borderRadius: "50%" }} alt={h.symbol} />
                            )}
                            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{h.symbol}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontFamily: "Space Mono", fontSize: "0.85rem", fontWeight: 700 }}>
                              ${h.usdValue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            {h.percentChange && (
                              <p style={{
                                fontSize: "0.65rem",
                                color: parseFloat(h.percentChange) >= 0 ? "var(--success)" : "var(--danger)",
                                fontFamily: "Space Mono",
                              }}>
                                {parseFloat(h.percentChange) >= 0 ? "+" : ""}{h.percentChange}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            
                {/* Recent transactions */}
                {walletProfile.recentTxs?.length > 0 && (
                  <div>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "10px" }}>
                      RECENT TRANSACTIONS ({walletProfile.totalTxs?.toLocaleString()} total)
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {walletProfile.recentTxs.map((tx: any, i: number) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: "var(--bg)", padding: "8px 12px", borderRadius: "6px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                              width: "6px", height: "6px", borderRadius: "50%",
                              background: tx.successful ? "var(--success)" : "var(--danger)",
                            }} />
                            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                              {tx.hash?.slice(0, 10)}...
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {tx.valueUsd > 0 && (
                              <span style={{ fontFamily: "Space Mono", fontSize: "0.7rem", color: "var(--accent)" }}>
                                ${tx.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            )}
                            <span style={{ fontFamily: "Space Mono", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                              {new Date(tx.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}


            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                onClick={() => { shadowWallet(selectedWallet.walletAddress); setSelectedWallet(null); }}
                style={{
                  flex: 1, background: "var(--accent)", color: "var(--bg)", border: "none",
                  padding: "12px", borderRadius: "8px", fontWeight: 700,
                  fontSize: "0.9rem", cursor: "pointer", fontFamily: "Syne, sans-serif",
                }}
              >
                🌊 SHADOW THIS WALLET
              </button>
              <a
                href={
                  selectedWallet.network?.includes("base")
                    ? `https://basescan.org/address/${selectedWallet.walletAddress}`
                    : `https://etherscan.io/address/${selectedWallet.walletAddress}`
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", padding: "12px 16px", borderRadius: "8px",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                  fontFamily: "Syne, sans-serif", textDecoration: "none",
                  display: "flex", alignItems: "center",
                }}
              >
                VIEW ON CHAIN ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}