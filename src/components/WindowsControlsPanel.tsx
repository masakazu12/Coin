import React, { useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  Globe,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Square,
  Type,
} from 'lucide-react';
import { DeskSettings } from '../types/desk';
import { LiveFeedSource } from '../engine/marketFeed';

interface WindowsControlsPanelProps {
  settings: DeskSettings;
  engineRunning: boolean;
  privatePaused: boolean;
  tradesTonight: number;
  openPositionCount: number;
  passedTestsCount: number;
  scanningLive: boolean;
  onToggleEngine: () => void;
  onTogglePrivate: () => void;
  onUpdateSetting: <K extends keyof DeskSettings>(
    key: K,
    value: DeskSettings[K],
    who?: 'me' | 'telegram'
  ) => void;
  onLookupRealToken: (query: string) => Promise<{ ok: boolean; message: string }>;
  onScanRealSource: (source: LiveFeedSource) => Promise<{ count: number; error?: string }>;
  onPauseAllSafe: () => void;
}

const SOURCE_OPTIONS: Array<{ value: LiveFeedSource; label: string }> = [
  { value: 'auto', label: '自動統合（PumpPortal卒業 + DexScreener最新）' },
  { value: 'pumpportal', label: 'PumpPortal 卒業ストリーム優先' },
  { value: 'boosts', label: 'DexScreener 最新ブースト銘柄 (Solana)' },
  { value: 'profiles', label: 'DexScreener 最新登録プロフィール (Solana)' },
  { value: 'pumpswap', label: 'PumpSwap ペア検索上位 (Solana)' },
];

