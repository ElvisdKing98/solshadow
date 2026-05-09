import dotenv from "dotenv";
dotenv.config();

// In-memory signal store
export const signals = [];
export const watchedWallets = new Set();

export function addWallets(walletAddresses) {
  walletAddresses.forEach((w) => watchedWallets.add(w));
}

export function startWalletStream(walletAddresses, onSignal) {
  if (!walletAddresses || walletAddresses.length === 0) return null;

  console.log(`👀 Watching ${walletAddresses.length} wallets...`);

  // Start demo signals immediately
  startDemoSignals(walletAddresses, onSignal);
  return true;
}

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
  if (demoInterval) clearInterval(demoInterval);

  setTimeout(() => {
    fireDemoSignal(walletAddresses, onSignal);
  }, 8000);

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
  console.log(`🎯 Signal: ${signal.summary}`);
  if (onSignal) onSignal(signal);
}