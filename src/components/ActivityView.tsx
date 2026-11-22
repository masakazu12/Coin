import React, { useMemo, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { ActivityItem, ActivityKind, AnalystDecision, Position } from '../types/desk';
import { SIGNUP_URL } from '../engine/links';

interface ActivityViewProps {
  activities: ActivityItem[];
  positions: Position[];
  searchQuery: string;
  onSelectPosition: (pos: Position) => void;
  onSelectAudit: (audit: AnalystDecision) => void;
}

const FILTERS: Array<{ key: 'all' | ActivityKind; label: string }> = [
  { key: 'all', label: 'すべて' },
  { key: 'bought', label: '購入 (Bought)' },
  { key: 'sold', label: '利確・売却 (Sold)' },
  { key: 'stopped', label: '損切り (Stopped)' },
  { key: 'rejected', label: '監査却下 (Rejected)' },
  { key: 'skipped', label: 'スキップ (Skipped)' },
];

export const ActivityView: React.FC<ActivityViewProps> = ({
  activities,
  positions,
  searchQuery,
  onSelectPosition,
  onSelectAudit,
}) => {
  const [filter, setFilter] = useState<'all' | ActivityKind>('all');
  const [showReport, setShowReport] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((a) => {
      if (filter !== 'all' && a.kind !== filter) return false;
      if (!q) return true;
      return (
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.mint.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q)
      );
    });
  }, [activities, filter, searchQuery]);

  // STEP 14 Morning Report aggregation (Red trades first, then green, kills by reason, refusals by layer)
  const report = useMemo(() => {
    const closed = positions.filter((p) => p.closedAt !== null);
    const redTrades = closed.filter((p) => p.pnlUsd < 0);
    const greenTrades = closed.filter((p) => p.pnlUsd >= 0);
    const totalFees = positions.reduce((acc, p) => acc + p.feesUsd, 0);
    const totalPnl = closed.reduce((acc, p) => acc + p.pnlUsd, 0);

    const scannerKills: Record<string, number> = {};
    const analystRefusals: Record<string, number> = {};

    activities.forEach((a) => {
      if (a.kind === 'rejected' && a.bot === 'scanner') {
        const key = a.subtitle.replace(/^Scanner ·\s*/, '');
        scannerKills[key] = (scannerKills[key] || 0) + 1;
      }
      if (a.kind === 'rejected' && a.bot === 'analyst') {
        const key = a.subtitle.replace(/^Analyst ·\s*/, '');
        analystRefusals[key] = (analystRefusals[key] || 0) + 1;
      }
    });

    return { redTrades, greenTrades, totalFees, totalPnl, scannerKills, analystRefusals };
  }, [positions, activities]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#1c1c1e] border border-[#545458]/50 rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filter === f.key
                  ? 'bg-[#2c2c2e] text-white'
                  : 'text-[#ebebf5]/60 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowReport((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-[#545458]/50 text-white rounded-xl transition-colors whitespace-nowrap cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-[#ffd60a]" />
          {showReport ? 'アクティビティ一覧へ戻る' : '朝のレポートを表示 (STEP 14)'}
        </button>
      </div>

      {/* STEP 14 Morning Report Page */}
      {showReport ? (
        <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#545458]/40 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Daily Report — 24時間運用レポート</h2>
              <p className="text-xs text-[#ebebf5]/55 mt-0.5">
                STEP 14仕様: 損失トレード（赤）を先頭に表示し、その後に利益トレード・除外理由・手数料内訳を一覧化
              </p>
            </div>
            <div className="text-right font-mono-tabular">
              <div
                className={`text-xl font-bold ${
                  report.totalPnl >= 0 ? 'text-[#00d35a]' : 'text-[#ff453a]'
                }`}
              >
                確定損益 {report.totalPnl >= 0 ? '+' : ''}${report.totalPnl.toFixed(2)}
              </div>
              <div className="text-xs text-[#ebebf5]/55">
                累計手数料 ${report.totalFees.toFixed(2)} (fees.py準拠)
              </div>
            </div>
          </div>

          {/* Red Trades First */}
          <div>
            <h3 className="text-sm font-semibold text-[#ff453a] mb-2">
              1. 損失トレード ({report.redTrades.length}件)
            </h3>
            {report.redTrades.length === 0 ? (
              <p className="text-xs text-[#ebebf5]/45">今夜の損失確定トレードはありません。</p>
            ) : (
              <div className="divide-y divide-[#545458]/30">
                {report.redTrades.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs font-mono-tabular">
                    <div>
                      <span className="text-white font-semibold">{p.symbol}</span>
                      <span className="text-[#ebebf5]/55">
                        {' '}· Entry ${p.entryPrice.toFixed(6)} → Exit ${(p.exitPrice ?? p.currentPrice).toFixed(6)} · {p.exitReason}
                      </span>
                    </div>
                    <span className="text-[#ff453a] font-semibold">
                      ${p.pnlUsd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Green Trades */}
          <div className="pt-4 border-t border-[#545458]/35">
            <h3 className="text-sm font-semibold text-[#00d35a] mb-2">
              2. 利益トレード ({report.greenTrades.length}件)
            </h3>
            {report.greenTrades.length === 0 ? (
              <p className="text-xs text-[#ebebf5]/45">今夜の利益確定トレードはまだありません。</p>
            ) : (
              <div className="divide-y divide-[#545458]/30">
                {report.greenTrades.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs font-mono-tabular">
                    <div>
                      <span className="text-white font-semibold">{p.symbol}</span>
                      <span className="text-[#ebebf5]/55">
                        {' '}· Entry ${p.entryPrice.toFixed(6)} → Exit ${(p.exitPrice ?? p.currentPrice).toFixed(6)} · {p.exitReason}
                      </span>
                    </div>
                    <span className="text-[#00d35a] font-semibold">
                      +${p.pnlUsd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scanner Kills & Analyst Refusals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#545458]/35">
            <div>
              <h3 className="text-sm font-semibold text-[#64d2ff] mb-2">Scanner 除外理由別件数</h3>
              {Object.keys(report.scannerKills).length === 0 ? (
                <p className="text-xs text-[#ebebf5]/45">該当なし</p>
              ) : (
                <div className="space-y-1.5 text-xs font-mono-tabular">
                  {Object.entries(report.scannerKills).map(([reason, cnt]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="text-[#ebebf5]/70 truncate">{reason}</span>
                      <span className="text-white">{cnt}件</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ffd60a] mb-2">Analyst レイヤー別却下件数</h3>
              {Object.keys(report.analystRefusals).length === 0 ? (
                <p className="text-xs text-[#ebebf5]/45">該当なし</p>
              ) : (
                <div className="space-y-1.5 text-xs font-mono-tabular">
                  {Object.entries(report.analystRefusals).map(([reason, cnt]) => (
                    <div key={reason} className="flex justify-between">
                      <span className="text-[#ebebf5]/70 truncate">{reason}</span>
                      <span className="text-white">{cnt}件</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#545458]/35 text-xs text-[#ebebf5]/50 flex items-center justify-between">
            <span>
              New to FOMO?{' '}
              <a
                href={SIGNUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0a84ff] hover:underline font-mono-tabular"
              >
                {SIGNUP_URL}
              </a>
            </span>
          </div>
        </section>
      ) : (
        /* Activity Ledger */
        <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#ebebf5]/50">
              条件に一致するアクティビティはありません。
            </div>
          ) : (
            <div className="divide-y divide-[#545458]/35">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#242427] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (item.positionId) {
                        const found = positions.find((p) => p.id === item.positionId);
                        if (found) {
                          onSelectPosition(found);
                          return;
                        }
                      }
                      if (item.audit) {
                        onSelectAudit(item.audit);
                      }
                    }}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <span className="text-[11px] font-mono-tabular text-[#ebebf5]/40">
                        {new Date(item.ts).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-[#ebebf5]/60 font-mono-tabular truncate mt-0.5">
                      {item.subtitle}
                      {item.checks && (
                        <span className="text-[#00d35a]">
                          {' '}· 3-Check ({item.checks.screen ? 'Screen✓' : 'Screen✗'} / {item.checks.api ? 'API✓' : 'API✗'} / {item.checks.chain === true ? 'Chain✓' : 'Chain n/a'})
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-4 shrink-0">
                    <div
                      className={`text-sm font-mono-tabular font-semibold ${
                        item.positive
                          ? 'text-[#00d35a]'
                          : item.negative
                            ? 'text-[#ff453a]'
                            : 'text-white'
                      }`}
                    >
                      {item.valueText}
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline whitespace-nowrap"
                    >
                      Open on FOMO
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