export const WindowsControlsPanel: React.FC<WindowsControlsPanelProps> = ({
  settings,
  engineRunning,
  privatePaused,
  tradesTonight,
  openPositionCount,
  passedTestsCount,
  scanningLive,
  onToggleEngine,
  onTogglePrivate,
  onUpdateSetting,
  onLookupRealToken,
  onScanRealSource,
  onPauseAllSafe,
}) => {
  const [queryInput, setQueryInput] = useState('BONK');
  const [memoInput, setMemoInput] = useState('実データ監査メモ');
  const [selectedSource, setSelectedSource] = useState<LiveFeedSource>('auto');
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState(
    '実データ接続待機 — Solanaの実Mintアドレスまたはシンボルを入力し、DexScreener + RugCheck + Solana RPC で即時監査できます。'
  );

  const tradeQuotaPct = Math.min(
    100,
    Math.round((tradesTonight / Math.max(1, settings.max_trades_night)) * 100)
  );
  const testPassPct = Math.round((passedTestsCount / 11) * 100);

  const handleLookupAndRun = async () => {
    const q = queryInput.trim();
    if (!q) {
      setStatusLabel('エラー: テキストボックスに Solana Mint アドレスまたは銘柄シンボルを入力してください。');
      return;
    }
    setBusy(true);
    setStatusLabel(`実データ照会中: "${q}" を DexScreener / RugCheck / Solana RPC で検証しています...`);
    const res = await onLookupRealToken(q);
    setBusy(false);
    setStatusLabel(
      memoInput.trim() ? `${res.message}（メモ: ${memoInput.trim()}）` : res.message
    );
  };

  const handleScanSource = async () => {
    setBusy(true);
    const label = SOURCE_OPTIONS.find((o) => o.value === selectedSource)?.label ?? selectedSource;
    setStatusLabel(`実データスキャン中: ${label} から最新Solana銘柄を取得しています...`);
    const res = await onScanRealSource(selectedSource);
    setBusy(false);
    if (res.error) {
      setStatusLabel(`取得エラー: ${res.error}`);
    } else if (res.count === 0) {
      setStatusLabel('新規の未処理Solana銘柄は見つかりませんでした（既存監視対象のみ）。');
    } else {
      setStatusLabel(`実データ取得完了: ${res.count}件の実Solana銘柄を5ボットパイプラインへ投入しました。`);
    }
  };

  const handleClearInputs = () => {
    setQueryInput('');
    setMemoInput('');
    setSelectedSource('auto');
    setStatusLabel('入力欄（テキストボックス・コンボボックス）をクリアしました。');
  };

  return (
    <section
      aria-label="Windows 基本UIコントロールパネル"
      className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl overflow-hidden"
    >
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-[#545458]/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Windows クイック操作パネル（実データ直結コントロール）
          </h2>
          <p className="text-xs text-[#ebebf5]/60 mt-0.5">
            ラベル・テキストボックス・コンボボックス・チェックボックス・ラジオボタン・数値入力・プログレスバー・ボタンで実Solanaデータを直接操作します
          </p>
        </div>
        <div className="text-xs font-mono-tabular text-[#ebebf5]/55">
          モード: <span className={settings.mode === 'PAPER' ? 'text-[#ff9f0a]' : 'text-[#00d35a]'}>{settings.mode}</span> · 保有 {openPositionCount}件
        </div>
      </div>

      {/* Control Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Label */}
        <div className="lg:col-span-12 bg-[#141416] border border-[#545458]/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Type className="w-4 h-4 text-[#64d2ff] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">
                ラベル (Label) — リアルタイムAPI応答・操作結果表示
              </div>
              <p className="text-xs text-[#ebebf5]/85 font-mono-tabular mt-1 break-words">
                {statusLabel}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-[#ebebf5]/50 shrink-0">
            機能: 読み取り専用の現在状態や実API照会結果を表示します
          </span>
        </div>

        {/* 2. TextBox & ComboBox */}
        <div className="lg:col-span-6 bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <label htmlFor="win-textbox-query" className="text-xs font-semibold text-white">
                テキストボックス (TextBox) — 実Solana銘柄シンボル / Mintアドレス指定
              </label>
              <span className="text-[11px] text-[#ebebf5]/45">DexScreener + RugCheck直結</span>
            </div>
            <input
              id="win-textbox-query"
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="例: WIF / POPCAT / DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
              className="w-full bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-3 py-2 text-xs font-mono-tabular text-white placeholder:text-[#ebebf5]/35 focus:outline-none focus:border-[#0a84ff]"
            />
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: 任意のSolana銘柄シンボルまたはMintアドレスを入力して実オンチェーン監査を実行します。
            </p>
          </div>

          <div>
            <label htmlFor="win-textbox-memo" className="block text-xs font-semibold text-white mb-1.5">
              テキストボックス (TextBox) — 監視メモ入力
            </label>
            <input
              id="win-textbox-memo"
              type="text"
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="例: 24時間監視用メモ"
              className="w-full bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#ebebf5]/35 focus:outline-none focus:border-[#0a84ff]"
            />
          </div>

          <div>
            <label htmlFor="win-combobox-source" className="block text-xs font-semibold text-white mb-1.5">
              コンボボックス (ComboBox / Dropdown) — 実データ取得フィード選択
            </label>
            <div className="relative">
              <select
                id="win-combobox-source"
                value={selectedSource}
                onChange={(e) => {
                  const val = e.target.value as LiveFeedSource;
                  setSelectedSource(val);
                  const found = SOURCE_OPTIONS.find((o) => o.value === val);
                  setStatusLabel(`コンボボックス変更: 取得フィードを「${found?.label ?? val}」に切り替えました。`);
                }}
                className="w-full appearance-none bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-[#0a84ff] cursor-pointer"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1c1c1e] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#ebebf5]/50 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: PumpPortal WebSocket や DexScreener API の取得対象ソースを選択します。
            </p>
          </div>
        </div>

        {/* 3. CheckBox, RadioButton, NumberBox & ProgressBar */}
        <div className="lg:col-span-6 bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-[#00d35a]" />
              <span>チェックボックス (CheckBox) — 機能オプションのON/OFF</span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.always_on_24h}
                  onChange={(e) => {
                    onUpdateSetting('always_on_24h', e.target.checked, 'me');
                    setStatusLabel(
                      `チェックボックス変更: 24時間自由稼働を ${e.target.checked ? '有効' : '時間帯指定'} にしました。`
                    );
                  }}
                  className="w-4 h-4 accent-[#00d35a] rounded cursor-pointer"
                />
                <span>24時間自由稼働（時間制限・自動ロックなし）</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={privatePaused}
                  onChange={() => {
                    onTogglePrivate();
                    setStatusLabel(
                      `チェックボックス変更: ライブブラウザ画面のプライバシー保護を ${!privatePaused ? '有効' : '解除'} にしました。`
                    );
                  }}
                  className="w-4 h-4 accent-[#ff9f0a] rounded cursor-pointer"
                />
                <span>ライブ画面のプライバシー保護（Paused · private）を有効にする</span>
              </label>
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1.5">
              機能: 複数の独立した稼働オプションをチェックの有無でオン・オフ切替します。
            </p>
          </div>

          <div className="pt-3 border-t border-[#545458]/30">
            <div className="text-xs font-semibold text-white mb-2">
              ラジオボタン (RadioButton) — 実データ監視モード切替
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="radio"
                  name="win-run-mode"
                  checked={!engineRunning}
                  onChange={() => {
                    if (engineRunning) onToggleEngine();
                    setStatusLabel('ラジオボタン変更: 手動スキャン待機モードに切り替えました。');
                  }}
                  className="w-3.5 h-3.5 accent-[#0a84ff] cursor-pointer"
                />
                <span>手動スキャン待機</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="radio"
                  name="win-run-mode"
                  checked={engineRunning}
                  onChange={() => {
                    if (!engineRunning) onToggleEngine();
                    setStatusLabel('ラジオボタン変更: 24時間実データ自動監視モードを開始しました。');
                  }}
                  className="w-3.5 h-3.5 accent-[#00d35a] cursor-pointer"
                />
                <span>24時間自動監視（実価格5秒ポーリング & 自動スキャン）</span>
              </label>
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: 排他的な選択肢の中から稼働方式を1つ選択します。
            </p>
          </div>

          <div className="pt-3 border-t border-[#545458]/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="win-num-ticket"
                className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-[#bf5af2]" />
                <span>数値入力 (NumberBox)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="win-num-ticket"
                  type="number"
                  min={5}
                  max={500}
                  step={5}
                  value={settings.max_ticket_usd}
                  onChange={(e) => {
                    const num = Math.max(5, Math.min(500, Number(e.target.value) || 5));
                    onUpdateSetting('max_ticket_usd', num, 'me');
                    setStatusLabel(`数値入力変更: 最大チケット額 (max_ticket_usd) を $${num} に設定しました。`);
                  }}
                  className="w-24 bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-2.5 py-1.5 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
                />
                <span className="text-xs font-mono-tabular text-[#ebebf5]/55">USD (最大購入額)</span>
              </div>
              <p className="text-[11px] text-[#ebebf5]/55 mt-1">
                機能: 範囲制限付きの数値を安全に入力・増減します。
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00d35a]" />
                  プログレスバー (ProgressBar)
                </span>
                <span className="font-mono-tabular text-[11px] text-[#ebebf5]/65">
                  取引 {tradesTonight}/{settings.max_trades_night} · テスト {passedTestsCount}/11
                </span>
              </div>
              <div className="space-y-2">
                <div className="w-full h-2 bg-[#2c2c2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0a84ff] transition-all duration-300"
                    style={{ width: `${tradeQuotaPct}%` }}
                  />
                </div>
                <div className="w-full h-2 bg-[#2c2c2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00d35a] transition-all duration-300"
                    style={{ width: `${testPassPct}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#ebebf5]/55 mt-1">
                機能: 24時間取引上限の消化率と受入テスト通過率を視覚化します。
              </p>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons Row */}
        <div className="lg:col-span-12 pt-1 flex flex-wrap items-center justify-between gap-4 border-t border-[#545458]/35">
          <div className="text-xs text-[#ebebf5]/60">
            <span className="font-semibold text-white">ボタン (Button):</span>{' '}
            実データの照会・スキャン実行・入力クリア・安全停止の各処理を発火します。
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearInputs}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              入力クリア
            </button>

            <button
              type="button"
              onClick={() => {
                onPauseAllSafe();
                setStatusLabel(
                  openPositionCount > 0
                    ? '安全停止: Scanner〜Executorを一時停止しました（Riskは保有中のため継続稼働）。'
                    : '安全停止: 全ボットを一時停止しました。'
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ff453a] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              全ボット安全停止
            </button>

            <button
              type="button"
              disabled={busy || scanningLive}
              onClick={handleScanSource}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#64d2ff] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5" />
              {busy || scanningLive ? '実データ取得中...' : '選択フィードを実スキャン'}
            </button>

            <button
              type="button"
              disabled={busy || scanningLive}
              onClick={handleLookupAndRun}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#00d35a] hover:bg-[#1be06d] text-black rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              指定銘柄を実データ監査
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
