import express from "express";
import {
  getTopTraders,
  getTopHolders,
  getWalletPnL,
  getWalletBalances,
  getRecentTransactions,
  getTransactionSummary,
  scoreWallet,
  scoreFromBalance,
  estimatePnlFromTxs,
} from "../services/goldrush.js";

const router = express.Router();

const API_KEY = process.env.GOLDRUSH_API_KEY;
const BASE_URL = "https://api.covalenthq.com/v1";

// Simple in-memory cache — 5 minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

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

// Tokens that don't support token_holders_v2 — use fallback list
const UNSUPPORTED_TOKENS = [
  
];

// GET /api/whales/discover?token=<tokenAddress>&chain=<chainName>&network=<network>
router.get("/discover", async (req, res) => {
  try {
    const { token, chain = "ETH_MAINNET", network = "eth-mainnet" } = req.query;
    if (!token) return res.status(400).json({ error: "Token address required" });

    // Check cache first
    const cacheKey = `discover:${token}:${network}`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log("Cache hit:", cacheKey);
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
      // Check if token is unsupported for holders endpoint
      const isUnsupported = UNSUPPORTED_TOKENS.includes(token.toLowerCase());
      if (isUnsupported) {
        return res.status(400).json({
          error: "This token doesn't support holder lookup. Try USDC, PEPE, LINK, Brett or AERO instead.",
        });
      }

      console.log(`Fetching top holders on ${network}...`);
      const holders = await getTopHolders(token, network);
      const total = holders.length;

      if (!holders || holders.length === 0) {
        return res.status(400).json({ error: "No holders found for this token." });
      }

      // Fetch transaction summary for top 10 holders to get trade counts + PnL
      const topHolders = holders.slice(0, 20);
      const txSummaries = await Promise.allSettled(
        topHolders.map((h) => getTransactionSummary(h.address, network))
      );

      const scored = topHolders
        .filter((h) => h.address)
        .map((h, index) => {
          const decimals = h.contract_decimals ?? 18;
          const balanceHuman = parseFloat(h.balance) / Math.pow(10, decimals);
          const score = scoreFromBalance(balanceHuman, index, total);
          const txSummary = txSummaries[index]?.status === "fulfilled"
            ? txSummaries[index].value
            : null;

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
            tradesCount: txSummary?.total_count || 0,
            balance: balanceHuman.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            token: h.contract_ticker_symbol,
            logoUrl: h.logo_url,
            score,
            tier,
            source: "holders",
            network,
          };
        })
        .sort((a, b) => b.totalBuyUsd - a.totalBuyUsd);

      const result = { success: true, whales: scored, source: "holders" };
      setCache(cacheKey, result);
      return res.json(result);
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
      .slice(0, 20);

    const result = { success: true, whales: scored, source: "traders" };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("Discover error:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch whale wallets" });
  }
});

// GET /api/whales/profile?wallet=<walletAddress>&chain=<chainName>&network=<network>
router.get("/profile", async (req, res) => {
  try {
    const { wallet, chain = "ETH_MAINNET", network = "eth-mainnet" } = req.query;
    if (!wallet) return res.status(400).json({ error: "Wallet address required" });

    // Check cache
    const cacheKey = `profile:${wallet}:${network}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    // Fetch balances, tx summary, and recent txs in parallel
    const [balances, txSummary, recentTxs] = await Promise.all([
      getWalletBalances(wallet, network),
      getTransactionSummary(wallet, network),
      getRecentTransactions(wallet, network),
    ]);

    // Try PnL from GraphQL
    let pnlData = [];
    try {
      pnlData = await getWalletPnL(wallet, chain);
    } catch (e) {}

    // Estimate PnL from transactions if GraphQL returns nothing
    const estimatedPnl = estimatePnlFromTxs(recentTxs, wallet);
    const graphqlPnl = pnlData.reduce((sum, t) => sum + (t.pnl_realized_usd || 0), 0);
    const realizedPnl = graphqlPnl !== 0 ? graphqlPnl : estimatedPnl;

    const score = pnlData.length > 0 ? scoreWallet(pnlData) : 50;

    // Top holdings by USD value
    const topHoldings = balances
      .filter((b) => b.quote > 0)
      .sort((a, b) => b.quote - a.quote)
      .slice(0, 8)
      .map((b) => ({
        symbol: b.contract_ticker_symbol,
        name: b.contract_name,
        usdValue: b.quote,
        logoUrl: b.logo_url,
        percentChange: b.quote_24h && b.quote_24h > 0
          ? (((b.quote - b.quote_24h) / b.quote_24h) * 100).toFixed(2)
          : null,
      }));

    // Recent transactions
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
      pnl: pnlData.slice(0, 5),
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

export default router;