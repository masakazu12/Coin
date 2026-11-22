import {
  AnalystDecision,
  AuditLayer,
  BrainDecision,
  CandidateToken,
  DeskSettings,
  Position,
  RiskDecision,
  ScannerDecision,
  ScoreBreakdown,
  SocialRaw,
} from '../types/desk';
import { calculateFomoFee } from './fees';
import { coinUrl } from './links';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeCopycat(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s0-9]/g, '')
    .replace(/[^\p{L}]/gu, '');
}

/**
 * BOT 1: SCANNER
 * Counts and cuts graduated PumpSwap coins before Analyst.
 */
export function evaluateScanner(
  token: CandidateToken,
  settings: DeskSettings,
  todayRunners: Array<{ name: string; symbol: string; h24ChangePct: number }>
): ScannerDecision {
  const ts = Date.now();
  const holdersGrowth =
    token.holders10mAgo > 0
      ? ((token.holders - token.holders10mAgo) / token.holders10mAgo) * 100
      : 0;
  const liqMcap = token.marketCapUsd > 0 ? token.liquidityUsd / token.marketCapUsd : 0;
  const accel = token.volumeH1Usd > 0 ? (token.volumeM5Usd * 12) / token.volumeH1Usd : 0;

  const base = {
    bot: 'scanner' as const,
    mint: token.mint,
    name: token.name,
    symbol: token.symbol,
    pool: token.pool,
    liquidityUsd: token.liquidityUsd,
    top10Pct: token.top10Pct,
    h1ChangePct: token.h1ChangePct,
    ageMin: token.ageMin,
    liqMcap: Number(liqMcap.toFixed(3)),
    accel: Number(accel.toFixed(2)),
    holdersGrowth: Number(holdersGrowth.toFixed(1)),
    ts,
  };

  if (token.liquidityUsd < settings.min_liquidity_usd) {
    return {
      ...base,
      verdict: 'kill',
      reason: `liq $${(token.liquidityUsd / 1000).toFixed(1)}K`,
    };
  }

  if (token.top10Pct > settings.scanner_max_top10_pct) {
    return {
      ...base,
      verdict: 'kill',
      reason: `top 10 hold ${token.top10Pct.toFixed(0)}%`,
    };
  }

  if (token.h1ChangePct > settings.max_h1_change_pct) {
    return {
      ...base,
      verdict: 'kill',
      reason: `+${token.h1ChangePct.toFixed(0)}% in 1h`,
    };
  }

  // Copycat check against today's runners (h24 >= runner_h24_pct)
  const normName = normalizeCopycat(token.name);
  const normSym = normalizeCopycat(token.symbol);
  for (const runner of todayRunners) {
    if (runner.h24ChangePct < settings.runner_h24_pct) continue;
    const rName = normalizeCopycat(runner.name);
    const rSym = normalizeCopycat(runner.symbol);
    const sameOrNested =
      (rSym.length >= 3 && (normSym === rSym || normName.includes(rSym) || rSym.includes(normSym))) ||
      (rName.length >= 4 && (normName === rName || normName.includes(rName)));
    if (sameOrNested && runner.symbol !== token.symbol) {
      return {
        ...base,
        verdict: 'kill',
        reason: `copycat of ${runner.symbol}`,
      };
    }
  }

  if (token.tokenWarnings.disableSelling || token.tokenWarnings.disableBuying) {
    return {
      ...base,
      verdict: 'kill',
      reason: 'FOMO: selling off',
    };
  }

  if (token.tokenWarnings.warningText) {
    return {
      ...base,
      verdict: 'kill',
      reason: `FOMO warns: ${token.tokenWarnings.warningText}`,
    };
  }

  if (holdersGrowth < settings.min_holders_growth_pct) {
    return {
      ...base,
      verdict: 'kill',
      reason: `holders leaving ${holdersGrowth.toFixed(0)}% in 10m`,
    };
  }

  if (token.ageMin < settings.min_pool_age_min) {
    return {
      ...base,
      verdict: 'kill',
      reason: `waiting room (${token.ageMin}m < ${settings.min_pool_age_min}m)`,
    };
  }

  return {
    ...base,
    verdict: 'pass',
    reason: `cleared (${token.ageMin}m · liq $${(token.liquidityUsd / 1000).toFixed(1)}K)`,
  };
}

/**
 * SOCIAL (5th part of Analyst score)
 */
