import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCode2,
  Play,
  Send,
  Terminal,
  XCircle,
} from 'lucide-react';
import { AcceptanceTestResult, ConsoleMessage, DeskSettings } from '../types/desk';
import { buildWindowsBundleFiles, downloadWindowsAppZip } from '../engine/windowsBundle';

interface WindowsPackageViewProps {
  settings: DeskSettings;
  testResults: AcceptanceTestResult[];
  onRunAllTests: () => void;
  consoleMessages: ConsoleMessage[];
  onRunCommand: (cmd: string) => void;
}

const QUICK_COMMANDS = [
  'status',
  'report',
  'pause Scanner',
  'resume Scanner',
  'set stop to -20%',
  'withdraw 10',
];

export const WindowsPackageView: React.FC<WindowsPackageViewProps> = ({
  settings,
  testResults,
  onRunAllTests,
  consoleMessages,
  onRunCommand,
}) => {
  const bundleFiles = useMemo(() => buildWindowsBundleFiles(settings), [settings]);
  const [selectedFile, setSelectedFile] = useState<string>(bundleFiles[0].path);
  const [downloading, setDownloading] = useState(false);
  const [cmdInput, setCmdInput] = useState('');

  const currentFile =
    bundleFiles.find((f) => f.path === selectedFile) ?? bundleFiles[0];

  const passedCount = testResults.filter((t) => t.status === 'pass').length;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadWindowsAppZip(settings);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;
    onRunCommand(cmdInput.trim());
    setCmdInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Windows 11 Native App Package Exporter */}
      <section className="bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#545458]/40">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-white">
              Windows デスクトップアプリ一式パッケージ出力
            </h2>
            <p className="text-xs text-[#ebebf5]/65 mt-1 leading-relaxed">
              現在の STEP 12 設定値（<span className="font-mono-tabular text-white">mode={settings.mode}</span> / <span className="font-mono-tabular text-white">@{settings.fomo_handle}</span> / <span className="font-mono-tabular text-white">stop -{settings.stop_pct}%</span>）をそのまま埋め込んだ Windows 11 向け実行パッケージ（PowerShell 自動インストーラー + ワンクリック起動バッチ + Python 3.12 Playwright 5ボット実装）を ZIP 出力します。
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#00d35a] hover:bg-[#1be06d] text-black rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'ZIP生成中...' : 'Windowsアプリ一式をダウンロード (.zip)'}
          </button>
        </div>

        {/* File Tree & Code Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-5">
          <div className="lg:col-span-4 space-y-1 max-h-[340px] overflow-y-auto pr-1">
            {bundleFiles.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelectedFile(f.path)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  selectedFile === f.path
                    ? 'bg-[#2c2c2e] text-white'
                    : 'text-[#ebebf5]/65 hover:bg-[#232326] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-mono-tabular font-medium">
                  <FileCode2 className="w-3.5 h-3.5 text-[#64d2ff] shrink-0" />
                  <span className="truncate">{f.path}</span>
                </div>
                <div className="text-[11px] text-[#ebebf5]/45 mt-0.5 truncate pl-5">
                  {f.description}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-[#0d0d0f] border border-[#545458]/40 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-[#161618] border-b border-[#545458]/35 flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-white">{currentFile.path}</span>
              <span className="text-[#ebebf5]/45">{currentFile.language}</span>
            </div>
            <pre className="p-4 text-[11px] font-mono-tabular text-[#ebebf5]/85 overflow-auto max-h-[300px] leading-relaxed">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Bottom Split: STEP 15 Acceptance Suite (11 Tests) & STEP 11 Telegram / Desk Command Console */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* STEP 15 Acceptance Tests */}
        <section className="xl:col-span-7 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                STEP 15 受入テストスイート (全11項目)
              </h2>
              <p className="text-xs text-[#ebebf5]/55 mt-0.5">
                実エンジンの関数に対してリンク・境界スコア・サイジング・損切り・異常トークン検知を直接検証
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono-tabular text-[#ebebf5]/70">
                {passedCount}/11 PASS
              </span>
              <button
                type="button"
                onClick={onRunAllTests}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0a84ff] hover:bg-[#2491ff] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                全11テストを実行
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {testResults.map((t) => (
              <div
                key={t.id}
                className="bg-[#141416] border border-[#545458]/35 rounded-xl p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.status === 'pass' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00d35a] shrink-0" />
                    ) : t.status === 'fail' ? (
                      <XCircle className="w-4 h-4 text-[#ff453a] shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-[#545458] shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-white truncate">
                      {t.number}. {t.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-[#ebebf5]/45 shrink-0">
                    {t.status === 'idle' ? '未実行' : `${t.status.toUpperCase()} · ${t.durationMs}ms`}
                  </span>
                </div>
                <p className="text-[11px] text-[#ebebf5]/55 mt-1 pl-6">{t.description}</p>
                {t.output && (
                  <pre className="mt-2 ml-6 p-2 rounded-lg bg-[#0c0c0e] text-[10px] font-mono-tabular text-[#ebebf5]/80 overflow-x-auto whitespace-pre-wrap">
                    {t.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* STEP 11 Telegram / Desk Command Terminal */}
        <section className="xl:col-span-5 bg-[#1c1c1e] border border-[#545458]/50 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-4 h-4 text-[#00d35a]" />
              <h2 className="text-sm font-semibold text-white">デスクコマンド対話 (STEP 11)</h2>
            </div>
            <p className="text-xs text-[#ebebf5]/55 mb-3">
              Telegram Bot およびデスクトップから直接コマンドを実行（status / why / sell / pause / set stop / withdraw）
            </p>

            {/* Quick Command Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => onRunCommand(cmd)}
                  className="px-2.5 py-1 text-[11px] font-mono-tabular bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ebebf5]/85 rounded-md transition-colors cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 bg-[#111113] border border-[#545458]/40 rounded-xl p-3 space-y-2.5 max-h-[290px] min-h-[220px] overflow-y-auto mb-3">
            {consoleMessages.map((m) => (
              <div
                key={m.id}
                className={`text-xs ${m.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block max-w-[92%] rounded-xl px-3 py-2 font-mono-tabular whitespace-pre-wrap text-left ${
                    m.sender === 'user'
                      ? 'bg-[#0a84ff] text-white'
                      : 'bg-[#1c1c1e] text-[#ebebf5]/90 border border-[#545458]/40'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendCmd} className="flex items-center gap-2">
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              placeholder="例: status / why KURO / sell KURO 50 / set stop to -20%"
              className="flex-1 bg-[#111113] border border-[#545458]/50 rounded-lg px-3 py-2 text-xs font-mono-tabular text-white focus:outline-none focus:border-[#0a84ff]"
            />
            <button
              type="submit"
              className="p-2 bg-[#0a84ff] hover:bg-[#2491ff] text-white rounded-lg transition-colors cursor-pointer"
              aria-label="コマンド送信"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
