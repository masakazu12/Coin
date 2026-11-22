import React from 'react';
import { Check, ExternalLink, Minus, X } from 'lucide-react';
import { AnalystDecision } from '../types/desk';
import { coinUrl } from '../engine/links';

interface AuditModalProps {
  audit: AnalystDecision | null;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ audit, onClose }) => {
  if (!audit) return null;

  const passedCount = audit.layers.filter((l) => l.status === 'pass').length;
  const url = coinUrl(audit.mint, 'solana');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1c1c1e] border border-[#545458]/55 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#545458]/45">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-white">
                {audit.name} ({audit.symbol}) 監査レポート
              </h2>
              <span
                className={`text-xs font-mono-tabular font-semibold ${
                  audit.passed ? 'text-[#00d35a]' : 'text-[#ff453a]'
                }`}
              >
                {passedCount}/8 · Score {audit.score}
              </span>
            </div>
            <p className="text-xs text-[#ebebf5]/60 font-mono-tabular mt-0.5">
              Mint: {audit.mint}
            </p>
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

        <div className="p-6 overflow-y-auto space-y-6">
          {/* 8 Discs Grid (STEP 10 Audit Screen) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">8レイヤー順次監査（最初の赤で即停止）</span>
              <span className="text-xs text-[#ebebf5]/60 font-mono-tabular">{audit.reason}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {audit.layers.map((layer) => {
                const isPass = layer.status === 'pass';
                const isFail = layer.status === 'fail';
                const ringColor = isPass
                  ? '#00d35a'
                  : isFail
                    ? '#ff453a'
                    : 'rgba(235, 235, 245, 0.25)';

                return (
                  <div
                    key={layer.index}
                    className="bg-[#141416] border border-[#545458]/40 rounded-xl p-3 flex flex-col items-center text-center"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center mb-2 border-2"
                      style={{ borderColor: ringColor }}
                    >
                      {isPass ? (
                        <Check className="w-5 h-5 text-[#00d35a]" />
                      ) : isFail ? (
                        <X className="w-5 h-5 text-[#ff453a]" />
                      ) : (
                        <Minus className="w-4 h-4 text-[#ebebf5]/35" />
                      )}
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {layer.index}. {layer.name}
                    </div>
                    <div className="text-[11px] text-[#ebebf5]/50 mt-0.5">{layer.labelJa}</div>
                    <div
                      className={`text-xs font-mono-tabular mt-1.5 font-medium ${
                        isPass ? 'text-[#00d35a]' : isFail ? 'text-[#ff453a]' : 'text-[#ebebf5]/35'
                      }`}
                    >
                      {layer.valueText}
                    </div>
                    <div className="text-[10px] text-[#ebebf5]/40 mt-0.5">{layer.source}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Row (5th part of score) */}
          <div className="pt-4 border-t border-[#545458]/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Social シグナル (X 公開検索 · 重み 0.5)</span>
              <span className="text-xs font-mono-tabular text-[#64d2ff]">
                {audit.breakdown.social !== null
                  ? `Social ${audit.socialPts >= 0 ? '+' : ''}${audit.socialPts}pt · Plan ${audit.social.plan}`
                  : 'Social: off'}
              </span>
            </div>
            <p className="text-xs text-[#ebebf5]/65 mt-1.5 font-mono-tabular">
              {audit.breakdown.social !== null
                ? `${audit.social.u15} accounts in 15m (u60: ${audit.social.u60}, accel: ${audit.social.accel.toFixed(2)}x) · ${audit.social.smart} smart top traders hold · shill ${(audit.social.shill * 100).toFixed(0)}%`
                : 'ソーシャル未有効または8レイヤー未通過のため4要素スコアのみ算出'}
            </p>
            {audit.social.catalyst && audit.breakdown.social !== null && (
              <p className="text-xs text-[#ebebf5]/80 mt-1">カタリスト: {audit.social.catalyst}</p>
            )}
          </div>

          {/* Score Breakdown Formula */}
          <div className="pt-4 border-t border-[#545458]/40">
            <div className="text-sm font-medium text-white mb-3">スコア内訳（通過ライン 70点）</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-tabular">
              {[
                { label: 'Alive (出来高)', val: audit.breakdown.alive.toFixed(2) },
                { label: 'Organic (実需)', val: audit.breakdown.organic.toFixed(2) },
                { label: 'Flush (売り枯れ)', val: audit.breakdown.flush.toFixed(2) },
                { label: '1-Chase (過熱)', val: (1 - audit.breakdown.chase).toFixed(2) },
                {
                  label: 'Social',
                  val: audit.breakdown.social === null ? 'off' : audit.breakdown.social.toFixed(2),
                },
              ].map((item) => (
                <div key={item.label} className="bg-[#141416] rounded-lg p-2.5 border border-[#545458]/35">
                  <div className="text-[11px] text-[#ebebf5]/50 font-sans">{item.label}</div>
                  <div className="text-sm font-semibold text-white mt-1">{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#545458]/45 flex items-center justify-between bg-[#161618]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0a84ff] hover:underline"
          >
            Open on FOMO
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