export function computeSocialScore(social: SocialRaw, enabled: boolean): number | null {
  if (!enabled || !social.enabled || social.plan === 'C') {
    return null;
  }
  let v = Math.min(social.u15 / 20, 1);
  if (social.accel < 1) {
    v *= 0.5;
  }
  const b = Math.min(social.big / 3, 1);
  const c = social.catalyst ? 1 : 0;
  const x =
    social.coinXAgeDays !== null && social.coinXAgeDays > 7 && social.coinXHasReplies
      ? 1
      : social.coinXAgeDays !== null
        ? 0.5
        : 0;
  const s = Math.min(social.smart / 2, 1);
  return clamp(0.3 * v + 0.15 * b + 0.15 * c + 0.1 * x + 0.3 * s - social.shill, 0, 1);
}

/**
 * BOT 2: ANALYST
 * 8 sequential layers (stops at first red, rest marked 'not_checked') + 5-part score.
 */
export function evaluateAnalyst(
  token: CandidateToken,
  settings: DeskSettings,
  knownRugCreators: Set<string> = new Set()
): AnalystDecision {
  const ts = Date.now();
  const layers: AuditLayer[] = [];
  let halted = false;
  let failReason = '';

  const pushLayer = (
    index: number,
    name: string,
    labelJa: string,
    source: string,
    check: () => { pass: boolean; valueText: string; reason?: string }
  ) => {
    if (halted) {
      layers.push({
        index,
        name,
        labelJa,
        status: 'not_checked',
        valueText: 'not checked',
        source,
      });
      return;
    }
    const res = check();
    layers.push({
      index,
      name,
      labelJa,
      status: res.pass ? 'pass' : 'fail',
      valueText: res.valueText,
      source,
      reason: res.reason,
    });
    if (!res.pass) {
      halted = true;
      failReason = `Layer ${index} (${name}): ${res.reason || res.valueText}`;
    }
  };

  // Layer 1: Mint authority
  pushLayer(1, 'Mint authority', 'ミント権限', 'Solana RPC', () =>
    token.mintRevoked
      ? { pass: true, valueText: 'Revoked' }
      : { pass: false, valueText: 'Active', reason: 'mint not revoked' }
  );

  // Layer 2: Freeze authority
  pushLayer(2, 'Freeze authority', '凍結権限', 'Solana RPC', () =>
    token.freezeRevoked
      ? { pass: true, valueText: 'Revoked' }
      : { pass: false, valueText: 'Active', reason: 'freeze not revoked' }
  );

  // Layer 3: Dev wallet & rug history
  pushLayer(3, 'Dev wallet', '開発者ウォレット', 'RugCheck + db.rugs', () => {
    if (token.devRugHistoryCount > 0 || knownRugCreators.has(token.creator)) {
      const cnt = Math.max(token.devRugHistoryCount, 1);
      return {
        pass: false,
        valueText: `rugged ${cnt}`,
        reason: `dev rugged ${cnt} before`,
      };
    }
    if (token.creatorSold > 0) {
      return {
        pass: false,
        valueText: `${token.devHoldPct.toFixed(1)}% · sold`,
        reason: 'dev sold',
      };
    }
    if (token.devHoldPct >= settings.max_dev_pct) {
      return {
        pass: false,
        valueText: `${token.devHoldPct.toFixed(1)}%`,
        reason: `dev holds ${token.devHoldPct.toFixed(1)}%`,
      };
    }
    return {
      pass: true,
      valueText: `${token.devHoldPct.toFixed(1)}% · sold 0`,
    };
  });

  // Layer 4: Top 10
  pushLayer(4, 'Top 10', '上位10保有', 'RPC LargestAccounts', () => {
    if (token.top10Pct >= settings.analyst_max_top10_pct) {
      return {
        pass: false,
        valueText: `${token.top10Pct.toFixed(1)}%`,
        reason: `top 10 hold ${token.top10Pct.toFixed(1)}%`,
      };
    }
    return { pass: true, valueText: `${token.top10Pct.toFixed(1)}%` };
  });

  // Layer 5: Liquidity burned/locked
  pushLayer(5, 'Liquidity', 'LPロック/焼却', 'RugCheck + DexScreener', () => {
    const liqDropPct =
      token.liquidityAtScanUsd > 0
        ? ((token.liquidityAtScanUsd - token.liquidityUsd) / token.liquidityAtScanUsd) * 100
        : 0;
    if (token.lpLockedPct < settings.min_lp_locked_pct || liqDropPct > 50) {
      return {
        pass: false,
        valueText: `${token.lpLockedPct.toFixed(0)}% locked`,
        reason: 'liquidity unlocked',
      };
    }
    return { pass: true, valueText: `${token.lpLockedPct.toFixed(0)}% burned` };
  });

  // Layer 6: Pool age
  pushLayer(6, 'Pool age', 'プール経過時間', 'DexScreener', () => {
    if (token.ageMin < settings.min_pool_age_min) {
      return {
        pass: false,
        valueText: `${token.ageMin}m`,
        reason: 'pool too young',
      };
    }
    return { pass: true, valueText: `${token.ageMin}m` };
  });

  // Layer 7: Bundles & insiders graph
  pushLayer(7, 'Bundles', 'バンドル・インサイダー', 'RugCheck Graph', () => {
    if (token.bundledGroupSize >= settings.max_bundled) {
      return {
        pass: false,
        valueText: `${token.bundledGroupSize} bundled`,
        reason: `${token.bundledGroupSize} bundled wallets`,
      };
    }
    if (token.insiderNetworksPct >= 15) {
      return {
        pass: false,
        valueText: `insiders ${token.insiderNetworksPct.toFixed(0)}%`,
        reason: `insiders hold ${token.insiderNetworksPct.toFixed(0)}%`,
      };
    }
    return {
      pass: true,
      valueText: token.bundledGroupSize > 0 ? `${token.bundledGroupSize} grp · ${token.insiderNetworksPct.toFixed(0)}%` : 'None',
    };
  });

  // Layer 8: Delegations
  pushLayer(8, 'Delegations', 'トークン委任', 'RPC getProgramAccounts', () => {
    if (token.delegatedAccounts > settings.max_delegated_accounts) {
      return {
        pass: false,
        valueText: `${token.delegatedAccounts} wallets`,
        reason: `${token.delegatedAccounts} delegated wallets`,
      };
    }
    return {
      pass: true,
      valueText: token.delegatedAccounts === 0 ? 'None' : `${token.delegatedAccounts} accts`,
    };
  });

  // Score calculation (exact formula from Page 4)
  const alive = clamp(token.volumeH1Usd / settings.alive_volume_h1, 0, 1);

  let organic = clamp(token.uniqueBuys1h / settings.organic_unique_h1, 0, 1);
  if (token.uniqueSells1h > token.uniqueBuys1h) organic *= 0.5;
  if (token.bundledGroupSize >= 3) organic *= settings.bundled_penalty;
  if (token.curveMin < settings.fast_curve_min) organic *= 0.5;
  if (token.freshPct >= settings.max_fresh_pct) organic *= 0.5;

  const flush =
    token.uniqueSells5m <= token.uniqueBuys5m
      ? 1
      : token.uniqueSells5m <= settings.flush_sell_ratio * token.uniqueBuys5m
        ? 0.5
        : 0;

  const chase = clamp(token.h1ChangePct / settings.chase_h1_pct, 0, 1);
  const core = alive + organic + flush + (1 - chase);

  // Social runs ONLY for 8/8 green coins
  const socialVal = !halted ? computeSocialScore(token.social, settings.social_enabled) : null;
  const w = socialVal === null ? 0 : settings.social_weight;
  const baseScore = Math.round((100 * core) / 4);
  const score = Math.round((100 * (core + w * (socialVal ?? 0))) / (4 + w));
  const socialPts = socialVal === null ? 0 : score - baseScore;

  const passed = !halted && score >= settings.min_score;
  const reason = halted
    ? failReason
    : passed
      ? `8/8 cleared · score ${score}`
      : `score ${score} < ${settings.min_score}`;

  const breakdown: ScoreBreakdown = {
    alive: Number(alive.toFixed(3)),
    organic: Number(organic.toFixed(3)),
    flush: Number(flush.toFixed(2)),
    chase: Number(chase.toFixed(3)),
    social: socialVal === null ? null : Number(socialVal.toFixed(3)),
    core: Number(core.toFixed(3)),
    socialPts,
    freshPct: token.freshPct,
    curveMin: token.curveMin,
    score,
    passed,
    reason,
  };

  return {
    bot: 'analyst',
    mint: token.mint,
    name: token.name,
    symbol: token.symbol,
    layers,
    holders: token.holders,
    score,
    socialPts,
    breakdown,
    social: token.social,
    passed,
    reason,
    ts,
  };
}

