import React from 'react';
import { ArrowUpRight, ChevronRight, Play, Radio, Square } from 'lucide-react';
import {
  ActivityItem,
  AnalystDecision,
  BalancePoint,
  BotName,
  BotRuntimeStatus,
  BrowserLaneState,
  ChartRange,
  DeskSettings,
  LivePnlTick,
  Position,
} from '../types/desk';
import { BOT_META } from '../engine/defaults';
import { LiveFeedSource, LiveFeedStatus } from '../engine/marketFeed';
import { BalanceChart } from './BalanceChart';
import { LiveBrowserLane } from './LiveBrowserLane';
import { ProfitTrendChart } from './ProfitTrendChart';
import { WindowsControlsPanel } from './WindowsControlsPanel';

interface DeskViewProps {
  totalEquity: number;
  freeCash: number;
  startCash: number;
  balanceHistory: BalancePoint[];
  livePnlTicks: LivePnlTick[];
  lastPriceSyncTs: number | null;
  chartRange: ChartRange;
  onChartRangeChange: (r: ChartRange) => void;
  lane: BrowserLaneState;
  onTogglePrivate: () => void;
  bots: Record<BotName, BotRuntimeStatus>;
  latestAudit: AnalystDecision | null;
  openPositions: Position[];
  allPositions: Position[];
  tradesTonight: number;
  passedTestsCount: number;
  activities: ActivityItem[];
  settings: DeskSettings;
  engineRunning: boolean;
  scanningLive: boolean;
  liveFeedStatus: LiveFeedStatus | null;
  lastSyncError: string | null;
  onToggleEngine: () => void;
  onScanRealSource: (source: LiveFeedSource) => Promise<{ count: number; error?: string }>;
  onLookupRealToken: (query: string) => Promise<{ ok: boolean; message: string }>;
  onUpdateSetting: <K extends keyof DeskSettings>(
    key: K,
    value: DeskSettings[K],
    who?: 'me' | 'telegram'
  ) => void;
  onPauseAllSafe: () => void;
  onNavigate: (tab: 'home' | 'bots' | 'activity' | 'settings' | 'windows' | 'manual') => void;
  onSelectPosition: (pos: Position) => void;
  onSelectAudit: (audit: AnalystDecision) => void;
}

