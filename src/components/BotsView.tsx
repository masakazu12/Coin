import React, { useState } from 'react';
import { ExternalLink, Globe, Lock, Pause, Play, Radio, SlidersHorizontal } from 'lucide-react';
import { BotName, BotRuntimeStatus } from '../types/desk';
import { BOT_META } from '../engine/defaults';
import { LiveFeedSource, LiveFeedStatus } from '../engine/marketFeed';

interface BotsViewProps {
  bots: Record<BotName, BotRuntimeStatus>;
  hasOpenPosition: boolean;
  liveFeedStatus: LiveFeedStatus | null;
  onTogglePause: (bot: BotName) => void;
  onScanRealSource: (source: LiveFeedSource) => Promise<{ count: number; error?: string }>;
  onJumpToSettings: () => void;
}

const BOT_ORDER: BotName[] = ['scanner', 'analyst', 'brain', 'executor', 'risk'];

export const BotsView: React.FC<BotsViewProps> = ({
  bots,
  hasOpenPosition,
  liveFeedStatus,
  onTogglePause,
  onScanRealSource,
  onJumpToSettings,
}) => {
  const [fetchingSource, setFetchingSource] = useState<LiveFeedSource | null>(null);
  const [liveStatusMsg, setLiveStatusMsg] = useState<string | null>(null);

  const handleScan = async (source: LiveFeedSource, label: string) => {
    setFetchingSource(source);
    setLiveStatusMsg(null);
    const res = await onScanRealSource(source);
    setFetchingSource(null);
    if (res.error) {
      setLiveStatusMsg(`${label} 取得エラー: ${res.error}`);
    } else if (res.count === 0) {
      setLiveStatusMsg(`${label}: 新規の未処理Solana銘柄はありませんでした。`);
    } else {
      setLiveStatusMsg(
        `${label} から実Solana銘柄 ${res.count}件を取得し、RugCheck + Solana RPC 監査を経て5ボットパイプラインへ投入しました。`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Real Data Action Bar */}
      <div className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">5ボット 実データパイプライン管理</h2>
          <p className="text-xs text-[#ebebf5]/60 mt-0.5">
            PumpPortal WS ({liveFeedStatus?.pumpPortalConnected ? '接続済' : '再接続待機'} · 卒業検知 {liveFeedStatus?.recentMigrationsCount ?? 0}件) · RugCheck ラグDB ({liveFeedStatus?.ruggedMintsCount ?? 0}件) · DexScreener / Solana RPC 直結
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={fetchingSource !== null}
            onClick={() => void handleScan('auto', '総合ライブスキャン')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#00d35a] hover:bg-[#1be06d] text-black rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Globe className="w-3.5 h-3.5" />
            {fetchingSource === 'auto' ? '実データ取得中...' : '最新Solana実銘柄スキャン'}
          </button>

          <button
            type="button"
            disabled={fetchingSource !== null}
            onClick={() => void handleScan('pumpportal', 'PumpPortal卒業')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#64d2ff] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Radio className="w-3.5 h-3.5" />
            {fetchingSource === 'pumpportal' ? '取得中...' : 'PumpPortal卒業取得'}
          </button>

          <button
            type="button"
            disabled={fetchingSource !== null}
            onClick={() => void handleScan('pumpswap', 'PumpSwap検索')}
            className="px-3 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {fetchingSource === 'pumpswap' ? '取得中...' : 'PumpSwap実ペア取得'}
          </button>
        </div>
      </div>

      {liveStatusMsg && (
        <div className="px-4 py-3 rounded-xl bg-[#1c1c1e] border border-[#64d2ff]/40 text-xs text-[#ebebf5]/85">
          {liveStatusMsg}
        </div>
      )}

      {/* 5 Full-Width Bot Cards */}
      <div className="space-y-4">
        {BOT_ORDER.map((botKey) => {
          const bot = bots[botKey];
          const meta = BOT_META[botKey];
          const riskLocked = botKey === 'risk' && hasOpenPosition;

          return (
            <section
              key={botKey}
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#545458]/35 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: bot.paused ? 'rgba(235,235,245,0.25)' : meta.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-white">{meta.name}</h3>
                      <span className="text-xs text-[#ebebf5]/55">{meta.labelJa}</span>
                      <span className="text-xs font-mono-tabular text-[#ebebf5]/45">
                        · 本日 {bot.todayCount}件
                      </span>
                    </div>
                    <p className="text-xs text-[#ebebf5]/55 mt-0.5">{meta.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={onJumpToSettings}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ebebf5]/70 hover:text-white bg-[#2c2c2e] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    設定
                  </button>

                  <button
                    type="button"
                    disabled={riskLocked}
                    onClick={() => onTogglePause(botKey)}
                    title={riskLocked ? 'ポジション保有中はRiskボットを停止できません' : ''}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      riskLocked
                        ? 'bg-[#2c2c2e]/60 text-[#ebebf5]/40 cursor-not-allowed'
                        : bot.paused
                          ? 'bg-[#00d35a] text-black hover:bg-[#1be06d] cursor-pointer'
                          : 'bg-[#2c2c2e] text-white hover:bg-[#3a3a3c] cursor-pointer'
                    }`}
                  >
                    {riskLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-[#ff6b9a]" />
                        保有中ロック
                      </>
                    ) : bot.paused ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        再開
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        一時停止
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="px-5 py-3">
                <div className="flex items-center justify-between text-xs text-[#ebebf5]/50 mb-2">
                  <span>直近の判断ログ（最大20件 · 実データ）</span>
                  <span className="font-mono-tabular">
                    現在: {bot.headline} · {bot.subline}
                  </span>
                </div>

                {bot.decisions.length === 0 ? (
                  <div className="py-5 text-center text-xs text-[#ebebf5]/40">
                    まだ実データの判断履歴はありません
                  </div>
                ) : (
                  <div className="max-h-[210px] overflow-y-auto divide-y divide-[#545458]/25">
                    {bot.decisions.slice(0, 20).map((d) => (
                      <div
                        key={d.id}
                        className="py-2 flex items-center justify-between gap-4 text-xs font-mono-tabular"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[#ebebf5]/40 shrink-0">
                            {new Date(d.ts).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                          <span className="text-white font-semibold shrink-0">{d.symbol}</span>
                          <span
                            className={`shrink-0 ${
                              d.positive
                                ? 'text-[#00d35a]'
                                : d.negative
                                  ? 'text-[#ff453a]'
                                  : 'text-[#ebebf5]/75'
                            }`}
                          >
                            {d.verdict}
                          </span>
                          <span className="text-[#ebebf5]/60 font-sans truncate">{d.reason}</span>
                        </div>

                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#0a84ff] hover:underline shrink-0 font-sans"
                        >
                          FOMO
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