/**
 * BOT 3: BRAIN
 * Exact position sizing. Never picks a coin and never clicks.
 */
export function evaluateBrain(
  analyst: AnalystDecision,
  token: CandidateToken,
  freeCash: number,
  tradesTonight: number,
  nightLossPct: number,
  settings: DeskSettings
): BrainDecision {
  const ts = Date.now();

  if (nightLossPct >= settings.night_loss_stop_pct) {
    return {
      bot: 'brain',
      mint: token.mint,
      symbol: token.symbol,
      score: analyst.score,
      sizeUsd: 0,
      rawSizeUsd: 0,
      pctOfCash: 0,
      capHit: 'none',
      approved: false,
      reason: `night loss ${nightLossPct.toFixed(1)}% >= ${settings.night_loss_stop_pct}%`,
      ts,
    };
  }

  if (tradesTonight >= settings.max_trades_night) {
    return {
      bot: 'brain',
      mint: token.mint,
      symbol: token.symbol,
      score: analyst.score,
      sizeUsd: 0,
      rawSizeUsd: 0,
      pctOfCash: 0,
      capHit: 'none',
      approved: false,
      reason: `max_trades_night (${settings.max_trades_night}) reached`,
      ts,
    };
  }

  const riskFraction = settings.risk_per_trade_pct / settings.stop_pct; // e.g. 3/25 = 0.12
  let size = freeCash * riskFraction;
  const rawSizeUsd = Math.round(size * 100) / 100;

  if (analyst.score < settings.full_size_score) {
    size *= settings.below_full_pct / 100;
  }

  if (token.social.enabled && token.social.shill >= settings.shill_cut) {
    size *= 0.5;
  }

  let capHit: 'pool' | 'ticket' | 'none' = 'none';
  const poolCap = token.liquidityUsd * (settings.max_pool_pct / 100);
  if (size > poolCap) {
    size = poolCap;
    capHit = 'pool';
  }

  if (size > settings.max_ticket_usd) {
    size = settings.max_ticket_usd;
    capHit = 'ticket';
  }

  size = Math.round(size * 100) / 100;

  if (size < settings.min_ticket_usd) {
    return {
      bot: 'brain',
      mint: token.mint,
      symbol: token.symbol,
      score: analyst.score,
      sizeUsd: 0,
      rawSizeUsd,
      pctOfCash: 0,
      capHit,
      approved: false,
      reason: `under $${settings.min_ticket_usd}`,
      ts,
    };
  }

  const pctOfCash = freeCash > 0 ? Math.round((size / freeCash) * 1000) / 10 : 0;

  return {
    bot: 'brain',
    mint: token.mint,
    symbol: token.symbol,
    score: analyst.score,
    sizeUsd: size,
    rawSizeUsd,
    pctOfCash,
    capHit,
    approved: true,
    reason:
      capHit === 'pool'
        ? `capped at ${settings.max_pool_pct}% pool`
        : capHit === 'ticket'
          ? `capped at $${settings.max_ticket_usd} ticket`
          : analyst.score >= settings.full_size_score
            ? 'full size'
            : `half size (score ${analyst.score} < ${settings.full_size_score})`,
    ts,
  };
}

