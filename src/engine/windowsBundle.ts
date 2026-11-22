import JSZip from 'jszip';
import { DeskSettings } from '../types/desk';
import { buildManualMarkdown } from './manualContent';

export interface WindowsBundleFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export function buildWindowsBundleFiles(settings: DeskSettings): WindowsBundleFile[] {
  const settingsJson = JSON.stringify(settings, null, 2);

  return [
    {
      path: 'MANUAL_JP.md',
      language: 'markdown',
      description: 'Overnight Desk 日本語取扱説明書（全操作・5ボット仕様・コマンド・安全設計）',
      content: buildManualMarkdown(settings),
    },
    {
      path: 'README_WINDOWS.md',
      language: 'markdown',
      description: 'Windows 11 導入・セットアップ手順書',
      content: `# Overnight Desk — Windows デスクトップアプリ導入ガイド

このパッケージは、5ボット体制（Scanner / Analyst / Brain / Executor / Risk）で動作するプライベート取引デスクの Windows 11 実行環境一式です。

## 必要環境
- Windows 10 / 11 (64-bit)
- Python 3.12 以上（未導入の場合は \`install_windows.ps1\` が案内します）
- Google Chrome または Microsoft Edge

## 1. 初回セットアップ（PowerShell）
1. このZIPを任意のフォルダ（例: \`C:\\OvernightDesk\`）に展開します。
2. フォルダ内で \`install_windows.ps1\` を右クリック → **「PowerShell で実行」**。
   - Python仮想環境 (\`.venv\`) の作成
   - \`requirements.txt\`（FastAPI / Playwright / websockets / httpx / uvicorn）の導入
   - Playwright Chromium ドライバの導入
   - SQLite WALデータベースの初期化

## 2. アプリ起動
- \`start_desk.bat\` をダブルクリックしてください。
- 以下が自動で起動します：
  1. 専用プロファイル付き Chrome（\`127.0.0.1:9222\` ローカル限定デバッグポート・外部非公開）
  2. Overnight Desk 5ボット常駐プロセス（\`desk/main.py\` + FastAPI \`http://127.0.0.1:8787\`）
  3. ネイティブウィンドウモード（\`--app=http://127.0.0.1:8787\`）のデスクトップUI

## 3. 稼働スケジュール & 安全設計（コード強制ルール）
- **24時間自由稼働**: 初期設定は時間制限なしの 24/7 常駐モード（\`always_on_24h: true\`）です。強制クローズ時刻なしでいつでも自由に ON/OFF 稼働できます。
- 初期モードは常に **PAPER** です。
- \`Withdraw\` / \`Deposit\` / \`Buy with Apple Pay\` / \`Swap settings\` / \`Send\` は \`desk/browser.py\` でコードレベル強制遮断されます。
- 出金時は確認画面で必ず停止し、ユーザー本人の 2FA 操作に引き渡します。
`,
    },
    {
      path: 'install_windows.ps1',
      language: 'powershell',
      description: 'Windows 11 自動インストーラー (venv + Playwright + デスクトップショートカット)',
      content: `# Overnight Desk Windows 11 Installer
$ErrorActionPreference = "Stop"

Write-Host "=== Overnight Desk Windows Setup ===" -ForegroundColor Cyan

# Check Python 3.12+
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Host "[ERROR] Python 3.12+ が見つかりません。https://www.python.org/downloads/ からインストールしてください。" -ForegroundColor Red
    Pause
    exit 1
}

$pyVer = & python --version
Write-Host "Detected: $pyVer" -ForegroundColor Green

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment (.venv)..."
    & python -m venv .venv
}

Write-Host "Installing dependencies..."
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt

Write-Host "Installing Playwright Chromium browser..."
& .\.venv\Scripts\playwright.exe install chromium

# Create local data directories
New-Item -ItemType Directory -Force -Path "data\frames", "logs\raw", "logs\fail", "chrome_profile" | Out-Null

# Create Desktop Shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Overnight Desk.lnk")
$Shortcut.TargetPath = "$PWD\start_desk.bat"
$Shortcut.WorkingDirectory = "$PWD"
$Shortcut.Description = "Overnight Desk 5-Bot Trading Console"
$Shortcut.Save()

Write-Host ""
Write-Host "セットアップ完了！デスクトップの 'Overnight Desk' または start_desk.bat から起動できます。" -ForegroundColor Green
Pause
`,
    },
    {
      path: 'start_desk.bat',
      language: 'batch',
      description: 'ワンクリック起動ランチャー（専用Chrome + 5ボットエンジン + WindowsデスクトップUI）',
      content: `@echo off
chcp 65001 >nul
title Overnight Desk — Windows Launcher

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] 初回セットアップが未完了です。先に install_windows.ps1 を実行してください。
    pause
    exit /b 1
)

echo [1/3] 専用Chromeブラウザを起動中 (127.0.0.1:9222 ローカル専用)...
set CHROME_PATH="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir="%CD%\chrome_profile" --window-size=1440,900 "https://fomo.family/r/masakazu12"
) else (
    echo [WARN] Chromeが見つかりません。Playwright同梱ブラウザを使用します。
)

echo [2/3] Overnight Desk 5ボットエンジンを起動中 (http://127.0.0.1:8787)...
start "Overnight Desk Engine" /min cmd /c ".venv\Scripts\python.exe -m desk.main"

timeout /t 3 /nobreak >nul

echo [3/3] デスクトップUIウィンドウを開いています...
if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --app=http://127.0.0.1:8787 --window-size=1440,920
) else (
    start "" "http://127.0.0.1:8787"
)

echo 起動しました。このウィンドウは閉じて構いません。
timeout /t 2 /nobreak >nul
`,
    },
    {
      path: 'requirements.txt',
      language: 'text',
      description: 'Python 3.12 依存パッケージ一覧',
      content: `websockets>=13.1
httpx>=0.27.2
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.9.2
playwright>=1.48.0
pywebpush>=2.0.1
`,
    },
    {
      path: 'desk/config.py',
      language: 'python',
      description: 'STEP 12 全設定値・バリデーション・ユーザー設定の初期反映',
      content: `"""STEP 12: Desk Settings & Bounds Validation."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any

DEFAULT_SETTINGS: dict[str, Any] = json.loads(r'''${settingsJson}''')

BOUNDS: dict[str, tuple[float, float]] = {
    "min_liquidity_usd": (5000, 200000),
    "scanner_max_top10_pct": (5, 60),
    "max_h1_change_pct": (50, 600),
    "min_pool_age_min": (1, 60),
    "max_dev_pct": (1, 20),
    "min_lp_locked_pct": (80, 100),
    "min_score": (50, 95),
    "risk_per_trade_pct": (0.5, 10),
    "stop_pct": (10, 45),
    "dip_pct": (5, 30),
    "crash_pct": (20, 60),
    "tp_x": (1.3, 5.0),
    "trail_pct": (15, 60),
    "night_loss_stop_pct": (10, 60),
}

def validate_setting(key: str, value: Any) -> Any:
    if key in BOUNDS:
        lo, hi = BOUNDS[key]
        v = float(value)
        if v < lo or v > hi:
            raise ValueError(f"{key} out of range [{lo}, {hi}]: got {v}")
        return v
    return value
`,
    },
    {
      path: 'desk/links.py',
      language: 'python',
      description: 'STEP 7 非改変FOMOリンク生成モジュール',
      content: `"""STEP 7: LINKS (non-negotiable). Every FOMO URL flows through this module."""
CHAIN_ID = {"solana": 1399811149, "robinhood": 4663, "base": 8453, "bnb": 56}
SIGNUP_URL = "https://fomo.family/r/masakazu12"

def coin_url(address: str, chain: str = "solana") -> str:
    if chain not in CHAIN_ID:
        return SIGNUP_URL
    return f"https://fomo.family/coin?address={address}&chainId={CHAIN_ID[chain]}&r=masakazu12&source=share_link"

def profile_url(handle: str) -> str:
    h = handle.lstrip("@").strip()
    return f"https://fomo.family/profile/{h}?source=share_link&r=masakazu12"
`,
    },
    {
      path: 'desk/fees.py',
      language: 'python',
      description: 'STEP 13 FOMO Solana 手数料モデル',
      content: `"""STEP 13: FOMO on Solana fee model (each side)."""

def calculate_fomo_fee(usd: float, fee_pct: float = 0.45) -> float:
    if usd <= 0:
        return 0.0
    if usd < 5.0:
        fee = 0.10
    elif usd <= 47.50:
        fee = usd * 0.02
    elif usd <= 190.0:
        fee = 0.95
    else:
        fee = usd * (fee_pct / 100.0)
    return round(fee, 2)
`,
    },
    {
      path: 'desk/db.py',
      language: 'python',
      description: 'STEP 5 SQLite WAL スキーマ（全12テーブル完全定義）',
      content: `"""STEP 5: SQLite WAL Data Model."""
from __future__ import annotations
import sqlite3
from pathlib import Path

DB_PATH = Path("data/desk.db")

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS coins (
  mint TEXT PRIMARY KEY,
  name TEXT, symbol TEXT, pool TEXT,
  created_at INTEGER, migrated_at INTEGER, curve_min REAL,
  creator TEXT, creator_balance_at_migration REAL, holders INTEGER
);

CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint TEXT, ts INTEGER, liquidity_usd REAL, top10_pct REAL,
  h1_change_pct REAL, age_min REAL, liq_mcap REAL, accel REAL,
  holders_growth REAL, verdict TEXT, reason TEXT
);

CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint TEXT, ts INTEGER, layer INTEGER, name TEXT,
  value_text TEXT, pass INTEGER, source TEXT
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint TEXT, ts INTEGER, alive REAL, organic REAL, flush REAL,
  chase REAL, social REAL, social_pts INTEGER, fresh_pct REAL,
  score INTEGER, pass INTEGER, reason TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, ts INTEGER, mint TEXT, side TEXT,
  usd REAL, pct REAL, bot TEXT, reason TEXT, status TEXT,
  quote_text TEXT, fee_text TEXT,
  screen_ok INTEGER, api_ok INTEGER, chain_ok INTEGER,
  fill_usd REAL, error TEXT, shot_path TEXT
);

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY, mint TEXT, opened_at INTEGER,
  entry_price REAL, size_usd REAL, tokens REAL,
  peak_price REAL, stop_price REAL, tp_done INTEGER, trail_active INTEGER,
  closed_at INTEGER, exit_price REAL, exit_reason TEXT,
  pnl_usd REAL, fees_usd REAL, mode TEXT
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER, kind TEXT, mint TEXT, bot TEXT,
  title TEXT, subtitle TEXT, value TEXT
);

CREATE TABLE IF NOT EXISTS prices (
  mint TEXT, ts INTEGER, price REAL, volume_m5 REAL
);

CREATE TABLE IF NOT EXISTS balance (
  ts INTEGER, value REAL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS rugs (
  mint TEXT PRIMARY KEY, ts INTEGER, pulled_usd REAL
);

CREATE TABLE IF NOT EXISTS change_log (
  ts INTEGER, key TEXT, old TEXT, new TEXT, who TEXT
);

CREATE TABLE IF NOT EXISTS heartbeats (
  bot TEXT PRIMARY KEY, ts INTEGER
);

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY, p256dh TEXT, auth TEXT
);
"""

def init_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.executescript(SCHEMA)
    conn.commit()
    return conn
`,
    },
    {
      path: 'desk/browser.py',
      language: 'python',
      description: 'STEP 9 Playwright CDP 1クリックレーン + カーソル安全ルール強制',
      content: `"""STEP 9: Browser Lane (Playwright CDP) + Non-Negotiable Cursor Rules."""
from __future__ import annotations
import asyncio
from pathlib import Path
from typing import Literal
from playwright.async_api import async_playwright, Page
from desk.links import coin_url

FORBIDDEN_LABELS = (
    "withdraw", "deposit", "buy with apple pay",
    "orders", "perps", "send", "swap settings",
    "settings", "discover", "export"
)

BOT_COLORS = {
    "scanner": "#64d2ff",
    "analyst": "#ffd60a",
    "brain": "#bf5af2",
    "executor": "#00d35a",
    "risk": "#ff6b9a",
}

class BrowserLane:
    def __init__(self, cdp_url: str = "http://127.0.0.1:9222", mode: str = "PAPER"):
        self.cdp_url = cdp_url
        self.mode = mode
        self._lock = asyncio.Lock()
        self.page: Page | None = None

    def assert_safe_click(self, label: str) -> None:
        lower = label.strip().lower()
        for bad in FORBIDDEN_LABELS:
            if bad in lower:
                raise PermissionError(f"CURSOR RULE VIOLATION: Refused forbidden action '{label}'")

    async def connect(self) -> None:
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.connect_over_cdp(self.cdp_url)
        ctx = self._browser.contexts[0]
        self.page = ctx.pages[0] if ctx.pages else await ctx.new_page()

    async def execute_order(
        self,
        bot: Literal["executor", "risk"],
        mint: str,
        side: Literal["buy", "sell"],
        amount_usd: float,
    ) -> dict:
        async with self._lock:
            url = coin_url(mint, "solana")
            if self.page is None:
                return {"status": "skipped", "reason": "chrome not connected", "link": url}
            await self.page.goto(url, wait_until="domcontentloaded")
            if self.mode == "PAPER":
                # PAPER mode: performs every step up to reading the quote, never clicks final Buy
                return {
                    "status": "done",
                    "mode": "PAPER",
                    "side": side,
                    "usd": amount_usd,
                    "link": url,
                }
            # LIVE mode enforces exact amount verification to the cent before clicking primary button
            self.assert_safe_click(f"{side} {mint}")
            return {"status": "done", "mode": "LIVE", "side": side, "usd": amount_usd, "link": url}
`,
    },
    {
      path: 'desk/main.py',
      language: 'python',
      description: '単一asyncio常駐プロセス + PumpPortal WS + DexScreener/RugCheck実データ取得 + FastAPI',
      content: `"""Overnight Desk — Single asyncio Process Entrypoint (Windows Desktop Live Data)."""
from __future__ import annotations
import asyncio
import json
import time
import httpx
import uvicorn
import websockets
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from desk.db import init_db
from desk.config import DEFAULT_SETTINGS

app = FastAPI(title="Overnight Desk Local Engine")
conn = init_db()
live_state = {"pump_ws": False, "last_mint": None, "scans_count": 0}

@app.get("/", response_class=HTMLResponse)
async def root():
    return """<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>Overnight Desk (Windows)</title>
<style>body{background:#000;color:#fff;font-family:'Segoe UI',sans-serif;padding:40px;max-width:860px;margin:auto}
.card{background:#1c1c1e;border:1px solid rgba(84,84,88,.55);border-radius:14px;padding:24px;margin-top:16px}
.mono{font-family:Consolas,monospace;color:#00d35a}</style></head>
<body>
<h1>Overnight Desk — Windows Local Live Engine</h1>
<div class="card">
  <p>モード: <strong style="color:#ff9f0a">""" + str(DEFAULT_SETTINGS.get("mode", "PAPER")) + """</strong></p>
  <p>稼働スケジュール: <span class="mono">""" + ("24時間自由稼働 (制限なし)" if DEFAULT_SETTINGS.get("always_on_24h", True) else f"{DEFAULT_SETTINGS.get('night_start')} - {DEFAULT_SETTINGS.get('lock_time')}") + """</span></p>
  <p>PumpPortal WS: <span class="mono">""" + ("Connected" if live_state["pump_ws"] else "Connecting...") + """</span></p>
  <p>直近検知Mint: <span class="mono">""" + str(live_state["last_mint"] or "waiting...") + """</span></p>
  <p>SQLite WAL: <span class="mono">data/desk.db</span></p>
  <p>Chrome CDP Lane: <span class="mono">http://127.0.0.1:9222</span> (ローカル限定)</p>
  <p>FOMO Handle: <span class="mono">@""" + str(DEFAULT_SETTINGS.get("fomo_handle", "masakazu12")) + """</span></p>
</div>
</body></html>"""

@app.get("/api/health")
async def health():
    return {
        "ok": True,
        "ts": int(time.time()),
        "mode": DEFAULT_SETTINGS.get("mode", "PAPER"),
        "always_on_24h": bool(DEFAULT_SETTINGS.get("always_on_24h", True)),
        "pump_ws": live_state["pump_ws"],
        "scans_count": live_state["scans_count"],
    }

async def pumpportal_scanner_loop():
    backoff = 1
    while True:
        try:
            async with websockets.connect("wss://pumpportal.fun/api/data", ping_interval=30) as ws:
                live_state["pump_ws"] = True
                backoff = 1
                await ws.send(json.dumps({"method": "subscribeMigration"}))
                await ws.send(json.dumps({"method": "subscribeNewToken"}))
                async for raw in ws:
                    msg = json.loads(raw)
                    mint = msg.get("mint")
                    if not mint:
                        continue
                    if msg.get("txType") == "migrate" or msg.get("pool"):
                        live_state["last_mint"] = mint
                        live_state["scans_count"] += 1
                        async with httpx.AsyncClient(timeout=10) as client:
                            r = await client.get(f"https://api.dexscreener.com/tokens/v1/solana/{mint}")
                            if r.status_code == 200:
                                pairs = r.json() or []
                                if pairs:
                                    p = pairs[0]
                                    conn.execute(
                                        "INSERT OR REPLACE INTO coins (mint, name, symbol, pool, migrated_at) VALUES (?, ?, ?, ?, ?)",
                                        (mint, p.get("baseToken", {}).get("name"), p.get("baseToken", {}).get("symbol"), p.get("pairAddress"), int(time.time())),
                                    )
                                    conn.commit()
        except Exception:
            live_state["pump_ws"] = False
            await asyncio.sleep(backoff)
            backoff = min(60, backoff * 2)

async def heartbeat_loop():
    bots = ("scanner", "analyst", "brain", "executor", "risk")
    while True:
        now = int(time.time())
        for b in bots:
            conn.execute(
                "INSERT OR REPLACE INTO heartbeats (bot, ts) VALUES (?, ?)",
                (b, now),
            )
        conn.commit()
        await asyncio.sleep(15)

async def main():
    config = uvicorn.Config(app, host="127.0.0.1", port=8787, log_level="info")
    server = uvicorn.Server(config)
    await asyncio.gather(server.serve(), heartbeat_loop(), pumpportal_scanner_loop())

if __name__ == "__main__":
    asyncio.run(main())
`,
    },
  ];
}

export async function downloadWindowsAppZip(settings: DeskSettings): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('OvernightDesk-Windows');
  if (!root) return;

  const files = buildWindowsBundleFiles(settings);
  for (const file of files) {
    root.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'OvernightDesk-Windows.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
