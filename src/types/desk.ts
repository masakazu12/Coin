export type BotName = 'scanner' | 'analyst' | 'brain' | 'executor' | 'risk';

export type DeskMode = 'PAPER' | 'LIVE';

export type ChartRange = 'LIVE' | '1H' | '4H' | '1D' | '1W' | 'ALL';

export type LayerStatus = 'pass' | 'fail' | 'not_checked';

export interface AuditLayer {
  index: number;
  name: string;
  labelJa: string;
  status: LayerStatus;
  valueText: string;
  source: string;
  reason?: string;
}

export interface SocialRaw {
  u15: number;
  u60: number;
  accel: number;
  big: number;
  catalyst: string | null;
  coinXAgeDays: number | null;
  coinXHasReplies: boolean;
  smart: number;
  shill: number;
  plan: 'A' | 'B' | 'C';
  enabled: boolean;
}

export interface ScoreBreakdown {
  alive: number;
  organic: number;
  flush: number;
  chase: number;
  social: number | null;
  core: number;
  socialPts: number;
  freshPct: number;
  curveMin: number;
  score: number;
  passed: boolean;
  reason: string;
}

export interface CandidateToken {
  mint: string;
  name: string;
  symbol: string;
  pool: string;
  createdAt: number;
  migratedAt: number;
  curveMin: number;
  creator: string;
  creatorBalanceAtMigration: number;
  creatorBalanceNow: number;
  creatorSold: number;
  devHoldPct: number;
  devRugHistoryCount: number;
  priceUsd: number;
  liquidityUsd: number;
  liquidityAtScanUsd: number;
  marketCapUsd: number;
  volumeH1Usd: number;
  volumeM5Usd: number;
  h1ChangePct: number;
  h24ChangePct: number;
  top10Pct: number;
  lpLockedPct: number;
  ageMin: number;
  holders: number;
  holders10mAgo: number;
  uniqueBuys1h: number;
  uniqueSells1h: number;
  uniqueBuys5m: number;
  uniqueSells5m: number;
  freshPct: number;
  bundledGroupSize: number;
  insiderNetworksPct: number;
  delegatedAccounts: number;
  mintRevoked: boolean;
  freezeRevoked: boolean;
  tokenWarnings: {
    disableSelling: boolean;
    disableBuying: boolean;
    warningText: string | null;
  };
  social: SocialRaw;
  candles: CandleBar[];
}

