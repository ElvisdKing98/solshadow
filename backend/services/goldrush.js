import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GOLDRUSH_API_KEY;
const BASE_URL = "https://api.covalenthq.com/v1";
const GRAPHQL_URL = "https://streaming.goldrushdata.com/graphql";

// Get top token holders
export async function getTopHolders(tokenAddress, chain = "eth-mainnet") {
  const response = await fetch(
    `${BASE_URL}/${chain}/tokens/${tokenAddress}/token_holders_v2/?key=${API_KEY}`
  );
  const data = await response.json();
  if (data.error) throw new Error(data.error_message || "Failed to fetch holders");
  return data?.data?.items || [];
}

// Get wallet token balances
export async function getWalletBalances(walletAddress, chain = "eth-mainnet") {
  const response = await fetch(
    `${BASE_URL}/${chain}/address/${walletAddress}/balances_v2/?key=${API_KEY}`
  );
  const data = await response.json();
  return data?.data?.items || [];
}

// Get transaction summary — total count, first/last tx date
export async function getTransactionSummary(walletAddress, chain = "eth-mainnet") {
  const response = await fetch(
    `${BASE_URL}/${chain}/address/${walletAddress}/transactions_summary/?key=${API_KEY}`
  );
  const data = await response.json();
  if (data.error) return null;
  return data?.data?.items?.[0] || null;
}

// Get recent transactions for PnL estimation
export async function getRecentTransactions(walletAddress, chain = "eth-mainnet") {
  const response = await fetch(
    `${BASE_URL}/${chain}/address/${walletAddress}/transactions_v3/?key=${API_KEY}&no-logs=true`
  );
  const data = await response.json();
  if (data.error) return [];
  return data?.data?.items || [];
}

// Estimate realized PnL from recent transactions
export function estimatePnlFromTxs(txs, walletAddress) {
  if (!txs || txs.length === 0) return 0;

  let totalIn = 0;
  let totalOut = 0;

  for (const tx of txs) {
    if (!tx.successful) continue;
    const valueUsd = tx.value_quote || 0;
    if (tx.to_address?.toLowerCase() === walletAddress?.toLowerCase()) {
      totalIn += valueUsd;
    } else if (tx.from_address?.toLowerCase() === walletAddress?.toLowerCase()) {
      totalOut += valueUsd;
    }
  }

  return Math.round(totalIn - totalOut);
}

// Try upnlForToken GraphQL
export async function getTopTraders(tokenAddress, chainName = "ETH_MAINNET") {
  const query = `
    query {
      upnlForToken(
        chain_name: ${chainName}
        token_address: "${tokenAddress}"
      ) {
        wallet_address
        volume
        transactions_count
        balance_pretty
        pnl_realized_usd
        pnl_unrealized_usd
        contract_metadata {
          contract_name
          contract_ticker_symbol
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0]?.message);
  return data?.data?.upnlForToken || [];
}

// Get wallet PnL via GraphQL
export async function getWalletPnL(walletAddress, chainName = "ETH_MAINNET") {
  const query = `
    query {
      upnlForWallet(
        chain_name: ${chainName}
        wallet_address: "${walletAddress}"
      ) {
        token_address
        pnl_realized_usd
        pnl_unrealized_usd
        balance_pretty
        volume
        contract_metadata {
          contract_name
          contract_ticker_symbol
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  if (data.errors) return [];
  return data?.data?.upnlForWallet || [];
}

// Score wallet from PnL data
export function scoreWallet(pnlData) {
  if (!pnlData || pnlData.length === 0) return 0;
  const totalRealized = pnlData.reduce((sum, t) => sum + (t.pnl_realized_usd || 0), 0);
  const totalPnl = totalRealized + pnlData.reduce((sum, t) => sum + (t.pnl_unrealized_usd || 0), 0);
  const winningTokens = pnlData.filter((t) => t.pnl_realized_usd > 0).length;
  const winRate = pnlData.length > 0 ? winningTokens / pnlData.length : 0;
  let score = 0;
  if (totalPnl > 100000) score += 50;
  else if (totalPnl > 10000) score += 30;
  else if (totalPnl > 1000) score += 15;
  score += Math.round(winRate * 50);
  return Math.min(score, 100);
}

// Score wallet from holder balance — varied, meaningful scores
export function scoreFromBalance(balanceHuman, rank, totalHolders) {
  const rankScore = Math.max(0, 60 - (rank / totalHolders) * 40);
  let balanceScore = 0;
  if (balanceHuman > 1_000_000_000) balanceScore = 40;
  else if (balanceHuman > 100_000_000) balanceScore = 35;
  else if (balanceHuman > 10_000_000) balanceScore = 28;
  else if (balanceHuman > 1_000_000) balanceScore = 20;
  else if (balanceHuman > 100_000) balanceScore = 12;
  else balanceScore = 5;
  return Math.min(Math.round(rankScore + balanceScore), 99);
}