import { DeskSettings, SettingMetadata } from '../types/desk';

export const DEFAULT_SETTINGS: DeskSettings = {
  // Scanner
  min_liquidity_usd: 20000,
  scanner_max_top10_pct: 25,
  max_h1_change_pct: 200,
  scanner_poll_s: 60,
  min_pool_age_min: 10,
  max_wait_min: 60,
  runner_h24_pct: 300,
  min_holders_growth_pct: 0,

  // Analyst
  max_dev_pct: 5,
  analyst_max_top10_pct: 25,
  min_lp_locked_pct: 99,
  max_bundled: 5,
  max_delegated_accounts: 10,
  analyst_retries: 3,
  min_score: 70,
  alive_volume_h1: 25000,
  fast_curve_min: 10,
  max_fresh_pct: 50,
  organic_unique_h1: 80,
  organic_buys_h1: 150,
  bundled_penalty: 0.5,
  flush_sell_ratio: 1.5,
  chase_h1_pct: 200,

  // Social
  social_weight: 0.5,
  social_max_per_h: 20,
  social_timeout_s: 120,
  shill_cut: 0.5,
  social_enabled: true,

  // Brain
  risk_per_trade_pct: 3,
  full_size_score: 80,
  below_full_pct: 50,
  max_pool_pct: 2,
  min_ticket_usd: 2,
  max_ticket_usd: 50,
  max_trades_night: 30,

  // Executor
  dip_pct: 15,
  dip_window_min: 10,
  dip_wait_min: 30,
  crash_pct: 35,
  tp_x: 2.0,
  tp_sell_pct: 50,
  trail_pct: 40,
  recheck_liq_drop_pct: 20,
  recheck_price_up_pct: 15,
  quote_timeout_s: 10,
  verify_timeout_s: 30,

  // Risk
  risk_poll_s: 5,
  stop_pct: 25,
  timeout_h: 3,
  timeout_min_gain_pct: 5,
  night_loss_stop_pct: 30,

  // Desk
  mode: 'PAPER',
  paper_start_cash: 36,
  always_on_24h: true,
  night_start: '00:00',
  lock_time: '24:00',
  report_time: '08:00',
  notifier: 'telegram',
  fomo_handle: 'masakazu12',
  withdraw_address: '',
  rpc_url: 'https://api.mainnet-beta.solana.com',
  push_rejects: false,
  fee_pct: 0.45,
};

