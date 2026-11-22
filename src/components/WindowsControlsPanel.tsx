import React, { useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Square,
  Type,
} from 'lucide-react';
import { CandidateToken, DeskSettings } from '../types/desk';
import { generateCandidateToken } from '../engine/marketFeed';

export type TestTokenProfile =
  | 'clean_high'
  | 'clean_mid'
  | 'scanner_kill_liq'
  | 'analyst_fail_bundle'
  | 'analyst_fail_dev'
  | 'shill_ring';

interface WindowsControlsPanelProps {
  settings: DeskSettings;
  engineRunning: boolean;
  privatePaused: boolean;
  tradesTonight: number;
  openPositionCount: number;
  passedTestsCount: number;
  onToggleEngine: () => void;
  onTogglePrivate: () => void;
  onUpdateSetting: <K extends keyof DeskSettings>(
    key: K,
    value: DeskSettings[K],
    who?: 'me' | 'telegram'
  ) => void;
  onRunCustomToken: (token: CandidateToken) => void;
  onPauseAllSafe: () => void;
}

const PROFILE_OPTIONS: Array<{ value: TestTokenProfile; label: string }> = [
  { value: 'clean_high', label: '優良銘柄（8/8通過・高スコア）' },
  { value: 'clean_mid', label: '中堅銘柄（スコア70〜79・半額サイズ）' },
  { value: 'scanner_kill_liq', label: '低流動性銘柄（Scanner除外テスト）' },
  { value: 'analyst_fail_bundle', label: 'バンドル不正銘柄（Layer 7 却下テスト）' },
  { value: 'analyst_fail_dev', label: 'ラグ履歴Dev銘柄（Layer 3 却下テスト）' },
  { value: 'shill_ring', label: 'シルリング検知銘柄（Brain半額テスト）' },
];

