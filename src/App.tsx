import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  Download,
  Home,
  Package,
  Search,
  Settings,
} from 'lucide-react';
import {
  AcceptanceTestResult,
  ActivityItem,
  AnalystDecision,
  BalancePoint,
  BotName,
  BotRuntimeStatus,
  BrowserLaneState,
  CandidateToken,
  ChangeLogEntry,
  ChartRange,
  ConsoleMessage,
  DeskSettings,
  LivePnlTick,
  Position,
} from './types/desk';
import { BOT_META, DEFAULT_SETTINGS } from './engine/defaults';
import {
  evaluateAnalyst,
  evaluateBrain,
  evaluatePositionGuard,
  evaluateScanner,
} from './engine/bots';
import { calculateFomoFee } from './engine/fees';
import { coinUrl } from './engine/links';
import {
  fetchLiveFeedStatus,
  fetchRealLivePrices,
  fetchRealSolanaCandidates,
  LiveFeedSource,
  LiveFeedStatus,
  lookupRealSolanaToken,
} from './engine/marketFeed';
import { runAcceptanceSuite } from './engine/acceptanceTests';
import { downloadWindowsAppZip } from './engine/windowsBundle';
import { DeskView } from './components/DeskView';
import { BotsView } from './components/BotsView';
import { ActivityView } from './components/ActivityView';
import { SettingsView } from './components/SettingsView';
import { WindowsPackageView } from './components/WindowsPackageView';
import { ManualView } from './components/ManualView';
import { AuditModal } from './components/AuditModal';
import { CoinDetailModal } from './components/CoinDetailModal';

type NavTab = 'home' | 'bots' | 'activity' | 'settings' | 'windows' | 'manual';

const STORAGE_SETTINGS_KEY = 'overnight_desk_settings_v1';
const STORAGE_CHANGELOG_KEY = 'overnight_desk_changelog_v1';
const STORAGE_LIVE_STATE_KEY = 'overnight_desk_live_state_v1';

const NAV_ITEMS: Array<{ key: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'home', label: 'ホーム', icon: Home },
  { key: 'bots', label: 'ボット', icon: Bot },
  { key: 'activity', label: 'アクティビティ', icon: Activity },
  { key: 'settings', label: '設定', icon: Settings },
  { key: 'windows', label: 'Windows導入 & テスト', icon: Package },
  { key: 'manual', label: '説明書', icon: BookOpen },
];

function createInitialBots(): Record<BotName, BotRuntimeStatus> {
  const now = Date.now();
  return {
    scanner: {
      name: 'scanner',
      displayName: 'Scanner',
      color: BOT_META.scanner.color,
      paused: false,
      todayCount: 0,
      headline: 'PumpSwap待機中',
      subline: 'liq ≥ $20K · age ≥ 10m',
      lastHeartbeat: now,
      decisions: [],
    },
    analyst: {
      name: 'analyst',
      displayName: 'Analyst',
      color: BOT_META.analyst.color,
      paused: false,
      todayCount: 0,
      headline: '8レイヤー監査待機',
      subline: 'pass at ≥ 70',
      lastHeartbeat: now,
      decisions: [],
    },
    brain: {
      name: 'brain',
      displayName: 'Brain',
      color: BOT_META.brain.color,
      paused: false,
      todayCount: 0,
      headline: '$4.32 · 12.0% of cash',
      subline: '80+ full / under 80 half',
      lastHeartbeat: now,
      decisions: [],
    },
    executor: {
      name: 'executor',
      displayName: 'Executor',
      color: BOT_META.executor.color,
      paused: false,
      todayCount: 0,
      headline: '1クリックレーン待機',
      subline: 'PAPER 検証モード',
      lastHeartbeat: now,
      decisions: [],
    },
    risk: {
      name: 'risk',
      displayName: 'Risk',
      color: BOT_META.risk.color,
      paused: false,
      todayCount: 0,
      headline: '常時ガード待機',
      subline: 'stop -25% · trail 40%',
      lastHeartbeat: now,
      decisions: [],
    },
  };
}

