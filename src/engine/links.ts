/**
 * STEP 7: LINKS (non-negotiable)
 * Every FOMO link the desk produces goes through this module.
 * Never drop a parameter. Never shorten or wrap a FOMO link.
 */

export const CHAIN_ID: Record<string, number> = {
  solana: 1399811149,
  robinhood: 4663,
  base: 8453,
  bnb: 56,
};

export const SIGNUP_URL = 'https://fomo.family/r/masakazu12';

export function coinUrl(address: string, chain: string = 'solana'): string {
  if (!(chain in CHAIN_ID)) {
    return SIGNUP_URL;
  }
  return `https://fomo.family/coin?address=${address}&chainId=${CHAIN_ID[chain]}&r=masakazu12&source=share_link`;
}

export function profileUrl(handle: string): string {
  const h = handle.replace(/^@+/, '').trim() || 'trader';
  return `https://fomo.family/profile/${h}?source=share_link&r=masakazu12`;
}
