import { CandleBar, CandidateToken } from '../types/desk';

export type LiveFeedSource = 'auto' | 'pumpportal' | 'boosts' | 'profiles' | 'pumpswap';

export interface LiveFeedStatus {
  ok: boolean;
  pumpPortalConnected: boolean;
  pumpPortalLastEventTs: number;
  recentMigrationsCount: number;
  ruggedMintsCount: number;
  lastRugSyncTs: number;
  ts: number;
}

export interface LivePriceUpdate {
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volumeH1Usd: number;
  volumeM5Usd: number;
  h1ChangePct: number;
  buys5m: number;
  sells5m: number;
}

interface RawLiveCandidate {
  mint: string;
  name: string;
  symbol: string;
  dexId: string;
  pool: string;
  createdAt: number;
  migratedAt: number;
  curveMin: number;
  creator: string;
  priceUsd: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volumeH1Usd: number;
  volumeM5Usd: number;
  h1ChangePct: number;
  h24ChangePct: number;
  ageMin: number;
  buys1h: number;
  sells1h: number;
  buys5m: number;
  sells5m: number;
  hasTwitter: boolean;
  source: string;
}

interface RawLiveAudit {
  mint: string;
  sourcesUsed: string[];
  mintRevoked: boolean;
  freezeRevoked: boolean;
  creator: string;
  devHoldPct: number;
  devRugHistoryCount: number;
  top10Pct: number;
  lpLockedPct: number;
  bundledGroupSize: number;
  insiderNetworksPct: number;
  delegatedAccounts: number;
  holders: number;
  rugged: boolean;
  warningText: string | null;
  rugScore: number | null;
}

function buildInitialRealCandles(priceUsd: number, h1ChangePct: number, volumeM5Usd: number): CandleBar[] {
  const now = Date.now();
  const prevPrice =
    h1ChangePct > -95 ? priceUsd / (1 + h1ChangePct / 100) : priceUsd;
  return [
    {
      ts: now - 60 * 1000,
      open: prevPrice,
      high: Math.max(prevPrice, priceUsd),
      low: Math.min(prevPrice, priceUsd),
      close: priceUsd,
      volume: Math.round(volumeM5Usd),
    },
    {
      ts: now,
      open: priceUsd,
      high: priceUsd,
      low: priceUsd,
      close: priceUsd,
      volume: Math.round(volumeM5Usd),
    },
  ];
}

function combineCandidateAndAudit(raw: RawLiveCandidate, audit?: RawLiveAudit | null): CandidateToken {
  const holders = audit?.holders && audit.holders > 0 ? audit.holders : Math.max(1, raw.buys1h);
  return {
    mint: raw.mint,
    name: raw.name,
    symbol: raw.symbol,
    pool: raw.pool || raw.mint,
    createdAt: raw.createdAt,
    migratedAt: raw.migratedAt,
    curveMin: raw.curveMin,
    creator: audit?.creator || raw.creator || '',
    creatorBalanceAtMigration: 100,
    creatorBalanceNow: 100,
    creatorSold: 0,
    devHoldPct: audit ? audit.devHoldPct : 0,
    devRugHistoryCount: audit ? audit.devRugHistoryCount : 0,
    priceUsd: raw.priceUsd,
    liquidityUsd: raw.liquidityUsd,
    liquidityAtScanUsd: raw.liquidityUsd,
    marketCapUsd: raw.marketCapUsd,
    volumeH1Usd: raw.volumeH1Usd,
    volumeM5Usd: raw.volumeM5Usd,
    h1ChangePct: raw.h1ChangePct,
    h24ChangePct: raw.h24ChangePct,
    top10Pct: audit ? audit.top10Pct : 20,
    lpLockedPct: audit ? audit.lpLockedPct : 0,
    ageMin: raw.ageMin,
    holders,
    holders10mAgo: holders,
    uniqueBuys1h: raw.buys1h,
    uniqueSells1h: raw.sells1h,
    uniqueBuys5m: raw.buys5m,
    uniqueSells5m: raw.sells5m,
    freshPct: 20,
    bundledGroupSize: audit ? audit.bundledGroupSize : 0,
    insiderNetworksPct: audit ? audit.insiderNetworksPct : 0,
    delegatedAccounts: audit ? audit.delegatedAccounts : 0,
    mintRevoked: audit ? audit.mintRevoked : false,
    freezeRevoked: audit ? audit.freezeRevoked : false,
    tokenWarnings: {
      disableSelling: Boolean(audit?.rugged),
      disableBuying: false,
      warningText: audit?.warningText ?? null,
    },
    // Plan C per STEP 4 spec: never invent X counts without a real X API/webhook
    social: {
      u15: 0,
      u60: 0,
      accel: 0,
      big: 0,
      catalyst: null,
      coinXAgeDays: raw.hasTwitter ? 7 : null,
      coinXHasReplies: false,
      smart: 0,
      shill: 0,
      plan: 'C',
      enabled: false,
    },
    candles: buildInitialRealCandles(raw.priceUsd, raw.h1ChangePct, raw.volumeM5Usd),
  };
}

