import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  Search,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { DeskSettings } from '../types/desk';
import {
  buildManualMarkdown,
  downloadManualMarkdown,
  MANUAL_SECTIONS,
} from '../engine/manualContent';
import { SIGNUP_URL, profileUrl } from '../engine/links';

type NavTarget = 'home' | 'bots' | 'activity' | 'settings' | 'windows' | 'manual';

interface ManualViewProps {
  settings: DeskSettings;
  onNavigate: (tab: NavTarget) => void;
  onDownloadZip: () => void;
}

export const ManualView: React.FC<ManualViewProps> = ({
  settings,
  onNavigate,
  onDownloadZip,
}) => {
  const [query, setQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('overview');
  const [copied, setCopied] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const matchingSectionIds = useMemo(() => {
    if (!normalizedQuery) return new Set(MANUAL_SECTIONS.map((s) => s.id));
    return new Set(
      MANUAL_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(normalizedQuery) ||
          s.summary.toLowerCase().includes(normalizedQuery) ||
          s.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
      ).map((s) => s.id)
    );
  }, [normalizedQuery]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildManualMarkdown(settings));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard denial in restricted iframes
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(`manual-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isVisible = (id: string) => matchingSectionIds.has(id);

  return (
    <div className="space-y-6">
      {/* Top Manual Header Card */}
      <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#00d35a]" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Overnight Desk 取扱説明書（操作マニュアル）
              </h2>
            </div>
            <p className="text-sm text-[#ebebf5]/65">
              実データ連携・5ボット自動売買パイプライン・リアルタイム収益グラフ・Windows導入手順までの完全ガイドです。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00d35a]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'コピー完了' : 'Markdownをコピー'}
            </button>
            <button
              type="button"
              onClick={() => downloadManualMarkdown(settings)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-[#e5e5ea] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              説明書をダウンロード (.md)
            </button>
          </div>
        </div>

        {/* Manual Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-[#545458]/35">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#ebebf5]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="説明書内を検索（例: 8レイヤー、損切り、LIVE、コマンド、Windows）"
              className="w-full bg-[#121214] border border-[#545458]/55 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#ebebf5]/40 focus:outline-none focus:border-[#0a84ff]"
            />
          </div>
          <span className="text-xs font-mono-tabular text-[#ebebf5]/50">
            表示セクション: {matchingSectionIds.size} / {MANUAL_SECTIONS.length}
          </span>
        </div>
      </section>

      {/* Main Layout: Sticky TOC + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table of Contents */}
        <aside className="lg:col-span-3 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-4 lg:sticky lg:top-20 space-y-1.5">
          <p className="px-2.5 py-1 text-xs font-semibold text-[#ebebf5]/55">目次</p>
          {MANUAL_SECTIONS.map((sec) => {
            const matched = isVisible(sec.id);
            const active = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                disabled={!matched}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-[#2c2c2e] text-white font-semibold'
                    : 'text-[#ebebf5]/70 hover:bg-[#242426] hover:text-white'
                }`}
              >
                <span className="font-mono-tabular text-[#00d35a] shrink-0">{sec.number}</span>
                <span className="truncate">{sec.title}</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-[#545458]/35 px-2.5 space-y-2 text-[11px] font-mono-tabular text-[#ebebf5]/55">
            <div className="flex items-center justify-between">
              <span>現在モード</span>
              <span className={settings.mode === 'PAPER' ? 'text-[#ff9f0a]' : 'text-[#00d35a]'}>
                {settings.mode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>稼働方式</span>
              <span className="text-white">{settings.always_on_24h ? '24h 自由' : '時間指定'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>損切り / 利確</span>
              <span className="text-white">
                -{settings.stop_pct}% / {settings.tp_x}x
              </span>
            </div>
          </div>
        </aside>

        {/* Manual Sections */}
        <div className="lg:col-span-9 space-y-6">
          {matchingSectionIds.size === 0 && (
            <div className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-10 text-center space-y-2">
              <p className="text-sm text-white font-medium">
                「{query}」に一致する項目が見つかりませんでした。
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-[#0a84ff] hover:underline cursor-pointer"
              >
                検索条件をクリアして全章を表示
              </button>
            </div>
          )}

          {/* Section 01: Overview */}
          {isVisible('overview') && (
            <section
              id="manual-sec-overview"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">01</span>
                  <h3 className="text-base font-bold text-white">アプリ概要・実データ連携</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline whitespace-nowrap cursor-pointer"
                >
                  ホームを開く
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm text-[#ebebf5]/80 leading-relaxed">
                Overnight Desk は、Solana PumpSwap 上の実銘柄を 5つの専用ボット（Scanner / Analyst / Brain / Executor / Risk）で自動監視・8レイヤー監査・ポジションサイズ計算・売買検証・リスク防衛する Windows デスクトップ取引コンソールです。時間制限のない <strong className="text-white">24時間自由稼働</strong> に対応し、初期状態では資金を消費しない安全な <strong className="text-[#ff9f0a]">PAPER（シミュレーション検証）モード</strong> で動作します。
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-semibold text-[#64d2ff]">PumpPortal WebSocket</div>
                  <p className="text-xs text-[#ebebf5]/65 leading-relaxed">
                    <span className="font-mono-tabular text-[#ebebf5]/85">wss://pumpportal.fun/api/data</span> に常時接続し、Pump.fun の新規発行と PumpSwap へのマイグレーションをリアルタイム検知します。
                  </p>
                </div>
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-semibold text-[#00d35a]">DexScreener Live API</div>
                  <p className="text-xs text-[#ebebf5]/65 leading-relaxed">
                    実価格・流動性・時価総額・5分/1時間出来高・売買件数を <span className="font-mono-tabular text-white">3秒ごと</span> に同期し、収益推移とリスク監視へ即時反映します。
                  </p>
                </div>
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-semibold text-[#ffd60a]">RugCheck Security API</div>
                  <p className="text-xs text-[#ebebf5]/65 leading-relaxed">
                    LP焼却/ロック率・インサイダー保有率・バンドル構成・既知のRug履歴を取得し、Analyst の8レイヤー監査に使用します。
                  </p>
                </div>
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="text-xs font-semibold text-[#bf5af2]">Solana Mainnet RPC</div>
                  <p className="text-xs text-[#ebebf5]/65 leading-relaxed">
                    Mint権限・Freeze権限の放棄状態および上位ホルダー集中度をオンチェーンから直接検証します。
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Section 02: Screens */}
          {isVisible('screens') && (
            <section
              id="manual-sec-screens"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">02</span>
                <h3 className="text-base font-bold text-white">画面構成と基本操作</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#545458]/45 text-[#ebebf5]/55">
                      <th className="py-2.5 pr-4 font-semibold whitespace-nowrap">画面</th>
                      <th className="py-2.5 pr-4 font-semibold">主な機能・操作</th>
                      <th className="py-2.5 font-semibold whitespace-nowrap text-right">移動</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#545458]/30 text-[#ebebf5]/80">
                    <tr>
                      <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">ホーム</td>
                      <td className="py-3 pr-4 leading-relaxed">
                        総評価額・バランス推移、3秒自動更新の「直近の収益傾向」折れ線グラフ（リアルタイム推移 / 取引別 +/- / 累積損益）、1クリックブラウザレーン、5ボット稼働状況、Windows基本UIコントロールを確認・操作します。
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('home')}
                          className="text-[#0a84ff] hover:underline cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">ボット</td>
                      <td className="py-3 pr-4 leading-relaxed">
                        5ボットごとの判定件数・直近20件の判断ログを表示。個別の一時停止/再開、およびデータソース別の即時スキャンを実行できます。
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('bots')}
                          className="text-[#0a84ff] hover:underline cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">アクティビティ</td>
                      <td className="py-3 pr-4 leading-relaxed">
                        約定・利確・損切り・除外の全履歴を一覧表示。行をクリックすると保有銘柄詳細（25%/50%/100%手動売却）や8レイヤー監査レポートが開きます。朝報レポート（STEP 14）もここから閲覧できます。
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('activity')}
                          className="text-[#0a84ff] hover:underline cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">設定</td>
                      <td className="py-3 pr-4 leading-relaxed">
                        STEP 12 全パラメータの調整、PAPER/LIVEモード切替、FOMOプロフィール・招待リンク確認、設定変更履歴（change_log）の確認を行います。
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('settings')}
                          className="text-[#0a84ff] hover:underline cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">Windows導入 & テスト</td>
                      <td className="py-3 pr-4 leading-relaxed">
                        STEP 15 受入テスト（11項目）の実行、STEP 11 コマンドコンソール操作、Windows 11 ローカル実行用ZIPファイルの中身プレビューと出力を行います。
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate('windows')}
                          className="text-[#0a84ff] hover:underline cursor-pointer"
                        >
                          開く
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1.5">
                <div className="text-xs font-semibold text-white">
                  リアルタイム収益傾向グラフの見方
                </div>
                <ul className="text-xs text-[#ebebf5]/70 space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong className="text-[#00d35a]">リアルタイム推移</strong>: 3秒ごとに実価格から再計算した純損益（確定＋含み）を時系列で描画します。`$0.00` より上は緑、下は赤で色分けされます。
                  </li>
                  <li>
                    <strong className="text-white">取引別 +/-</strong> と <strong className="text-white">累積損益</strong>: 取引ごとの損益バー/折れ線、および累積推移に切り替えて勝率や最大利益/最大損失を確認できます。
                  </li>
                  <li>
                    グラフ上の点にカーソルを合わせると詳細数値が表示され、クリックで該当ポジションのチャート・売却画面へ移動します。
                  </li>
                </ul>
              </div>
            </section>
          )}

          {/* Section 03: 5 Bots Pipeline */}
          {isVisible('bots') && (
            <section
              id="manual-sec-bots"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">03</span>
                  <h3 className="text-base font-bold text-white">5ボット自動売買パイプライン</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('bots')}
                  className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline whitespace-nowrap cursor-pointer"
                >
                  ボット画面へ
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-[#ebebf5]/70 leading-relaxed">
                購入注文は <strong className="text-white">Scanner → Analyst → Brain → Executor → Risk</strong> の5段階すべてを通過した銘柄にのみ発行されます。途中段階で1つでも基準に満たない場合は即時スキップ・除外されます。
              </p>

              <div className="space-y-3">
                {[
                  {
                    bot: 'Bot 1 · Scanner',
                    color: '#64d2ff',
                    role: 'PumpSwap 候補の一次フィルタ',
                    detail: `流動性 $${settings.min_liquidity_usd.toLocaleString()} 以上、Top10保有率 ${settings.scanner_max_top10_pct}% 以下、1h騰落率 +${settings.max_h1_change_pct}% 以下、経過時間 ${settings.min_pool_age_min}分以上、売買停止警告なしを通過条件とします。`,
                  },
                  {
                    bot: 'Bot 2 · Analyst + Social',
                    color: '#ffd60a',
                    role: '8レイヤー安全性監査 & 100点スコアリング',
                    detail: `①Mint権限放棄 ②Freeze権限放棄 ③Dev保有 ${settings.max_dev_pct}%未満＆Rug歴なし ④Top10 ${settings.analyst_max_top10_pct}%未満 ⑤LPロック ${settings.min_lp_locked_pct}%以上 ⑥プール経過時間 ⑦バンドル(${settings.max_bundled}未満)・インサイダー(15%未満) ⑧委任アカウント(${settings.max_delegated_accounts}以下) を検査。全通過後、スコア ${settings.min_score}点以上で合格します。`,
                  },
                  {
                    bot: 'Bot 3 · Brain',
                    color: '#bf5af2',
                    role: 'リスク逆算ポジションサイズ決定',
                    detail: `空き現金 × リスク比率(${settings.risk_per_trade_pct}%) ÷ 損切り幅(${settings.stop_pct}%) で基準額を算出。スコア ${settings.full_size_score}点未満は ${settings.below_full_pct}% に縮小し、流動性 ${settings.max_pool_pct}% 上限および $${settings.min_ticket_usd}〜$${settings.max_ticket_usd} 枠に収めます。`,
                  },
                  {
                    bot: 'Bot 4 · Executor',
                    color: '#00d35a',
                    role: '1クリックブラウザレーン実行 & 利確',
                    detail: `1度に1注文ずつ排他実行し、画面・API・オンチェーンの3点検証を実施。価格が ${settings.tp_x}x に達すると ${settings.tp_sell_pct}% を自動利確し、残玉へ -${settings.trail_pct}% トレールを設定します。`,
                  },
                  {
                    bot: 'Bot 5 · Risk',
                    color: '#ff6b9a',
                    role: '3秒監視による常時ストップ防衛',
                    detail: `損切り -${settings.stop_pct}%、高値から -${settings.trail_pct}% のトレール、${settings.timeout_h}時間経過で +${settings.timeout_min_gain_pct}% 未満のタイムアウト撤退、流動性80%急減やDev売却50%超を自動検知して全売却します。`,
                  },
                ].map((item) => (
                  <div
                    key={item.bot}
                    className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono-tabular" style={{ color: item.color }}>
                        {item.bot}
                      </span>
                      <span className="text-xs font-medium text-white">{item.role}</span>
                    </div>
                    <p className="text-xs text-[#ebebf5]/70 leading-relaxed">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 04: Windows Basic UI Controls */}
          {isVisible('controls') && (
            <section
              id="manual-sec-controls"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">04</span>
                <h3 className="text-base font-bold text-white">Windows 基本UI要素リファレンス</h3>
              </div>

              <p className="text-xs text-[#ebebf5]/70 leading-relaxed">
                ホーム画面の「Windows 基本UIコントロール」パネルに配置された各UI部品の役割です。
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'ラベル (Label)', desc: '現在の取引モード、空き現金、保有中ポジション数を読み取り専用で常時表示します。' },
                  { name: 'テキストボックス (TextBox)', desc: '任意の Solana 銘柄ティッカー（BONK等）または Mint アドレスを入力し、実データ検索して5ボット審査にかけます。' },
                  { name: 'コンボボックス (ComboBox)', desc: 'スキャン対象の実データソース（自動優先 / PumpPortal新着 / DexScreener急上昇 / 高流動性）を切り替えます。' },
                  { name: '数値入力ボックス (NumberBox)', desc: '損切りパーセンテージ（10〜45%）を直接変更し、変更履歴へ自動記録します。' },
                  { name: 'ラジオボタン (RadioButton)', desc: '「24時間自由稼働」と「時間帯指定稼働」を択一で切り替えます。' },
                  { name: 'チェックボックス (CheckBox)', desc: 'ブラウザ配信のプライベート保護（一時停止）および Social スコアの有効/無効をオン・オフします。' },
                  { name: 'プログレスバー (ProgressBar)', desc: '取引枠の使用進捗および STEP 15 受入テスト（11項目）の達成率を視覚化します。' },
                  { name: 'ボタン (Button)', desc: '「実データ取得」「24h稼働 ON/OFF」「安全停止（Risk保護維持）」をワンクリックで実行します。' },
                ].map((ctrl) => (
                  <div
                    key={ctrl.name}
                    className="bg-[#141416] border border-[#545458]/40 rounded-xl p-3.5 space-y-1"
                  >
                    <div className="font-semibold text-white">{ctrl.name}</div>
                    <p className="text-[#ebebf5]/65 leading-relaxed">{ctrl.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 05: Command Console */}
          {isVisible('commands') && (
            <section
              id="manual-sec-commands"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">05</span>
                  <h3 className="text-base font-bold text-white">コマンドコンソール操作一覧 (STEP 11)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('windows')}
                  className="inline-flex items-center gap-1 text-xs text-[#0a84ff] hover:underline whitespace-nowrap cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  コンソールを開く
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#545458]/45 text-[#ebebf5]/55">
                      <th className="py-2 pr-4 font-semibold whitespace-nowrap">入力コマンド</th>
                      <th className="py-2 font-semibold">実行内容</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#545458]/30 font-mono-tabular">
                    {[
                      { cmd: 'status', desc: '現在のモード、空き現金、総評価額、保有中ポジション一覧と FOMO リンクを表示' },
                      { cmd: 'why <SYMBOL>', desc: '指定銘柄の購入・除外理由と担当ボットの判定根拠を照会' },
                      { cmd: 'sell <SYMBOL> <25|50|100>', desc: '保有中銘柄を指定比率（25% / 50% / 100%）で即時売却' },
                      { cmd: 'pause <Bot名>', desc: 'Scanner / Analyst / Brain / Executor を一時停止（保有中の Risk は停止不可）' },
                      { cmd: 'resume <Bot名>', desc: '一時停止中のボットを再開' },
                      { cmd: 'set stop to -20%', desc: '損切りラインを指定値（10〜45%）へ変更し change_log へ記録' },
                      { cmd: 'withdraw <USD>', desc: 'Review 画面で安全停止し、配信を Paused・private に切替えて本人 2FA へ引渡し' },
                      { cmd: 'report', desc: 'アクティビティ画面の朝報レポート（STEP 14）を表示' },
                      { cmd: 'paper / live', desc: 'PAPER へ切替（LIVE 切替は安全確認のため設定画面へ案内）' },
                    ].map((row) => (
                      <tr key={row.cmd}>
                        <td className="py-2.5 pr-4 text-[#64d2ff] whitespace-nowrap">{row.cmd}</td>
                        <td className="py-2.5 font-sans text-[#ebebf5]/75">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 06: Windows 11 Installation */}
          {isVisible('windows') && (
            <section
              id="manual-sec-windows"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">06</span>
                  <h3 className="text-base font-bold text-white">Windows 11 ローカル導入手順</h3>
                </div>
                <button
                  type="button"
                  onClick={onDownloadZip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-black hover:bg-[#e5e5ea] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Windows版 (.zip) を取得
                </button>
              </div>

              <ol className="space-y-3 text-xs text-[#ebebf5]/80">
                <li className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">STEP 1. パッケージのダウンロードと展開</div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    画面右上の「Windows版を出力 (.zip)」から <span className="font-mono-tabular text-white">OvernightDesk-Windows.zip</span> を保存し、<span className="font-mono-tabular text-white">C:\OvernightDesk</span> などのフォルダへすべて展開します（本説明書 <span className="font-mono-tabular text-white">MANUAL_JP.md</span> も同梱されます）。
                  </p>
                </li>
                <li className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">STEP 2. 初回自動セットアップ（PowerShell）</div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    展開フォルダ内の <span className="font-mono-tabular text-[#64d2ff]">install_windows.ps1</span> を右クリックし「PowerShell で実行」をクリックします。Python 仮想環境（.venv）、依存パッケージ、Playwright Chromium、SQLite WAL データベース、デスクトップショートカットが自動構築されます。
                  </p>
                </li>
                <li className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">STEP 3. ワンクリック起動</div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    デスクトップの「Overnight Desk」または <span className="font-mono-tabular text-[#00d35a]">start_desk.bat</span> をダブルクリックします。ローカル限定 Chrome（<span className="font-mono-tabular">127.0.0.1:9222</span>）と 5ボット常駐プロセス（<span className="font-mono-tabular">http://127.0.0.1:8787</span>）が自動起動します。
                  </p>
                </li>
              </ol>
            </section>
          )}

          {/* Section 07: Safety & FAQ */}
          {isVisible('safety') && (
            <section
              id="manual-sec-safety"
              className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6 space-y-4 scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-sm font-bold text-[#00d35a]">07</span>
                <h3 className="text-base font-bold text-white">安全設計・LIVE切替条件・FAQ</h3>
              </div>

              <div className="bg-[#141416] border border-[#00d35a]/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00d35a]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>コードレベルで強制される安全保護</span>
                </div>
                <ul className="text-xs text-[#ebebf5]/75 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong className="text-white">LIVE 切替ゲート</strong>: STEP 15 受入テスト全11項目の PASS と、設定画面での大文字 <span className="font-mono-tabular text-white">LIVE</span> 明示入力の両方が必要です。
                  </li>
                  <li>
                    <strong className="text-white">危険操作の自動拒否</strong>: Withdraw / Deposit / Apple Pay / Send / Swap settings はブラウザ実行層でクリック不可に設定されています。
                  </li>
                  <li>
                    <strong className="text-white">Risk ボット停止ロック</strong>: ポジション保有中は、損切り監視が外れないよう Risk ボットを一時停止できません。
                  </li>
                  <li>
                    <strong className="text-white">FOMO リンク固定</strong>: すべての FOMO URL は <span className="font-mono-tabular text-[#64d2ff]">r=masakazu12</span> 付きで生成されます（プロフィール:{' '}
                    <a
                      href={profileUrl(settings.fomo_handle)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0a84ff] hover:underline inline-flex items-center gap-0.5"
                    >
                      @{settings.fomo_handle}
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    / 招待:{' '}
                    <a
                      href={SIGNUP_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0a84ff] hover:underline inline-flex items-center gap-0.5"
                    >
                      fomo.family/r/masakazu12
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    ）。
                  </li>
                </ul>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">
                    Q. 起動直後にポジションが増えないことがありますが正常ですか？
                  </div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    正常です。実データのみで動作しているため、8レイヤー監査やスコア基準（{settings.min_score}点以上）を満たさない銘柄は安全のため自動除外されます。ホーム画面のテキストボックスから任意の Solana 銘柄（例: BONK, WIF など）を直接検索して監査へ投入することも可能です。
                  </p>
                </div>
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">
                    Q. 設定やリアルタイム損益履歴は保存されますか？
                  </div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    はい。Webコンソールではブラウザのローカルストレージへ自動保存され、Windows ローカル版では <span className="font-mono-tabular text-white">data/desk.db</span>（SQLite WAL）に永続化されます。
                  </p>
                </div>
                <div className="bg-[#141416] border border-[#545458]/40 rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-white">
                    Q. 損切りや利確の基準を変えたい場合はどうすればよいですか？
                  </div>
                  <p className="text-[#ebebf5]/70 leading-relaxed">
                    「設定」画面のスライダー/数値入力、ホーム画面の数値ボックス、またはコマンドコンソールの <span className="font-mono-tabular text-[#64d2ff]">set stop to -20%</span> から変更できます。すべての変更は日時とともに <span className="font-mono-tabular text-white">change_log</span> へ記録されます。
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