export const WindowsControlsPanel: React.FC<WindowsControlsPanelProps> = ({
  settings,
  engineRunning,
  privatePaused,
  tradesTonight,
  openPositionCount,
  passedTestsCount,
  onToggleEngine,
  onTogglePrivate,
  onUpdateSetting,
  onRunCustomToken,
  onPauseAllSafe,
}) => {
  const [symbolInput, setSymbolInput] = useState('WINBOT');
  const [memoInput, setMemoInput] = useState('24時間自由稼働テスト銘柄');
  const [selectedProfile, setSelectedProfile] = useState<TestTokenProfile>('clean_high');
  const [statusLabel, setStatusLabel] = useState(
    '待機中 — 各Windows UIコントロールから5ボットエンジンを直接操作できます。'
  );

  const tradeQuotaPct = Math.min(
    100,
    Math.round((tradesTonight / Math.max(1, settings.max_trades_night)) * 100)
  );
  const testPassPct = Math.round((passedTestsCount / 11) * 100);

  const handleExecuteCustom = () => {
    const cleanSym =
      symbolInput
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10) || 'WINBOT';
    const base = generateCandidateToken(selectedProfile);
    const customToken: CandidateToken = {
      ...base,
      symbol: cleanSym,
      name: memoInput.trim() ? `${cleanSym} (${memoInput.trim().slice(0, 18)})` : cleanSym,
    };
    onRunCustomToken(customToken);
    const profileLabel =
      PROFILE_OPTIONS.find((p) => p.value === selectedProfile)?.label ?? selectedProfile;
    setStatusLabel(
      `実行完了: ${cleanSym} [${profileLabel}] を Scanner → Analyst → Brain → Executor へ投入しました。`
    );
  };

  const handleClearInputs = () => {
    setSymbolInput('WINBOT');
    setMemoInput('');
    setSelectedProfile('clean_high');
    setStatusLabel('入力欄（テキストボックス・コンボボックス）を初期値にリセットしました。');
  };

  return (
    <section
      aria-label="Windows 基本UIコントロールパネル"
      className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl overflow-hidden"
    >
      {/* Windows Panel Header */}
      <div className="px-6 py-4 border-b border-[#545458]/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Windows クイック操作パネル（基本UIコントロール）
          </h2>
          <p className="text-xs text-[#ebebf5]/60 mt-0.5">
            ラベル・テキストボックス・コンボボックス・チェックボックス・ラジオボタン・数値入力・プログレスバー・ボタンでデスクを直接操作します
          </p>
        </div>
        <div className="text-xs font-mono-tabular text-[#ebebf5]/55">
          モード: <span className={settings.mode === 'PAPER' ? 'text-[#ff9f0a]' : 'text-[#00d35a]'}>{settings.mode}</span> · 保有 {openPositionCount}件
        </div>
      </div>

      {/* Control Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Label (Status Display) — full width top banner inside panel */}
        <div className="lg:col-span-12 bg-[#141416] border border-[#545458]/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Type className="w-4 h-4 text-[#64d2ff] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">
                ラベル (Label) — ステータス・操作結果表示
              </div>
              <p className="text-xs text-[#ebebf5]/85 font-mono-tabular mt-1 break-words">
                {statusLabel}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-[#ebebf5]/50 shrink-0">
            機能: 読み取り専用の現在状態や処理結果をユーザーへ通知します
          </span>
        </div>

        {/* 2. TextBox & ComboBox (Left 6 cols) */}
        <div className="lg:col-span-6 bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-4">
          {/* TextBox 1 */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <label htmlFor="win-textbox-symbol" className="text-xs font-semibold text-white">
                テキストボックス (TextBox) — 銘柄シンボル入力
              </label>
              <span className="text-[11px] text-[#ebebf5]/45">英数字 最大10文字</span>
            </div>
            <input
              id="win-textbox-symbol"
              type="text"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              placeholder="例: KURO, SHIBU, WINBOT"
              className="w-full bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-3 py-2 text-xs font-mono-tabular text-white placeholder:text-[#ebebf5]/35 focus:outline-none focus:border-[#0a84ff]"
            />
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: 任意のテキスト（銘柄名やテスト用ティッカー）をキーボードから入力します。
            </p>
          </div>

          {/* TextBox 2 (Memo) */}
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

          {/* ComboBox */}
          <div>
            <label htmlFor="win-combobox-profile" className="block text-xs font-semibold text-white mb-1.5">
              コンボボックス (ComboBox / Dropdown) — 銘柄プロファイル選択
            </label>
            <div className="relative">
              <select
                id="win-combobox-profile"
                value={selectedProfile}
                onChange={(e) => {
                  const val = e.target.value as TestTokenProfile;
                  setSelectedProfile(val);
                  const found = PROFILE_OPTIONS.find((o) => o.value === val);
                  setStatusLabel(`コンボボックス変更: 「${found?.label ?? val}」を選択しました。`);
                }}
                className="w-full appearance-none bg-[#1c1c1e] border border-[#545458]/60 rounded-lg px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-[#0a84ff] cursor-pointer"
              >
                {PROFILE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1c1c1e] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#ebebf5]/50 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: 定義済みの候補リストから1つの条件（優良・低流動性・バンドル不正など）を選択します。
            </p>
          </div>
        </div>

        {/* 3. CheckBox, RadioButton, NumericUpDown & ProgressBar (Right 6 cols) */}
        <div className="lg:col-span-6 bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-4">
          {/* CheckBoxes */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-2">
              <CheckSquare className="w-3.5 h-3.5 text-[#00d35a]" />
              <span>チェックボックス (CheckBox) — 機能オプションのON/OFF</span>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.social_enabled}
                  onChange={(e) => {
                    onUpdateSetting('social_enabled', e.target.checked, 'me');
                    setStatusLabel(
                      `チェックボックス変更: Social (X検索) を ${e.target.checked ? '有効' : '無効'} にしました。`
                    );
                  }}
                  className="w-4 h-4 accent-[#0a84ff] rounded cursor-pointer"
                />
                <span>Social (X公開検索・重み0.5) をスコア計算に含める</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={privatePaused}
                  onChange={() => {
                    onTogglePrivate();
                    setStatusLabel(
                      `チェックボックス変更: ブラウザ画面のプライバシー保護を ${!privatePaused ? '有効' : '解除'} にしました。`
                    );
                  }}
                  className="w-4 h-4 accent-[#ff9f0a] rounded cursor-pointer"
                />
                <span>ライブ画面のプライバシー保護（Paused · private）を有効にする</span>
              </label>
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1.5">
              機能: 複数の独立した設定項目をそれぞれチェックの有無でオン・オフ切替します。
            </p>
          </div>

          {/* RadioButtons */}
          <div className="pt-3 border-t border-[#545458]/30">
            <div className="text-xs font-semibold text-white mb-2">
              ラジオボタン (RadioButton) — 監視実行モード切替
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="radio"
                  name="win-run-mode"
                  checked={!engineRunning}
                  onChange={() => {
                    if (engineRunning) onToggleEngine();
                    setStatusLabel('ラジオボタン変更: 手動テスト待機モードに切り替えました。');
                  }}
                  className="w-3.5 h-3.5 accent-[#0a84ff] cursor-pointer"
                />
                <span>手動テスト待機</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[#ebebf5]/85 cursor-pointer select-none">
                <input
                  type="radio"
                  name="win-run-mode"
                  checked={engineRunning}
                  onChange={() => {
                    if (!engineRunning) onToggleEngine();
                    setStatusLabel('ラジオボタン変更: 24時間自由稼働モードを開始しました。');
                  }}
                  className="w-3.5 h-3.5 accent-[#00d35a] cursor-pointer"
                />
                <span>24時間自動監視（時間制限なし · 自動スキャン & Risk常時稼働）</span>
              </label>
            </div>
            <p className="text-[11px] text-[#ebebf5]/55 mt-1">
              機能: 排他的な選択肢の中から必ず1つの動作モードを選択します。
            </p>
          </div>

          {/* NumericUpDown & ProgressBar */}
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
            クリックをトリガーに「5ボット実行」「入力初期化」「全ボット安全停止」の各アクションを発火します。
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearInputs}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              入力をリセット
            </button>

            <button
              type="button"
              onClick={() => {
                onPauseAllSafe();
                setStatusLabel(
                  openPositionCount > 0
                    ? '安全停止: Scanner〜Executorを一時停止しました（Riskはポジション保有中のため継続稼働）。'
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
              onClick={handleExecuteCustom}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#00d35a] hover:bg-[#1be06d] text-black rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              入力内容でテスト銘柄を投入
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
