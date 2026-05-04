import express from "express";
import {
  getTopTraders,
  getTopHolders,
  getWalletPnL,
  getWalletBalances,
  getRecentTransactions,
  getTransactionSummary,
  getWalletApprovals,
  scoreWallet,
  scoreFromBalance,
  estimatePnlFromTxs,
  estimatePnlFrom24hChange,
} from "../services/goldrush.js";

const router = express.Router();

const API_KEY = process.env.GOLDRUSH_API_KEY;
const BASE_URL = "https://api.covalenthq.com/v1";

// Cache — 15 minute TTL
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Background enrichment — updates cache with tx counts + PnL after response sent
async function enrichWhalesInBackground(whales, network, cacheKey) {
  try {
    console.log(`🔄 Background enrichment for top 3...`);

    // Only enrich top 3, only fetch tx summary (skip balances for speed)
    const enriched = await Promise.allSettled(
      whales.slice(0, 3).map(async (whale) => {
        try {
          const txSummary = await getTransactionSummary(whale.walletAddress, network);
          return {
            ...whale,
            tradesCount: txSummary?.total_count || 0,
          };
        } catch {
          return whale;
        }
      })
    );

    const cached = cache.get(cacheKey);
    if (cached) {
      const updatedWhales = [...cached.data.whales];
      enriched.forEach((result, index) => {
        if (result.status === "fulfilled") {
          updatedWhales[index] = result.value;
        }
      });
      cache.set(cacheKey, {
        data: { ...cached.data, whales: updatedWhales },
        timestamp: cached.timestamp,
      });
      console.log(`✅ Enrichment complete`);
    }
  } catch (err) {
    console.error("Enrichment error:", err.message);
  }
}