/**
 * Check real backend live data feed status (PumpPortal WS + RugCheck ticker)
 */
export async function fetchLiveFeedStatus(): Promise<LiveFeedStatus | null> {
  try {
    const res = await fetch('/api/live/status');
    if (!res.ok) return null;
    return (await res.json()) as LiveFeedStatus;
  } catch {
    return null;
  }
}

/**
 * Fetch real live Solana token candidates from server (/api/live/candidates)
 * and enrich passing/selected mints with real RugCheck + Solana RPC on-chain audits.
 */
export async function fetchRealSolanaCandidates(
  source: LiveFeedSource = 'auto',
  rpcUrl: string = 'https://api.mainnet-beta.solana.com',
  limit: number = 4,
  excludeMints: Set<string> = new Set()
): Promise<{ tokens: CandidateToken[]; error?: string }> {
  try {
    const res = await fetch(`/api/live/candidates?source=${encodeURIComponent(source)}`);
    if (!res.ok) {
      return { tokens: [], error: `候補取得エラー (HTTP ${res.status})` };
    }
    const data = (await res.json()) as {
      ok: boolean;
      candidates?: RawLiveCandidate[];
      error?: string;
    };
    if (!data.ok || !Array.isArray(data.candidates)) {
      return { tokens: [], error: data.error || '実データの取得に失敗しました' };
    }

    const fresh = data.candidates
      .filter((c) => c.mint && c.priceUsd > 0 && !excludeMints.has(c.mint))
      .slice(0, limit);

    // Run real RugCheck + Solana RPC audit in parallel for selected live tokens
    const enriched = await Promise.all(
      fresh.map(async (raw) => {
        try {
          const auditRes = await fetch(
            `/api/live/audit/${encodeURIComponent(raw.mint)}?rpcUrl=${encodeURIComponent(rpcUrl)}`
          );
          if (!auditRes.ok) return combineCandidateAndAudit(raw, null);
          const auditJson = (await auditRes.json()) as { ok: boolean; audit?: RawLiveAudit };
          return combineCandidateAndAudit(raw, auditJson.audit ?? null);
        } catch {
          return combineCandidateAndAudit(raw, null);
        }
      })
    );

    return { tokens: enriched };
  } catch (err) {
    return {
      tokens: [],
      error: err instanceof Error ? err.message : 'ネットワークエラー',
    };
  }
}

/**
 * Lookup ANY real Solana token by exact Mint address or Ticker Symbol via DexScreener + RugCheck + Solana RPC
 */
