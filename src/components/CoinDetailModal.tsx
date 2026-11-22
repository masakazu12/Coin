import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';
import { Position } from '../types/desk';
import { coinUrl } from '../engine/links';

interface CoinDetailModalProps {
  position: Position | null;
  onClose: () => void;
  onOpenAudit: (pos: Position) => void;
  onManualSell: (positionId: string, pct: 25 | 50 | 100) => void;
}

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({
  position,
  onClose,
  onOpenAudit,
  onManualSell,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sellSheetOpen, setSellSheetOpen] = useState(false);
  const [sellPct, setSellPct] = useState<25 | 50 | 100>(100);

  useEffect(() => {
    setSellSheetOpen(false);
    setSellPct(100);
  }, [position?.id]);

  useEffect(() => {
    if (!position || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const width = 580;
    const height = 190;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const candles = position.token.candles;
    if (candles.length === 0) return;

    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    allPrices.push(position.stopPrice, position.entryPrice, position.currentPrice);
    const minP = Math.min(...allPrices) * 0.96;
    const maxP = Math.max(...allPrices) * 1.04;
    const span = Math.max(maxP - minP, 0.000001);

    const padX = 12;
    const padY = 14;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;
    const toY = (p: number) => padY + (1 - (p - minP) / span) * plotH;

    // Orange dashed exit / stop line
    const stopY = toY(position.stopPrice);
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#ff9f0a';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padX, stopY);
    ctx.lineTo(width - padX, stopY);
    ctx.stroke();
    ctx.restore();

    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff9f0a';
    ctx.fillText(`Stop $${position.stopPrice.toFixed(6)}`, padX + 4, Math.max(12, stopY - 4));

    // Candlesticks
    const step = plotW / candles.length;
    const bodyW = Math.max(4, step * 0.56);

    candles.forEach((c, idx) => {
      const cx = padX + idx * step + step / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? '#00d35a' : '#ff453a';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, toY(c.high));
      ctx.lineTo(cx, toY(c.low));
      ctx.stroke();

      const yTop = toY(Math.max(c.open, c.close));
      const yBot = toY(Math.min(c.open, c.close));
      ctx.fillStyle = color;
      ctx.fillRect(cx - bodyW / 2, yTop, bodyW, Math.max(2, yBot - yTop));
    });
  }, [position]);

  if (!position) return null;

  const multiple = position.entryPrice > 0 ? position.currentPrice / position.entryPrice : 1;
  const unrealizedUsd = position.remainingUsd * multiple - position.remainingUsd;
  const pctChange = (multiple - 1) * 100;
  const isOpen = position.closedAt === null;
  const url = coinUrl(position.mint, 'solana');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1c1c1e] border border-[#545458]/55 rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#545458]/45">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white">{position.name}</h2>
              <span className="text-xs text-[#ebebf5]/60 font-mono-tabular">
                {position.symbol} · Solana · {position.token.ageMin}m
              </span>
              <button
                type="button"
                onClick={() => onOpenAudit(position)}
                className="inline-flex items-center gap-1 text-xs font-mono-tabular text-[#00d35a] hover:underline cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                8/8 · {position.audit.score}
              </button>
            </div>
            <div className="flex items-baseline gap-3 mt-1.5 font-mono-tabular">
              <span className="text-2xl font-bold text-white">
                ${position.currentPrice.toFixed(6)}
              </span>
              <span
                className={`text-sm font-semibold ${
                  multiple >= 1 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                }`}
              >
                {multiple.toFixed(2)}x ({pctChange >= 0 ? '+' : ''}
                {pctChange.toFixed(1)}%)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 rounded-lg text-[#ebebf5]/60 hover:text-white hover:bg-[#2c2c2e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1-Minute Candles Canvas */}
          <div className="bg-[#121214] rounded-xl p-3 border border-[#545458]/35">
            <div className="flex items-center justify-between text-[11px] text-[#ebebf5]/50 mb-1.5">
              <span>1分足チャート (db.prices)</span>
              <span className="font-mono-tabular">
                Entry ${position.entryPrice.toFixed(6)} · Peak ${position.peakPrice.toFixed(6)}
              </span>
            </div>
            <canvas ref={canvasRef} className="w-full h-[190px] block" />
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 font-mono-tabular">
            <div className="bg-[#141416] rounded-xl p-3 border border-[#545458]/35">
              <div className="text-xs text-[#ebebf5]/50 font-sans">時価総額</div>
              <div className="text-sm font-semibold text-white mt-1">
                ${(position.token.marketCapUsd / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="bg-[#141416] rounded-xl p-3 border border-[#545458]/35">
              <div className="text-xs text-[#ebebf5]/50 font-sans">流動性</div>
              <div className="text-sm font-semibold text-white mt-1">
                ${(position.token.liquidityUsd / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="bg-[#141416] rounded-xl p-3 border border-[#545458]/35">
              <div className="text-xs text-[#ebebf5]/50 font-sans">ホルダー数</div>
              <div className="text-sm font-semibold text-white mt-1">
                {position.token.holders.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Your Position Box */}
          <div className="bg-[#141416] rounded-xl p-4 border border-[#545458]/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#ebebf5]/55">保有ポジション ({position.mode})</div>
              <div className="text-base font-semibold text-white font-mono-tabular mt-0.5">
                ${position.remainingUsd.toFixed(2)} in · Executor
                {position.tpDone ? ' · TP 50%済 (Trail 40%)' : ''}
              </div>
              <div className="text-xs font-mono-tabular mt-0.5">
                <span className={unrealizedUsd >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'}>
                  評価損益 {unrealizedUsd >= 0 ? '+' : ''}${unrealizedUsd.toFixed(2)}
                </span>
                <span className="text-[#ebebf5]/40"> · 手数料計 ${position.feesUsd.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Open on FOMO
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {isOpen && (
                <button
                  type="button"
                  onClick={() => setSellSheetOpen((prev) => !prev)}
                  className="px-4 py-2 text-xs font-semibold bg-[#ff453a] hover:bg-[#ff5e54] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  今すぐ売却
                </button>
              )}
            </div>
          </div>

          {/* Manual Sell Sheet (25% / 50% / 100% -> Confirm sell) */}
          {isOpen && sellSheetOpen && (
            <div className="bg-[#231516] border border-[#ff453a]/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  手動売却キューを Executor へ送信
                </span>
                <span className="text-xs font-mono-tabular text-[#ebebf5]/60">
                  POST /api/sell
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([25, 50, 100] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSellPct(pct)}
                    className={`py-2 text-xs font-mono-tabular font-semibold rounded-lg transition-colors cursor-pointer ${
                      sellPct === pct
                        ? 'bg-[#ff453a] text-white'
                        : 'bg-[#2c2c2e] text-[#ebebf5]/70 hover:text-white'
                    }`}
                  >
                    {pct}% (${((position.remainingUsd * multiple * pct) / 100).toFixed(2)})
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSellSheetOpen(false)}
                  className="px-3.5 py-2 text-xs text-[#ebebf5]/70 hover:text-white cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onManualSell(position.id, sellPct);
                    setSellSheetOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#ff453a] hover:bg-[#ff5e54] text-white rounded-lg transition-colors cursor-pointer"
                >
                  {sellPct}% の売却を確定 (Confirm sell)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