// GET /api/whales/discover
router.get("/discover", async (req, res) => {
  try {
    const { token, chain = "ETH_MAINNET", network = "eth-mainnet" } = req.query;
    if (!token) return res.status(400).json({ error: "Token address required" });

    // Check cache first — return instantly if cached
    const cacheKey = `discover:${token}:${network}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log("⚡ Cache hit:", cacheKey);
      return res.json({ ...cached, cached: true });
    }

    // Try GraphQL upnlForToken first (EVM only)
    let traders = [];
    try {
      traders = await getTopTraders(token, chain);
    } catch (e) {
      console.log("GraphQL unavailable, using Foundational API");
    }

    // Fallback: top token holders
    if (!traders || traders.length === 0) {
      console.log(`Fetching top holders on ${network}...`);
      const holders = await getTopHolders(token, network);

      if (!holders || holders.length === 0) {
        return res.status(400).json({ error: "No holders found for this token." });
      }

      const total = holders.length;
      // Only take top 10 for speed
      const topHolders = holders.slice(0, 10).filter((h) => h.address);

      // Build basic scored list IMMEDIATELY — no extra API calls
      const scored = topHolders.map((h, index) => {
        const decimals = h.contract_decimals ?? 18;
        const balanceHuman = parseFloat(h.balance) / Math.pow(10, decimals);
        const score = scoreFromBalance(balanceHuman, index, total);

        let tier = "🐟 Fish";
        if (balanceHuman > 1_000_000_000) tier = "🐳 Mega Whale";
        else if (balanceHuman > 100_000_000) tier = "🐋 Whale";
        else if (balanceHuman > 10_000_000) tier = "🦈 Shark";
        else if (balanceHuman > 1_000_000) tier = "🐬 Dolphin";

        return {
          walletAddress: h.address,
          totalBuyUsd: balanceHuman,
          totalSellUsd: 0,
          realizedPnl: 0,
          unrealizedPnl: balanceHuman,
          tradesCount: 0,
          balance: balanceHuman.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          token: h.contract_ticker_symbol,
          logoUrl: h.logo_url,
          score,
          tier,
          source: "holders",
          network,
        };
      }).sort((a, b) => b.totalBuyUsd - a.totalBuyUsd);

      // Cache and respond immediately
      const result = { success: true, whales: scored, source: "holders" };
      setCache(cacheKey, result);
      res.json(result);

      // Enrich top 5 in background after response sent
      enrichWhalesInBackground(scored.slice(0, 5), network, cacheKey);
      return;
    }

    // Use GraphQL traders data
    const scored = traders
      .map((t) => ({
        walletAddress: t.wallet_address,
        totalBuyUsd: parseFloat(t.volume || 0),
        totalSellUsd: parseFloat(t.volume || 0),
        realizedPnl: t.pnl_realized_usd || 0,
        unrealizedPnl: t.pnl_unrealized_usd || 0,
        tradesCount: t.transactions_count || 0,
        balance: t.balance_pretty,
        token: t.contract_metadata?.contract_ticker_symbol,
        score: scoreWallet([t]),
        tier: t.pnl_realized_usd > 100000 ? "🐳 Whale" : "🦈 Shark",
        source: "traders",
        network,
      }))
      .sort((a, b) => b.realizedPnl - a.realizedPnl)
      .slice(0, 10);

    const result = { success: true, whales: scored, source: "traders" };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("Discover error:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch whale wallets" });
  }
});

// GET /api/whales/profile
router.get("/profile", async (req, res) => {
  try {
    const { wallet, chain = "ETH_MAINNET", network = "eth-mainnet" } = req.query;
    if (!wallet) return res.status(400).json({ error: "Wallet address required" });

    const cacheKey = `profile:${wallet}:${network}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    // Fetch balances + tx summary in parallel
    const [balances, txSummary] = await Promise.all([
      getWalletBalances(wallet, network),
      getTransactionSummary(wallet, network),
      
    ]);

    // Fetch recent txs only if tx summary was fast
    let recentTxs = [];
    try {
      const txRes = await Promise.race([
        getRecentTransactions(wallet, network),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
      ]);
      recentTxs = txRes;
    } catch {
      console.log("Recent txs timed out — skipping");
    }

    
    const realizedPnl = estimatePnlFrom24hChange(
      balances
    );
    const score = 50;

    const topHoldings = balances
      .filter((b) => b.quote > 0)
      .sort((a, b) => b.quote - a.quote)
      .slice(0, 8)
      .map((b) => ({
        symbol: b.contract_ticker_symbol,
        name: b.contract_name,
        usdValue: b.quote,
        logoUrl: b.logo_url,
        percentChange:
          b.quote_24h && b.quote_24h > 0
            ? (((b.quote - b.quote_24h) / b.quote_24h) * 100).toFixed(2)
            : null,
      }));

    const formattedTxs = recentTxs.slice(0, 10).map((tx) => ({
      hash: tx.tx_hash,
      date: tx.block_signed_at,
      successful: tx.successful,
      valueUsd: tx.value_quote || 0,
      from: tx.from_address,
      to: tx.to_address,
    }));

    const result = {
      success: true,
      wallet,
      score,
      realizedPnl,
      totalTxs: txSummary?.total_count || recentTxs.length,
      firstTx: txSummary?.earliest_transaction?.block_signed_at || null,
      lastTx: txSummary?.latest_transaction?.block_signed_at || null,
      topHoldings,
      recentTxs: formattedTxs,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("Profile error:", err.message);
    res.status(500).json({ error: "Failed to fetch wallet profile" });
  }
});

// POST /api/whales/watch
router.post("/watch", async (req, res) => {
  try {
    const { wallets } = req.body;
    if (!wallets || wallets.length === 0) {
      return res.status(400).json({ error: "Wallet addresses required" });
    }
    const { startWalletStream, addWallets } = await import("../services/streaming.js");
    addWallets(wallets);
    startWalletStream(wallets, (signal) => {
      console.log("New signal:", signal.summary);
    });
    res.json({ success: true, message: `Watching ${wallets.length} wallets`, wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start stream" });
  }
});

// GET /api/whales/signals
router.get("/signals", async (req, res) => {
  try {
    const { signals } = await import("../services/streaming.js");
    res.json({ success: true, signals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

// GET /api/whales/risk
router.get("/risk", async (req, res) => {
  try {
    const { wallet, network = "eth-mainnet" } = req.query;
    if (!wallet) return res.status(400).json({ error: "Wallet required" });

    const cacheKey = `risk:${wallet}:${network}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const approvals = await getWalletApprovals(wallet, network);

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let totalValueAtRisk = 0;

    for (const approval of approvals) {
      const spenders = approval.spenders || [];
      for (const spender of spenders) {
        const risk = spender.risk_factor || "";
        if (risk.includes("HIGH")) highRiskCount++;
        else if (risk.includes("CONSIDER")) mediumRiskCount++;
        totalValueAtRisk += spender.value_at_risk_quote || 0;
      }
    }

    const riskScore = Math.min(
      Math.round(
        highRiskCount * 20 +
          mediumRiskCount * 8 +
          (totalValueAtRisk > 100000 ? 10 : 0)
      ),
      100
    );
    const trustScore = Math.max(100 - riskScore, 0);

    const result = {
      success: true,
      wallet,
      trustScore,
      riskScore,
      highRiskApprovals: highRiskCount,
      mediumRiskApprovals: mediumRiskCount,
      totalValueAtRisk: Math.round(totalValueAtRisk),
      totalApprovals: approvals.length,
      approvals: approvals.slice(0, 5).map((a) => ({
        token: a.ticker_symbol,
        balance: a.pretty_balance_quote,
        valueAtRisk: a.pretty_value_at_risk_quote,
        spenderCount: a.spenders?.length || 0,
        highestRisk: a.spenders?.reduce(
          (max, s) =>
            s.risk_factor?.includes("HIGH")
              ? "HIGH"
              : s.risk_factor?.includes("CONSIDER")
              ? "MEDIUM"
              : max,
          "LOW"
        ),
      })),
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("Risk error:", err.message);
    res.status(500).json({ error: "Failed to fetch risk data" });
  }
});

// POST /api/whales/explain
router.post("/explain", async (req, res) => {
  try {
    const { signal, walletScore, totalTrades } = req.body;
    if (!signal) return res.status(400).json({ error: "Signal required" });

    const prompt = `You are a concise crypto trading analyst. Analyze this whale trade signal in 2-3 sentences.

Signal: ${signal.summary}
Chain: ${signal.chain?.includes("BASE") ? "Base" : "Ethereum"}
Amount: $${signal.amountIn?.toLocaleString() || "Unknown"}
Wallet Score: ${walletScore || "Unknown"}/99
Total Historical Trades: ${totalTrades || "Unknown"}

Briefly cover: what this trade likely means, whether it's worth copying, and one key risk. Be direct and actionable.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const explanation =
      data?.choices?.[0]?.message?.content ||
      "Analysis unavailable at this time.";

    res.json({ success: true, explanation });
  } catch (err) {
    console.error("Explain error:", err.message);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

export default router;