/**
 * STEP 13: fees.py
 * FOMO on Solana, each side:
 *   under $5         -> $0.10
 *   $5 to $47.50     -> 2%
 *   $47.50 to $190   -> $0.95
 *   above $190       -> fee_pct (default 0.45%)
 */

export function calculateFomoFee(usd: number, feePct: number = 0.45): number {
  if (usd <= 0) return 0;
  let fee = 0;
  if (usd < 5) {
    fee = 0.10;
  } else if (usd <= 47.5) {
    fee = usd * 0.02;
  } else if (usd <= 190) {
    fee = 0.95;
  } else {
    fee = usd * (feePct / 100);
  }
  return Math.round(fee * 100) / 100;
}
