import React, { useRef, useState } from 'react';
import { Crosshair, RefreshCw, ZoomIn } from 'lucide-react';

interface PhotoViewfinderProps {
  imageUrl: string;
  clickPoint: { xRatio: number; yRatio: number; label?: string } | null;
  onPointSelected: (point: { xRatio: number; yRatio: number; label?: string }) => void;
  altitudeMeters: number;
  floor: number;
}

export function PhotoViewfinder({
  imageUrl,
  clickPoint,
  onPointSelected,
  altitudeMeters,
  floor,
}: PhotoViewfinderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; xPct: number; yPct: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setHoverPos({
      x,
      y,
      xPct: Math.round((x / rect.width) * 100),
      yPct: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const xRatio = Number((x / rect.width).toFixed(4));
    const yRatio = Number((y / rect.height).toFixed(4));

    onPointSelected({
      xRatio,
      yRatio,
      label: `Target Spot (${Math.round(xRatio * 100)}%, ${Math.round(yRatio * 100)}%)`,
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Viewfinder Header */}
      <div className="flex items-center justify-between gap-1.5 text-xs w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[55%] sm:max-w-none">
          <span className="font-bold text-slate-900 flex items-center gap-1 shrink-0">
            <Crosshair className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">High-Ground</span> Viewfinder
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-500 text-[11px] truncate">
            {clickPoint ? 'Tap to re-target' : 'Tap on ground'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            Floor {floor} ({altitudeMeters}m)
          </span>
          {clickPoint && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPointSelected({ xRatio: 0.5, yRatio: 0.5, label: 'Center Target' });
              }}
              className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors"
              title="Reset target to center"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Photo Canvas */}
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-crosshair select-none bg-slate-950 shadow-md border border-slate-200"
      >
        <img
          src={imageUrl}
          alt="High ground view"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Viewfinder framing brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-white/80 pointer-events-none"></div>
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/80 pointer-events-none"></div>
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/80 pointer-events-none"></div>
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-white/80 pointer-events-none"></div>

        {/* Status Chip */}
        <div className="absolute top-3 left-4 pointer-events-none flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>{clickPoint ? 'TARGET ACQUIRED' : 'CLICK TO TARGET'}</span>
        </div>

        {/* Coordinate indicator on bottom */}
        <div className="absolute bottom-3 right-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[11px] font-mono tabular-nums">
          {hoverPos ? `AIM: X ${hoverPos.xPct}% · Y ${hoverPos.yPct}%` : 'TAP ANYWHERE ON GROUND'}
        </div>

        {/* Active Target Reticle */}
        {clickPoint && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 z-20"
            style={{
              left: `${clickPoint.xRatio * 100}%`,
              top: `${clickPoint.yRatio * 100}%`,
            }}
          >
            {/* Pulsing ring */}
            <div className="absolute -inset-3.5 rounded-full border-2 border-rose-500 animate-ping opacity-75"></div>
            {/* Target Reticle */}
            <div className="relative w-11 h-11 rounded-full border-2 border-rose-400 bg-rose-500/25 backdrop-blur-xs flex items-center justify-center shadow-lg shadow-rose-950/50">
              <div className="absolute w-full h-[1.5px] bg-white"></div>
              <div className="absolute h-full w-[1.5px] bg-white"></div>
              <div className="w-2 h-2 rounded-full bg-white border border-rose-600 shadow-xs"></div>
            </div>

            {/* Target Label */}
            <div className="absolute top-13 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-rose-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
              🎯 Target Locked
            </div>
          </div>
        )}

        {/* Hover Crosshairs */}
        {hoverPos && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 opacity-75 z-10"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="w-6 h-6 rounded-full border border-dashed border-white/90 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