export const DeskView: React.FC<DeskViewProps> = ({
  totalEquity,
  freeCash,
  startCash,
  balanceHistory,
  livePnlTicks,
  lastPriceSyncTs,
  chartRange,
  onChartRangeChange,
  lane,
  onTogglePrivate,
  bots,
  latestAudit,
  openPositions,
  allPositions,
  tradesTonight,
  passedTestsCount,
  activities,
  settings,
  engineRunning,
  scanningLive,
  liveFeedStatus,
  lastSyncError,
  onToggleEngine,
  onScanRealSource,
  onLookupRealToken,
  onUpdateSetting,
  onPauseAllSafe,
  onNavigate,
  onSelectPosition,
  onSelectAudit,
}) => {
  const diffUsd = totalEquity - startCash;
  const diffPct = startCash > 0 ? (diffUsd / startCash) * 100 : 0;
  const multiplier = startCash > 0 ? totalEquity / startCash : 1;
  const activeCount = Object.values(bots).filter((b) => !b.paused).length;
  const recentFive = activities.slice(0, 5);

  const scoreVal = latestAudit?.score ?? 0;
  const scoreStroke = scoreVal >= settings.min_score ? '#00d35a' : '#ff453a';
  const circumference = 2 * Math.PI * 16;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, scoreVal)) / 100);

  return (
    <div className="space-y-6">
      {/* Top Split: Balance + Chart (7 cols) & Live Browser Lane (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: Balance Hero & Live Equity Chart */}
        <section className="xl:col-span-7 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#ebebf5]/60">総資産評価額</span>
                {settings.mode === 'PAPER' ? (
                  <span className="text-xs font-mono-tabular font-semibold text-[#ff9f0a]">
                    PAPER
                  </span>
                ) : (
                  <span className="text-xs font-mono-tabular font-semibold text-[#00d35a]">
                    LIVE
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3.5 mt-1">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-mono-tabular">
                  ${totalEquity.toFixed(2)}
                </span>
                <span
                  className={`text-sm font-mono-tabular font-semibold ${
                    multiplier >= 1 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                  }`}
                >
                  {multiplier.toFixed(2)}x
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular mt-1.5">
                <span className={diffUsd >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'}>
                  {diffUsd >= 0 ? '+' : ''}
                  {diffPct.toFixed(2)}% ({diffUsd >= 0 ? '+' : ''}${diffUsd.toFixed(2)}) 本日
                </span>
                <span className="text-[#ebebf5]/30">·</span>
                <span className="text-[#ebebf5]/60">余力 ${freeCash.toFixed(2)}</span>
                <span className="text-[#ebebf5]/30">·</span>
                <span className="text-[#ebebf5]/60">保有 {openPositions.length}銘柄</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={scanningLive}
                onClick={() => void onScanRealSource('auto')}
                className="px-3.5 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {scanningLive ? '実データ取得中...' : '最新Solana実銘柄スキャン'}
              </button>
              <button
                type="button"
                onClick={onToggleEngine}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  engineRunning
                    ? 'bg-[#2c2c2e] text-[#ff453a] hover:bg-[#3a3a3c]'
                    : 'bg-[#00d35a] text-black hover:bg-[#19e06c]'
                }`}
              >
                {engineRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    監視を停止
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    24時間自動監視を開始
                  </>
                )}
              </button>
            </div>
          </div>

          {lastSyncError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-[#231516] border border-[#ff453a]/40 text-xs text-[#ff453a]">
              実データ取得エラー: {lastSyncError}
            </div>
          )}

          <BalanceChart
            points={balanceHistory}
            startCash={startCash}
            range={chartRange}
            onRangeChange={onChartRangeChange}
          />
        </section>

        {/* Right: 16:9 Live Browser Lane */}
        <section className="xl:col-span-5 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">ライブブラウザレーン (STEP 9)</h2>
              <p className="text-xs text-[#ebebf5]/55 mt-0.5">
                専用Chrome CDPの1クリック排他制御と5ボットカーソルを監視
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono-tabular text-[#ebebf5]/65 shrink-0">
              <Radio className={`w-3.5 h-3.5 ${engineRunning ? 'text-[#00d35a]' : 'text-[#ebebf5]/35'}`} />
              <span>{engineRunning ? '自動稼働中' : '待機中'}</span>
            </div>
          </div>

          <LiveBrowserLane
            lane={lane}
            mode={settings.mode}
            onTogglePrivate={onTogglePrivate}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#ebebf5]/55 pt-1">
            <span>
              {settings.always_on_24h
                ? `24時間自由稼働 · 実データ接続 (${liveFeedStatus?.pumpPortalConnected ? 'PumpPortal WS + ' : ''}DexScreener / RugCheck / RPC)`
                : `時間帯稼働: ${settings.night_start} – ${settings.lock_time}`}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('windows')}
              className="inline-flex items-center gap-1 text-[#0a84ff] hover:underline cursor-pointer whitespace-nowrap"
            >
              Windowsローカル導入
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Recent Profit Trend Line Chart (Real-Time Live Stream + Per-Trade +/-) */}
      <ProfitTrendChart
        positions={allPositions}
        livePnlTicks={livePnlTicks}
        engineRunning={engineRunning}
        lastPriceSyncTs={lastPriceSyncTs}
        onSelectPosition={onSelectPosition}
      />

      {/* 5 Bot Summary Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">ボット稼働状況</h2>
            <span className="text-xs font-mono-tabular text-[#ebebf5]/55">
              · {activeCount}/5 稼働中
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bots')}
            className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline cursor-pointer"
          >
            全ボット詳細
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Scanner */}
          <div
            onClick={() => onNavigate('bots')}
            className="bg-[#1c1c1e] hover:bg-[#232326] border border-[#545458]/50 rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between min-h-[154px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: BOT_META.scanner.color }}>
                Scanner
              </span>
              <span className="text-xs font-mono-tabular text-[#ebebf5]/55">
                {bots.scanner.todayCount} pools
              </span>
            </div>
            <div className="my-3 space-y-1">
              <div className="text-xs text-white truncate">{bots.scanner.headline}</div>
              <div className="text-[11px] font-mono-tabular text-[#ebebf5]/55 truncate">
                {bots.scanner.subline}
              </div>
            </div>
            <div className="text-[11px] font-mono-tabular text-[#ebebf5]/45 flex items-center justify-between">
              <span>liq ≥ ${(settings.min_liquidity_usd / 1000).toFixed(0)}K</span>
              <span>{bots.scanner.paused ? '一時停止' : '→ Analyst'}</span>
            </div>
          </div>

          {/* 2. Analyst (4x2 layer strip + score ring) */}
          <div
            onClick={() => (latestAudit ? onSelectAudit(latestAudit) : onNavigate('bots'))}
            className="bg-[#1c1c1e] hover:bg-[#232326] border border-[#545458]/50 rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between min-h-[154px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: BOT_META.analyst.color }}>
                Analyst
              </span>
              <span className="text-xs font-mono-tabular text-[#ebebf5]/55">
                {bots.analyst.todayCount} audited
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 my-2">
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const st = latestAudit?.layers[idx]?.status ?? 'not_checked';
                  const bg =
                    st === 'pass'
                      ? '#00d35a'
                      : st === 'fail'
                        ? '#ff453a'
                        : 'rgba(235, 235, 245, 0.15)';
                  return (
                    <div
                      key={idx}
                      className="h-2 rounded-sm"
                      style={{ backgroundColor: bg }}
                      title={latestAudit?.layers[idx]?.name || `Layer ${idx + 1}`}
                    />
                  );
                })}
              </div>

              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" stroke="#2c2c2e" strokeWidth="3.5" fill="none" />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke={latestAudit ? scoreStroke : '#2c2c2e'}
                    strokeWidth="3.5"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={latestAudit ? dashOffset : circumference}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono-tabular font-bold text-white">
                  {latestAudit ? latestAudit.score : '--'}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono-tabular text-[#ebebf5]/55 flex items-center justify-between">
              <span className="truncate">{latestAudit ? latestAudit.symbol : '待機中'}</span>
              <span className="text-[#64d2ff] shrink-0">
                {latestAudit && latestAudit.breakdown.social !== null
                  ? `Social ${latestAudit.socialPts >= 0 ? '+' : ''}${latestAudit.socialPts}`
                  : 'Social off'}
              </span>
            </div>
          </div>

          {/* 3. Brain */}
          <div
            onClick={() => onNavigate('bots')}
            className="bg-[#1c1c1e] hover:bg-[#232326] border border-[#545458]/50 rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between min-h-[154px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: BOT_META.brain.color }}>
                Brain
              </span>
              <span className="text-xs font-mono-tabular text-[#ebebf5]/55">Sizing</span>
            </div>
            <div className="my-3 space-y-1">
              <div className="text-xs font-mono-tabular font-semibold text-white truncate">
                {bots.brain.headline}
              </div>
              <div className="text-[11px] text-[#ebebf5]/55 truncate">{bots.brain.subline}</div>
            </div>
            <div className="text-[11px] font-mono-tabular text-[#ebebf5]/45 flex items-center justify-between">
              <span>{settings.full_size_score}+ = full</span>
              <span>cap ${settings.max_ticket_usd}</span>
            </div>
          </div>

          {/* 4. Executor */}
          <div
            onClick={() => onNavigate('bots')}
            className="bg-[#1c1c1e] hover:bg-[#232326] border border-[#545458]/50 rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between min-h-[154px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: BOT_META.executor.color }}>
                Executor
              </span>
              <span className="text-xs font-mono-tabular text-[#ebebf5]/55">
                {bots.executor.todayCount} trades
              </span>
            </div>
            <div className="my-3 space-y-1">
              <div className="text-xs text-white truncate">{bots.executor.headline}</div>
              <div className="text-[11px] font-mono-tabular text-[#00d35a] truncate">
                {bots.executor.subline}
              </div>
            </div>
            <div className="text-[11px] font-mono-tabular text-[#ebebf5]/45 flex items-center justify-between">
              <span>dip -{settings.dip_pct}%</span>
              <span>TP {settings.tp_x}x</span>
            </div>
          </div>

          {/* 5. Risk */}
          <div
            onClick={() => onNavigate('bots')}
            className="bg-[#1c1c1e] hover:bg-[#232326] border border-[#545458]/50 rounded-xl p-4 transition-colors cursor-pointer flex flex-col justify-between min-h-[154px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: BOT_META.risk.color }}>
                Risk
              </span>
              <span className="text-xs font-mono-tabular text-[#ebebf5]/55">
                {openPositions.length > 0 ? `Guarding ${openPositions.length}` : 'Standby'}
              </span>
            </div>
            <div className="my-3 space-y-1">
              <div className="text-xs text-white truncate">{bots.risk.headline}</div>
              <div className="text-[11px] font-mono-tabular text-[#ebebf5]/55 truncate">
                {bots.risk.subline}
              </div>
            </div>
            <div className="text-[11px] font-mono-tabular flex items-center justify-between">
              <span className="text-[#ff453a]">stop -{settings.stop_pct}%</span>
              <span className="text-[#00d35a]">trail {settings.trail_pct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Split: Open Positions & Recent Activity (Latest 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Open Positions */}
        <section className="lg:col-span-5 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">保有ポジション ({openPositions.length})</h2>
            <span className="text-xs font-mono-tabular text-[#ebebf5]/50">5秒監視 (Risk)</span>
          </div>

          {openPositions.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#ebebf5]/50">
              現在オープン中のポジションはありません。「新規卒業トークン投入」または自動監視を開始してください。
            </div>
          ) : (
            <div className="divide-y divide-[#545458]/35">
              {openPositions.map((pos) => {
                const mult = pos.currentPrice / pos.entryPrice;
                const pnlUsd = pos.remainingUsd * mult - pos.remainingUsd;
                const pct = (mult - 1) * 100;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onSelectPosition(pos)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-[#2c2c2e]/50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{pos.symbol}</span>
                        <span className="text-xs text-[#ebebf5]/50 truncate">{pos.name}</span>
                        {pos.tpDone && (
                          <span className="text-[11px] font-mono-tabular text-[#00d35a]">
                            Trail {settings.trail_pct}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[#ebebf5]/50 mt-0.5">
                        ${pos.remainingUsd.toFixed(2)} · Entry ${pos.entryPrice.toFixed(6)} · Stop ${pos.stopPrice.toFixed(6)}
                      </div>
                    </div>

                    <div className="text-right font-mono-tabular shrink-0">
                      <div
                        className={`text-sm font-semibold ${
                          pnlUsd >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                        }`}
                      >
                        {pnlUsd >= 0 ? '+' : ''}${pnlUsd.toFixed(2)}
                      </div>
                      <div
                        className={`text-[11px] ${
                          pct >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                        }`}
                      >
                        {pct >= 0 ? '+' : ''}
                        {pct.toFixed(1)}% ({mult.toFixed(2)}x)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity (Last 5) */}
        <section className="lg:col-span-7 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">最近のアクティビティ</h2>
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline cursor-pointer"
            >
              すべて表示 ({activities.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentFive.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#ebebf5]/50">
              今夜の取引履歴はまだありません。
            </div>
          ) : (
            <div className="divide-y divide-[#545458]/35">
              {recentFive.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.positionId) {
                      const found = openPositions.find((p) => p.id === item.positionId);
                      if (found) {
                        onSelectPosition(found);
                        return;
                      }
                    }
                    if (item.audit) {
                      onSelectAudit(item.audit);
                    }
                  }}
                  className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-[#2c2c2e]/50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-[#ebebf5]/55 truncate mt-0.5 font-mono-tabular">
                      {item.subtitle}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                      item.positive
                        ? 'text-[#00d35a]'
                        : item.negative
                          ? 'text-[#ff453a]'
                          : 'text-white'
                    }`}
                  >
                    {item.valueText}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Windows Basic UI Controls Panel */}
      <WindowsControlsPanel
        settings={settings}
        engineRunning={engineRunning}
        privatePaused={lane.privatePaused}
        tradesTonight={tradesTonight}
        openPositionCount={openPositions.length}
        passedTestsCount={passedTestsCount}
        scanningLive={scanningLive}
        onToggleEngine={onToggleEngine}
        onTogglePrivate={onTogglePrivate}
        onUpdateSetting={onUpdateSetting}
        onLookupRealToken={onLookupRealToken}
        onScanRealSource={onScanRealSource}
        onPauseAllSafe={onPauseAllSafe}
      />
    </div>
  );
};
