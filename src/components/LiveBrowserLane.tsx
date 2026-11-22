import React, { useState } from 'react';
import { Check, ExternalLink, EyeOff, Lock, Maximize2, ShieldCheck, X } from 'lucide-react';
import { BrowserLaneState, DeskMode } from '../types/desk';
import { BOT_META } from '../engine/defaults';
import { coinUrl } from '../engine/links';

interface LiveBrowserLaneProps {
  lane: BrowserLaneState;
  mode: DeskMode;
  onTogglePrivate: () => void;
}

const BotCursor: React.FC<{
  botName: keyof typeof BOT_META;
  x: number;
  y: number;
  clicking: boolean;
}> = ({ botName, x, y, clicking }) => {
  const meta = BOT_META[botName];
  return (
    <div
      className="pointer-events-none absolute z-20 transition-all duration-300 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-2px, -2px) scale(${clicking ? 0.88 : 1})`,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M2 2L14.5 7.5L8.8 9.4L6.8 15L2 2Z"
          fill={meta.color}
          stroke="#000000"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className="mt-0.5 ml-3 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono-tabular text-black whitespace-nowrap"
        style={{ backgroundColor: meta.color }}
      >
        {meta.name}
      </div>
    </div>
  );
};

export const LiveBrowserLane: React.FC<LiveBrowserLaneProps> = ({
  lane,
  mode,
  onTogglePrivate,
}) => {
  const [fullscreen, setFullscreen] = useState(false);

  const isFresh = Date.now() - lane.lastFrameTs < 5000;
  const activeMeta = lane.activeBot ? BOT_META[lane.activeBot] : null;
  const coin = lane.currentCoin;
  const url = coin ? coinUrl(coin.mint, 'solana') : 'https://fomo.family/r/masakazu12';

  const renderViewport = (isModal: boolean) => (
    <div
      className={`relative w-full aspect-video bg-[#111113] rounded-xl border border-[#545458]/55 overflow-hidden select-none flex flex-col ${
        isModal ? 'max-w-5xl mx-auto' : ''
      }`}
    >
      {/* Top Browser Chrome Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1c1c1e] border-b border-[#545458]/40 text-xs gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: isFresh ? '#ff453a' : 'rgba(235,235,245,0.35)' }}
          />
          <span className="text-white/90 font-medium whitespace-nowrap">
            {isFresh ? 'Live · Bot’s computer' : `Last frame ${new Date(lane.lastFrameTs).toLocaleTimeString('ja-JP')}`}
          </span>
          <span className="text-[#ebebf5]/35 hidden sm:inline">·</span>
          <span className="text-[#ebebf5]/50 font-mono-tabular truncate hidden sm:inline">
            127.0.0.1:9222 · tab: desk
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeMeta ? (
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: activeMeta.color }}>
              {activeMeta.name} · {lane.actionText}
            </span>
          ) : (
            <span className="text-xs text-[#ebebf5]/50 whitespace-nowrap">Idle · 1-click lane ready</span>
          )}
          <button
            type="button"
            onClick={onTogglePrivate}
            title="ログイン・出金時のプライバシー保護切替"
            className="p-1.5 rounded-md text-[#ebebf5]/60 hover:text-white hover:bg-[#2c2c2e] transition-colors cursor-pointer"
          >
            {lane.privatePaused ? <Lock className="w-3.5 h-3.5 text-[#ff9f0a]" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          {!isModal ? (
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              title="フルスクリーン表示"
              className="p-1.5 rounded-md text-[#ebebf5]/60 hover:text-white hover:bg-[#2c2c2e] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              title="閉じる"
              className="p-1.5 rounded-md text-[#ebebf5]/60 hover:text-white hover:bg-[#2c2c2e] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Content */}
      {lane.privatePaused ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0c0c0d]">
          <Lock className="w-8 h-8 text-[#ff9f0a] mb-3" />
          <div className="text-base font-semibold text-white">Paused · private</div>
          <p className="text-xs text-[#ebebf5]/60 mt-1 max-w-sm">
            ログイン・2FA認証・出金画面のフレーム送信を停止しています。再開すると1秒ごとのCDPフレーム配信が復帰します。
          </p>
          <button
            type="button"
            onClick={onTogglePrivate}
            className="mt-4 px-4 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors cursor-pointer"
          >
            画面共有を再開
          </button>
        </div>
      ) : (
        <div className="relative flex-1 p-4 flex flex-col justify-between bg-[#0a0a0c]">
          {/* Simulated FOMO Web Address Bar */}
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-[#1c1c1e] rounded-lg border border-[#545458]/40 text-[11px] font-mono-tabular text-[#ebebf5]/60">
            <span className="truncate">{url}</span>
            <span className="text-[#ff9f0a] font-semibold shrink-0">{mode}</span>
          </div>

          {/* FOMO Web Trade Panel Representation */}
          <div className="grid grid-cols-12 gap-3 my-auto py-3">
            <div className="col-span-7 bg-[#161618] rounded-lg p-3 border border-[#545458]/35 flex flex-col justify-between">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {coin ? `${coin.name} (${coin.symbol})` : '待機中 — PumpSwap 監視中'}
                  </div>
                  <div className="text-[11px] text-[#ebebf5]/50 font-mono-tabular truncate mt-0.5">
                    {coin ? `Mint: ${coin.mint.slice(0, 8)}...${coin.mint.slice(-6)}` : 'wss://pumpportal.fun/api/data'}
                  </div>
                </div>
                <div className="text-right font-mono-tabular shrink-0">
                  <div className="text-sm font-semibold text-white">
                    {coin ? `$${coin.priceUsd.toFixed(6)}` : '—'}
                  </div>
                  <div
                    className={`text-[11px] ${
                      coin && coin.h1ChangePct >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                    }`}
                  >
                    {coin ? `${coin.h1ChangePct >= 0 ? '+' : ''}${coin.h1ChangePct.toFixed(1)}% 1h` : '0.0%'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#545458]/30 text-[11px]">
                <div>
                  <div className="text-[#ebebf5]/45">流動性</div>
                  <div className="font-mono-tabular text-white mt-0.5">
                    {coin ? `$${(coin.liquidityUsd / 1000).toFixed(1)}K` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[#ebebf5]/45">時価総額</div>
                  <div className="font-mono-tabular text-white mt-0.5">
                    {coin ? `$${(coin.marketCapUsd / 1000).toFixed(0)}K` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[#ebebf5]/45">ホルダー</div>
                  <div className="font-mono-tabular text-white mt-0.5">
                    {coin ? coin.holders.toLocaleString() : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-5 bg-[#161618] rounded-lg p-3 border border-[#545458]/35 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
                <div
                  className={`text-center py-1 rounded ${
                    lane.targetButton === 'buy_tab' || lane.targetButton === 'submit'
                      ? 'bg-[#00d35a]/20 text-[#00d35a]'
                      : 'bg-[#2c2c2e] text-[#ebebf5]/60'
                  }`}
                >
                  Buy
                </div>
                <div
                  className={`text-center py-1 rounded ${
                    lane.targetButton === 'sell_tab'
                      ? 'bg-[#ff453a]/20 text-[#ff453a]'
                      : 'bg-[#2c2c2e] text-[#ebebf5]/60'
                  }`}
                >
                  Sell
                </div>
              </div>

              <div className="my-2 px-2.5 py-1.5 rounded bg-[#0c0c0d] border border-[#545458]/40 flex items-center justify-between font-mono-tabular text-xs">
                <span className="text-[#ebebf5]/50">USD</span>
                <span className="text-white font-semibold">{lane.typedAmount || '0.00'}</span>
              </div>

              <div className="text-[10px] text-[#ebebf5]/50 font-mono-tabular truncate mb-1.5">
                {lane.quoteText || 'Quote: waiting for Brain size'}
              </div>

              <div
                className={`w-full py-1.5 rounded text-center text-xs font-semibold transition-colors ${
                  lane.targetButton === 'submit'
                    ? 'bg-[#00d35a] text-black'
                    : 'bg-[#2c2c2e] text-white/80'
                }`}
              >
                {mode === 'PAPER'
                  ? `PAPER Stop before Buy ${coin?.symbol || ''}`
                  : `Buy ${coin?.symbol || 'Token'}`}
              </div>
            </div>
          </div>

          {/* Cursor Overlay */}
          {lane.activeBot && (
            <BotCursor
              botName={lane.activeBot}
              x={lane.cursorX}
              y={lane.cursorY}
              clicking={lane.clicking}
            />
          )}

          {/* Bottom 3-Check Verification Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#545458]/35 text-[11px]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[#ebebf5]/80 font-mono-tabular truncate">
                {lane.lastOrderSummary
                  ? lane.lastOrderSummary.text
                  : '直近注文: まだ約定はありません'}
              </span>
              {lane.lastOrderSummary && (
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono-tabular">
                  <span className={lane.lastOrderSummary.checks.screen ? 'text-[#00d35a]' : 'text-[#ff453a]'}>
                    <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" />Screen
                  </span>
                  <span className={lane.lastOrderSummary.checks.api ? 'text-[#00d35a]' : 'text-[#ff453a]'}>
                    <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" />API
                  </span>
                  <span className={lane.lastOrderSummary.checks.chain === true ? 'text-[#00d35a]' : 'text-[#ebebf5]/50'}>
                    <ShieldCheck className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                    {lane.lastOrderSummary.checks.chain === 'n/a' ? 'Chain n/a' : 'Chain'}
                  </span>
                </div>
              )}
            </div>

            {coin && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#0a84ff] hover:underline whitespace-nowrap shrink-0"
              >
                Open on FOMO
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {renderViewport(false)}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          {renderViewport(true)}
        </div>
      )}
    </>
  );
};
