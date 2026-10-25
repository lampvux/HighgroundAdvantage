import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Navigation,
  Footprints,
  Clock,
  ArrowRight,
  TrendingDown,
  Building,
} from 'lucide-react';
import { TargetCalculationResult, generateShortestWalkingRoute } from '../utils/geoCalc';

interface RouteAnalysisCardProps {
  originLat: number;
  originLon: number;
  floor: number;
  calculation: TargetCalculationResult;
  onFloorChange?: (newFloor: number) => void;
}

export function RouteAnalysisCard({
  originLat,
  originLon,
  floor,
  calculation,
  onFloorChange,
}: RouteAnalysisCardProps) {
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${calculation.targetLat},${calculation.targetLon}&travelmode=walking`;

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${calculation.targetLat}, ${calculation.targetLon}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const routeSteps = generateShortestWalkingRoute(
    originLat,
    originLon,
    calculation.targetLat,
    calculation.targetLon,
    floor
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm w-full">
      {/* Top Header with detected coordinates & Google Maps CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-0.5">
            <span>Target Coordinates</span>
            <span aria-hidden="true">·</span>
            <span>Bearing {calculation.bearingDeg}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base sm:text-xl font-bold tracking-tight text-slate-900 tabular-nums">
              {calculation.targetLat.toFixed(5)}, {calculation.targetLon.toFixed(5)}
            </span>
            <button
              onClick={copyCoordinates}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
              title="Copy GPS coordinates"
              aria-label="Copy coordinates"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Action Button: Link to Google Maps */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
        >
          <Navigation className="w-4 h-4" />
          <span>Walk on Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <span className="text-[11px] text-slate-500 block mb-0.5">Ground Distance</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {calculation.groundDistanceMeters}
            </span>
            <span className="text-xs text-slate-500 font-medium">m</span>
          </div>
          <span className="text-[10px] text-slate-400">Slant: {calculation.slantDistanceMeters}m</span>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <span className="text-[11px] text-slate-500 block mb-0.5">Walking ETA</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {calculation.walkingEtaMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">min</span>
          </div>
          <span className="text-[10px] text-slate-400">Down &amp; walk</span>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <span className="text-[11px] text-slate-500 block mb-0.5">Altitude Drop</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {calculation.altitudeDropMeters}
            </span>
            <span className="text-xs text-slate-500 font-medium">m</span>
          </div>
          <span className="text-[10px] text-slate-400">Angle: {calculation.depressionAngleDeg}°</span>
        </div>
      </div>

      {/* Quick Floor Selector if onFloorChange provided */}
      {onFloorChange && (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            Current Floor: <strong>Floor {floor}</strong> (~{floor * 3}m)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onFloorChange(Math.max(1, floor - 1))}
              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center transition-colors"
              aria-label="Decrease floor"
            >
              -
            </button>
            <button
              onClick={() => onFloorChange(floor + 1)}
              className="w-7 h-7 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center transition-colors"
              aria-label="Increase floor"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Shortest Route Descent Guide */}
      <div>
        <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-blue-600" />
          <span>Shortest Route to Target</span>
        </h4>
        <div className="space-y-2">
          {routeSteps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100 text-xs"
            >
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-700 font-mono font-medium flex items-center justify-center shrink-0 text-[11px] shadow-2xs">
                {idx + 1}
              </div>
              <div className="flex-1 text-slate-700">
                <span>{step.instruction}</span>
                {step.distanceMeters > 0 && (
                  <span className="text-slate-400 text-[11px] ml-1.5 tabular-nums">
                    (~{step.distanceMeters}m)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
