import React, { useState } from 'react';
import { Check, Copy, ExternalLink, RotateCcw, ShieldAlert } from 'lucide-react';
import { ChangeLogEntry, DeskSettings } from '../types/desk';
import { CURSOR_RULES, SETTINGS_META } from '../engine/defaults';
import { profileUrl, SIGNUP_URL } from '../engine/links';

interface SettingsViewProps {
  settings: DeskSettings;
  changeLog: ChangeLogEntry[];
  allTestsPassed: boolean;
  onUpdateSetting: <K extends keyof DeskSettings>(key: K, value: DeskSettings[K], who?: 'me' | 'telegram') => void;
  onResetDefaults: () => void;
}

const GROUPS = [
  { key: 'scanner', label: '1. Scanner (卒業銘柄スクリーナー)', color: '#64d2ff' },
  { key: 'analyst', label: '2. Analyst (8レイヤー監査 & スコア)', color: '#ffd60a' },
  { key: 'social', label: '2b. Social (X 公開シグナル)', color: '#64d2ff' },
  { key: 'brain', label: '3. Brain (ポジションサイズ計算)', color: '#bf5af2' },
  { key: 'executor', label: '4. Executor (押し目エントリー & 利確)', color: '#00d35a' },
  { key: 'risk', label: '5. Risk (損切り & 日次損失停止)', color: '#ff6b9a' },
  { key: 'desk', label: 'Desk (基本設定 & 手数料)', color: '#ffffff' },
] as const;

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  changeLog,
  allTestsPassed,
  onUpdateSetting,
  onResetDefaults,
}) => {
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]['key']>('scanner');
  const [liveConfirmInput, setLiveConfirmInput] = useState('');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(SIGNUP_URL).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleSwitchToLive = () => {
    setLiveError(null);
    if (!allTestsPassed) {
      setLiveError('STEP 15 受入テスト（全11件）を通過してから LIVE へ切り替えてください。');
      return;
    }
    if (liveConfirmInput.trim() !== 'LIVE') {
      setLiveError('安全確認のため、入力欄に半角大文字で LIVE と入力してください。');
      return;
    }
    onUpdateSetting('mode', 'LIVE', 'me');
    setLiveConfirmInput('');
  };

  const groupMeta = SETTINGS_META.filter((m) => m.group === activeGroup);

  return (
    <div className="space-y-6">
      {/* Account & Mode Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mode Switcher (PAPER / LIVE) */}
        <section className="lg:col-span-6 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">取引モード切替 (STEP 13)</h2>
              <p className="text-xs text-[#ebebf5]/55 mt-0.5">
                PAPERでは最終Buyボタン押下直前で停止し実クォートで約定シミュレーションを行います。
              </p>
            </div>
            <span
              className={`text-xs font-mono-tabular font-bold ${
                settings.mode === 'PAPER' ? 'text-[#ff9f0a]' : 'text-[#00d35a]'
              }`}
            >
              現在: {settings.mode}
            </span>
          </div>

          {settings.mode === 'PAPER' ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={liveConfirmInput}
                  onChange={(e) => setLiveConfirmInput(e.target.value)}
                  placeholder='LIVE へ切替えるには "LIVE" と入力'
                  className="flex-1 bg-[#121214] border border-[#545458]/55 rounded-lg px-3 py-2 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
                />
                <button
                  type="button"
                  onClick={handleSwitchToLive}
                  className="px-4 py-2 text-xs font-semibold bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  LIVEへ切替
                </button>
              </div>
              {liveError && <p className="text-xs text-[#ff453a]">{liveError}</p>}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#121214] border border-[#00d35a]/40 rounded-xl p-3">
              <span className="text-xs text-[#00d35a]">
                LIVEモードが有効です（実際のBuy/Sellボタン操作を実行）
              </span>
              <button
                type="button"
                onClick={() => onUpdateSetting('mode', 'PAPER', 'me')}
                className="px-3 py-1.5 text-xs font-semibold bg-[#ff9f0a] text-black rounded-lg cursor-pointer whitespace-nowrap"
              >
                PAPERへ戻す
              </button>
            </div>
          )}

          {/* FOMO Profile & Account Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#545458]/35">
            <div>
              <label className="block text-[11px] text-[#ebebf5]/60 mb-1">FOMO ハンドル名</label>
              <input
                type="text"
                value={settings.fomo_handle}
                onChange={(e) => onUpdateSetting('fomo_handle', e.target.value, 'me')}
                className="w-full bg-[#121214] border border-[#545458]/50 rounded-lg px-3 py-1.5 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#ebebf5]/60 mb-1">Solana RPC URL (Layer 8必須)</label>
              <input
                type="text"
                value={settings.rpc_url}
                onChange={(e) => onUpdateSetting('rpc_url', e.target.value, 'me')}
                className="w-full bg-[#121214] border border-[#545458]/50 rounded-lg px-3 py-1.5 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
          </div>

          {/* 24-Hour Free Operation Schedule Controls */}
          <div className="pt-3 border-t border-[#545458]/35 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-white font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.always_on_24h}
                  onChange={(e) => onUpdateSetting('always_on_24h', e.target.checked, 'me')}
                  className="w-4 h-4 accent-[#00d35a] cursor-pointer"
                />
                <span>24時間自由稼働（時間制限・自動ロックなし）</span>
              </label>
              <span
                className={`text-[11px] font-mono-tabular font-semibold ${
                  settings.always_on_24h ? 'text-[#00d35a]' : 'text-[#ff9f0a]'
                }`}
              >
                {settings.always_on_24h ? '24/7 FREE' : `${settings.night_start}–${settings.lock_time}`}
              </span>
            </div>

            {!settings.always_on_24h && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] text-[#ebebf5]/55 mb-1">開始時刻</label>
                  <input
                    type="time"
                    value={settings.night_start}
                    onChange={(e) => onUpdateSetting('night_start', e.target.value, 'me')}
                    className="w-full bg-[#121214] border border-[#545458]/50 rounded-lg px-2.5 py-1 text-xs font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#ebebf5]/55 mb-1">新規停止時刻</label>
                  <input
                    type="time"
                    value={settings.lock_time === '24:00' ? '23:59' : settings.lock_time}
                    onChange={(e) => onUpdateSetting('lock_time', e.target.value, 'me')}
                    className="w-full bg-[#121214] border border-[#545458]/50 rounded-lg px-2.5 py-1 text-xs font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#ebebf5]/55 mb-1">定時レポート</label>
                  <input
                    type="time"
                    value={settings.report_time}
                    onChange={(e) => onUpdateSetting('report_time', e.target.value, 'me')}
                    className="w-full bg-[#121214] border border-[#545458]/50 rounded-lg px-2.5 py-1 text-xs font-mono-tabular text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <a
              href={profileUrl(settings.fomo_handle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0a84ff] hover:underline"
            >
              Your FOMO profile
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-1.5 text-[#ebebf5]/75 hover:text-white cursor-pointer"
            >
              {copiedInvite ? <Check className="w-3.5 h-3.5 text-[#00d35a]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedInvite ? '招待リンクをコピーしました' : '招待リンクをコピー (Invite a friend)'}
            </button>
          </div>
        </section>

        {/* Non-Negotiable Cursor Rules */}
        <section className="lg:col-span-6 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-[#ff9f0a]" />
              <h2 className="text-sm font-semibold text-white">カーソル安全ルール（コード強制・変更不可）</h2>
            </div>
            <div className="space-y-2.5">
              {CURSOR_RULES.map((item) => (
                <div key={item.rule} className="text-xs">
                  <span className="font-semibold text-white">{item.rule}: </span>
                  <span className="text-[#ebebf5]/65">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#545458]/35 flex items-center justify-between">
            <span className="text-xs text-[#ebebf5]/50">
              出金時は必ず確認画面で一時停止し、ユーザー本人の2FA承認が必要です。
            </span>
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ebebf5]/70 hover:text-white bg-[#2c2c2e] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              初期値へ戻す
            </button>
          </div>
        </section>
      </div>

      {/* STEP 12 Bot Parameter Sliders + Exact Numeric Fields */}
      <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#545458]/40 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">STEP 12 全ボット設定パラメータ</h2>
            <p className="text-xs text-[#ebebf5]/55 mt-0.5">
              すべての変更は min/max 検証を経て change_log に記録され、Windows出力コードにも即反映されます。
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-2 text-[#ebebf5]/75 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.social_enabled}
                onChange={(e) => onUpdateSetting('social_enabled', e.target.checked, 'me')}
                className="accent-[#64d2ff]"
              />
              Social (X検索 5要素目) を有効化
            </label>
          </div>
        </div>

        {/* Group Tabs */}
        <div className="px-5 pt-4 flex flex-wrap gap-1.5 border-b border-[#545458]/35 pb-3">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setActiveGroup(g.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeGroup === g.key
                  ? 'bg-[#2c2c2e] text-white'
                  : 'text-[#ebebf5]/55 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Parameter Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupMeta.map((meta) => {
            const val = Number(settings[meta.key]);
            return (
              <div
                key={meta.key}
                className="bg-[#141416] border border-[#545458]/35 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-white">{meta.label}</div>
                    <div className="text-[11px] text-[#ebebf5]/50 mt-0.5">{meta.description}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={val}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        if (!Number.isNaN(num) && meta.min !== undefined && meta.max !== undefined) {
                          const clamped = Math.max(meta.min, Math.min(meta.max, num));
                          onUpdateSetting(meta.key, clamped as never, 'me');
                        }
                      }}
                      className="w-20 bg-[#1c1c1e] border border-[#545458]/55 rounded-md px-2 py-1 text-right text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
                    />
                    {meta.unit && (
                      <span className="text-[11px] font-mono-tabular text-[#ebebf5]/45 w-7">
                        {meta.unit}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono-tabular text-[#ebebf5]/40">{meta.min}</span>
                  <input
                    type="range"
                    min={meta.min}
                    max={meta.max}
                    step={meta.step}
                    value={val}
                    onChange={(e) => onUpdateSetting(meta.key, Number(e.target.value) as never, 'me')}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono-tabular text-[#ebebf5]/40">{meta.max}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Change Log Table */}
      <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">設定変更履歴 (db.change_log)</h2>
        {changeLog.length === 0 ? (
          <p className="text-xs text-[#ebebf5]/45">まだ設定変更の記録はありません。</p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto divide-y divide-[#545458]/30 text-xs font-mono-tabular">
            {changeLog.slice(0, 30).map((entry) => (
              <div key={entry.id} className="py-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[#ebebf5]/40">
                    {new Date(entry.ts).toLocaleTimeString('ja-JP')}
                  </span>
                  <span className="text-white">{entry.key}</span>
                  <span className="text-[#ebebf5]/50">
                    {entry.oldVal} → <span className="text-[#00d35a]">{entry.newVal}</span>
                  </span>
                </div>
                <span className="text-[#ebebf5]/45">who={entry.who}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