export const SETTINGS_META: SettingMetadata[] = [
  // Scanner
  { key: 'min_liquidity_usd', group: 'scanner', label: '最小流動性 (min_liquidity_usd)', description: 'PumpSwapプールの最低流動性。これ未満は即除外。', type: 'number', min: 5000, max: 200000, step: 1000, unit: 'USD' },
  { key: 'scanner_max_top10_pct', group: 'scanner', label: 'Top10保有上限 (max_top10_pct)', description: '上位10ウォレットの合計保有率上限。', type: 'number', min: 5, max: 60, step: 1, unit: '%' },
  { key: 'max_h1_change_pct', group: 'scanner', label: '1時間上昇率上限 (max_h1_change_pct)', description: '過熱追随を防ぐ1h変化率の上限。', type: 'number', min: 50, max: 600, step: 10, unit: '%' },
  { key: 'scanner_poll_s', group: 'scanner', label: 'スキャン間隔 (poll_s)', description: '待機ルームのDexScreenerバッチ監視間隔。', type: 'number', min: 15, max: 180, step: 5, unit: '秒' },
  { key: 'min_pool_age_min', group: 'scanner', label: '最低プール経過時間 (min_pool_age_min)', description: '卒業後の待機時間。クリア後にAnalystへ送出。', type: 'number', min: 1, max: 60, step: 1, unit: '分' },
  { key: 'max_wait_min', group: 'scanner', label: '最大待機時間 (max_wait_min)', description: 'この時間を超えて通過しない銘柄は待機ルームから削除。', type: 'number', min: 15, max: 240, step: 5, unit: '分' },
  { key: 'runner_h24_pct', group: 'scanner', label: 'コピーキャット判定基準 (runner_h24_pct)', description: '24h上昇率がこの値以上の銘柄をランナーとして類似名を除外。', type: 'number', min: 100, max: 1000, step: 50, unit: '%' },
  { key: 'min_holders_growth_pct', group: 'scanner', label: 'ホルダー増加率下限 (min_holders_growth_pct)', description: '直近10分間のホルダー増減率の下限。', type: 'number', min: -20, max: 50, step: 1, unit: '%' },

  // Analyst
  { key: 'max_dev_pct', group: 'analyst', label: 'Dev保有率上限 (max_dev_pct)', description: 'Layer 3: 作成者の保有率上限。', type: 'number', min: 1, max: 20, step: 0.5, unit: '%' },
  { key: 'analyst_max_top10_pct', group: 'analyst', label: 'Top10保有上限 (max_top10_pct)', description: 'Layer 4: RPC getTokenLargestAccountsの上位10比率。', type: 'number', min: 5, max: 60, step: 1, unit: '%' },
  { key: 'min_lp_locked_pct', group: 'analyst', label: 'LP焼却/ロック下限 (min_lp_locked_pct)', description: 'Layer 5: LPのロックまたはバーン比率下限。', type: 'number', min: 80, max: 100, step: 1, unit: '%' },
  { key: 'max_bundled', group: 'analyst', label: '最大バンドル群 (max_bundled)', description: 'Layer 7: 資金関係で接続された最大ウォレット群の上限。', type: 'number', min: 2, max: 20, step: 1, unit: '件' },
  { key: 'max_delegated_accounts', group: 'analyst', label: '委任アカウント上限 (max_delegated_accounts)', description: 'Layer 8: Token/Token-2022委任アカウント数の上限。', type: 'number', min: 0, max: 50, step: 1, unit: '件' },
  { key: 'min_score', group: 'analyst', label: '通過スコア下限 (min_score)', description: '8レイヤー全通過後に必要な総合スコア（0–100）。', type: 'number', min: 50, max: 95, step: 1, unit: '点' },
  { key: 'alive_volume_h1', group: 'analyst', label: '出来高基準 (alive_volume_h1)', description: 'Aliveスコア満点となる1h出来高。', type: 'number', min: 5000, max: 100000, step: 2500, unit: 'USD' },
  { key: 'fast_curve_min', group: 'analyst', label: '急卒業ペナルティ閾値 (fast_curve_min)', description: 'この分数未満で卒業した場合はOrganicスコア×0.5。', type: 'number', min: 1, max: 30, step: 1, unit: '分' },
  { key: 'max_fresh_pct', group: 'analyst', label: '新規ウォレット比率上限 (max_fresh_pct)', description: '上位20ホルダーの新規ウォレット比率がこの値以上で×0.5。', type: 'number', min: 10, max: 90, step: 5, unit: '%' },
  { key: 'organic_unique_h1', group: 'analyst', label: 'ユニーク買い手基準 (organic_unique_h1)', description: 'Organicスコア満点となる1hユニーク購入者数。', type: 'number', min: 20, max: 300, step: 10, unit: '人' },
  { key: 'flush_sell_ratio', group: 'analyst', label: '売り枯れ比率上限 (flush_sell_ratio)', description: '5mユニーク売り/買い比率の閾値。', type: 'number', min: 1.0, max: 3.0, step: 0.1, unit: 'x' },
  { key: 'chase_h1_pct', group: 'analyst', label: '追随ペナルティ基準 (chase_h1_pct)', description: 'Chaseスコア算出の1h上昇率分母。', type: 'number', min: 50, max: 500, step: 10, unit: '%' },

  // Social
  { key: 'social_weight', group: 'social', label: 'ソーシャル重み (social_weight)', description: 'スコア5要素目のソーシャル比重（基本4要素に対し0.5）。', type: 'number', min: 0, max: 2, step: 0.1, unit: 'w' },
  { key: 'social_max_per_h', group: 'social', label: '1時間最大調査数 (social_max_per_h)', description: '8/8通過銘柄に対する1時間あたり最大X調査回数。', type: 'number', min: 1, max: 60, step: 1, unit: '回' },
  { key: 'social_timeout_s', group: 'social', label: 'タイムアウト (social_timeout_s)', description: '無応答時はsocial=nullとして買いを止めない。', type: 'number', min: 15, max: 300, step: 15, unit: '秒' },
  { key: 'shill_cut', group: 'social', label: 'シルリング減額閾値 (shill_cut)', description: 'shill比率がこの値以上でBrainが投入額を半減。', type: 'number', min: 0.1, max: 1.0, step: 0.05, unit: '' },

  // Brain
  { key: 'risk_per_trade_pct', group: 'brain', label: '1トレード許容損失 (risk_per_trade_pct)', description: '総資産に対する1回の損切り許容割合（stop 25%で投入12%）。', type: 'number', min: 0.5, max: 10, step: 0.5, unit: '%' },
  { key: 'full_size_score', group: 'brain', label: 'フルサイズ基準スコア (full_size_score)', description: 'このスコア以上でフルサイズ、未満はbelow_full_pct適用。', type: 'number', min: 70, max: 98, step: 1, unit: '点' },
  { key: 'below_full_pct', group: 'brain', label: '低スコア時サイズ比率 (below_full_pct)', description: 'full_size_score未満のときの投入比率。', type: 'number', min: 10, max: 100, step: 5, unit: '%' },
  { key: 'max_pool_pct', group: 'brain', label: 'プール流動性上限 (max_pool_pct)', description: '薄い板を動かさないためのプール流動性上限比率。', type: 'number', min: 0.5, max: 5, step: 0.5, unit: '%' },
  { key: 'min_ticket_usd', group: 'brain', label: '最小チケット額 (min_ticket_usd)', description: 'FOMO最小購入額（$2未満はスキップ）。', type: 'number', min: 2, max: 20, step: 1, unit: 'USD' },
  { key: 'max_ticket_usd', group: 'brain', label: '最大チケット額 (max_ticket_usd)', description: '1銘柄あたりの最大購入上限額。', type: 'number', min: 5, max: 500, step: 5, unit: 'USD' },
  { key: 'max_trades_night', group: 'brain', label: '24時間最大取引回数 (max_trades_night)', description: '24時間あたりの新規購入回数の上限。', type: 'number', min: 1, max: 100, step: 1, unit: '回' },

  // Executor
  { key: 'dip_pct', group: 'executor', label: '押し目待機幅 (dip_pct)', description: '直近10分高値からの押し目エントリー条件。', type: 'number', min: 5, max: 30, step: 1, unit: '%' },
  { key: 'dip_window_min', group: 'executor', label: '高値参照ウィンドウ (dip_window_min)', description: '押し目基準となる高値参照期間。', type: 'number', min: 5, max: 30, step: 1, unit: '分' },
  { key: 'dip_wait_min', group: 'executor', label: '押し目最大待機 (dip_wait_min)', description: 'この時間内に押し目が来なければスキップ。', type: 'number', min: 5, max: 90, step: 5, unit: '分' },
  { key: 'crash_pct', group: 'executor', label: 'クラッシュ除外幅 (crash_pct)', description: '高値からこの割合超の下落は押し目ではなく暴落として除外。', type: 'number', min: 20, max: 60, step: 1, unit: '%' },
  { key: 'tp_x', group: 'executor', label: '利確倍率 (tp_x)', description: '初回部分利確の到達倍率。', type: 'number', min: 1.3, max: 5.0, step: 0.1, unit: 'x' },
  { key: 'tp_sell_pct', group: 'executor', label: '初回利確売却率 (tp_sell_pct)', description: 'tp_x到達時に売却する割合。', type: 'number', min: 25, max: 100, step: 5, unit: '%' },
  { key: 'trail_pct', group: 'executor', label: 'トレーリング幅 (trail_pct)', description: '初回利確後、ピーク価格からこの割合下落で全量売却。', type: 'number', min: 15, max: 60, step: 5, unit: '%' },
  { key: 'recheck_liq_drop_pct', group: 'executor', label: '直前流動性低下ガード (recheck_liq_drop_pct)', description: '購入クリック直前の流動性低下スキップ閾値。', type: 'number', min: 5, max: 50, step: 5, unit: '%' },
  { key: 'recheck_price_up_pct', group: 'executor', label: '直前急騰ガード (recheck_price_up_pct)', description: 'Analyst通過後からクリック直前までの急騰スキップ閾値。', type: 'number', min: 5, max: 50, step: 1, unit: '%' },

  // Risk
  { key: 'risk_poll_s', group: 'risk', label: '監視ポーリング間隔 (poll_s)', description: '保有ポジションの価格・流動性監視間隔。', type: 'number', min: 2, max: 30, step: 1, unit: '秒' },
  { key: 'stop_pct', group: 'risk', label: '損切りライン (stop_pct)', description: 'エントリー価格からの固定損切り幅（下方修正不可）。', type: 'number', min: 10, max: 45, step: 1, unit: '%' },
  { key: 'timeout_h', group: 'risk', label: 'デッドマネー時間 (timeout_h)', description: '保有経過時間がこの値以上かつ低上昇で自動撤退。', type: 'number', min: 1, max: 12, step: 0.5, unit: '時間' },
  { key: 'timeout_min_gain_pct', group: 'risk', label: 'タイムアウト最低上昇 (timeout_min_gain_pct)', description: 'timeout_h経過時にこの上昇率未満なら売却。', type: 'number', min: 0, max: 30, step: 1, unit: '%' },
  { key: 'night_loss_stop_pct', group: 'risk', label: '日次損失停止ライン (night_loss_stop_pct)', description: '24時間の累積損失がこの割合に達したら新規購入を全停止。', type: 'number', min: 10, max: 60, step: 5, unit: '%' },

  // Desk
  { key: 'paper_start_cash', group: 'desk', label: 'PAPER初期残高 (paper_start_cash)', description: 'ペーパートレード開始時の仮想残高。', type: 'number', min: 10, max: 10000, step: 1, unit: 'USD' },
  { key: 'fee_pct', group: 'desk', label: '大口手数料率 (fee_pct)', description: '$190超取引時のFOMO手数料率。', type: 'number', min: 0.1, max: 2.0, step: 0.05, unit: '%' },
];

