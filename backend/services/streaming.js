import { createClient } from "graphql-ws";
import { WebSocket } from "ws";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GOLDRUSH_API_KEY;
const STREAMING_URL = `wss://streaming.goldrushdata.com/graphql`;

// In-memory signal store
export const signals = [];
export const watchedWallets = new Set();

// Add wallets to watch list
export function addWallets(walletAddresses) {
  walletAddresses.forEach((w) => watchedWallets.add(w));
}

// Start watching wallets for real-time activity
export function startWalletStream(walletAddresses, onSignal) {
  if (!walletAddresses || walletAddresses.length === 0) return null;

  const client = createClient({
    url: STREAMING_URL,
    webSocketImpl: WebSocket,
    connectionParams: () => ({
      Authorization: `Bearer ${API_KEY}`,
      "x-api-key": API_KEY,
      token: API_KEY,
      apiKey: API_KEY,
    }),
    on: {
      connecting: () => console.log("🔌 Connecting to GoldRush stream..."),
      opened: () => console.log("✅ Connected to GoldRush stream!"),
      closed: () => console.log("❌ Stream closed"),
      error: (err) => console.error("Stream error:", err?.message || err),
    },
  });

  const query = `
    subscription {
      walletTxs(
        chain_name: BASE_MAINNET,
        wallet_addresses: ${JSON.stringify(walletAddresses)}
      ) {
        tx_hash
        from_address
        to_address
        value
        chain_name
        block_signed_at
        block_height
        successful
        decoded_type
        decoded_details {
          ... on SwapTransaction {
            token_in {
              contract_address
              contract_decimals
              contract_ticker_symbol
            }
            token_out {
              contract_address
              contract_decimals
              contract_ticker_symbol
            }
            amount_in
            amount_out
          }
          ... on TransferTransaction {
            from
            to
            amount
            quote_usd
            contract_metadata {
              contract_name
              contract_ticker_symbol
            }
          }
        }
      }
    }
  `;

  client.subscribe(
    { query },
    {
      next: (data) => {
        const tx = data?.data?.walletTxs;
        if (!tx) return;
        const signal = buildSignal(tx);
        if (!signal) return;
        signals.unshift(signal);
        if (signals.length > 100) signals.pop();
        console.log(`🐋 Signal detected: ${signal.type} — ${signal.summary}`);
        if (onSignal) onSignal(signal);
      },
      error: (err) => console.error("Subscription error:", JSON.stringify(err, null, 2)),
      complete: () => console.log("Subscription complete"),
    }
  );

  // Start demo signal generator for hackathon demo purposes
  startDemoSignals(walletAddresses, onSignal);

  return client;
}

// Build a clean signal object from raw tx
function buildSignal(tx) {
  const base = {
    id: tx.tx_hash,
    wallet: tx.from_address,
    chain: tx.chain_name,
    timestamp: tx.block_signed_at || new Date().toISOString(),
    txHash: tx.tx_hash,
    type: tx.decoded_type || "SWAP",
  };

  if (tx.decoded_type === "SWAP" && tx.decoded_details) {
    const d = tx.decoded_details;
    return {
      ...base,
      summary: `Swapped ${d.token_in?.contract_ticker_symbol} → ${d.token_out?.contract_ticker_symbol}`,
      tokenIn: d.token_in?.contract_ticker_symbol,
      tokenOut: d.token_out?.contract_ticker_symbol,
      amountIn: d.amount_in,
      amountOut: d.amount_out,
    };
  }

  if (tx.decoded_type === "TRANSFER" && tx.decoded_details) {
    const d = tx.decoded_details;
    const usd = d.quote_usd || 0;
    if (usd < 10000) return null;
    return {
      ...base,
      summary: `Transferred $${usd.toLocaleString()} of ${d.contract_metadata?.contract_ticker_symbol}`,
      usdValue: usd,
      token: d.contract_metadata?.contract_ticker_symbol,
    };
  }

  return null;
}

// Demo signal generator — fires realistic signals for hackathon demo
const DEMO_TOKENS = [
  { in: "USDC", out: "WETH", min: 50000, max: 2000000 },
  { in: "WETH", out: "USDC", min: 100000, max: 5000000 },
  { in: "USDC", out: "Brett", min: 25000, max: 500000 },
  { in: "AERO", out: "USDC", min: 10000, max: 300000 },
  { in: "USDC", out: "PEPE", min: 50000, max: 1000000 },
  { in: "WETH", out: "AERO", min: 200000, max: 3000000 },
];

let demoInterval = null;

function startDemoSignals(walletAddresses, onSignal) {
  // Clear existing interval if any
  if (demoInterval) clearInterval(demoInterval);

  // Fire first signal after 10 seconds
  setTimeout(() => {
    fireDemoSignal(walletAddresses, onSignal);
  }, 10000);

  // Then fire every 30-60 seconds
  demoInterval = setInterval(() => {
    fireDemoSignal(walletAddresses, onSignal);
  }, 35000);
}

function fireDemoSignal(walletAddresses, onSignal) {
  if (!walletAddresses || walletAddresses.length === 0) return;

  const wallet = walletAddresses[Math.floor(Math.random() * walletAddresses.length)];
  const token = DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)];
  const amount = Math.floor(Math.random() * (token.max - token.min) + token.min);
  const chains = ["BASE_MAINNET", "ETH_MAINNET"];
  const chain = chains[Math.floor(Math.random() * chains.length)];

  const signal = {
    id: `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    wallet,
    chain,
    timestamp: new Date().toISOString(),
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    type: "SWAP",
    summary: `Swapped $${amount.toLocaleString()} ${token.in} → ${token.out}`,
    tokenIn: token.in,
    tokenOut: token.out,
    amountIn: amount,
    amountOut: amount * (0.98 + Math.random() * 0.04),
    isDemo: true,
  };

  signals.unshift(signal);
  if (signals.length > 100) signals.pop();
  console.log(`🎯 Demo signal: ${signal.summary} from ${wallet.slice(0, 8)}...`);
  if (onSignal) onSignal(signal);
}