import express from "express";
import {
  getTopTraders,
  getTopHolders,
  getWalletPnL,
  getWalletBalances,
  getWalletTransactions,
  scoreWallet,
  scoreFromBalance,
} from "../services/goldrush.js";

const API_KEY = process.env.GOLDRUSH_API_KEY;
const BASE_URL = "https://api.covalenthq.com/v1";

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Known Solana whale wallets for demo
const SOLANA_KNOWN_WHALES = [
  { address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2", label: "SOL Rich #1" },
  { address: "52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD", label: "SOL Rich #2" },
  { address: "8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt", label: "SOL Rich #3" },
  { address: "GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC", label: "SOL Rich #4" },
  { address: "9QgXqrgdbVU8KcpfskqJpAXKzbaYQJecgMAruSWoXDkM", label: "SOL Rich #5" },
  { address: "9uRJ5aGgeu2i3J98hsC5FDxd2PmRjVy9fQwNAy7fzLG3", label: "SOL Rich #6" },
  { address: "EJRJswH9LyjhAfBWwPBvat1LQtrJYK4sVUzsea889cQt", label: "SOL Rich #7" },
  { address: "53nHsQXkzZUp5MF1BK6Qoa48ud3aXfDFJBbe1oECPucC", label: "SOL Rich #8" },
  { address: "8PjJTv657aeN9p5R2WoM6pPSz385chvTTytUWaEjSjkq", label: "SOL Rich #9" },
  { address: "AHB94zKUASftTdqgdfiDSdnPJHkEFp7zX3yMrcSxABsv", label: "SOL Rich #10" },
];

const router = express.Router();

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

    // Handle Solana — fetch real balances for curated whale wallets
    if (network === "solana-mainnet") {
      console.log("Discovering top Solana holders via Helius...");

      const { getTopSolanaHolders, getSolanaTransactions, calculateSolanaPnL } =
        await import("../services/helius.js");

      // Dynamically get top holders for the token
      const topHolders = await getTopSolanaHolders(token, 20);

      if (!topHolders || topHolders.length === 0) {
        return res.status(400).json({
          error: "No holders found for this Solana token. Try a different token address.",
        });
      }

      // Fetch balances + transactions for each holder
      const whalesWithData = await Promise.allSettled(
        topHolders.map(async (holder, index) => {
          try {
            const [balanceRes, txData] = await Promise.all([
              fetch(
                `${BASE_URL}/solana-mainnet/address/${holder.walletAddress}/balances_v2/?key=${API_KEY}`
              ).then((r) => r.json()),
              getSolanaTransactions(holder.walletAddress, 30),
            ]);

            const items = balanceRes?.data?.items || [];
            const totalUsd = items.reduce((sum, i) => sum + (i.quote || 0), 0);
            const pnl = calculateSolanaPnL(txData);

            let tier = "🐬 Dolphin";
            if (totalUsd > 500_000_000) tier = "🐳 Mega Whale";
            else if (totalUsd > 50_000_000) tier = "🐋 Whale";
            else if (totalUsd > 5_000_000) tier = "🦈 Shark";

            return {
              walletAddress: holder.walletAddress,
              label: `Top Holder #${index + 1}`,
              totalBuyUsd: totalUsd,
              totalSellUsd: 0,
              realizedPnl: pnl.realizedPnl,
              unrealizedPnl: totalUsd,
              tradesCount: pnl.totalTrades,
              swapCount: pnl.swapCount,
              balance: holder.tokenAmount.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              }),
              token: "SOL",
              score: Math.max(99 - index * 4, 45),
              tier,
              source: "helius-live",
              network,
            };
          } catch (err) {
            console.error(`Failed for ${holder.walletAddress}:`, err.message);
            return {
              walletAddress: holder.walletAddress,
              label: `Top Holder #${index + 1}`,
              totalBuyUsd: holder.tokenAmount,
              totalSellUsd: 0,
              realizedPnl: 0,
              unrealizedPnl: holder.tokenAmount,
              tradesCount: 0,
              balance: holder.tokenAmount.toLocaleString(),
              token: "SOL",
              score: Math.max(99 - index * 4, 45),
              tier: "🦈 Shark",
              source: "helius-live",
              network,
            };
          }
        })
      );

      const scored = whalesWithData
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean)
        .sort((a, b) => b.totalBuyUsd - a.totalBuyUsd);

      const result = { success: true, whales: scored, source: "helius-live" };
      setCache(cacheKey, result);
      return res.json(result);
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
      const total = holders.length;

      const scored = holders
        .filter((h) => h.address)
        .map((h, index) => {
          const decimals = h.contract_decimals ?? 18; // default to 18 for ERC20
          const balanceHuman = parseFloat(h.balance) / Math.pow(10, decimals);

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
            score: scoreFromBalance(balanceHuman, index, total),
            tier,
            source: "holders",
            network,
          };
        })
        .sort((a, b) => b.totalBuyUsd - a.totalBuyUsd)
        .slice(0, 20);

      const result = { success: true, whales: scored, source: "holders" };
      setCache(cacheKey, result);
      return res.json(result);
    }

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

    // Fetch balances and transactions in parallel
    const [balances, txs] = await Promise.all([
      getWalletBalances(wallet, network),
      getWalletTransactions(wallet, network),
    ]);

    // Try PnL from GraphQL too
    let pnlData = [];
    try {
      pnlData = await getWalletPnL(wallet, chain);
    } catch (e) {}

    const score = pnlData.length > 0 ? scoreWallet(pnlData) : 50;

    // Top holdings by USD value
    const topHoldings = balances
      .filter((b) => b.quote > 0)
      .sort((a, b) => b.quote - a.quote)
      .slice(0, 8)
      .map((b) => ({
        symbol: b.contract_ticker_symbol,
        name: b.contract_name,
        balance: b.balance_24h,
        usdValue: b.quote,
        logoUrl: b.logo_url,
        percentChange: b.quote_24h
          ? (((b.quote - b.quote_24h) / b.quote_24h) * 100).toFixed(2)
          : null,
      }));

    // Recent transactions
    const recentTxs = txs.slice(0, 10).map((tx) => ({
      hash: tx.tx_hash,
      date: tx.block_signed_at,
      successful: tx.successful,
      value: tx.value_quote || 0,
      from: tx.from_address,
      to: tx.to_address,
    }));

    res.json({
      success: true,
      wallet,
      score,
      topHoldings,
      recentTxs,
      totalTxs: txs.length,
      pnl: pnlData.slice(0, 5),
    });
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

    const { startWalletStream, addWallets } = await import(
      "../services/streaming.js"
    );
    addWallets(wallets);
    startWalletStream(wallets, (signal) => {
      console.log("New signal:", signal.summary);
    });

    res.json({
      success: true,
      message: `Watching ${wallets.length} wallets`,
      wallets,
    });
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