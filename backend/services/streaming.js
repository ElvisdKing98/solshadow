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
    connectionParams: {
      headers: {
        GOLDRUSH_API_KEY: API_KEY,
      },
    },
    on: {
      connecting: () => console.log("🔌 Connecting to GoldRush stream..."),
      opened: () => console.log("✅ Connected to GoldRush stream!"),
      closed: () => console.log("❌ Stream closed"),
      error: (err) => console.error("Stream error:", err),
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

        // Only care about swaps and large transfers
        if (tx.decoded_type !== "SWAP" && tx.decoded_type !== "TRANSFER") return;

        const signal = buildSignal(tx);
        if (!signal) return;

        // Store signal in memory
        signals.unshift(signal);
        if (signals.length > 100) signals.pop(); // Keep last 100

        console.log(`🐋 Signal detected: ${signal.type} — ${signal.summary}`);
        if (onSignal) onSignal(signal);
      },
      error: (err) => console.error("Subscription error:", err),
      complete: () => console.log("Subscription complete"),
    }
  );

  return client;
}

// Build a clean signal object from raw tx
function buildSignal(tx) {
  const base = {
    id: tx.tx_hash,
    wallet: tx.from_address,
    chain: tx.chain_name,
    timestamp: tx.block_signed_at,
    txHash: tx.tx_hash,
    type: tx.decoded_type,
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
    if (usd < 10000) return null; // Only signal large transfers $10k+
    return {
      ...base,
      summary: `Transferred $${usd.toLocaleString()} of ${d.contract_metadata?.contract_ticker_symbol}`,
      usdValue: usd,
      token: d.contract_metadata?.contract_ticker_symbol,
    };
  }

  return null;
}