/**
 * BOT 4: EXECUTOR — Dip & Pre-click Re-check
 */
export function evaluateDipEntry(
  currentPrice: number,
  high10: number,
  uniqueBuys5m: number,
  uniqueSells5m: number,
  waitedMin: number,
  settings: DeskSettings
): { action: 'buy' | 'wait' | 'skip'; reason: string } {
  if (high10 <= 0) {
    return { action: 'wait', reason: 'waiting for 10m high' };
  }
  const dropPct = ((high10 - currentPrice) / high10) * 100;

  if (dropPct > settings.crash_pct) {
    return { action: 'skip', reason: `crash -${dropPct.toFixed(0)}%` };
  }

  if (waitedMin >= settings.dip_wait_min) {
    return { action: 'skip', reason: 'no dip' };
  }

  const dipReached = currentPrice <= high10 * (1 - settings.dip_pct / 100);
  const sellersCalming = uniqueSells5m <= settings.flush_sell_ratio * uniqueBuys5m;

  if (dipReached && sellersCalming) {
    return { action: 'buy', reason: `dip -${dropPct.toFixed(1)}% with buyers back` };
  }

  if (dipReached && !sellersCalming) {
    return { action: 'wait', reason: `dip -${dropPct.toFixed(1)}% but sellers running` };
  }

  return { action: 'wait', reason: `waiting dip (-${dropPct.toFixed(1)}% / -${settings.dip_pct}%)` };
}

