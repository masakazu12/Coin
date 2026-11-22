import { DeskSettings } from '../types/desk';
import { SIGNUP_URL, profileUrl } from './links';

export interface ManualSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  keywords: string[];
}

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    number: '01',
    title: 'アプリ概要・実データ連携',
    summary: 'Overnight Deskの全体構成、24時間自由稼働、4つのリアルタイムSolanaデータソース',
    keywords: ['概要', '実データ', '24時間', 'PumpPortal', 'DexScreener', 'RugCheck', 'RPC', 'PAPER', 'LIVE'],
  },
  {
    id: 'screens',
    number: '02',
    title: '画面構成と基本操作',
    summary: 'ホーム・ボット・アクティビティ・設定・Windows導入の5画面とリアルタイムグラフの使い方',
    keywords: ['ホーム', '画面', 'リアルタイム', 'グラフ', '折れ線', 'ブラウザレーン', 'UI', 'コントロール'],
  },
  {
    id: 'bots',
    number: '03',
    title: '5ボット自動売買パイプライン',
    summary: 'Scanner・Analyst(8レイヤー監査)・Brain・Executor・Riskの役割と判断基準',
    keywords: ['Scanner', 'Analyst', 'Brain', 'Executor', 'Risk', '8レイヤー', 'スコア', '利確', '損切り'],
  },
  {
    id: 'controls',
    number: '04',
    title: 'Windows基本UI要素リファレンス',
    summary: 'ホーム画面に配置されたテキストボックス・コンボボックス・チェックボックス等の機能一覧',
    keywords: ['ラベル', 'テキストボックス', 'コンボボックス', 'チェックボックス', 'ラジオボタン', 'プログレスバー', 'ボタン'],
  },
  {
    id: 'commands',
    number: '05',
    title: 'コマンドコンソール操作一覧 (STEP 11)',
    summary: 'テキストコマンドによる残高確認・理由照会・手動売却・ボット停止・設定変更',
    keywords: ['コマンド', 'status', 'why', 'sell', 'pause', 'resume', 'set stop', 'withdraw', 'report'],
  },
  {
    id: 'windows',
    number: '06',
    title: 'Windows 11 ローカル導入手順',
    summary: 'ZIP出力からPowerShell自動セットアップ、ワンクリック起動までの手順',
    keywords: ['Windows', 'zip', 'install_windows.ps1', 'start_desk.bat', 'Python', 'Chrome', 'Playwright'],
  },
  {
    id: 'safety',
    number: '07',
    title: '安全設計・LIVE切替条件・FAQ',
    summary: 'PAPERからLIVEへの切替要件、禁止クリック保護、Riskロック、よくある質問',
    keywords: ['安全', 'LIVE', 'PAPER', 'FAQ', '出金', '2FA', 'テスト', 'fomo', 'masakazu12'],
  },
];