export const BOT_META = {
  scanner: { name: 'Scanner', labelJa: 'スキャナー', color: '#64d2ff', role: 'PumpSwap卒業銘柄を収集・初期フィルタリング' },
  analyst: { name: 'Analyst', labelJa: 'アナリスト', color: '#ffd60a', role: '8レイヤー監査とソーシャル込み100点スコア判定' },
  brain: { name: 'Brain', labelJa: 'ブレイン', color: '#bf5af2', role: 'リスク許容度とプール流動性に基づく厳密サイジング' },
  executor: { name: 'Executor', labelJa: 'エグゼキューター', color: '#00d35a', role: '1クリックレーンで押し目エントリー・3重検証・利確' },
  risk: { name: 'Risk', labelJa: 'リスク', color: '#ff6b9a', role: '5秒監視による損切り・ラグ検知・日次損失停止' },
} as const;

export const CURSOR_RULES = [
  { rule: '許可ページ限定', detail: 'fomo.family の銘柄ページ、検索ボックス、自分のプロフィール(閲覧のみ)以外は開かない。' },
  { rule: '禁止アクション強制遮断', detail: 'Withdraw / Deposit / Buy with Apple Pay / Orders / Perps / Send / Settings / Swap設定 / 確認チェックボックスはコードレベルでクリック拒否。' },
  { rule: '購入金額の1セント単位検証', detail: 'Buyクリック前に金額欄とクォートを再読取。Brainの計算額と不一致なら最大1回リトライ、再不一致で即中止。' },
  { rule: '1クリックレーン排他制御', detail: '同時操作は1ボットのみ。Riskの損切り・緊急売却のみキュー最優先割り込み。' },
  { rule: '3重約定検証 (VERIFY)', detail: 'クリック後30秒以内に「画面表示」「FOMO API /swaps」「Solana RPCトークン残高」の3証跡を照合。未検証(unverified)は再クリック禁止。' },
];