/**
 * BOT 4 & 5: RISK + TAKE PROFIT EVALUATION
 * Evaluates an open position in strict priority order:
 * 1. Stop loss (entry * (1 - stop_pct%)) -> Sell 100%
 * 2. Dead money (open >= timeout_h & gain < timeout_min_gain_pct) -> Sell 100%
 * 3. Pulled (liquidity <= 0 or down > 80%) -> Sell 100%
 * 4. Dev dumping (creator balance down > 50%) -> Sell 100%
 * 5. FOMO warns -> Sell 100%
 * 6. Executor TP (price >= entry * tp_x and !tpDone) -> Sell tp_sell_pct%
 * 7. Executor Trail (tpDone && price <= peak * (1 - trail_pct%)) -> Sell 100%
 */
export function evaluatePositionGuard(
  pos: Position,
  currentPrice: number,
  currentLiqUsd: number,
  creatorBalNow: number,
  nowMs: number,
  settings: DeskSettings
): {
  action: 'hold' | 'sell_partial' | 'sell_all';
  sellPct: number;
  reason: RiskDecision['reason'] | null;
  newPeak: number;
  estimatedPnlUsd: number;
  feeUsd: number;
  link: string;
} {
  const newPeak = Math.max(pos.peakPrice, currentPrice);
  const link = coinUrl(pos.mint, 'solana');

  const computeExit = (sellPct: number, reason: RiskDecision['reason']) => {
    const grossExitUsd = pos.remainingUsd * (currentPrice / pos.entryPrice) * (sellPct / 100);
    const feeUsd = calculateFomoFee(grossExitUsd, settings.fee_pct);
    const costBasis = pos.remainingUsd * (sellPct / 100);
    const estimatedPnlUsd = Math.round((grossExitUsd - feeUsd - costBasis) * 100) / 100;
    return {
      action: sellPct >= 100 ? ('sell_all' as const) : ('sell_partial' as const),
      sellPct,
      reason,
      newPeak,
      estimatedPnlUsd,
      feeUsd,
      link,
    };
  };

  // 1. Stop loss (never moves down!)
  const effectiveStop = Math.max(pos.stopPrice, pos.entryPrice * (1 - settings.stop_pct / 100));
  if (currentPrice <= effectiveStop) {
    return computeExit(100, 'stop');
  }

  // 2. Dead money timeout
  const openHours = (nowMs - pos.openedAt) / (1000 * 60 * 60);
  if (openHours >= settings.timeout_h && currentPrice < pos.entryPrice * (1 + settings.timeout_min_gain_pct / 100)) {
    return computeExit(100, 'dead money');
  }

  // 3. Pulled liquidity
  const liqDrop =
    pos.token.liquidityUsd > 0
      ? ((pos.token.liquidityUsd - currentLiqUsd) / pos.token.liquidityUsd) * 100
      : 0;
  if (currentLiqUsd <= 0 || liqDrop > 80) {
    return computeExit(100, 'pulled');
  }

  // 4. Dev dumping
  if (
    pos.token.creatorBalanceAtMigration > 0 &&
    creatorBalNow < pos.token.creatorBalanceAtMigration * 0.5
  ) {
    return computeExit(100, 'dev dumping');
  }

  // 5. FOMO warns
  if (pos.token.tokenWarnings.warningText && !pos.token.tokenWarnings.disableSelling) {
    return computeExit(100, 'FOMO warns');
  }

  // 6. Executor Take Profit (2.0x -> sell 50%)
  if (!pos.tpDone && currentPrice >= pos.entryPrice * settings.tp_x) {
    return computeExit(settings.tp_sell_pct, 'take profit');
  }

  // 7. Executor Trailing stop after TP (40% off peak -> sell 100%)
  if (pos.tpDone && currentPrice <= newPeak * (1 - settings.trail_pct / 100)) {
    return computeExit(100, 'trail');
  }

  return {
    action: 'hold',
    sellPct: 0,
    reason: null,
    newPeak,
    estimatedPnlUsd: 0,
    feeUsd: 0,
    link,
  };
}