export function buildManualMarkdown(settings: DeskSettings): string {
  const scheduleText = settings.always_on_24h
    ? '24時間自由稼働（時間制限なし）'
    : `${settings.night_start} 〜 ${settings.lock_time}`;

  return `# Overnight Desk — 取扱説明書（ユーザーマニュアル）

本ドキュメントは、Solana PumpSwap 向け 5ボット自動監視・取引デスク **Overnight Desk** の操作説明書です。

---

## 01. アプリ概要・実データ連携

Overnight Desk は、5つの専門ボット（Scanner / Analyst / Brain / Executor / Risk）が連携して Solana PumpSwap 上の実銘柄をリアルタイムに監視・監査・サイジング・売買検証・リスク防衛する Windows デスクトップ取引コンソールです。

### 現在の動作設定スナップショット
- **取引モード**: \`${settings.mode}\`（初期設定は安全な \`PAPER\` モード）
- **稼働スケジュール**: ${scheduleText}
- **FOMO ハンドル**: \`@${settings.fomo_handle}\`（${profileUrl(settings.fomo_handle)}）
- **FOMO 招待リンク**: ${SIGNUP_URL}
- **初期ペーパー残高**: \`$${settings.paper_start_cash.toFixed(2)}\`
- **損切り / 利確 / トレール**: \`-${settings.stop_pct}%\` / \`${settings.tp_x}x (${settings.tp_sell_pct}%売却)\` / \`-${settings.trail_pct}%\`

### 接続中の実データソース（すべてモックなしの本番データ）
1. **PumpPortal WebSocket** (\`wss://pumpportal.fun/api/data\`) — Pump.fun 新規上場および PumpSwap マイグレーションをリアルタイム検知
2. **DexScreener API** — 実価格・流動性・時価総額・5分/1時間出来高・買い/売り件数を 3秒間隔で同期
3. **RugCheck API** — LPロック/焼却率、インサイダー/バンドル比率、既知のRug履歴をリアルタイム取得
4. **Solana Mainnet RPC** (\`${settings.rpc_url}\`) — Mint権限・Freeze権限・上位ホルダー比率をオンチェーン検証

---

## 02. 画面構成と基本操作

左サイドバー（モバイルは下部ナビゲーション）から各画面を切り替えます。

| 画面名 | 主な役割 |
| :--- | :--- |
| **ホーム** | 総資産推移、直近の収益傾向（3秒リアルタイム推移グラフ）、ライブブラウザ1クリックレーン、5ボット稼働状況、Windows基本UIコントロール、最新アクティビティ |
| **ボット** | 5ボットごとの稼働件数・最新判定履歴・個別の一時停止/再開、データソース別の即時スキャン |
| **アクティビティ** | 全取引・除外履歴の検索/絞り込み、8レイヤー監査詳細、コイン詳細（手動売却 25%/50%/100%）、朝報レポート |
| **設定** | STEP 12 全パラメータ調整（スライダー＋数値入力）、PAPER/LIVEモード切替、FOMOプロフィール/招待リンク、変更履歴 (\`change_log\`) |
| **Windows導入 & テスト** | STEP 15 受入テスト（11項目自動検証）、STEP 11 コマンドコンソール、Windows 11 実行パッケージ（\`.zip\`）出力 |
| **説明書** | 本マニュアルの閲覧・検索・Markdownダウンロード |

### 「直近の収益傾向（リアルタイム推移）」グラフの使い方
- **リアルタイム推移**: DexScreener の実価格を 3秒ごとに自動プロットし、保有中の含み損益＋確定損益の推移をリアルタイム表示します。基準線 \`$0.00\` より上が緑、下が赤で色分けされます。
- **取引別 +/-**: 取引1件ごとのプラス/マイナス損益を比較表示します。保有中ポジションの評価損益も3秒ごとに連動更新されます。
- **累積損益**: 取引順に積み上げた累積損益カーブを表示します。
- グラフ上の点にマウスを合わせると時刻・損益・監視中銘柄の実価格が表示され、クリックで該当銘柄の詳細画面を開けます。

---

## 03. 5ボット自動売買パイプライン

すべての購入判断は **5ボット全員が承認した場合のみ** 実行されます。

1. **Bot 1: Scanner（候補抽出）**
   - 監視対象: Pump.fun から PumpSwap へ移行した Solana 実銘柄
   - 除外条件: 流動性 \`$${settings.min_liquidity_usd.toLocaleString()}\` 未満、Top10保有率 \`${settings.scanner_max_top10_pct}%\` 超、1時間騰落率 \`+${settings.max_h1_change_pct}%\` 超、プール経過 \`${settings.min_pool_age_min}分\` 未満、売買禁止警告あり
2. **Bot 2: Analyst + Social（8レイヤー監査 & スコアリング）**
   - Layer 1〜8（Mint権限放棄 / Freeze権限放棄 / Dev保有率とRug履歴 / Top10比率 / LP焼却・ロック率 / プール経過時間 / バンドル・インサイダー / 委任アカウント数）を順番に検査し、**1つでも赤（不合格）が出た時点で即終了**します。
   - 8項目すべて通過した銘柄のみ 100点満点で採点し、\`${settings.min_score}点\` 以上で合格します。
3. **Bot 3: Brain（資金管理・サイジング）**
   - 計算式: \`空き現金 × リスク比率(${settings.risk_per_trade_pct}%) ÷ 損切り幅(${settings.stop_pct}%)\`
   - スコア \`${settings.full_size_score}点\` 以上はフルサイズ、未満は \`${settings.below_full_pct}%\` に半減。
   - 上限ガード: プール流動性の \`${settings.max_pool_pct}%\` 上限、1回あたり \`$${settings.min_ticket_usd}〜$${settings.max_ticket_usd}\` 制限。
4. **Bot 4: Executor（1クリック実行レーン & 3点検証）**
   - 1度に1注文のみを排他ロックで処理し、約定後は **画面表示・API・オンチェーン** の3点検証を実施します。
   - PAPERモードでは見積もり確認まで実行し、本番購入ボタンは押下しません。
   - 目標倍率 \`${settings.tp_x}x\` 到達時に \`${settings.tp_sell_pct}%\` を自動利確し、残りに \`-${settings.trail_pct}%\` トレールを設定します。
5. **Bot 5: Risk（3秒間隔の常時防衛）**
   - 損切り \`-${settings.stop_pct}%\`、高値からのトレール \`-${settings.trail_pct}%\`、タイムアウト（\`${settings.timeout_h}時間\` で \`+${settings.timeout_min_gain_pct}%\` 未満）、流動性80%急減、Dev売却50%超を監視し自動撤退します。
   - ストップラインは有利方向へのみ引き上げ、絶対に緩めません。

---

## 04. Windows基本UI要素リファレンス

ホーム画面の「Windows 基本UIコントロール」パネルで主要操作を直接行えます。

- **ラベル (Label)**: 現在のモード（PAPER/LIVE）、空き現金、保有ポジション数をリアルタイム表示
- **テキストボックス (TextBox)**: Solana 実銘柄の Mint アドレスまたはティッカー（例: \`BONK\`, \`WIF\`）を入力し、実データ検索・5ボット監査へ投入
- **コンボボックス (ComboBox)**: 実データスキャン対象（自動優先 / PumpPortal新着 / DexScreener急上昇 / 高流動性）を選択
- **数値ボックス (NumberBox)**: 損切りライン（\`stop_pct\`）をその場で変更（\`change_log\` に自動記録）
- **ラジオボタン (RadioButton)**: 稼働スケジュール（24時間自由稼働 / 指定時間帯稼働）を切替
- **チェックボックス (CheckBox)**: ライブ画面配信の一時停止（プライベート保護）および Social スコアの有効/無効を切替
- **プログレスバー (ProgressBar)**: 1日あたりの取引枠消費率と STEP 15 受入テスト合格進捗を表示
- **操作ボタン (Button)**: 実データスキャン実行・24時間稼働 ON/OFF・安全停止（保有中は Risk を自動維持）

---

## 05. コマンドコンソール操作一覧 (STEP 11)

「Windows導入 & テスト」画面のコマンドコンソールから以下のコマンドを実行できます。

| コマンド | 動作内容 |
| :--- | :--- |
| \`status\` | 現在のモード・空き現金・総評価額・保有ポジション一覧と FOMO リンクを表示 |
| \`why <SYMBOL>\` | 指定銘柄がなぜ購入/除外されたかの理由・担当ボット・リンクを表示 |
| \`sell <SYMBOL> <25\|50\|100>\` | 保有中ポジションを指定割合で即時売却 |
| \`pause <Bot名>\` | 指定ボット（Scanner / Analyst / Brain / Executor）を一時停止（※保有中のRiskは保護ロック） |
| \`resume <Bot名>\` | 一時停止中のボットを再開 |
| \`set stop to -20%\` | 損切り幅を変更し \`change_log\` へ自動記録 |
| \`withdraw <USD>\` | 出金確認画面で自動停止し、画面配信を \`Paused · private\` へ切替えて本人2FAへ引き渡し |
| \`report\` | アクティビティ画面の朝報レポートを表示 |
| \`paper\` / \`live\` | PAPERモードへ切替（LIVE切替は安全確認のため「設定」画面で実行） |

---

## 06. Windows 11 ローカル導入手順

1. 画面右上の **「Windows版を出力 (.zip)」** ボタンをクリックし、\`OvernightDesk-Windows.zip\` を保存します。
2. ZIP を任意のフォルダ（例: \`C:\\OvernightDesk\`）にすべて展開します。
3. Python 3.12 以上と Google Chrome がインストールされていることを確認します。
4. フォルダ内の **\`install_windows.ps1\`** を右クリック → **「PowerShell で実行」** を選択します。
   - 仮想環境 (\`.venv\`) の構築、必要ライブラリ・Playwright Chromium の導入、デスクトップショートカット作成が自動完了します。
5. デスクトップの **Overnight Desk** またはフォルダ内の **\`start_desk.bat\`** をダブルクリックして起動します。
   - 専用プロファイル Chrome（\`127.0.0.1:9222\` ローカル限定）と 5ボット常駐エンジン（\`http://127.0.0.1:8787\`）が自動起動します。

---

## 07. 安全設計・LIVE切替条件・FAQ

### LIVE モードへの切替条件
本番資金を使用する \`LIVE\` モードへの切替は、以下の2条件をすべて満たした場合のみ「設定」画面から解除できます。
1. **STEP 15 受入テスト全11項目が PASS** していること
2. 確認入力欄に大文字で **\`LIVE\`** と明示入力すること

### コード強制の安全ルール
- **禁止クリック保護**: \`Withdraw\` / \`Deposit\` / \`Buy with Apple Pay\` / \`Send\` / \`Swap settings\` などの危険操作はブラウザ制御層で自動拒否されます。
- **Risk ボット保護ロック**: 保有ポジションが1件以上ある間は、誤操作防止のため Risk ボットを一時停止できません。
- **FOMO リンク統一**: すべての銘柄リンク・プロフィールリンクは \`links\` モジュール経由で \`r=masakazu12\` を付与して生成されます。

### よくある質問 (FAQ)
- **Q. 起動直後に取引件数が 0 件のままです。不具合ですか？**
  - A. 実データ稼働のため、8レイヤー監査とスコア基準（\`${settings.min_score}点\` 以上）を満たさない危険な実銘柄は自動除外されます。「今すぐ実データ取得」ボタンまたはテキストボックスから任意の Solana 銘柄（例: \`BONK\`）を検索して投入することもできます。
- **Q. ブラウザを閉じると設定や履歴は消えますか？**
  - A. 設定値・変更履歴・ポジション・リアルタイム損益ティックはブラウザの \`localStorage\` に自動保存されます。Windows ローカル版では SQLite WAL (\`data/desk.db\`) に永続化されます。
- **Q. リアルタイムグラフの更新間隔は？**
  - A. DexScreener の公開API制限（約300回/分）に収まる安全な間隔として **3秒ごと** に自動同期しています。
`;
}

export function downloadManualMarkdown(settings: DeskSettings): void {
  const md = buildManualMarkdown(settings);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OvernightDesk-取扱説明書.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