export interface CandleBar {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ScannerDecision {
  bot: 'scanner';
  mint: string;
  name: string;
  symbol: string;
  pool: string;
  liquidityUsd: number;
  top10Pct: number;
  h1ChangePct: number;
  ageMin: number;
  liqMcap: number;
  accel: number;
  holdersGrowth: number;
  verdict: 'pass' | 'kill';
  reason: string;
  ts: number;
}

export interface AnalystDecision {
  bot: 'analyst';
  mint: string;
  name: string;
  symbol: string;
  layers: AuditLayer[];
  holders: number;
  score: number;
  socialPts: number;
  breakdown: ScoreBreakdown;
  social: SocialRaw;
  passed: boolean;
  reason: string;
  ts: number;
}

export interface BrainDecision {
  bot: 'brain';
  mint: string;
  symbol: string;
  score: number;
  sizeUsd: number;
  rawSizeUsd: number;
  pctOfCash: number;
  capHit: 'pool' | 'ticket' | 'none';
  approved: boolean;
  reason: string;
  ts: number;
}

export interface VerifyChecks {
  screen: boolean;
  api: boolean;
  chain: boolean | 'n/a';
}

export interface ExecutorDecision {
  bot: 'executor';
  orderId: string;
  mint: string;
  symbol: string;
  side: 'buy' | 'sell';
  usd: number;
  pct: number;
  status: 'done' | 'skipped' | 'failed' | 'unverified';
  reason: string | null;
  checks: VerifyChecks;
  feeUsd: number;
  fillPrice: number;
  link: string;
  ts: number;
}

export interface RiskDecision {
  bot: 'risk';
  mint: string;
  symbol: string;
  reason: 'stop' | 'dead money' | 'pulled' | 'dev dumping' | 'FOMO warns' | 'no price' | 'take profit' | 'trail' | 'manual' | 'lock time';
  entryPrice: number;
  exitPrice: number;
  pnlUsd: number;
  pct: number;
  feesUsd: number;
  checks: VerifyChecks;
  link: string;
  ts: number;
}

export interface Position {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  openedAt: number;
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  remainingUsd: number;
  tokens: number;
  peakPrice: number;
  stopPrice: number;
  tpDone: boolean;
  trailActive: boolean;
  closedAt: number | null;
  exitPrice: number | null;
  exitReason: string | null;
  pnlUsd: number;
  feesUsd: number;
  mode: DeskMode;
  audit: AnalystDecision;
  token: CandidateToken;
}

export type ActivityKind = 'bought' | 'sold' | 'stopped' | 'rejected' | 'skipped';

export interface ActivityItem {
  id: string;
  ts: number;
  kind: ActivityKind;
  mint: string;
  symbol: string;
  name: string;
  bot: BotName;
  title: string;
  subtitle: string;
  valueText: string;
  positive?: boolean;
  negative?: boolean;
  link: string;
  audit?: AnalystDecision;
  token?: CandidateToken;
  positionId?: string;
  checks?: VerifyChecks;
}

export interface BalancePoint {
  ts: number;
  value: number;
  marker?: {
    label: string;
    tone: 'blue' | 'green' | 'red';
  };
}

export interface BotRuntimeStatus {
  name: BotName;
  displayName: string;
  color: string;
  paused: boolean;
  todayCount: number;
  headline: string;
  subline: string;
  lastHeartbeat: number;
  decisions: Array<{
    id: string;
    ts: number;
    mint: string;
    symbol: string;
    verdict: string;
    reason: string;
    link: string;
    positive?: boolean;
    negative?: boolean;
  }>;
}

export interface BrowserLaneState {
  activeBot: BotName | null;
  actionText: string;
  targetButton: 'idle' | 'search' | 'buy_tab' | 'sell_tab' | 'amount' | 'submit';
  cursorX: number; // percentage 0..100
  cursorY: number; // percentage 0..100
  clicking: boolean;
  privatePaused: boolean;
  currentCoin: CandidateToken | null;
  typedAmount: string;
  quoteText: string;
  lastOrderSummary: {
    text: string;
    checks: VerifyChecks;
    ts: number;
  } | null;
  lastFrameTs: number;
}

export interface SettingMetadata {
  key: keyof DeskSettings;
  group: 'scanner' | 'analyst' | 'social' | 'brain' | 'executor' | 'risk' | 'desk';
  label: string;
  description: string;
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface DeskSettings {
  // Scanner
  min_liquidity_usd: number;
  scanner_max_top10_pct: number;
  max_h1_change_pct: number;
  scanner_poll_s: number;
  min_pool_age_min: number;
  max_wait_min: number;
  runner_h24_pct: number;
  min_holders_growth_pct: number;

  // Analyst
  max_dev_pct: number;
  analyst_max_top10_pct: number;
  min_lp_locked_pct: number;
  max_bundled: number;
  max_delegated_accounts: number;
  analyst_retries: number;
  min_score: number;
  alive_volume_h1: number;
  fast_curve_min: number;
  max_fresh_pct: number;
  organic_unique_h1: number;
  organic_buys_h1: number;
  bundled_penalty: number;
  flush_sell_ratio: number;
  chase_h1_pct: number;

  // Social
  social_weight: number;
  social_max_per_h: number;
  social_timeout_s: number;
  shill_cut: number;
  social_enabled: boolean;

  // Brain
  risk_per_trade_pct: number;
  full_size_score: number;
  below_full_pct: number;
  max_pool_pct: number;
  min_ticket_usd: number;
  max_ticket_usd: number;
  max_trades_night: number;

  // Executor
  dip_pct: number;
  dip_window_min: number;
  dip_wait_min: number;
  crash_pct: number;
  tp_x: number;
  tp_sell_pct: number;
  trail_pct: number;
  recheck_liq_drop_pct: number;
  recheck_price_up_pct: number;
  quote_timeout_s: number;
  verify_timeout_s: number;

  // Risk
  risk_poll_s: number;
  stop_pct: number;
  timeout_h: number;
  timeout_min_gain_pct: number;
  night_loss_stop_pct: number;

  // Desk
  mode: DeskMode;
  paper_start_cash: number;
  always_on_24h: boolean;
  night_start: string;
  lock_time: string;
  report_time: string;
  notifier: 'telegram' | 'webpush';
  fomo_handle: string;
  withdraw_address: string;
  rpc_url: string;
  push_rejects: boolean;
  fee_pct: number;
}

export interface ChangeLogEntry {
  id: string;
  ts: number;
  key: string;
  oldVal: string;
  newVal: string;
  who: 'me' | 'system' | 'telegram';
}

export interface AcceptanceTestResult {
  id: string;
  number: number;
  name: string;
  description: string;
  status: 'idle' | 'pass' | 'fail';
  output: string;
  durationMs: number;
}

export interface ConsoleMessage {
  id: string;
  ts: number;
  sender: 'user' | 'desk';
  text: string;
  link?: string;
}
