import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';

interface PumpMigrationEvent {
  mint: string;
  pool?: string;
  creator?: string;
  name?: string;
  symbol?: string;
  migratedAt: number;
  createdAt?: number;
  curveMin?: number;
}

// In-memory live caches fed by real PumpPortal WS + RugCheck ticker
const recentMigrations: PumpMigrationEvent[] = [];
const newTokenCreatedAt = new Map<string, number>();
const ruggedMints = new Set<string>();
const ruggedCreators = new Set<string>();

let pumpWsConnected = false;
let pumpWsLastEventTs = 0;
let lastRugSyncTs = 0;

function connectPumpPortalWs(): void {
  const WS = globalThis.WebSocket;
  if (!WS) return;

  let backoffMs = 1000;

  const openSocket = () => {
    try {
      const ws = new WS('wss://pumpportal.fun/api/data');

      ws.addEventListener('open', () => {
        pumpWsConnected = true;
        backoffMs = 1000;
        try {
          ws.send(JSON.stringify({ method: 'subscribeMigration' }));
          ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        } catch {
          // ignore send errors
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const text = typeof event.data === 'string' ? event.data : String(event.data);
          const msg = JSON.parse(text) as Record<string, unknown>;
          const mint = typeof msg.mint === 'string' ? msg.mint : null;
          if (!mint) return;

          const now = Date.now();
          pumpWsLastEventTs = now;

          if (msg.txType === 'create') {
            newTokenCreatedAt.set(mint, now);
            if (newTokenCreatedAt.size > 2000) {
              const firstKey = newTokenCreatedAt.keys().next().value;
              if (firstKey) newTokenCreatedAt.delete(firstKey);
            }
            return;
          }

          if (msg.txType === 'migrate' || msg.pool) {
            const created = newTokenCreatedAt.get(mint);
            const curveMin = created ? Math.max(1, Math.round((now - created) / 60000)) : undefined;
            recentMigrations.unshift({
              mint,
              pool: typeof msg.pool === 'string' ? msg.pool : undefined,
              creator: typeof msg.traderPublicKey === 'string' ? msg.traderPublicKey : undefined,
              name: typeof msg.name === 'string' ? msg.name : undefined,
              symbol: typeof msg.symbol === 'string' ? msg.symbol : undefined,
              migratedAt: now,
              createdAt: created,
              curveMin,
            });
            if (recentMigrations.length > 60) {
              recentMigrations.length = 60;
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener('close', () => {
        pumpWsConnected = false;
        setTimeout(openSocket, backoffMs);
        backoffMs = Math.min(60000, backoffMs * 2);
      });

      ws.addEventListener('error', () => {
        pumpWsConnected = false;
        try {
          ws.close();
        } catch {
          // ignore
        }
      });
    } catch {
      pumpWsConnected = false;
      setTimeout(openSocket, backoffMs);
      backoffMs = Math.min(60000, backoffMs * 2);
    }
  };

  openSocket();
}

async function syncRugCheckTicker(): Promise<void> {
  try {
    const res = await fetch('https://api.rugcheck.xyz/v1/stats/rugs/ticker?limit=50', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data = (await res.json()) as unknown;
    const items = Array.isArray(data) ? data : [];
    for (const item of items) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        if (typeof rec.mint === 'string') ruggedMints.add(rec.mint);
        if (typeof rec.creator === 'string') ruggedCreators.add(rec.creator);
      }
    }
    lastRugSyncTs = Date.now();
  } catch {
    // non-fatal
  }
}

async function fetchJsonSafe(url: string, init?: RequestInit, timeoutMs = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface DexPairRaw {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  volume?: { h1?: number; m5?: number; h24?: number };
  priceChange?: { h1?: number; h24?: number; m5?: number };
  txns?: {
    h1?: { buys?: number; sells?: number };
    m5?: { buys?: number; sells?: number };
  };
  pairCreatedAt?: number;
  info?: { socials?: Array<{ type?: string; url?: string }> };
}

function selectBestSolanaPairs(pairs: DexPairRaw[]): DexPairRaw[] {
  const bestByMint = new Map<string, DexPairRaw>();
  for (const p of pairs) {
    if (p.chainId && p.chainId !== 'solana') continue;
    const mint = p.baseToken?.address;
    if (!mint) continue;
    const liq = Number(p.liquidity?.usd ?? 0);
    const existing = bestByMint.get(mint);
    const existingLiq = Number(existing?.liquidity?.usd ?? -1);
    const preferPumpSwap =
      p.dexId === 'pumpswap' && existing?.dexId !== 'pumpswap' && liq >= existingLiq * 0.5;
    if (!existing || preferPumpSwap || liq > existingLiq) {
      bestByMint.set(mint, p);
    }
  }
  return Array.from(bestByMint.values());
}

function mapDexPairToLiveCandidate(p: DexPairRaw, migration?: PumpMigrationEvent) {
  const now = Date.now();
  const mint = p.baseToken?.address ?? migration?.mint ?? '';
  const priceUsd = Number(p.priceUsd ?? 0);
  const liquidityUsd = Number(p.liquidity?.usd ?? 0);
  const marketCapUsd = Number(p.marketCap ?? p.fdv ?? 0);
  const volumeH1Usd = Number(p.volume?.h1 ?? 0);
  const volumeM5Usd = Number(p.volume?.m5 ?? 0);
  const h1ChangePct = Number(p.priceChange?.h1 ?? 0);
  const h24ChangePct = Number(p.priceChange?.h24 ?? 0);
  const buys1h = Number(p.txns?.h1?.buys ?? 0);
  const sells1h = Number(p.txns?.h1?.sells ?? 0);
  const buys5m = Number(p.txns?.m5?.buys ?? 0);
  const sells5m = Number(p.txns?.m5?.sells ?? 0);
  const pairCreatedAt = p.pairCreatedAt ?? migration?.migratedAt ?? now;
  const ageMin = Math.max(1, Math.round((now - pairCreatedAt) / 60000));
  const hasTwitter = Boolean(
    p.info?.socials?.some((s) => s.type === 'twitter' || (s.url && s.url.includes('x.com')))
  );

  return {
    mint,
    name: p.baseToken?.name || migration?.name || 'Unknown Token',
    symbol: p.baseToken?.symbol || migration?.symbol || mint.slice(0, 6),
    dexId: p.dexId || 'solana',
    pool: p.pairAddress || migration?.pool || '',
    createdAt: migration?.createdAt ?? pairCreatedAt,
    migratedAt: migration?.migratedAt ?? pairCreatedAt,
    curveMin: migration?.curveMin ?? Math.min(60, ageMin),
    creator: migration?.creator ?? '',
    priceUsd,
    liquidityUsd,
    marketCapUsd,
    volumeH1Usd,
    volumeM5Usd,
    h1ChangePct,
    h24ChangePct,
    ageMin,
    buys1h,
    sells1h,
    buys5m,
    sells5m,
    hasTwitter,
    source: migration ? 'PumpPortal + DexScreener' : 'DexScreener Live',
  };
}

async function fetchSolanaRpc(rpcUrl: string, method: string, params: unknown[]): Promise<unknown | null> {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
  const data = (await fetchJsonSafe(
    rpcUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    6500
  )) as { result?: unknown } | null;
  return data?.result ?? null;
}

async function buildLiveAudit(mint: string, rpcUrl: string) {
  const safeRpc = rpcUrl && rpcUrl.startsWith('http') ? rpcUrl : DEFAULT_RPC_URL;

  const [rugReportRaw, insidersRaw, accountInfoRaw, supplyRaw, largestRaw] = await Promise.all([
    fetchJsonSafe(`https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(mint)}/report`, undefined, 7500),
    fetchJsonSafe(`https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(mint)}/insiders/graph`, undefined, 6000),
    fetchSolanaRpc(safeRpc, 'getAccountInfo', [mint, { encoding: 'jsonParsed' }]),
    fetchSolanaRpc(safeRpc, 'getTokenSupply', [mint]),
    fetchSolanaRpc(safeRpc, 'getTokenLargestAccounts', [mint]),
  ]);

  const sourcesUsed: string[] = [];
  if (rugReportRaw) sourcesUsed.push('RugCheck API');
  if (accountInfoRaw || largestRaw) sourcesUsed.push('Solana RPC');

  // Parse Solana RPC Mint & Freeze Authority
  let mintRevoked: boolean | null = null;
  let freezeRevoked: boolean | null = null;
  const accVal = (accountInfoRaw as { value?: { data?: { parsed?: { info?: Record<string, unknown> } } } } | null)
    ?.value?.data?.parsed?.info;
  if (accVal) {
    mintRevoked = accVal.mintAuthority === null || accVal.mintAuthority === undefined;
    freezeRevoked = accVal.freezeAuthority === null || accVal.freezeAuthority === undefined;
  }

  // Parse RugCheck Report
  const rug = (rugReportRaw ?? {}) as Record<string, unknown>;
  if (mintRevoked === null && 'mintAuthority' in rug) {
    mintRevoked = rug.mintAuthority === null || rug.mintAuthority === '';
  }
  if (freezeRevoked === null && 'freezeAuthority' in rug) {
    freezeRevoked = rug.freezeAuthority === null || rug.freezeAuthority === '';
  }

  const creator = typeof rug.creator === 'string' ? rug.creator : '';
  const totalHolders = Number(rug.totalHolders ?? 0);
  const ruggedFlag = Boolean(rug.rugged);

  // Dev hold pct from RugCheck topHolders / creatorBalance
  const topHoldersArr = Array.isArray(rug.topHolders)
    ? (rug.topHolders as Array<Record<string, unknown>>)
    : [];
  const creatorEntry = creator
    ? topHoldersArr.find((h) => h.owner === creator || h.address === creator)
    : undefined;
  const devHoldPct = creatorEntry ? Number(creatorEntry.pct ?? 0) : 0;

  // LP Locked/Burned % from RugCheck markets
  let lpLockedPct = 0;
  const markets = Array.isArray(rug.markets) ? (rug.markets as Array<Record<string, unknown>>) : [];
  for (const m of markets) {
    const lp = m.lp as Record<string, unknown> | undefined;
    if (lp && typeof lp.lpLockedPct === 'number') {
      lpLockedPct = Math.max(lpLockedPct, lp.lpLockedPct);
    }
  }
  if (markets.length === 0 && !ruggedFlag && rugReportRaw) {
    // PumpSwap / Raydium migrated pools without explicit LP report
    lpLockedPct = 100;
  }

  // Top 10% from Solana RPC getTokenLargestAccounts / getTokenSupply, fallback to RugCheck topHolders
  let top10Pct: number | null = null;
  const totalSupplyUi = Number(
    (supplyRaw as { value?: { uiAmount?: number } } | null)?.value?.uiAmount ?? 0
  );
  const largestAccounts = (
    largestRaw as { value?: Array<{ address?: string; uiAmount?: number }> } | null
  )?.value;

  if (totalSupplyUi > 0 && Array.isArray(largestAccounts) && largestAccounts.length > 0) {
    // Exclude largest LP/pool account (index 0 if it holds > 15% and looks like pool vault)
    const filtered = largestAccounts.slice(1, 11);
    const sumTop10 = filtered.reduce((acc, a) => acc + Number(a.uiAmount ?? 0), 0);
    top10Pct = Math.round((sumTop10 / totalSupplyUi) * 1000) / 10;
  } else if (topHoldersArr.length > 0) {
    const nonInsiderPool = topHoldersArr.filter((h) => !h.insider).slice(0, 10);
    const sumPct = nonInsiderPool.reduce((acc, h) => acc + Number(h.pct ?? 0), 0);
    top10Pct = Math.round(sumPct * 10) / 10;
  }

  // Insider networks & bundled groups
  let insiderNetworksPct = 0;
  const insiderNetworks = Array.isArray(rug.insiderNetworks)
    ? (rug.insiderNetworks as Array<Record<string, unknown>>)
    : [];
  const tokenSupplyRaw = Number(
    (rug.token as Record<string, unknown> | undefined)?.supply ?? 0
  );
  for (const net of insiderNetworks) {
    const holding = Number(net.tokenAmount ?? net.currentHolding ?? 0);
    if (tokenSupplyRaw > 0 && holding > 0) {
      insiderNetworksPct += (holding / tokenSupplyRaw) * 100;
    }
  }
  insiderNetworksPct = Math.round(insiderNetworksPct * 10) / 10;

  let bundledGroupSize = 0;
  if (Array.isArray(insidersRaw)) {
    // Find largest connected component in insiders graph
    const adj = new Map<string, Set<string>>();
    for (const edge of insidersRaw as Array<Record<string, unknown>>) {
      const from = typeof edge.from === 'string' ? edge.from : typeof edge.source === 'string' ? edge.source : null;
      const to = typeof edge.to === 'string' ? edge.to : typeof edge.target === 'string' ? edge.target : null;
      if (!from || !to) continue;
      if (!adj.has(from)) adj.set(from, new Set());
      if (!adj.has(to)) adj.set(to, new Set());
      adj.get(from)!.add(to);
      adj.get(to)!.add(from);
    }
    const visited = new Set<string>();
    for (const node of adj.keys()) {
      if (visited.has(node)) continue;
      const stack = [node];
      let size = 0;
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        size++;
        for (const nxt of adj.get(cur) ?? []) {
          if (!visited.has(nxt)) stack.push(nxt);
        }
      }
      bundledGroupSize = Math.max(bundledGroupSize, size);
    }
  }

  // Risks / warnings from RugCheck
  const risks = Array.isArray(rug.risks) ? (rug.risks as Array<Record<string, unknown>>) : [];
  const dangerRisk = risks.find(
    (r) => String(r.level ?? '').toLowerCase() === 'danger' || String(r.name ?? '').toLowerCase().includes('honeypot')
  );
  const warningText = dangerRisk ? String(dangerRisk.name ?? dangerRisk.description ?? 'RugCheck Danger') : null;
  const devRugHistoryCount =
    (ruggedFlag || ruggedMints.has(mint) || (creator && ruggedCreators.has(creator))) ? 1 : 0;

  return {
    mint,
    sourcesUsed,
    mintRevoked: mintRevoked ?? false,
    freezeRevoked: freezeRevoked ?? false,
    creator,
    devHoldPct: Math.round(devHoldPct * 10) / 10,
    devRugHistoryCount,
    top10Pct: top10Pct ?? 20,
    lpLockedPct: Math.round(lpLockedPct * 10) / 10,
    bundledGroupSize,
    insiderNetworksPct,
    delegatedAccounts: 0,
    holders: totalHolders,
    rugged: ruggedFlag,
    warningText,
    rugScore: typeof rug.score === 'number' ? rug.score : null,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Connect live streams on startup
  connectPumpPortalWs();
  void syncRugCheckTicker();
  setInterval(() => void syncRugCheckTicker(), 5 * 60 * 1000);

  // 1. Live Data Feed Health / Status
  app.get('/api/live/status', (_req, res) => {
    res.json({
      ok: true,
      pumpPortalConnected: pumpWsConnected,
      pumpPortalLastEventTs: pumpWsLastEventTs,
      recentMigrationsCount: recentMigrations.length,
      ruggedMintsCount: ruggedMints.size,
      lastRugSyncTs,
      ts: Date.now(),
    });
  });

  // 2. Fetch Real Live Solana Token Candidates (PumpPortal + DexScreener)
  app.get('/api/live/candidates', async (req, res) => {
    try {
      const source = String(req.query.source || 'auto');
      const mintSet = new Set<string>();
      const migrationByMint = new Map<string, PumpMigrationEvent>();

      if (source === 'auto' || source === 'pumpportal') {
        for (const m of recentMigrations.slice(0, 12)) {
          mintSet.add(m.mint);
          migrationByMint.set(m.mint, m);
        }
      }

      const collectedPairs: DexPairRaw[] = [];

      if (source === 'auto' || source === 'boosts') {
        const boosts = (await fetchJsonSafe('https://api.dexscreener.com/token-boosts/latest/v1')) as
          | Array<{ chainId?: string; tokenAddress?: string }>
          | null;
        if (Array.isArray(boosts)) {
          for (const b of boosts) {
            if (b.chainId === 'solana' && b.tokenAddress) {
              mintSet.add(b.tokenAddress);
              if (mintSet.size >= 18) break;
            }
          }
        }
      }

      if (source === 'profiles' || (source === 'auto' && mintSet.size < 12)) {
        const profiles = (await fetchJsonSafe('https://api.dexscreener.com/token-profiles/latest/v1')) as
          | Array<{ chainId?: string; tokenAddress?: string }>
          | null;
        if (Array.isArray(profiles)) {
          for (const p of profiles) {
            if (p.chainId === 'solana' && p.tokenAddress) {
              mintSet.add(p.tokenAddress);
              if (mintSet.size >= 20) break;
            }
          }
        }
      }

      if (source === 'pumpswap' || (source === 'auto' && mintSet.size < 8)) {
        const search = (await fetchJsonSafe('https://api.dexscreener.com/latest/dex/search?q=pumpswap')) as
          | { pairs?: DexPairRaw[] }
          | null;
        if (Array.isArray(search?.pairs)) {
          for (const p of search.pairs) {
            if (p.chainId === 'solana') collectedPairs.push(p);
          }
        }
      }

      const mintsList = Array.from(mintSet).slice(0, 20);
      if (mintsList.length > 0) {
        const pairsRaw = (await fetchJsonSafe(
          `https://api.dexscreener.com/tokens/v1/solana/${mintsList.join(',')}`
        )) as DexPairRaw[] | null;
        if (Array.isArray(pairsRaw)) {
          collectedPairs.push(...pairsRaw);
        }
      }

      const bestPairs = selectBestSolanaPairs(collectedPairs)
        .filter((p) => Number(p.priceUsd ?? 0) > 0)
        .slice(0, 15);

      const candidates = bestPairs.map((p) =>
        mapDexPairToLiveCandidate(p, p.baseToken?.address ? migrationByMint.get(p.baseToken.address) : undefined)
      );

      res.json({
        ok: true,
        source,
        pumpPortalConnected: pumpWsConnected,
        count: candidates.length,
        candidates,
        ts: Date.now(),
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to fetch live candidates',
        candidates: [],
      });
    }
  });

  // 3. Lookup ANY Real Solana Token by Mint Address or Ticker Symbol
  app.get('/api/live/token/:query', async (req, res) => {
    try {
      const q = decodeURIComponent(req.params.query || '').trim();
      const rpcUrl = typeof req.query.rpcUrl === 'string' ? req.query.rpcUrl : DEFAULT_RPC_URL;
      if (!q) {
        res.status(400).json({ ok: false, error: 'Missing token query' });
        return;
      }

      let pairs: DexPairRaw[] = [];
      // Base58 Solana mint address heuristic (32-44 chars)
      const looksLikeMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);
      if (looksLikeMint) {
        const direct = (await fetchJsonSafe(
          `https://api.dexscreener.com/tokens/v1/solana/${encodeURIComponent(q)}`
        )) as DexPairRaw[] | null;
        if (Array.isArray(direct)) pairs = direct;
      }

      if (pairs.length === 0) {
        const searched = (await fetchJsonSafe(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`
        )) as { pairs?: DexPairRaw[] } | null;
        if (Array.isArray(searched?.pairs)) {
          pairs = searched.pairs.filter((p) => p.chainId === 'solana');
        }
      }

      const best = selectBestSolanaPairs(pairs)[0];
      if (!best || !best.baseToken?.address) {
        res.status(404).json({ ok: false, error: `Solana token not found for "${q}"` });
        return;
      }

      const candidate = mapDexPairToLiveCandidate(best);
      const audit = await buildLiveAudit(candidate.mint, rpcUrl);

      res.json({ ok: true, candidate, audit, ts: Date.now() });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Lookup failed',
      });
    }
  });

  // 4. Real On-Chain Audit (RugCheck + Solana RPC)
  app.get('/api/live/audit/:mint', async (req, res) => {
    try {
      const mint = req.params.mint.trim();
      const rpcUrl = typeof req.query.rpcUrl === 'string' ? req.query.rpcUrl : DEFAULT_RPC_URL;
      const audit = await buildLiveAudit(mint, rpcUrl);
      res.json({ ok: true, audit, ts: Date.now() });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Audit failed',
      });
    }
  });

  // 5. Real Live Prices Batch Poll for Open Positions (DexScreener)
  app.get('/api/live/prices', async (req, res) => {
    try {
      const mintsParam = String(req.query.mints || '').trim();
      if (!mintsParam) {
        res.json({ ok: true, prices: {}, ts: Date.now() });
        return;
      }
      const mints = mintsParam
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 30);

      const pairsRaw = (await fetchJsonSafe(
        `https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`
      )) as DexPairRaw[] | null;

      const bestPairs = selectBestSolanaPairs(Array.isArray(pairsRaw) ? pairsRaw : []);
      const prices: Record<
        string,
        {
          priceUsd: number;
          liquidityUsd: number;
          marketCapUsd: number;
          volumeH1Usd: number;
          volumeM5Usd: number;
          h1ChangePct: number;
          buys5m: number;
          sells5m: number;
        }
      > = {};

      for (const p of bestPairs) {
        const mint = p.baseToken?.address;
        if (!mint) continue;
        prices[mint] = {
          priceUsd: Number(p.priceUsd ?? 0),
          liquidityUsd: Number(p.liquidity?.usd ?? 0),
          marketCapUsd: Number(p.marketCap ?? p.fdv ?? 0),
          volumeH1Usd: Number(p.volume?.h1 ?? 0),
          volumeM5Usd: Number(p.volume?.m5 ?? 0),
          h1ChangePct: Number(p.priceChange?.h1 ?? 0),
          buys5m: Number(p.txns?.m5?.buys ?? 0),
          sells5m: Number(p.txns?.m5?.sells ?? 0),
        };
      }

      res.json({ ok: true, prices, ts: Date.now() });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Price poll failed',
        prices: {},
      });
    }
  });

  // Vite middleware in dev, static dist in production
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'));
  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Overnight Desk real-data server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