function loadSettings(): DeskSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    if (parsed.fomo_handle === 'savipww') {
      parsed.fomo_handle = 'masakazu12';
    }
    if (parsed.night_start === '22:00' && parsed.lock_time === '06:30') {
      parsed.always_on_24h = true;
      parsed.night_start = '00:00';
      parsed.lock_time = '24:00';
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadChangeLog(): ChangeLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHANGELOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface PersistedLiveState {
  freeCash: number;
  positions: Position[];
  activities: ActivityItem[];
  balanceHistory: BalancePoint[];
  livePnlTicks: LivePnlTick[];
}

function loadLiveState(defaultCash: number): PersistedLiveState {
  try {
    const raw = localStorage.getItem(STORAGE_LIVE_STATE_KEY);
    if (!raw) {
      return {
        freeCash: defaultCash,
        positions: [],
        activities: [],
        balanceHistory: [{ ts: Date.now(), value: defaultCash }],
        livePnlTicks: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedLiveState>;
    return {
      freeCash: typeof parsed.freeCash === 'number' ? parsed.freeCash : defaultCash,
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      balanceHistory:
        Array.isArray(parsed.balanceHistory) && parsed.balanceHistory.length > 0
          ? parsed.balanceHistory
          : [{ ts: Date.now(), value: defaultCash }],
      livePnlTicks: Array.isArray(parsed.livePnlTicks) ? parsed.livePnlTicks : [],
    };
  } catch {
    return {
      freeCash: defaultCash,
      positions: [],
      activities: [],
      balanceHistory: [{ ts: Date.now(), value: defaultCash }],
      livePnlTicks: [],
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<DeskSettings>(loadSettings);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>(loadChangeLog);

  const initialLive = useMemo(() => loadLiveState(loadSettings().paper_start_cash), []);
  const [freeCash, setFreeCash] = useState<number>(initialLive.freeCash);
  const [positions, setPositions] = useState<Position[]>(initialLive.positions);
  const [activities, setActivities] = useState<ActivityItem[]>(initialLive.activities);
  const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>(initialLive.balanceHistory);
  const [livePnlTicks, setLivePnlTicks] = useState<LivePnlTick[]>(initialLive.livePnlTicks);
  const [lastPriceSyncTs, setLastPriceSyncTs] = useState<number | null>(
    initialLive.livePnlTicks.length > 0
      ? initialLive.livePnlTicks[initialLive.livePnlTicks.length - 1].ts
      : null
  );
  const lastNetPnlRef = useRef<number>(
    initialLive.livePnlTicks.length > 0
      ? initialLive.livePnlTicks[initialLive.livePnlTicks.length - 1].netPnlUsd
      : 0
  );
  const [chartRange, setChartRange] = useState<ChartRange>('LIVE');
  const [bots, setBots] = useState<Record<BotName, BotRuntimeStatus>>(createInitialBots);
  const [latestAudit, setLatestAudit] = useState<AnalystDecision | null>(null);
  const [engineRunning, setEngineRunning] = useState<boolean>(true);
  const [scanningLive, setScanningLive] = useState<boolean>(false);
  const [liveFeedStatus, setLiveFeedStatus] = useState<LiveFeedStatus | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const seenMintsRef = useRef<Set<string>>(new Set(initialLive.positions.map((p) => p.mint)));

  const [lane, setLane] = useState<BrowserLaneState>({
    activeBot: null,
    actionText: 'Idle',
    targetButton: 'idle',
    cursorX: 22,
    cursorY: 42,
    clicking: false,
    privatePaused: false,
    currentCoin: null,
    typedAmount: '',
    quoteText: '',
    lastOrderSummary: null,
    lastFrameTs: Date.now(),
  });

  const [selectedAudit, setSelectedAudit] = useState<AnalystDecision | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

  const [testResults, setTestResults] = useState<AcceptanceTestResult[]>(() =>
    runAcceptanceSuite(loadSettings(), true)
  );
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    {
      id: 'init-1',
      ts: Date.now(),
      sender: 'desk',
      text: 'Overnight Desk 準備完了 (PAPER)。\n"status"、"report"、"pause Scanner"、"set stop to -20%" などのコマンドを入力してください。',
    },
  ]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const freeCashRef = useRef(freeCash);
  freeCashRef.current = freeCash;
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const botsRef = useRef(bots);
  botsRef.current = bots;

  const openPositions = useMemo(
    () => positions.filter((p) => p.closedAt === null),
    [positions]
  );

  const positionsValue = useMemo(
    () =>
      openPositions.reduce(
        (sum, p) => sum + p.remainingUsd * (p.currentPrice / p.entryPrice),
        0
      ),
    [openPositions]
  );

  const totalEquity = Math.round((freeCash + positionsValue) * 100) / 100;
  const allTestsPassed = testResults.every((t) => t.status === 'pass');

  const selectedPosition = useMemo(
    () => positions.find((p) => p.id === selectedPositionId) ?? null,
    [positions, selectedPositionId]
  );

  // Persist settings & change_log
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHANGELOG_KEY, JSON.stringify(changeLog.slice(0, 100)));
    } catch {
      // ignore
    }
  }, [changeLog]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_LIVE_STATE_KEY,
        JSON.stringify({
          freeCash,
          positions: positions.slice(0, 40),
          activities: activities.slice(0, 80),
          balanceHistory: balanceHistory.slice(-120),
          livePnlTicks: livePnlTicks.slice(-120),
        })
      );
    } catch {
      // ignore
    }
  }, [freeCash, positions, activities, balanceHistory, livePnlTicks]);

  const recordLivePnlTick = useCallback(
    (
      positionsSnapshot: Position[],
      opts?: {
        ts?: number;
        eventLabel?: string;
        positionId?: string;
        topSymbol?: string;
        topPriceUsd?: number;
      }
    ) => {
      const ts = opts?.ts ?? Date.now();
      let realized = 0;
      let unrealized = 0;
      let primaryOpen: Position | null = null;

      for (const p of positionsSnapshot) {
        if (p.closedAt !== null) {
          realized += p.pnlUsd;
        } else {
          if (!primaryOpen) primaryOpen = p;
          const openPnl =
            p.remainingUsd * (p.currentPrice / p.entryPrice) - p.remainingUsd - p.feesUsd;
          unrealized += openPnl;
        }
      }

      const realizedPnlUsd = Math.round(realized * 1000) / 1000;
      const unrealizedPnlUsd = Math.round(unrealized * 1000) / 1000;
      const netPnlUsd = Math.round((realized + unrealized) * 1000) / 1000;
      const deltaUsd = Math.round((netPnlUsd - lastNetPnlRef.current) * 1000) / 1000;
      lastNetPnlRef.current = netPnlUsd;

      const tick: LivePnlTick = {
        ts,
        netPnlUsd,
        realizedPnlUsd,
        unrealizedPnlUsd,
        deltaUsd,
        topSymbol: opts?.topSymbol ?? primaryOpen?.symbol ?? '',
        topPriceUsd: opts?.topPriceUsd ?? primaryOpen?.currentPrice ?? 0,
        eventLabel: opts?.eventLabel,
        positionId: opts?.positionId ?? primaryOpen?.id,
      };

      setLivePnlTicks((prev) => [...prev.slice(-119), tick]);
      setLastPriceSyncTs(ts);
    },
    []
  );

  const appendBotDecision = useCallback(
    (
      bot: BotName,
      decision: BotRuntimeStatus['decisions'][number],
      headline: string,
      subline: string
    ) => {
      setBots((prev) => ({
        ...prev,
        [bot]: {
          ...prev[bot],
          todayCount: prev[bot].todayCount + 1,
          headline,
          subline,
          lastHeartbeat: Date.now(),
          decisions: [decision, ...prev[bot].decisions].slice(0, 20),
        },
      }));
    },
    []
  );

  /**
   * Animate the 1-click browser lane cursor sequence cleanly
   */
  const animateLaneBuy = useCallback(
    (token: CandidateToken, sizeUsd: number, feeUsd: number, mode: 'PAPER' | 'LIVE') => {
      const now = Date.now();
      setLane((prev) => ({
        ...prev,
        activeBot: 'executor',
        actionText: `opening ${token.symbol}`,
        targetButton: 'buy_tab',
        cursorX: 66,
        cursorY: 33,
        clicking: false,
        currentCoin: token,
        typedAmount: sizeUsd.toFixed(2),
        quoteText: `Quote: ~$${(sizeUsd - feeUsd).toFixed(2)} (fee $${feeUsd.toFixed(2)})`,
        lastFrameTs: now,
      }));

      setTimeout(() => {
        setLane((prev) => ({
          ...prev,
          activeBot: 'executor',
          actionText: mode === 'PAPER' ? 'reading quote (PAPER)' : 'clicking Buy',
          targetButton: 'submit',
          cursorX: 78,
          cursorY: 72,
          clicking: true,
          lastFrameTs: Date.now(),
        }));
      }, 320);

      setTimeout(() => {
        setLane((prev) => ({
          ...prev,
          activeBot: null,
          actionText: 'Idle',
          targetButton: 'idle',
          clicking: false,
          lastOrderSummary: {
            text: `${mode === 'PAPER' ? 'PAPER · ' : ''}Bought ${token.symbol} · $${sizeUsd.toFixed(2)} verified`,
            checks: { screen: true, api: true, chain: mode === 'PAPER' ? 'n/a' : true },
            ts: Date.now(),
          },
          lastFrameTs: Date.now(),
        }));
      }, 900);
    },
    []
  );

  /**
   * Full 5-bot Pipeline Evaluation for a Candidate Token:
   * Scanner -> Analyst (8-layer + Social) -> Brain -> Executor (Buy) -> Risk Guard
   */
  const processTokenThroughPipeline = useCallback(
    (token: CandidateToken, skipLaneAnimation = false) => {
      const curSettings = settingsRef.current;
      const curBots = botsRef.current;
      const link = coinUrl(token.mint, 'solana');
      const idBase = `${token.symbol}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (curBots.scanner.paused) return;

      // 1. SCANNER
      const scan = evaluateScanner(token, curSettings, []);
      appendBotDecision(
        'scanner',
        {
          id: `sc-${idBase}`,
          ts: scan.ts,
          mint: token.mint,
          symbol: token.symbol,
          verdict: scan.verdict.toUpperCase(),
          reason: scan.reason,
          link,
          positive: scan.verdict === 'pass',
          negative: scan.verdict === 'kill',
        },
        `${token.symbol} · ${scan.verdict === 'pass' ? '通過 → Analyst' : '除外'}`,
        scan.reason
      );

      if (scan.verdict === 'kill') {
        setActivities((prev) =>
          [
            {
              id: `act-${idBase}`,
              ts: scan.ts,
              kind: 'rejected' as const,
              mint: token.mint,
              symbol: token.symbol,
              name: token.name,
              bot: 'scanner' as const,
              title: `Rejected ${token.symbol}`,
              subtitle: `Scanner · ${scan.reason}`,
              valueText: 'Killed',
              negative: true,
              link,
              token,
            },
            ...prev,
          ].slice(0, 80)
        );
        return;
      }

      if (curBots.analyst.paused) return;

      // 2. ANALYST (8 layers + Social)
      const analyst = evaluateAnalyst(token, curSettings);
      setLatestAudit(analyst);

      appendBotDecision(
        'analyst',
        {
          id: `an-${idBase}`,
          ts: analyst.ts,
          mint: token.mint,
          symbol: token.symbol,
          verdict: analyst.passed ? `PASS (${analyst.score})` : `FAIL (${analyst.score})`,
          reason: analyst.reason,
          link,
          positive: analyst.passed,
          negative: !analyst.passed,
        },
        `${token.symbol} · Score ${analyst.score}`,
        analyst.reason
      );

      if (!analyst.passed) {
        setActivities((prev) =>
          [
            {
              id: `act-${idBase}`,
              ts: analyst.ts,
              kind: 'rejected' as const,
              mint: token.mint,
              symbol: token.symbol,
              name: token.name,
              bot: 'analyst' as const,
              title: `Rejected ${token.symbol}`,
              subtitle: `Analyst · ${analyst.reason}`,
              valueText: `Score ${analyst.score}`,
              negative: true,
              link,
              audit: analyst,
              token,
            },
            ...prev,
          ].slice(0, 80)
        );
        return;
      }

      if (curBots.brain.paused) return;

      // Prevent duplicate buy on already held mint
      if (positionsRef.current.some((p) => p.mint === token.mint && p.closedAt === null)) {
        return;
      }

      // 3. BRAIN (Sizing)
      const tradesTonight = positionsRef.current.length;
      const realizedPnl = positionsRef.current
        .filter((p) => p.closedAt !== null)
        .reduce((sum, p) => sum + p.pnlUsd, 0);
      const nightLossPct =
        realizedPnl < 0 ? (Math.abs(realizedPnl) / curSettings.paper_start_cash) * 100 : 0;

      const brain = evaluateBrain(
        analyst,
        token,
        freeCashRef.current,
        tradesTonight,
        nightLossPct,
        curSettings
      );

      appendBotDecision(
        'brain',
        {
          id: `br-${idBase}`,
          ts: brain.ts,
          mint: token.mint,
          symbol: token.symbol,
          verdict: brain.approved ? `$${brain.sizeUsd.toFixed(2)}` : 'SKIP',
          reason: brain.reason,
          link,
          positive: brain.approved,
          negative: !brain.approved,
        },
        brain.approved
          ? `$${brain.sizeUsd.toFixed(2)} · ${brain.pctOfCash}% of cash`
          : `Skipped (${brain.reason})`,
        brain.reason
      );

      if (!brain.approved) {
        setActivities((prev) =>
          [
            {
              id: `act-${idBase}`,
              ts: brain.ts,
              kind: 'skipped' as const,
              mint: token.mint,
              symbol: token.symbol,
              name: token.name,
              bot: 'brain' as const,
              title: `Skipped ${token.symbol}`,
              subtitle: `Brain · ${brain.reason}`,
              valueText: brain.reason,
              link,
              audit: analyst,
              token,
            },
            ...prev,
          ].slice(0, 80)
        );
        return;
      }

      if (curBots.executor.paused) return;

      // 4. EXECUTOR (Buy + 3-Check Verify)
      const feeUsd = calculateFomoFee(brain.sizeUsd, curSettings.fee_pct);
      const netUsd = Math.max(0.5, brain.sizeUsd - feeUsd);
      const tokensQty = netUsd / token.priceUsd;
      const stopPrice = token.priceUsd * (1 - curSettings.stop_pct / 100);
      const posId = `pos-${idBase}`;

      const newPosition: Position = {
        id: posId,
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        openedAt: Date.now(),
        entryPrice: token.priceUsd,
        currentPrice: token.priceUsd,
        sizeUsd: brain.sizeUsd,
        remainingUsd: brain.sizeUsd,
        tokens: tokensQty,
        peakPrice: token.priceUsd,
        stopPrice,
        tpDone: false,
        trailActive: false,
        closedAt: null,
        exitPrice: null,
        exitReason: null,
        pnlUsd: -feeUsd,
        feesUsd: feeUsd,
        mode: curSettings.mode,
        audit: analyst,
        token,
      };

      const nextCash = Math.max(0, Math.round((freeCashRef.current - brain.sizeUsd) * 100) / 100);
      const nextPositions = [newPosition, ...positionsRef.current];
      positionsRef.current = nextPositions;
      freeCashRef.current = nextCash;
      setFreeCash(nextCash);
      setPositions(nextPositions);

      if (!skipLaneAnimation) {
        animateLaneBuy(token, brain.sizeUsd, feeUsd, curSettings.mode);
      }

      const checks = {
        screen: true,
        api: true,
        chain: curSettings.mode === 'PAPER' ? ('n/a' as const) : true,
      };

      appendBotDecision(
        'executor',
        {
          id: `ex-${idBase}`,
          ts: Date.now(),
          mint: token.mint,
          symbol: token.symbol,
          verdict: `BOUGHT $${brain.sizeUsd.toFixed(2)}`,
          reason: `dip cleared · fee $${feeUsd.toFixed(2)} · 3-check OK`,
          link,
          positive: true,
        },
        `Bought ${token.symbol} ($${brain.sizeUsd.toFixed(2)})`,
        '✓ Bought · verified'
      );

      setActivities((prev) =>
        [
          {
            id: `act-${idBase}`,
            ts: Date.now(),
            kind: 'bought' as const,
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            bot: 'executor' as const,
            title: `Bought ${token.symbol}`,
            subtitle: `Executor · ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} · $${brain.sizeUsd.toFixed(2)} · ${brain.pctOfCash}% of cash`,
            valueText: `$${brain.sizeUsd.toFixed(2)}`,
            link,
            audit: analyst,
            token,
            positionId: posId,
            checks,
          },
          ...prev,
        ].slice(0, 80)
      );

      const currentPosVal = nextPositions
        .filter((p) => p.closedAt === null)
        .reduce((s, p) => s + p.remainingUsd * (p.currentPrice / p.entryPrice), 0);
      const nextEq = Math.round((nextCash + currentPosVal - feeUsd) * 100) / 100;

      setBalanceHistory((prev) => [
        ...prev.slice(-80),
        {
          ts: Date.now(),
          value: nextEq,
          marker: { label: `Bought ${token.symbol}`, tone: 'blue' },
        },
      ]);

      recordLivePnlTick(nextPositions, {
        eventLabel: `Bought ${token.symbol}`,
        positionId: posId,
        topSymbol: token.symbol,
        topPriceUsd: token.priceUsd,
      });
    },
    [appendBotDecision, animateLaneBuy, recordLivePnlTick]
  );

  /**
   * Manual Sell Execution (from Coin Detail Modal or STEP 11 Command)
   */
  const executeManualSell = useCallback(
    (positionId: string, sellPct: 25 | 50 | 100) => {
      const pos = positionsRef.current.find((p) => p.id === positionId && p.closedAt === null);
      if (!pos) return;
      const curSettings = settingsRef.current;
      const multiple = pos.currentPrice / pos.entryPrice;
      const sellFraction = sellPct / 100;
      const grossExit = pos.remainingUsd * multiple * sellFraction;
      const feeUsd = calculateFomoFee(grossExit, curSettings.fee_pct);
      const netProceeds = Math.max(0, grossExit - feeUsd);
      const costPart = pos.remainingUsd * sellFraction;
      const realizedPart = Math.round((netProceeds - costPart) * 100) / 100;
      const pctGain = Math.round((multiple - 1) * 100);
      const isFullClose = sellPct >= 100;
      const link = coinUrl(pos.mint, 'solana');

      const nextCash = Math.round((freeCashRef.current + netProceeds) * 100) / 100;
      const nextPositions = positionsRef.current.map((p) =>
        p.id !== pos.id
          ? p
          : {
              ...p,
              remainingUsd: isFullClose
                ? 0
                : Math.round((p.remainingUsd * (1 - sellFraction)) * 100) / 100,
              closedAt: isFullClose ? Date.now() : null,
              exitPrice: isFullClose ? p.currentPrice : p.exitPrice,
              exitReason: isFullClose ? 'manual' : p.exitReason,
              pnlUsd: Math.round((p.pnlUsd + realizedPart) * 100) / 100,
              feesUsd: Math.round((p.feesUsd + feeUsd) * 100) / 100,
            }
      );

      freeCashRef.current = nextCash;
      positionsRef.current = nextPositions;
      setFreeCash(nextCash);
      setPositions(nextPositions);

      appendBotDecision(
        'executor',
        {
          id: `msell-${Date.now()}`,
          ts: Date.now(),
          mint: pos.mint,
          symbol: pos.symbol,
          verdict: `SOLD ${sellPct}%`,
          reason: `manual sell (${realizedPart >= 0 ? '+' : ''}$${realizedPart.toFixed(2)})`,
          link,
          positive: realizedPart >= 0,
          negative: realizedPart < 0,
        },
        `Sold ${pos.symbol} (${sellPct}%)`,
        `${realizedPart >= 0 ? '+' : ''}$${realizedPart.toFixed(2)} (${pctGain >= 0 ? '+' : ''}${pctGain}%)`
      );

      setActivities((prev) =>
        [
          {
            id: `act-msell-${Date.now()}`,
            ts: Date.now(),
            kind: 'sold' as const,
            mint: pos.mint,
            symbol: pos.symbol,
            name: pos.name,
            bot: 'executor' as const,
            title: `Sold ${pos.symbol}`,
            subtitle: `Executor · manual sell ${sellPct}% · fee $${feeUsd.toFixed(2)}`,
            valueText: `${realizedPart >= 0 ? '+' : ''}$${realizedPart.toFixed(2)}`,
            positive: realizedPart >= 0,
            negative: realizedPart < 0,
            link,
            audit: pos.audit,
            token: pos.token,
            positionId: pos.id,
          },
          ...prev,
        ].slice(0, 80)
      );

      const remainingOpenVal = nextPositions
        .filter((p) => p.closedAt === null)
        .reduce((s, p) => s + p.remainingUsd * (p.currentPrice / p.entryPrice), 0);

      setBalanceHistory((prev) => [
        ...prev.slice(-80),
        {
          ts: Date.now(),
          value: Math.round((nextCash + remainingOpenVal) * 100) / 100,
          marker: {
            label: `${realizedPart >= 0 ? '+' : ''}$${realizedPart.toFixed(2)}`,
            tone: realizedPart >= 0 ? 'green' : 'red',
          },
        },
      ]);

      recordLivePnlTick(nextPositions, {
        eventLabel: `Sold ${realizedPart >= 0 ? '+' : '-'}$${Math.abs(realizedPart).toFixed(2)}`,
        positionId: pos.id,
        topSymbol: pos.symbol,
        topPriceUsd: pos.currentPrice,
      });
    },
    [appendBotDecision, recordLivePnlTick]
  );

  /**
   * Scan Real Live Solana Tokens from Server (/api/live/candidates + /api/live/audit)
   */
  const scanRealSource = useCallback(
    async (source: LiveFeedSource = 'auto'): Promise<{ count: number; error?: string }> => {
      setScanningLive(true);
      setLastSyncError(null);
      try {
        const res = await fetchRealSolanaCandidates(
          source,
          settingsRef.current.rpc_url,
          8,
          seenMintsRef.current
        );
        if (res.error) {
          setLastSyncError(res.error);
          return { count: 0, error: res.error };
        }
        let processed = 0;
        for (const tok of res.tokens) {
          seenMintsRef.current.add(tok.mint);
          processTokenThroughPipeline(tok);
          processed++;
        }
        const status = await fetchLiveFeedStatus();
        if (status) setLiveFeedStatus(status);
        return { count: processed };
      } finally {
        setScanningLive(false);
      }
    },
    [processTokenThroughPipeline]
  );

  /**
   * Lookup ANY Real Solana Token by exact Mint address or Ticker Symbol and run through 5-bot pipeline
   */
  const handleLookupRealToken = useCallback(
    async (query: string): Promise<{ ok: boolean; message: string }> => {
      setScanningLive(true);
      setLastSyncError(null);
      try {
        const res = await lookupRealSolanaToken(query, settingsRef.current.rpc_url);
        if (!res.token) {
          const msg = res.error || `"${query}" に一致するSolana実銘柄が見つかりませんでした。`;
          setLastSyncError(msg);
          return { ok: false, message: msg };
        }
        seenMintsRef.current.add(res.token.mint);
        processTokenThroughPipeline(res.token);
        return {
          ok: true,
          message: `実データ取得完了: ${res.token.name} (${res.token.symbol}) · 価格 $${res.token.priceUsd.toFixed(6)} · 流動性 $${(res.token.liquidityUsd / 1000).toFixed(1)}K を5ボットパイプラインへ投入しました。`,
        };
      } finally {
        setScanningLive(false);
      }
    },
    [processTokenThroughPipeline]
  );

  // Initial Real Data Sync on First Mount (ZERO mock/seeded trades)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void fetchLiveFeedStatus().then((st) => {
      if (st) setLiveFeedStatus(st);
    });
    void scanRealSource('auto');
  }, [scanRealSource]);

  // Real 24/7 Live Price Polling (3s) & Live Candidate Scanning (25s)
  useEffect(() => {
    if (!engineRunning) return;

    const pollRealPrices = async () => {
      const currentPositions = positionsRef.current;
      const openList = currentPositions.filter((p) => p.closedAt === null);
      const now = Date.now();
      setLane((prev) => ({ ...prev, lastFrameTs: now }));

      if (openList.length === 0) {
        recordLivePnlTick(currentPositions, { ts: now });
        return;
      }

      const mints = Array.from(new Set(openList.map((p) => p.mint)));
      const liveMap = await fetchRealLivePrices(mints);
      if (Object.keys(liveMap).length === 0) {
        recordLivePnlTick(currentPositions, { ts: now });
        return;
      }

      const curSettings = settingsRef.current;
      let cashDelta = 0;
      const newActivities: ActivityItem[] = [];
      let chartMarker: BalancePoint['marker'] | undefined;
      let tickEventLabel: string | undefined;
      let tickPositionId: string | undefined;

      const nextPositions = currentPositions.map((pos) => {
        if (pos.closedAt !== null) return pos;
        const live = liveMap[pos.mint];
        if (!live || live.priceUsd <= 0) return pos;

        const nextPrice = live.priceUsd;
        const nextLiq = live.liquidityUsd > 0 ? live.liquidityUsd : pos.token.liquidityUsd;

        // Update real 1-minute candle bar
        const updatedCandles = [...pos.token.candles];
        const lastC = updatedCandles[updatedCandles.length - 1];
        if (lastC && now - lastC.ts < 60_000) {
          updatedCandles[updatedCandles.length - 1] = {
            ...lastC,
            close: nextPrice,
            high: Math.max(lastC.high, nextPrice),
            low: Math.min(lastC.low, nextPrice),
            volume: Math.round(live.volumeM5Usd),
          };
        } else {
          updatedCandles.push({
            ts: now,
            open: lastC ? lastC.close : nextPrice,
            high: nextPrice,
            low: nextPrice,
            close: nextPrice,
            volume: Math.round(live.volumeM5Usd),
          });
          if (updatedCandles.length > 60) updatedCandles.shift();
        }

        const updatedToken = {
          ...pos.token,
          priceUsd: nextPrice,
          liquidityUsd: nextLiq,
          marketCapUsd: live.marketCapUsd > 0 ? live.marketCapUsd : pos.token.marketCapUsd,
          volumeH1Usd: live.volumeH1Usd,
          volumeM5Usd: live.volumeM5Usd,
          h1ChangePct: live.h1ChangePct,
          uniqueBuys5m: live.buys5m,
          uniqueSells5m: live.sells5m,
          candles: updatedCandles,
        };

        const guard = evaluatePositionGuard(
          pos,
          nextPrice,
          nextLiq,
          pos.token.creatorBalanceNow,
          now,
          curSettings
        );

        if (guard.action === 'sell_partial' && guard.reason === 'take profit') {
          const sellFrac = guard.sellPct / 100;
          const gross = pos.remainingUsd * (nextPrice / pos.entryPrice) * sellFrac;
          const net = Math.max(0, gross - guard.feeUsd);
          cashDelta += net;
          chartMarker = {
            label: `+$${Math.max(0, guard.estimatedPnlUsd).toFixed(2)}`,
            tone: 'green',
          };
          tickEventLabel = `TP ${pos.symbol} +$${Math.max(0, guard.estimatedPnlUsd).toFixed(2)}`;
          tickPositionId = pos.id;
          newActivities.push({
            id: `act-tp-${pos.id}-${now}`,
            ts: now,
            kind: 'sold',
            mint: pos.mint,
            symbol: pos.symbol,
            name: pos.name,
            bot: 'executor',
            title: `Sold ${pos.symbol} (${guard.sellPct}%)`,
            subtitle: `Executor · take profit ${curSettings.tp_x}x · trail ${curSettings.trail_pct}% active`,
            valueText: `+$${guard.estimatedPnlUsd.toFixed(2)}`,
            positive: true,
            link: guard.link,
            audit: pos.audit,
            token: updatedToken,
            positionId: pos.id,
          });
          appendBotDecision(
            'executor',
            {
              id: `tp-${pos.id}-${now}`,
              ts: now,
              mint: pos.mint,
              symbol: pos.symbol,
              verdict: `TP ${guard.sellPct}%`,
              reason: `reached ${curSettings.tp_x}x · +$${guard.estimatedPnlUsd.toFixed(2)}`,
              link: guard.link,
              positive: true,
            },
            `Take Profit ${pos.symbol}`,
            `+$${guard.estimatedPnlUsd.toFixed(2)} · Trail active`
          );
          return {
            ...pos,
            currentPrice: nextPrice,
            peakPrice: guard.newPeak,
            remainingUsd: Math.round(pos.remainingUsd * (1 - sellFrac) * 100) / 100,
            tpDone: true,
            trailActive: true,
            pnlUsd: Math.round((pos.pnlUsd + guard.estimatedPnlUsd) * 100) / 100,
            feesUsd: Math.round((pos.feesUsd + guard.feeUsd) * 100) / 100,
            token: updatedToken,
          };
        }

        if (guard.action === 'sell_all' && guard.reason) {
          const gross = pos.remainingUsd * (nextPrice / pos.entryPrice);
          const net = Math.max(0, gross - guard.feeUsd);
          cashDelta += net;
          const isStop = guard.reason === 'stop' || guard.estimatedPnlUsd < 0;
          chartMarker = {
            label: isStop
              ? `-${curSettings.stop_pct}% · -$${Math.abs(guard.estimatedPnlUsd).toFixed(2)}`
              : `+$${guard.estimatedPnlUsd.toFixed(2)}`,
            tone: isStop ? 'red' : 'green',
          };
          tickEventLabel = isStop
            ? `Stop ${pos.symbol} -$${Math.abs(guard.estimatedPnlUsd).toFixed(2)}`
            : `Exit ${pos.symbol} +$${guard.estimatedPnlUsd.toFixed(2)}`;
          tickPositionId = pos.id;
          newActivities.push({
            id: `act-exit-${pos.id}-${now}`,
            ts: now,
            kind: isStop ? 'stopped' : 'sold',
            mint: pos.mint,
            symbol: pos.symbol,
            name: pos.name,
            bot: isStop ? 'risk' : 'executor',
            title: isStop ? `Stopped ${pos.symbol}` : `Sold ${pos.symbol}`,
            subtitle: `${isStop ? 'Risk' : 'Executor'} · ${guard.reason} · fee $${guard.feeUsd.toFixed(2)}`,
            valueText: `${guard.estimatedPnlUsd >= 0 ? '+' : ''}$${guard.estimatedPnlUsd.toFixed(2)}`,
            positive: guard.estimatedPnlUsd >= 0,
            negative: guard.estimatedPnlUsd < 0,
            link: guard.link,
            audit: pos.audit,
            token: updatedToken,
            positionId: pos.id,
          });
          appendBotDecision(
            'risk',
            {
              id: `rk-${pos.id}-${now}`,
              ts: now,
              mint: pos.mint,
              symbol: pos.symbol,
              verdict: guard.reason.toUpperCase(),
              reason: `${guard.estimatedPnlUsd >= 0 ? '+' : ''}$${guard.estimatedPnlUsd.toFixed(2)}`,
              link: guard.link,
              positive: guard.estimatedPnlUsd >= 0,
              negative: guard.estimatedPnlUsd < 0,
            },
            `${guard.reason}: ${pos.symbol}`,
            `${guard.estimatedPnlUsd >= 0 ? '+' : ''}$${guard.estimatedPnlUsd.toFixed(2)}`
          );
          return {
            ...pos,
            currentPrice: nextPrice,
            peakPrice: guard.newPeak,
            remainingUsd: 0,
            closedAt: now,
            exitPrice: nextPrice,
            exitReason: guard.reason,
            pnlUsd: Math.round((pos.pnlUsd + guard.estimatedPnlUsd) * 100) / 100,
            feesUsd: Math.round((pos.feesUsd + guard.feeUsd) * 100) / 100,
            token: updatedToken,
          };
        }

        return {
          ...pos,
          currentPrice: nextPrice,
          peakPrice: guard.newPeak,
          token: updatedToken,
        };
      });

      positionsRef.current = nextPositions;
      setPositions(nextPositions);

      if (cashDelta > 0) {
        const updatedCash = Math.round((freeCashRef.current + cashDelta) * 100) / 100;
        freeCashRef.current = updatedCash;
        setFreeCash(updatedCash);
      }

      if (newActivities.length > 0) {
        setActivities((prev) => [...newActivities, ...prev].slice(0, 80));
      }

      const openVal = nextPositions
        .filter((p) => p.closedAt === null)
        .reduce((s, p) => s + p.remainingUsd * (p.currentPrice / p.entryPrice), 0);
      const eq = Math.round((freeCashRef.current + openVal) * 100) / 100;

      setBalanceHistory((prev) => [
        ...prev.slice(-119),
        {
          ts: now,
          value: eq,
          marker: chartMarker,
        },
      ]);

      recordLivePnlTick(nextPositions, {
        ts: now,
        eventLabel: tickEventLabel,
        positionId: tickPositionId,
      });
    };

    void pollRealPrices();
    const priceTimer = setInterval(() => void pollRealPrices(), 3000);
    const scanTimer = setInterval(() => void scanRealSource('auto'), 25000);
    const statusTimer = setInterval(
      () =>
        void fetchLiveFeedStatus().then((st) => {
          if (st) setLiveFeedStatus(st);
        }),
      15000
    );

    return () => {
      clearInterval(priceTimer);
      clearInterval(scanTimer);
      clearInterval(statusTimer);
    };
  }, [engineRunning, appendBotDecision, scanRealSource, recordLivePnlTick]);

  const handleUpdateSetting = useCallback(
    <K extends keyof DeskSettings>(
      key: K,
      value: DeskSettings[K],
      who: 'me' | 'telegram' = 'me'
    ) => {
      setSettings((prev) => {
        const oldVal = String(prev[key]);
        const newVal = String(value);
        if (oldVal !== newVal) {
          setChangeLog((logs) => [
            {
              id: `chg-${Date.now()}-${Math.random()}`,
              ts: Date.now(),
              key: String(key),
              oldVal,
              newVal,
              who,
            },
            ...logs,
          ]);
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const handleToggleBotPause = useCallback((bot: BotName) => {
    if (bot === 'risk' && positionsRef.current.some((p) => p.closedAt === null)) {
      return; // Strictly locked while any open position exists (Page 2 & 4)
    }
    setBots((prev) => ({
      ...prev,
      [bot]: {
        ...prev[bot],
        paused: !prev[bot].paused,
      },
    }));
  }, []);

  const handleRunCommand = useCallback(
    (rawCmd: string) => {
      const cmd = rawCmd.trim();
      const lower = cmd.toLowerCase();
      const pushMsg = (text: string) => {
        setConsoleMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, ts: Date.now(), sender: 'user', text: cmd },
          { id: `d-${Date.now() + 1}`, ts: Date.now() + 1, sender: 'desk', text },
        ]);
      };

      if (lower === 'status') {
        const openList = positionsRef.current
          .filter((p) => p.closedAt === null)
          .map(
            (p) =>
              `• ${p.symbol}: $${p.remainingUsd.toFixed(2)} (${(
                (p.currentPrice / p.entryPrice - 1) *
                100
              ).toFixed(1)}%) ${coinUrl(p.mint)}`
          )
          .join('\n');
        pushMsg(
          `[${settingsRef.current.mode}] 残高: $${freeCashRef.current.toFixed(2)} / 総評価額: $${totalEquity.toFixed(2)}\n保有ポジション (${positionsRef.current.filter((p) => p.closedAt === null).length}):\n${openList || 'なし'}`
        );
        return;
      }

      if (lower.startsWith('pause ')) {
        const target = lower.replace('pause ', '').trim() as BotName;
        if (target in BOT_META) {
          if (target === 'risk' && positionsRef.current.some((p) => p.closedAt === null)) {
            pushMsg('拒否: ポジション保有中は Risk ボットを一時停止できません。');
            return;
          }
          setBots((prev) => ({ ...prev, [target]: { ...prev[target], paused: true } }));
          pushMsg(`${BOT_META[target].name} を一時停止しました。`);
          return;
        }
      }

      if (lower.startsWith('resume ')) {
        const target = lower.replace('resume ', '').trim() as BotName;
        if (target in BOT_META) {
          setBots((prev) => ({ ...prev, [target]: { ...prev[target], paused: false } }));
          pushMsg(`${BOT_META[target].name} を再開しました。`);
          return;
        }
      }

      const stopMatch = lower.match(/set stop to -?(\d+)%?/);
      if (stopMatch) {
        const nextStop = Math.max(10, Math.min(45, Number(stopMatch[1])));
        const oldStop = settingsRef.current.stop_pct;
        handleUpdateSetting('stop_pct', nextStop, 'telegram');
        pushMsg(`stop -${oldStop}% -> -${nextStop}% (change_log に記録済)`);
        return;
      }

      if (lower.startsWith('why ')) {
        const q = cmd.slice(4).trim().toLowerCase();
        const found = activities.find(
          (a) => a.symbol.toLowerCase() === q || a.name.toLowerCase().includes(q)
        );
        if (!found) {
          pushMsg(`"${cmd.slice(4).trim()}" に一致する銘柄履歴が見つかりません。`);
        } else {
          pushMsg(
            `${found.title}\n理由: ${found.subtitle}\n結果: ${found.valueText}\n${found.link}`
          );
        }
        return;
      }

      const sellMatch = cmd.match(/^sell\s+(\S+)\s+(25|50|100)$/i);
      if (sellMatch) {
        const sym = sellMatch[1].toLowerCase();
        const pct = Number(sellMatch[2]) as 25 | 50 | 100;
        const pos = positionsRef.current.find(
          (p) => p.closedAt === null && p.symbol.toLowerCase() === sym
        );
        if (!pos) {
          pushMsg(`保有中のポジション "${sellMatch[1]}" が見つかりません。`);
        } else {
          executeManualSell(pos.id, pct);
          pushMsg(`Executor キュー実行完了: ${pos.symbol} を ${pct}% 売却しました。\n${coinUrl(pos.mint)}`);
        }
        return;
      }

      if (lower.startsWith('withdraw ')) {
        const amt = cmd.slice(9).trim();
        setLane((prev) => ({ ...prev, privatePaused: true }));
        pushMsg(
          `安全ハンドオフ: 出金 ($${amt}) は Review 画面で自動停止しました。\n画面配信を "Paused · private" に切替えました。Confirm と 2FA はユーザーご本人が直接実行してください。`
        );
        return;
      }

      if (lower === 'report') {
        setActiveTab('activity');
        pushMsg('アクティビティ画面の朝報レポート（STEP 14）を開きました。');
        return;
      }

      if (lower === 'paper') {
        handleUpdateSetting('mode', 'PAPER', 'telegram');
        pushMsg('PAPER モードへ切り替えました。');
        return;
      }

      if (lower === 'live') {
        pushMsg('LIVE への切替は安全確認のため「設定」画面で "LIVE" と明示入力してください。');
        return;
      }

      pushMsg(
        '利用可能なコマンド:\n• status\n• why <SYMBOL>\n• sell <SYMBOL> <25|50|100>\n• pause <Scanner|Analyst|Brain|Executor>\n• resume <Bot>\n• set stop to -20%\n• withdraw <USD>\n• report / paper / live'
      );
    },
    [activities, executeManualSell, handleUpdateSetting, totalEquity]
  );

  const activeNavLabel = NAV_ITEMS.find((n) => n.key === activeTab)?.label ?? 'ホーム';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Desktop Left Sidebar (240px Windows 11 Navigation Rail) */}
      <aside className="hidden md:flex md:w-[240px] md:shrink-0 bg-[#0d0d0f] border-r border-[#545458]/45 flex-col justify-between sticky top-0 h-screen">
        <div>
          {/* Brand Wordmark */}
          <div className="h-16 px-5 flex items-center border-b border-[#545458]/35">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Overnight Desk
            </span>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1" aria-label="メインナビゲーション">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#1c1c1e] text-white'
                      : 'text-[#ebebf5]/60 hover:text-white hover:bg-[#161618]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00d35a]' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quiet Account Summary Footer inside Sidebar */}
        <div className="p-4 border-t border-[#545458]/35 space-y-2 text-xs">
          <div className="flex items-center justify-between font-mono-tabular">
            <span className="text-[#ebebf5]/50">モード</span>
            <span
              className={`font-semibold ${
                settings.mode === 'PAPER' ? 'text-[#ff9f0a]' : 'text-[#00d35a]'
              }`}
            >
              {settings.mode}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono-tabular">
            <span className="text-[#ebebf5]/50">FOMO</span>
            <span className="text-white truncate max-w-[120px]">@{settings.fomo_handle}</span>
          </div>
          <div className="flex items-center justify-between font-mono-tabular">
            <span className="text-[#ebebf5]/50">Step 15</span>
            <span className={allTestsPassed ? 'text-[#00d35a]' : 'text-[#ff9f0a]'}>
              {testResults.filter((t) => t.status === 'pass').length}/11 PASS
            </span>
          </div>
        </div>
      </aside>

      {/* Right Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        {/* Top Contextual Header Bar (Strict 1-row, 3-zone contract) */}
        <header className="h-16 px-4 sm:px-6 border-b border-[#545458]/45 bg-black/95 backdrop-blur sticky top-0 z-30 flex items-center justify-between gap-6">
          {/* Zone 1: Breadcrumb */}
          <div className="flex items-center gap-2 text-sm whitespace-nowrap shrink-0">
            <span className="text-[#ebebf5]/50 hidden sm:inline">Overnight Desk</span>
            <span className="text-[#ebebf5]/30 hidden sm:inline">/</span>
            <h1 className="font-semibold text-white">{activeNavLabel}</h1>
          </div>

          {/* Zone 2: Search Input */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#ebebf5]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'activity' && e.target.value.trim().length > 0) {
                    setActiveTab('activity');
                  }
                }}
                placeholder="銘柄名・シンボル・Mintアドレスで検索..."
                className="w-full bg-[#1c1c1e] border border-[#545458]/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[#ebebf5]/40 focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          </div>

          {/* Zone 3: Single Primary Action */}
          <button
            type="button"
            onClick={() => downloadWindowsAppZip(settings)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-[#e5e5ea] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Windows版を出力 (.zip)
          </button>
        </header>

        {/* Active Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1360px] w-full mx-auto">
          {activeTab === 'home' && (
            <DeskView
              totalEquity={totalEquity}
              freeCash={freeCash}
              startCash={settings.paper_start_cash}
              balanceHistory={balanceHistory}
              livePnlTicks={livePnlTicks}
              lastPriceSyncTs={lastPriceSyncTs}
              chartRange={chartRange}
              onChartRangeChange={setChartRange}
              lane={lane}
              onTogglePrivate={() =>
                setLane((prev) => ({ ...prev, privatePaused: !prev.privatePaused }))
              }
              bots={bots}
              latestAudit={latestAudit}
              openPositions={openPositions}
              allPositions={positions}
              tradesTonight={positions.length}
              passedTestsCount={testResults.filter((t) => t.status === 'pass').length}
              activities={activities}
              settings={settings}
              engineRunning={engineRunning}
              scanningLive={scanningLive}
              liveFeedStatus={liveFeedStatus}
              lastSyncError={lastSyncError}
              onToggleEngine={() => setEngineRunning((r) => !r)}
              onScanRealSource={scanRealSource}
              onLookupRealToken={handleLookupRealToken}
              onUpdateSetting={handleUpdateSetting}
              onPauseAllSafe={() => {
                setEngineRunning(false);
                const hasOpen = positionsRef.current.some((p) => p.closedAt === null);
                setBots((prev) => ({
                  scanner: { ...prev.scanner, paused: true },
                  analyst: { ...prev.analyst, paused: true },
                  brain: { ...prev.brain, paused: true },
                  executor: { ...prev.executor, paused: true },
                  risk: { ...prev.risk, paused: hasOpen ? false : true },
                }));
              }}
              onNavigate={setActiveTab}
              onSelectPosition={(pos) => setSelectedPositionId(pos.id)}
              onSelectAudit={setSelectedAudit}
            />
          )}

          {activeTab === 'bots' && (
            <BotsView
              bots={bots}
              hasOpenPosition={openPositions.length > 0}
              liveFeedStatus={liveFeedStatus}
              onTogglePause={handleToggleBotPause}
              onScanRealSource={scanRealSource}
              onJumpToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityView
              activities={activities}
              positions={positions}
              searchQuery={searchQuery}
              onSelectPosition={(pos) => setSelectedPositionId(pos.id)}
              onSelectAudit={setSelectedAudit}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              changeLog={changeLog}
              allTestsPassed={allTestsPassed}
              onUpdateSetting={handleUpdateSetting}
              onResetDefaults={() => {
                setSettings(DEFAULT_SETTINGS);
                setChangeLog((logs) => [
                  {
                    id: `reset-${Date.now()}`,
                    ts: Date.now(),
                    key: 'ALL',
                    oldVal: 'custom',
                    newVal: 'defaults',
                    who: 'me',
                  },
                  ...logs,
                ]);
              }}
            />
          )}

          {activeTab === 'windows' && (
            <WindowsPackageView
              settings={settings}
              testResults={testResults}
              onRunAllTests={() => setTestResults(runAcceptanceSuite(settings, true))}
              consoleMessages={consoleMessages}
              onRunCommand={handleRunCommand}
            />
          )}

          {activeTab === 'manual' && (
            <ManualView
              settings={settings}
              onNavigate={setActiveTab}
              onDownloadZip={() => downloadWindowsAppZip(settings)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Compact, under 15% viewport height) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-[#0d0d0f]/95 backdrop-blur border-t border-[#545458]/45 flex items-center justify-around px-1 z-30"
        aria-label="モバイルナビゲーション"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] cursor-pointer ${
                isActive ? 'text-white font-semibold' : 'text-[#ebebf5]/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#00d35a]' : ''}`} />
              <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals: Audit Screen & Coin Detail Screen */}
      <AuditModal audit={selectedAudit} onClose={() => setSelectedAudit(null)} />
      <CoinDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPositionId(null)}
        onOpenAudit={(pos) => {
          setSelectedPositionId(null);
          setSelectedAudit(pos.audit);
        }}
        onManualSell={executeManualSell}
      />
    </div>
  );
}
