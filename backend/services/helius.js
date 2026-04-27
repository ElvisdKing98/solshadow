import dotenv from "dotenv";
dotenv.config();

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const HELIUS_URL = `https://api.helius.xyz/v0`;

// ✅ Dynamically discover top holders for any Solana token
export async function getTopSolanaHolders(tokenMint, limit = 20) {
  // Step 1: Get top 20 token accounts by balance
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getTokenLargestAccounts",
      params: [tokenMint],
    }),
  });

  const data = await res.json();
  const tokenAccounts = data?.result?.value || [];

  if (tokenAccounts.length === 0) return [];

  // Step 2: Resolve token accounts → owner wallet addresses
  const owners = await Promise.allSettled(
    tokenAccounts.slice(0, limit).map(async (ta) => {
      const accountRes = await fetch(HELIUS_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getAccountInfo",
          params: [
            ta.address,
            { encoding: "jsonParsed" },
          ],
        }),
      });
      const accountData = await accountRes.json();
      const owner =
        accountData?.result?.value?.data?.parsed?.info?.owner;
      return {
        walletAddress: owner || ta.address,
        tokenAmount: ta.uiAmount || 0,
        tokenAmountRaw: ta.amount,
      };
    })
  );

  return owners
    .filter((r) => r.status === "fulfilled" && r.value.walletAddress)
    .map((r) => r.value)
    .filter((v, i, self) =>
      // deduplicate by wallet address
      self.findIndex((x) => x.walletAddress === v.walletAddress) === i
    );
}

// Get parsed transaction history for a wallet
export async function getSolanaTransactions(walletAddress, limit = 50) {
  const response = await fetch(
    `${HELIUS_URL}/addresses/${walletAddress}/transactions?api-key=${HELIUS_KEY}&limit=${limit}`
  );
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data;
}

// Calculate PnL from swap transactions
export function calculateSolanaPnL(transactions) {
  let realizedPnl = 0;
  let swapCount = 0;
  let transferCount = 0;

  for (const tx of transactions) {
    if (!tx.successful) continue;
    if (tx.type === "SWAP") swapCount++;
    if (tx.type === "TRANSFER") transferCount++;
  }

  const solTransfers = transactions.flatMap((tx) =>
    (tx.nativeTransfers || [])
  );

  const solIn = solTransfers
    .reduce((sum, t) => sum + (t.amount / 1e9), 0);

  realizedPnl = solIn * 150; // rough USD at $150/SOL

  return {
    realizedPnl: Math.round(realizedPnl),
    swapCount,
    transferCount,
    totalTrades: swapCount + transferCount,
    recentTxs: transactions.slice(0, 10).map((tx) => ({
      hash: tx.signature,
      date: new Date(tx.timestamp * 1000).toISOString(),
      successful: tx.successful !== false,
      type: tx.type || "UNKNOWN",
      description: tx.description || "",
    })),
  };
}