export async function lookupRealSolanaToken(
  query: string,
  rpcUrl: string = 'https://api.mainnet-beta.solana.com'
): Promise<{ token: CandidateToken | null; error?: string }> {
  try {
    const res = await fetch(
      `/api/live/token/${encodeURIComponent(query.trim())}?rpcUrl=${encodeURIComponent(rpcUrl)}`
    );
    const data = (await res.json()) as {
      ok: boolean;
      candidate?: RawLiveCandidate;
      audit?: RawLiveAudit;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.candidate) {
      return { token: null, error: data.error || `"${query}" に一致するSolana銘柄が見つかりません` };
    }
    return { token: combineCandidateAndAudit(data.candidate, data.audit ?? null) };
  } catch (err) {
    return {
      token: null,
      error: err instanceof Error ? err.message : '銘柄検索中にエラーが発生しました',
    };
  }
}

/**
 * Poll real live prices for all open positions from DexScreener via /api/live/prices
 */
export async function fetchRealLivePrices(
  mints: string[]
): Promise<Record<string, LivePriceUpdate>> {
  if (mints.length === 0) return {};
  try {
    const res = await fetch(`/api/live/prices?mints=${encodeURIComponent(mints.join(','))}`);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      ok: boolean;
      prices?: Record<string, LivePriceUpdate>;
    };
    return data.ok && data.prices ? data.prices : {};
  } catch {
    return {};
  }
}

/**
 * Deterministic unit-test fixture builder used strictly by STEP 15 acceptanceTests.ts
 * (never used in live trading runtime).
 */
export function generateCandidateToken(
  profile:
    | 'clean_high'
    | 'clean_mid'
    | 'scanner_kill_liq'
    | 'scanner_kill_top10'
    | 'analyst_fail_dev'
    | 'analyst_fail_bundle'
    | 'analyst_fail_score'
    | 'shill_ring' = 'clean_high'
): CandidateToken {
  const now = Date.now();
  const basePrice = 0.001;
  const base: CandidateToken = {
    mint: 'So11111111111111111111111111111111111111112',
    name: 'FixtureToken',
    symbol: 'FIXT',
    pool: 'PoolFixture11111111111111111111111111111111',
    createdAt: now - 45 * 60 * 1000,
    migratedAt: now - 22 * 60 * 1000,
    curveMin: 20,
    creator: 'DevFixture111111111111111111111111111111111',
    creatorBalanceAtMigration: 1000000,
    creatorBalanceNow: 1000000,
    creatorSold: 0,
    devHoldPct: 1.0,
    devRugHistoryCount: 0,
    priceUsd: basePrice,
    liquidityUsd: 45000,
    liquidityAtScanUsd: 45000,
    marketCapUsd: 240000,
    volumeH1Usd: 35000,
    volumeM5Usd: 4200,
    h1ChangePct: 30,
    h24ChangePct: 110,
    top10Pct: 16.0,
    lpLockedPct: 100,
    ageMin: 22,
    holders: 380,
    holders10mAgo: 360,
    uniqueBuys1h: 90,
    uniqueSells1h: 50,
    uniqueBuys5m: 16,
    uniqueSells5m: 10,
    freshPct: 20,
    bundledGroupSize: 1,
    insiderNetworksPct: 4,
    delegatedAccounts: 0,
    mintRevoked: true,
    freezeRevoked: true,
    tokenWarnings: { disableSelling: false, disableBuying: false, warningText: null },
    social: {
      u15: 18,
      u60: 40,
      accel: 1.8,
      big: 2,
      catalyst: 'Unit test catalyst',
      coinXAgeDays: 14,
      coinXHasReplies: true,
      smart: 2,
      shill: 0.05,
      plan: 'A',
      enabled: true,
    },
    candles: buildInitialRealCandles(basePrice, 30, 4200),
  };

  if (profile === 'scanner_kill_liq') base.liquidityUsd = 14200;
  if (profile === 'scanner_kill_top10') base.top10Pct = 38.4;
  if (profile === 'analyst_fail_dev') {
    base.devHoldPct = 11.4;
    base.devRugHistoryCount = 2;
  }
  if (profile === 'analyst_fail_bundle') {
    base.bundledGroupSize = 14;
    base.insiderNetworksPct = 38;
  }
  if (profile === 'shill_ring') base.social.shill = 0.62;
  return base;
}
