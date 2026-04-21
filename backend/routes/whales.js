import express from "express";
import { getTopTraders, getWalletPnL, getWalletBalances, scoreWallet } from "../services/goldrush.js";

const router = express.Router();

// GET /api/whales/discover?token=<tokenAddress>
// Discover top whale wallets for a token
router.get("/discover", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Token address required" });
    }

    const traders = await getTopTraders(token);

    // Score each wallet
    const scored = traders
      .map((t) => ({
        walletAddress: t.walletAddress,
        totalBuyUsd: t.totalBuyUsd,
        totalSellUsd: t.totalSellUsd,
        realizedPnl: t.realizedPnlUsd,
        unrealizedPnl: t.unrealizedPnlUsd,
        tradesCount: t.totalTradesCount,
        score: scoreWallet([t]),
      }))
      .sort((a, b) => b.realizedPnl - a.realizedPnl)
      .slice(0, 20); // Top 20 whales

    res.json({ success: true, whales: scored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch whale wallets" });
  }
});

// GET /api/whales/profile?wallet=<walletAddress>
// Get full profile + score for a specific wallet
router.get("/profile", async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const [pnlData, balances] = await Promise.all([
      getWalletPnL(wallet),
      getWalletBalances(wallet),
    ]);

    const score = scoreWallet(pnlData);

    res.json({
      success: true,
      wallet,
      score,
      pnl: pnlData,
      balances: balances.slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wallet profile" });
  }
});

// In-memory stream client reference
let streamClient = null;

// POST /api/whales/watch
// Start watching a list of wallets
router.post("/watch", async (req, res) => {
  try {
    const { wallets } = req.body;
    if (!wallets || wallets.length === 0) {
      return res.status(400).json({ error: "Wallet addresses required" });
    }

    // Import streaming service
    const { startWalletStream, addWallets } = await import("../services/streaming.js");

    addWallets(wallets);
    streamClient = startWalletStream(wallets, (signal) => {
      console.log("New signal:", signal.summary);
    });

    res.json({ success: true, message: `Watching ${wallets.length} wallets`, wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start stream" });
  }
});

// GET /api/whales/signals
// Get latest signals
router.get("/signals", async (req, res) => {
  try {
    const { signals } = await import("../services/streaming.js");
    res.json({ success: true, signals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

export default router;