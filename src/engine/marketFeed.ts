import { CandleBar, CandidateToken } from '../types/desk';

const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function makeSolanaAddress(seed: number, suffix = 'pump'): string {
  let out = '';
  let s = seed * 9301 + 49297;
  for (let i = 0; i < 40; i++) {
    s = (s * 16807) % 2147483647;
    out += BASE58_CHARS[s % BASE58_CHARS.length];
  }
  return out + suffix;
}

export function generateCandles(basePrice: number, count = 24, volatility = 0.06): CandleBar[] {
  const now = Date.now();
  const candles: CandleBar[] = [];
  let price = basePrice * (0.78 + Math.random() * 0.25);

  for (let i = count; i >= 1; i--) {
    const ts = now - i * 60 * 1000;
    const drift = (Math.random() - 0.47) * volatility;
    const open = price;
    const close = i === 1 ? basePrice : Math.max(0.000001, open * (1 + drift));
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.65);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.55);
    const volume = Math.round(1200 + Math.random() * 9800);
    candles.push({ ts, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

interface TokenTemplate {
  name: string;
  symbol: string;
  profile: 'clean_high' | 'clean_mid' | 'scanner_kill_liq' | 'scanner_kill_top10' | 'analyst_fail_dev' | 'analyst_fail_bundle' | 'analyst_fail_score' | 'shill_ring';
}

const TEMPLATES: TokenTemplate[] = [
  { name: 'KuroNeko', symbol: 'KURO', profile: 'clean_high' },
  { name: 'Solana Shibuya', symbol: 'SHIBU', profile: 'clean_high' },
  { name: 'VeloCat', symbol: 'VCAT', profile: 'clean_mid' },
  { name: 'NeonDuck', symbol: 'NDUCK', profile: 'scanner_kill_liq' },
  { name: 'TurboFrog', symbol: 'TFROG', profile: 'analyst_fail_bundle' },
  { name: 'ZenithPup', symbol: 'ZPUP', profile: 'clean_high' },
  { name: 'AetherFox', symbol: 'AFOX', profile: 'analyst_fail_dev' },
  { name: 'MoonMochi', symbol: 'MOCHI', profile: 'clean_mid' },
  { name: 'PumpSniper', symbol: 'PSNP', profile: 'scanner_kill_top10' },
  { name: 'Kitsune AI', symbol: 'KITSU', profile: 'shill_ring' },
  { name: 'RamenCoin', symbol: 'RAMEN', profile: 'clean_high' },
  { name: 'ByteBear', symbol: 'BBEAR', profile: 'analyst_fail_score' },
  { name: 'SoraCat', symbol: 'SORA', profile: 'clean_high' },
  { name: 'PixelTanuki', symbol: 'TNKI', profile: 'clean_mid' },
];

let templateCursor = 0;

export function generateCandidateToken(forceProfile?: TokenTemplate['profile']): CandidateToken {
  const tpl = forceProfile
    ? TEMPLATES.find((t) => t.profile === forceProfile) ?? TEMPLATES[0]
    : TEMPLATES[templateCursor++ % TEMPLATES.length];

  const seed = Math.floor(Math.random() * 100000) + templateCursor * 17;
  const mint = makeSolanaAddress(seed, 'pump');
  const pool = makeSolanaAddress(seed + 777, 'swap');
  const creator = makeSolanaAddress(seed + 333, 'dev1');
  const now = Date.now();
  const basePrice = Number((0.00018 + Math.random() * 0.0024).toFixed(6));

  const base: CandidateToken = {
    mint,
    name: tpl.name,
    symbol: tpl.symbol,
    pool,
    createdAt: now - 45 * 60 * 1000,
    migratedAt: now - 22 * 60 * 1000,
    curveMin: 23,
    creator,
    creatorBalanceAtMigration: 1200000,
    creatorBalanceNow: 1200000,
    creatorSold: 0,
    devHoldPct: 1.1,
    devRugHistoryCount: 0,
    priceUsd: basePrice,
    liquidityUsd: 48500,
    liquidityAtScanUsd: 49000,
    marketCapUsd: 265000,
    volumeH1Usd: 44000,
    volumeM5Usd: 5200,
    h1ChangePct: 34,
    h24ChangePct: 125,
    top10Pct: 16.4,
    lpLockedPct: 100,
    ageMin: 24,
    holders: 412,
    holders10mAgo: 380,
    uniqueBuys1h: 96,
    uniqueSells1h: 54,
    uniqueBuys5m: 18,
    uniqueSells5m: 12,
    freshPct: 24,
    bundledGroupSize: 1,
    insiderNetworksPct: 4,
    delegatedAccounts: 0,
    mintRevoked: true,
    freezeRevoked: true,
    tokenWarnings: {
      disableSelling: false,
      disableBuying: false,
      warningText: null,
    },
    social: {
      u15: 19,
      u60: 42,
      accel: 1.81,
      big: 2,
      catalyst: 'Top Solana leaderboard traders accumulating after PumpSwap graduation',
      coinXAgeDays: 14,
      coinXHasReplies: true,
      smart: 2,
      shill: 0.05,
      plan: 'A',
      enabled: true,
    },
    candles: generateCandles(basePrice),
  };

  switch (tpl.profile) {
    case 'clean_high':
      base.volumeH1Usd = 38000 + Math.round(Math.random() * 26000);
      base.liquidityUsd = 36000 + Math.round(Math.random() * 44000);
      base.liquidityAtScanUsd = base.liquidityUsd;
      base.top10Pct = Number((12 + Math.random() * 8).toFixed(1));
      base.devHoldPct = Number((0.4 + Math.random() * 2.1).toFixed(1));
      base.ageMin = 14 + Math.floor(Math.random() * 35);
      base.h1ChangePct = Math.round(14 + Math.random() * 46);
      base.uniqueBuys1h = 78 + Math.floor(Math.random() * 45);
      base.uniqueSells1h = Math.floor(base.uniqueBuys1h * 0.62);
      break;
    case 'clean_mid':
      base.volumeH1Usd = 22000;
      base.liquidityUsd = 28500;
      base.liquidityAtScanUsd = 28500;
      base.h1ChangePct = 78;
      base.uniqueBuys1h = 62;
      base.uniqueSells1h = 44;
      base.uniqueBuys5m = 10;
      base.uniqueSells5m = 13;
      base.social.u15 = 8;
      base.social.big = 1;
      base.social.smart = 1;
      base.social.catalyst = null;
      break;
    case 'scanner_kill_liq':
      base.liquidityUsd = 14200;
      base.liquidityAtScanUsd = 14200;
      break;
    case 'scanner_kill_top10':
      base.top10Pct = 38.4;
      break;
    case 'analyst_fail_dev':
      base.devHoldPct = 11.4;
      base.devRugHistoryCount = 2;
      break;
    case 'analyst_fail_bundle':
      base.bundledGroupSize = 14;
      base.insiderNetworksPct = 38;
      break;
    case 'analyst_fail_score':
      base.volumeH1Usd = 8200;
      base.uniqueBuys1h = 24;
      base.uniqueSells1h = 39;
      base.uniqueBuys5m = 4;
      base.uniqueSells5m = 12;
      base.h1ChangePct = 175;
      base.freshPct = 64;
      base.curveMin = 4;
      base.social.u15 = 3;
      base.social.big = 0;
      base.social.smart = 0;
      base.social.catalyst = null;
      break;
    case 'shill_ring':
      base.social.u15 = 26;
      base.social.u60 = 40;
      base.social.shill = 0.62;
      base.social.smart = 1;
      base.social.catalyst = null;
      break;
  }

  return base;
}

/**
 * Fetch real live Solana trending / graduated token pairs from DexScreener public API
 * (no API key required). Maps into CandidateToken shape with safe defaults.
 */
export async function fetchLiveDexScreenerTokens(): Promise<CandidateToken[]> {
  try {
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const boosts = (await res.json()) as Array<{ chainId?: string; tokenAddress?: string }>;
    const solMints = boosts
      .filter((b) => b.chainId === 'solana' && b.tokenAddress)
      .slice(0, 6)
      .map((b) => b.tokenAddress as string);

    if (solMints.length === 0) return [];

    const pairRes = await fetch(
      `https://api.dexscreener.com/tokens/v1/solana/${solMints.join(',')}`
    );
    if (!pairRes.ok) throw new Error(`HTTP ${pairRes.status}`);
    const pairs = (await pairRes.json()) as Array<{
      pairAddress?: string;
      baseToken?: { address?: string; name?: string; symbol?: string };
      priceUsd?: string;
      liquidity?: { usd?: number };
      fdv?: number;
      marketCap?: number;
      volume?: { h1?: number; m5?: number };
      priceChange?: { h1?: number; h24?: number };
      txns?: { h1?: { buys?: number; sells?: number }; m5?: { buys?: number; sells?: number } };
      pairCreatedAt?: number;
    }>;

    const seen = new Set<string>();
    const results: CandidateToken[] = [];

    for (const p of pairs) {
      const mint = p.baseToken?.address;
      if (!mint || seen.has(mint)) continue;
      seen.add(mint);

      const price = Number(p.priceUsd || 0.001);
      const liq = Number(p.liquidity?.usd || 0);
      const mcap = Number(p.marketCap || p.fdv || liq * 4);
      const ageMin = p.pairCreatedAt
        ? Math.max(1, Math.round((Date.now() - p.pairCreatedAt) / 60000))
        : 28;
      const buys1h = p.txns?.h1?.buys ?? 72;
      const sells1h = p.txns?.h1?.sells ?? 48;
      const buys5m = p.txns?.m5?.buys ?? 14;
      const sells5m = p.txns?.m5?.sells ?? 9;

      results.push({
        mint,
        name: p.baseToken?.name || 'Solana Token',
        symbol: p.baseToken?.symbol || 'SOLT',
        pool: p.pairAddress || makeSolanaAddress(results.length + 10, 'swap'),
        createdAt: p.pairCreatedAt || Date.now() - ageMin * 60000,
        migratedAt: p.pairCreatedAt || Date.now() - ageMin * 60000,
        curveMin: 18,
        creator: makeSolanaAddress(results.length + 99, 'dev'),
        creatorBalanceAtMigration: 800000,
        creatorBalanceNow: 800000,
        creatorSold: 0,
        devHoldPct: 1.4,
        devRugHistoryCount: 0,
        priceUsd: price > 0 ? price : 0.001,
        liquidityUsd: liq,
        liquidityAtScanUsd: liq,
        marketCapUsd: mcap,
        volumeH1Usd: Number(p.volume?.h1 || 28000),
        volumeM5Usd: Number(p.volume?.m5 || 3200),
        h1ChangePct: Number(p.priceChange?.h1 || 18),
        h24ChangePct: Number(p.priceChange?.h24 || 65),
        top10Pct: 17.5,
        lpLockedPct: 100,
        ageMin,
        holders: 320 + Math.floor(Math.random() * 400),
        holders10mAgo: 305,
        uniqueBuys1h: buys1h,
        uniqueSells1h: sells1h,
        uniqueBuys5m: buys5m,
        uniqueSells5m: sells5m,
        freshPct: 26,
        bundledGroupSize: 1,
        insiderNetworksPct: 5,
        delegatedAccounts: 0,
        mintRevoked: true,
        freezeRevoked: true,
        tokenWarnings: { disableSelling: false, disableBuying: false, warningText: null },
        social: {
          u15: 14,
          u60: 32,
          accel: 1.75,
          big: 1,
          catalyst: 'Live DexScreener Solana pool detected',
          coinXAgeDays: 12,
          coinXHasReplies: true,
          smart: 1,
          shill: 0.08,
          plan: 'A',
          enabled: true,
        },
        candles: generateCandles(price > 0 ? price : 0.001),
      });
    }

    return results;
  } catch {
    return [];
  }
}
