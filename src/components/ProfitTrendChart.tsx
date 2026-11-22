import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { LivePnlTick, Position } from '../types/desk';

interface ProfitTrendChartProps {
  positions: Position[];
  livePnlTicks: LivePnlTick[];
  engineRunning: boolean;
  lastPriceSyncTs: number | null;
  onSelectPosition: (pos: Position) => void;
}

type TrendMode = 'live' | 'per_trade' | 'cumulative';

interface TradePoint {
  index: number;
  position: Position;
  symbol: string;
  ts: number;
  tradePnl: number;
  cumulativePnl: number;
  isOpen: boolean;
  reasonLabel: string;
}

export const ProfitTrendChart: React.FC<ProfitTrendChartProps> = ({
  positions,
  livePnlTicks,
  engineRunning,
  lastPriceSyncTs,
  onSelectPosition,
}) => {
  const [mode, setMode] = useState<TrendMode>('live');
  const [includeOpen, setIncludeOpen] = useState<boolean>(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(760);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 1s local clock for real-time elapsed sync indicator
  useEffect(() => {
    if (!engineRunning) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [engineRunning]);

  const tradePoints = useMemo<TradePoint[]>(() => {
    const eligible = positions.filter((p) => (includeOpen ? true : p.closedAt !== null));
    const ordered = [...eligible].sort(
      (a, b) => (a.closedAt ?? a.openedAt) - (b.closedAt ?? b.openedAt)
    );

    let running = 0;
    return ordered.slice(-24).map((pos, idx) => {
      const isOpen = pos.closedAt === null;
      const tradePnl = isOpen
        ? Math.round(
            (pos.remainingUsd * (pos.currentPrice / pos.entryPrice) -
              pos.remainingUsd -
              pos.feesUsd) *
              100
          ) / 100
        : Math.round(pos.pnlUsd * 100) / 100;

      running = Math.round((running + tradePnl) * 100) / 100;

      const reasonMap: Record<string, string> = {
        stop: '損切り (-25%)',
        'take profit': '利確 (2.0x)',
        trail: 'トレール利確',
        'dead money': 'タイムアウト撤退',
        manual: '手動売却',
        pulled: '流動性異常撤退',
        'dev dumping': 'Dev売却検知',
      };

      return {
        index: idx + 1,
        position: pos,
        symbol: pos.symbol,
        ts: pos.closedAt ?? pos.openedAt,
        tradePnl,
        cumulativePnl: running,
        isOpen,
        reasonLabel: isOpen
          ? '保有中 (リアルタイム評価)'
          : (reasonMap[pos.exitReason ?? ''] ?? pos.exitReason ?? '決済済'),
      };
    });
  }, [positions, includeOpen]);

  const visibleLiveTicks = useMemo(() => livePnlTicks.slice(-60), [livePnlTicks]);

  const stats = useMemo(() => {
    const latestLive = visibleLiveTicks[visibleLiveTicks.length - 1] ?? null;
    if (tradePoints.length === 0) {
      return {
        count: 0,
        wins: 0,
        winRate: 0,
        total: latestLive ? latestLive.netPnlUsd : 0,
        best: 0,
        worst: 0,
        lastDelta: latestLive ? latestLive.deltaUsd : 0,
      };
    }
    const pnls = tradePoints.map((t) => t.tradePnl);
    const wins = pnls.filter((v) => v >= 0).length;
    const total = tradePoints[tradePoints.length - 1].cumulativePnl;
    return {
      count: tradePoints.length,
      wins,
      winRate: Math.round((wins / tradePoints.length) * 100),
      total,
      best: Math.max(...pnls),
      worst: Math.min(...pnls),
      lastDelta: latestLive ? latestLive.deltaUsd : 0,
    };
  }, [tradePoints, visibleLiveTicks]);

  const height = 240;

  const seriesLength = mode === 'live' ? visibleLiveTicks.length : tradePoints.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || seriesLength === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, height);

    const padLeft = 58;
    const padRight = 24;
    const padTop = 28;
    const padBottom = 30;
    const plotW = Math.max(100, canvasWidth - padLeft - padRight);
    const plotH = height - padTop - padBottom;

    const series: number[] =
      mode === 'live'
        ? visibleLiveTicks.map((t) => t.netPnlUsd)
        : tradePoints.map((pt) => (mode === 'per_trade' ? pt.tradePnl : pt.cumulativePnl));

    const rawMin = Math.min(0, ...series);
    const rawMax = Math.max(0, ...series);
    const absMax = Math.max(Math.abs(rawMin), Math.abs(rawMax), 0.08);
    const minVal = rawMin < 0 ? rawMin - absMax * 0.2 : -absMax * 0.18;
    const maxVal = rawMax > 0 ? rawMax + absMax * 0.2 : absMax * 0.18;
    const span = Math.max(maxVal - minVal, 0.05);

    const toX = (i: number) =>
      series.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (series.length - 1)) * plotW;
    const toY = (v: number) => padTop + (1 - (v - minVal) / span) * plotH;

    const zeroY = toY(0);

    // Horizontal guide lines (max, 0, min)
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const guides = [maxVal, 0, minVal];
    guides.forEach((gVal) => {
      const gy = toY(gVal);
      ctx.save();
      ctx.strokeStyle =
        gVal === 0 ? 'rgba(235, 235, 245, 0.38)' : 'rgba(235, 235, 245, 0.08)';
      ctx.lineWidth = gVal === 0 ? 1.2 : 1;
      if (gVal === 0) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(canvasWidth - padRight, gy);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = gVal === 0 ? 'rgba(235, 235, 245, 0.75)' : 'rgba(235, 235, 245, 0.42)';
      const sign = gVal > 0 ? '+' : gVal < 0 ? '-' : '';
      ctx.fillText(`${sign}$${Math.abs(gVal).toFixed(2)}`, padLeft - 8, gy);
    });

    // Area fill relative to $0.00 zero line
    if (series.length >= 2) {
      for (let i = 0; i < series.length - 1; i++) {
        const x1 = toX(i);
        const y1 = toY(series[i]);
        const x2 = toX(i + 1);
        const y2 = toY(series[i + 1]);
        const avg = (series[i] + series[i + 1]) / 2;

        ctx.beginPath();
        ctx.moveTo(x1, zeroY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, zeroY);
        ctx.closePath();
        ctx.fillStyle =
          avg >= 0 ? 'rgba(0, 211, 90, 0.11)' : 'rgba(255, 69, 58, 0.11)';
        ctx.fill();
      }
    }

    // Per-trade stems from zero line
    if (mode === 'per_trade') {
      series.forEach((val, i) => {
        const x = toX(i);
        const y = toY(val);
        ctx.save();
        ctx.strokeStyle =
          val >= 0 ? 'rgba(0, 211, 90, 0.45)' : 'rgba(255, 69, 58, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, zeroY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Zero-crossing colored polyline
    if (series.length >= 2) {
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < series.length - 1; i++) {
        const v1 = series[i];
        const v2 = series[i + 1];
        const x1 = toX(i);
        const y1 = toY(v1);
        const x2 = toX(i + 1);
        const y2 = toY(v2);

        if ((v1 >= 0 && v2 >= 0) || (v1 < 0 && v2 < 0)) {
          ctx.strokeStyle = v1 >= 0 && v2 >= 0 ? '#00d35a' : '#ff453a';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else {
          const t = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2));
          const zx = x1 + (x2 - x1) * t;

          ctx.strokeStyle = v1 >= 0 ? '#00d35a' : '#ff453a';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(zx, zeroY);
          ctx.stroke();

          ctx.strokeStyle = v2 >= 0 ? '#00d35a' : '#ff453a';
          ctx.beginPath();
          ctx.moveTo(zx, zeroY);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    // Hover vertical guide
    if (hoverIdx !== null && hoverIdx < series.length) {
      const hx = toX(hoverIdx);
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 235, 245, 0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, height - padBottom);
      ctx.stroke();
      ctx.restore();
    }

    // Nodes & X-axis labels
    ctx.textAlign = 'center';
    if (mode === 'live') {
      const stepLabel = Math.max(1, Math.ceil(visibleLiveTicks.length / 6));
      visibleLiveTicks.forEach((tk, i) => {
        const val = tk.netPnlUsd;
        const x = toX(i);
        const y = toY(val);
        const isLast = i === visibleLiveTicks.length - 1;
        const isHovered = hoverIdx === i;
        const color = val >= 0 ? '#00d35a' : '#ff453a';

        // Event marker or endpoint or hovered dot
        if (tk.eventLabel || isLast || isHovered) {
          if (isLast && engineRunning) {
            // Subtle outer ring on real-time live tip
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = val >= 0 ? 'rgba(0, 211, 90, 0.22)' : 'rgba(255, 69, 58, 0.22)';
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(x, y, isHovered || isLast ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = tk.eventLabel && !isLast ? '#0a84ff' : color;
          ctx.fill();
          ctx.lineWidth = isHovered ? 2 : 1.5;
          ctx.strokeStyle = isHovered ? '#ffffff' : '#000000';
          ctx.stroke();
        }

        if (tk.eventLabel || isLast || isHovered) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = tk.eventLabel && !isLast ? '#64d2ff' : color;
          const lbl = tk.eventLabel
            ? tk.eventLabel
            : `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
          const ly = val >= 0 ? Math.max(12, y - 12) : Math.min(height - padBottom - 8, y + 14);
          const clampedX = Math.max(padLeft + 26, Math.min(x, canvasWidth - padRight - 26));
          ctx.fillText(lbl, clampedX, ly);
        }

        if (i % stepLabel === 0 || isLast) {
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isHovered || isLast ? '#ffffff' : 'rgba(235, 235, 245, 0.5)';
          const timeStr = new Date(tk.ts).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          ctx.fillText(timeStr, Math.max(padLeft + 24, Math.min(x, canvasWidth - padRight - 24)), height - 11);
        }
      });
    } else {
      tradePoints.forEach((pt, i) => {
        const val = series[i];
        const x = toX(i);
        const y = toY(val);
        const isHovered = hoverIdx === i;
        const isPos = pt.tradePnl >= 0;
        const nodeColor = isPos ? '#00d35a' : '#ff453a';

        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = pt.isOpen ? '#1c1c1e' : nodeColor;
        ctx.fill();
        ctx.lineWidth = isHovered ? 2.5 : 1.8;
        ctx.strokeStyle = isHovered ? '#ffffff' : nodeColor;
        ctx.stroke();

        if (isHovered || tradePoints.length <= 10) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = nodeColor;
          const label = `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
          const labelY = val >= 0 ? Math.max(12, y - 12) : Math.min(height - padBottom - 8, y + 14);
          ctx.fillText(label, x, labelY);
        }

        const stepLabel = tradePoints.length > 12 ? 2 : 1;
        if (i % stepLabel === 0 || i === tradePoints.length - 1 || isHovered) {
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(235, 235, 245, 0.52)';
          ctx.fillText(`#${pt.index} ${pt.symbol}`, x, height - 11);
        }
      });
    }
  }, [tradePoints, visibleLiveTicks, mode, canvasWidth, hoverIdx, engineRunning, seriesLength]);

  const resolveHoverIndex = (clientX: number, rect: DOMRect): number | null => {
    if (seriesLength === 0) return null;
    if (seriesLength === 1) return 0;
    const padLeft = 58;
    const padRight = 24;
    const plotW = Math.max(100, rect.width - padLeft - padRight);
    const rel = Math.max(0, Math.min(1, (clientX - rect.left - padLeft) / plotW));
    return Math.round(rel * (seriesLength - 1));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setHoverIdx(resolveHoverIndex(e.clientX, e.currentTarget.getBoundingClientRect()));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const idx = resolveHoverIndex(e.clientX, e.currentTarget.getBoundingClientRect());
    if (idx === null) return;
    if (mode === 'live') {
      const tk = visibleLiveTicks[idx];
      if (tk?.positionId) {
        const found = positions.find((p) => p.id === tk.positionId);
        if (found) onSelectPosition(found);
      }
    } else if (tradePoints[idx]) {
      onSelectPosition(tradePoints[idx].position);
    }
  };

  const activeLiveTick =
    mode === 'live'
      ? (hoverIdx !== null && visibleLiveTicks[hoverIdx]
          ? visibleLiveTicks[hoverIdx]
          : visibleLiveTicks[visibleLiveTicks.length - 1] ?? null)
      : null;

  const activeTradePoint =
    mode !== 'live'
      ? (hoverIdx !== null && tradePoints[hoverIdx]
          ? tradePoints[hoverIdx]
          : tradePoints[tradePoints.length - 1] ?? null)
      : null;

  const secondsSinceSync = lastPriceSyncTs
    ? Math.max(0, Math.floor((nowTick - lastPriceSyncTs) / 1000))
    : null;

  return (
    <section
      aria-label="直近の収益傾向（リアルタイム推移）"
      className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            {stats.total >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#00d35a]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#ff453a]" />
            )}
            <h2 className="text-base font-semibold text-white">
              直近の収益傾向（取引別プラス / マイナス リアルタイム推移）
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular text-[#ebebf5]/65">
              <Activity className={`w-3.5 h-3.5 ${engineRunning ? 'text-[#00d35a]' : 'text-[#ebebf5]/35'}`} />
              <span>
                {engineRunning
                  ? `LIVE 3秒更新${secondsSinceSync !== null ? ` (${secondsSinceSync}秒前同期)` : ''}`
                  : '停止中'}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-tabular mt-1.5 text-[#ebebf5]/60">
            <span>取引 {stats.count}件</span>
            <span aria-hidden="true">·</span>
            <span>
              勝率 <strong className="text-white">{stats.winRate}%</strong> ({stats.wins}/{stats.count})
            </span>
            <span aria-hidden="true">·</span>
            <span>
              現在損益{' '}
              <strong className={stats.total >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'}>
                {stats.total >= 0 ? '+' : '-'}${Math.abs(stats.total).toFixed(2)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              直近変動{' '}
              <strong
                className={
                  stats.lastDelta > 0
                    ? 'text-[#00d35a]'
                    : stats.lastDelta < 0
                      ? 'text-[#ff453a]'
                      : 'text-[#ebebf5]/70'
                }
              >
                {stats.lastDelta > 0 ? '▲ +' : stats.lastDelta < 0 ? '▼ -' : '±'}$
                {Math.abs(stats.lastDelta).toFixed(3)}
              </strong>
            </span>
          </div>
        </div>

        {/* Mode Switcher & Open Position Toggle */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {mode !== 'live' && (
            <label className="inline-flex items-center gap-2 text-xs text-[#ebebf5]/70 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeOpen}
                onChange={(e) => setIncludeOpen(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0a84ff] cursor-pointer"
              />
              <span>保有中の評価損益を含める</span>
            </label>
          )}

          <div
            className="flex items-center gap-1 p-1 bg-[#141416] border border-[#545458]/45 rounded-lg"
            role="tablist"
            aria-label="グラフ表示切替"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'live'}
              onClick={() => {
                setMode('live');
                setHoverIdx(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'live'
                  ? 'bg-[#2c2c2e] text-[#00d35a] font-semibold'
                  : 'text-[#ebebf5]/55 hover:text-white'
              }`}
            >
              リアルタイム推移
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'per_trade'}
              onClick={() => {
                setMode('per_trade');
                setHoverIdx(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'per_trade'
                  ? 'bg-[#2c2c2e] text-white'
                  : 'text-[#ebebf5]/55 hover:text-white'
              }`}
            >
              取引別 +/-
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'cumulative'}
              onClick={() => {
                setMode('cumulative');
                setHoverIdx(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'cumulative'
                  ? 'bg-[#2c2c2e] text-white'
                  : 'text-[#ebebf5]/55 hover:text-white'
              }`}
            >
              累積損益
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Canvas */}
      {seriesLength === 0 ? (
        <div className="py-14 text-center text-xs text-[#ebebf5]/50 bg-[#141416] rounded-xl border border-[#545458]/35">
          実データからの最初の価格・約定ティックを待機しています...
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full bg-[#121214] rounded-xl border border-[#545458]/35 p-3"
        >
          <canvas
            ref={canvasRef}
            style={{ width: `${canvasWidth}px`, height: `${height}px` }}
            className="block cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={handleClick}
          />
        </div>
      )}

      {/* Inspector Bar */}
      {mode === 'live' && activeLiveTick && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono-tabular">
          <div className="flex flex-wrap items-center gap-2.5 text-[#ebebf5]/75">
            <span className="text-white font-semibold">
              {new Date(activeLiveTick.ts).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className="text-[#ebebf5]/35">·</span>
            <span
              className={`font-semibold ${
                activeLiveTick.netPnlUsd >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
              }`}
            >
              純損益 {activeLiveTick.netPnlUsd >= 0 ? '+' : '-'}$
              {Math.abs(activeLiveTick.netPnlUsd).toFixed(2)}
            </span>
            <span className="text-[#ebebf5]/35">·</span>
            <span className="text-[#ebebf5]/60">
              確定 {activeLiveTick.realizedPnlUsd >= 0 ? '+' : '-'}$
              {Math.abs(activeLiveTick.realizedPnlUsd).toFixed(2)} / 含み{' '}
              {activeLiveTick.unrealizedPnlUsd >= 0 ? '+' : '-'}$
              {Math.abs(activeLiveTick.unrealizedPnlUsd).toFixed(2)}
            </span>
            {activeLiveTick.topSymbol && (
              <>
                <span className="text-[#ebebf5]/35">·</span>
                <span className="text-[#64d2ff]">
                  監視中 {activeLiveTick.topSymbol} ${activeLiveTick.topPriceUsd.toFixed(6)}
                </span>
              </>
            )}
          </div>

          <span className="text-[11px] font-sans text-[#ebebf5]/50">
            DexScreener 実価格を3秒ごとに自動プロット（{visibleLiveTicks.length}点記録）
          </span>
        </div>
      )}

      {mode !== 'live' && activeTradePoint && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono-tabular">
          <div className="flex flex-wrap items-center gap-2.5 text-[#ebebf5]/75">
            <span className="text-white font-semibold">
              #{activeTradePoint.index} {activeTradePoint.symbol}
            </span>
            <span className="text-[#ebebf5]/35">·</span>
            <span
              className={`font-semibold ${
                activeTradePoint.tradePnl >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
              }`}
            >
              取引損益 {activeTradePoint.tradePnl >= 0 ? '+' : '-'}$
              {Math.abs(activeTradePoint.tradePnl).toFixed(2)}
            </span>
            <span className="text-[#ebebf5]/35">·</span>
            <span
              className={
                activeTradePoint.cumulativePnl >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
              }
            >
              累積 {activeTradePoint.cumulativePnl >= 0 ? '+' : '-'}$
              {Math.abs(activeTradePoint.cumulativePnl).toFixed(2)}
            </span>
            <span className="text-[#ebebf5]/35">·</span>
            <span className="font-sans text-[#ebebf5]/60">{activeTradePoint.reasonLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectPosition(activeTradePoint.position)}
            className="text-xs font-sans text-[#0a84ff] hover:underline whitespace-nowrap cursor-pointer"
          >
            この取引の詳細を開く
          </button>
        </div>
      )}
    </section>
  );
};
