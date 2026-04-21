import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GOLDRUSH_API_KEY;
const BASE_URL = "https://api.covalenthq.com/v1";

// Discover top trader wallets for a given token on Solana
export async function getTopTraders(tokenAddress) {
  const query = `
    query {
      topTraderWalletsForToken(
        chainName: "solana-mainnet"
        tokenAddress: "${tokenAddress}"
      ) {
        walletAddress
        totalBuyUsd
        totalSellUsd
        realizedPnlUsd
        unrealizedPnlUsd
        totalTradesCount
      }
    }
  `;

  const response = await fetch("https://goldrush.covalenthq.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data?.data?.topTraderWalletsForToken || [];
}

// Get wallet PnL breakdown by token
export async function getWalletPnL(walletAddress) {
  const query = `
    query {
      walletPnlByToken(
        chainName: "solana-mainnet"
        walletAddress: "${walletAddress}"
      ) {
        tokenAddress
        tokenSymbol
        realizedPnlUsd
        unrealizedPnlUsd
        currentBalanceUsd
        totalBuyUsd
        totalSellUsd
      }
    }
  `;

  const response = await fetch("https://goldrush.covalenthq.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data?.data?.walletPnlByToken || [];
}

// Get token balances for a wallet
export async function getWalletBalances(walletAddress) {
  const response = await fetch(
    `${BASE_URL}/solana-mainnet/address/${walletAddress}/balances_v2/?key=${API_KEY}`
  );
  const data = await response.json();
  return data?.data?.items || [];
}

// Score a whale wallet based on PnL data
export function scoreWallet(pnlData) {
  if (!pnlData || pnlData.length === 0) return 0;

  const totalRealized = pnlData.reduce(
    (sum, t) => sum + (t.realizedPnlUsd || 0), 0
  );
  const totalUnrealized = pnlData.reduce(
    (sum, t) => sum + (t.unrealizedPnlUsd || 0), 0
  );
  const totalPnl = totalRealized + totalUnrealized;
  const winningTokens = pnlData.filter((t) => t.realizedPnlUsd > 0).length;
  const winRate = pnlData.length > 0 ? winningTokens / pnlData.length : 0;

  // Score out of 100
  let score = 0;
  if (totalPnl > 100000) score += 50;
  else if (totalPnl > 10000) score += 30;
  else if (totalPnl > 1000) score += 15;

  score += Math.round(winRate * 50);

  return Math.min(score, 100);
}