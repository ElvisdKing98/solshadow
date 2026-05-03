"use client";

interface RiskData {
  trustScore: number;
  riskScore: number;
  highRiskApprovals: number;
  mediumRiskApprovals: number;
  totalValueAtRisk: number;
  totalApprovals: number;
  approvals: {
    token: string;
    balance: string;
    valueAtRisk: string;
    spenderCount: number;
    highestRisk: string;
  }[];
}

export default function RiskScore({ risk }: { risk: RiskData }) {
  const trustColor =
    risk.trustScore >= 75
      ? "var(--success)"
      : risk.trustScore >= 50
      ? "var(--warning)"
      : "var(--danger)";

  const trustLabel =
    risk.trustScore >= 75
      ? "TRUSTED"
      : risk.trustScore >= 50
      ? "MODERATE"
      : "HIGH RISK";

  const riskBadgeColor = (level: string) =>
    level === "HIGH"
      ? "var(--danger)"
      : level === "MEDIUM"
      ? "var(--warning)"
      : "var(--success)";

  return (
    <div style={{ marginBottom: "20px" }}>
      <p style={{
        fontSize: "0.7rem", color: "var(--text-muted)",
        fontFamily: "Space Mono", marginBottom: "10px", letterSpacing: "0.1em",
      }}>
        WALLET RISK ASSESSMENT
      </p>

      {/* Trust Score + Risk Score row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        {/* Trust Score */}
        <div style={{
          background: "var(--bg)", padding: "12px", borderRadius: "8px",
          border: `1px solid ${trustColor}30`, textAlign: "center",
        }}>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
            TRUST SCORE
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "Space Mono", color: trustColor }}>
            {risk.trustScore}
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/100</span>
          </p>
          <span style={{
            fontSize: "0.55rem", fontFamily: "Space Mono", fontWeight: 700,
            color: trustColor, background: `${trustColor}15`,
            padding: "1px 6px", borderRadius: "4px",
          }}>
            {trustLabel}
          </span>
        </div>

        {/* Value at Risk */}
        <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
            VALUE AT RISK
          </p>
          <p style={{
            fontSize: risk.totalValueAtRisk > 1_000_000 ? "1rem" : "1.1rem",
            fontWeight: 800, fontFamily: "Space Mono",
            color: risk.totalValueAtRisk > 100000 ? "var(--danger)" : "var(--text-primary)",
          }}>
            {risk.totalValueAtRisk >= 1_000_000
              ? `$${(risk.totalValueAtRisk / 1_000_000).toFixed(1)}M`
              : risk.totalValueAtRisk >= 1_000
              ? `$${(risk.totalValueAtRisk / 1_000).toFixed(0)}K`
              : `$${risk.totalValueAtRisk}`}
          </p>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginTop: "2px" }}>
            exposed
          </p>
        </div>

        {/* Approvals count */}
        <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "Space Mono", marginBottom: "4px" }}>
            APPROVALS
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "Space Mono" }}>
            {risk.totalApprovals}
          </p>
          <p style={{ fontSize: "0.6rem", fontFamily: "Space Mono", marginTop: "2px" }}>
            <span style={{ color: "var(--danger)" }}>{risk.highRiskApprovals} high</span>
            {" · "}
            <span style={{ color: "var(--warning)" }}>{risk.mediumRiskApprovals} med</span>
          </p>
        </div>
      </div>

      {/* Trust score bar */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${risk.trustScore}%`,
            background: `linear-gradient(90deg, ${trustColor}, ${trustColor}99)`,
            borderRadius: "3px",
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* Top risky approvals */}
      {risk.approvals?.length > 0 && (
        <div>
          <p style={{
            fontSize: "0.65rem", color: "var(--text-muted)",
            fontFamily: "Space Mono", marginBottom: "6px",
          }}>
            TOKEN APPROVALS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {risk.approvals.slice(0, 4).map((a, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--bg)", padding: "8px 10px", borderRadius: "6px",
                borderLeft: `2px solid ${riskBadgeColor(a.highestRisk)}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    fontSize: "0.55rem", fontFamily: "Space Mono", fontWeight: 700,
                    color: riskBadgeColor(a.highestRisk),
                    background: `${riskBadgeColor(a.highestRisk)}15`,
                    padding: "1px 5px", borderRadius: "3px",
                  }}>
                    {a.highestRisk}
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    {a.token || "Unknown"}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "Space Mono" }}>
                    {a.spenderCount} spender{a.spenderCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", fontFamily: "Space Mono", color: "var(--text-secondary)" }}>
                  {a.valueAtRisk || a.balance}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No approvals state */}
      {risk.totalApprovals === 0 && (
        <div style={{
          textAlign: "center", padding: "12px",
          background: "var(--bg)", borderRadius: "8px",
          border: "1px solid var(--success)30",
        }}>
          <p style={{ fontSize: "0.8rem", color: "var(--success)", fontFamily: "Space Mono" }}>
            ✅ No risky approvals found
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
            This wallet has clean approval hygiene
          </p>
        </div>
      )}
    </div>
  );
}