// ── Deployed contract addresses ──────────────────────────────────────────────
// Paste your Remix-deployed address here after deploying to Monad Testnet.

export const CONTRACT_ADDRESSES = {
  PredictionPool: "0x5b6AE3e38Bf117A26260d175036F84F3E751d5F9" as `0x${string}`,
} as const;

// ── Re-export ABI ─────────────────────────────────────────────────────────────
// ABI lives in lib/abi/PredictionPool.json — paste the full ABI array there.

export { default as PredictionPoolABI } from "./abi/PredictionPool.json";
