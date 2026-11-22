import React, { useEffect, useRef, useState } from 'react';
import { BalancePoint, ChartRange } from '../types/desk';

interface BalanceChartProps {
  points: BalancePoint[];
  startCash: number;
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}

const RANGES: ChartRange[] = ['LIVE', '1H', '4H', '1D', '1W', 'ALL'];

export const BalanceChart: React.FC<BalanceChartProps> = ({
  points,
  startCash,
  range,
  onRangeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = React.useMemo(() => {
    if (points.length === 0) return [];
    const now = points[points.length - 1].ts;
    const cutoffMap: Record<ChartRange, number> = {
      LIVE: 15 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      ALL: Infinity,
    };
    const cutoff = cutoffMap[range];
    if (cutoff === Infinity) return points;
    const slice = points.filter((p) => now - p.ts <= cutoff);
    return slice.length >= 2 ? slice : points.slice(-Math.min(points.length, 24));
  }, [points, range]);

  const height = 220;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || filtered.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, height);

    const padTop = 34;
    const padBottom = 16;
    const padX = 8;
    const plotW = canvasWidth - padX * 2;
    const plotH = height - padTop - padBottom;

    const values = filtered.map((p) => p.value);
    const minVal = Math.min(startCash * 0.96, ...values);
    const maxVal = Math.max(startCash * 1.04, ...values);
    const span = Math.max(maxVal - minVal, 1);

    const toX = (idx: number) => padX + (idx / (filtered.length - 1)) * plotW;
    const toY = (val: number) => padTop + (1 - (val - minVal) / span) * plotH;

    // Dashed start line
    const startY = toY(startCash);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(235, 235, 245, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, startY);
    ctx.lineTo(canvasWidth - padX, startY);
    ctx.stroke();
    ctx.restore();

    const lastVal = filtered[filtered.length - 1].value;
    const lineColor = lastVal >= startCash ? '#00d35a' : '#ff453a';

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    if (lastVal >= startCash) {
      grad.addColorStop(0, 'rgba(0, 211, 90, 0.20)');
      grad.addColorStop(1, 'rgba(0, 211, 90, 0.00)');
    } else {
      grad.addColorStop(0, 'rgba(255, 69, 58, 0.20)');
      grad.addColorStop(1, 'rgba(255, 69, 58, 0.00)');
    }

    ctx.beginPath();
    filtered.forEach((pt, i) => {
      const x = toX(i);
      const y = toY(pt.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(filtered.length - 1), height - padBottom);
    ctx.lineTo(toX(0), height - padBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Main stroke
    ctx.beginPath();
    filtered.forEach((pt, i) => {
      const x = toX(i);
      const y = toY(pt.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Marks above line (no overlapping rows)
    let lastMarkerX = -999;
    let markerRow = 0;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    filtered.forEach((pt, i) => {
      if (!pt.marker) return;
      const x = toX(i);
      const y = toY(pt.value);
      if (x - lastMarkerX < 74) {
        markerRow = (markerRow + 1) % 2;
      } else {
        markerRow = 0;
      }
      lastMarkerX = x;

      const color =
        pt.marker.tone === 'blue'
          ? '#0a84ff'
          : pt.marker.tone === 'green'
            ? '#00d35a'
            : '#ff453a';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      const labelY = Math.max(12, Math.min(y - 10 - markerRow * 13, 26));
      const textWidth = ctx.measureText(pt.marker.label).width;
      const clampedX = Math.max(padX, Math.min(x - textWidth / 2, canvasWidth - padX - textWidth));
      ctx.fillText(pt.marker.label, clampedX, labelY);
    });

    // Hover crosshair
    if (hoverIdx !== null && filtered[hoverIdx]) {
      const x = toX(hoverIdx);
      const y = toY(filtered[hoverIdx].value);
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 235, 245, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [filtered, canvasWidth, startCash, hoverIdx]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (filtered.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relX / rect.width));
    setHoverIdx(Math.round(ratio * (filtered.length - 1)));
  };

  const hoveredPoint = hoverIdx !== null ? filtered[hoverIdx] : null;

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-2 min-h-[20px]">
        <div className="text-xs text-[#ebebf5]/60 font-mono-tabular">
          {hoveredPoint ? (
            <span>
              {new Date(hoveredPoint.ts).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}{' '}
              · ${hoveredPoint.value.toFixed(2)}
              {hoveredPoint.marker ? ` · ${hoveredPoint.marker.label}` : ''}
            </span>
          ) : (
            <span>基準ライン ${startCash.toFixed(2)} (開始残高)</span>
          )}
        </div>
        <div className="flex items-center gap-1" role="tablist" aria-label="チャート期間">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                range === r
                  ? 'bg-[#2c2c2e] text-white font-semibold'
                  : 'text-[#ebebf5]/50 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[220px]">
        <canvas
          ref={canvasRef}
          style={{ width: `${canvasWidth}px`, height: `${height}px` }}
          className="block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </div>
    </div>
  );
};
