import React, { useState } from 'react';
import {
  Compass,
  Building,
  Sliders,
  MapPin,
  LocateFixed,
  RotateCcw,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { VantagePoint } from '../utils/geoCalc';

interface VantageCalibrationPanelProps {
  vantage: VantagePoint & { locationName: string };
  onChange: (updated: VantagePoint & { locationName: string }) => void;
  onReset: () => void;
}

export function VantageCalibrationPanel({
  vantage,
  onChange,
  onReset,
}: VantageCalibrationPanelProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gyroActive, setGyroActive] = useState(false);

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocation not supported by this browser.');
      return;
    }

    setGpsLoading(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude, longitude, altitude } = pos.coords;
        const newAltitude = altitude && altitude > 5 ? Math.round(altitude) : vantage.altitudeMeters;
        onChange({
          ...vantage,
          lat: Number(latitude.toFixed(6)),
          lon: Number(longitude.toFixed(6)),
          altitudeMeters: newAltitude,
          locationName: `GPS Fix (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        });
        setGpsMessage('GPS locked successfully!');
        setTimeout(() => setGpsMessage(null), 3000);
      },
      (err) => {
        setGpsLoading(false);
        setGpsMessage(`Location permission denied or unavailable (${err.message}). Using manual location.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const enableGyroSensors = () => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      // For iOS 13+ permission request
      const deviceOrientation = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof deviceOrientation.requestPermission === 'function') {
        deviceOrientation
          .requestPermission()
          .then((permissionState) => {
            if (permissionState === 'granted') {
              bindOrientationListener();
            } else {
              setGpsMessage('Device motion sensors permission denied.');
            }
          })
          .catch(() => {
            setGpsMessage('Device motion sensors unavailable on this device.');
          });
      } else {
        bindOrientationListener();
      }
    } else {
      setGpsMessage('Device sensors not available in this browser.');
    }
  };

  const bindOrientationListener = () => {
    setGyroActive(true);
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && e.beta !== null) {
        // alpha: compass heading (0..360)
        // beta: tilt front-to-back (-180..180)
        const heading = Math.round(360 - e.alpha);
        const pitch = Math.max(-85, Math.min(-15, Math.round(-Math.abs(e.beta))));
        onChange({
          ...vantage,
          compassHeadingDeg: heading,
          cameraPitchDeg: pitch,
        });
      }
    };
    window.addEventListener('deviceorientation', handler, { once: true });
    setGpsMessage('Sensors calibrated from phone tilt!');
    setTimeout(() => setGpsMessage(null), 3000);
  };

  const getCompassDirectionLabel = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col gap-4 sm:gap-5 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Vantage &amp; Camera Calibration</h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* GPS Location Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Observer GPS Coordinates</span>
            <span className="text-sm font-semibold text-slate-900 font-mono">
              {vantage.lat.toFixed(5)}, {vantage.lon.toFixed(5)}
            </span>
            <span className="text-xs text-slate-400 block truncate max-w-[240px]">
              {vantage.locationName}
            </span>
          </div>
        </div>

        <button
          onClick={requestGeolocation}
          disabled={gpsLoading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs rounded-lg shadow-2xs transition-colors shrink-0"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
          <span>{gpsLoading ? 'Acquiring GPS...' : 'Use My Current GPS'}</span>
        </button>
      </div>

      {gpsMessage && (
        <div className="text-xs px-3 py-2 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{gpsMessage}</span>
        </div>
      )}

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Floor Level / Altitude */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              Floor Level / Height
            </span>
            <span className="font-mono font-bold text-slate-900">
              Floor {vantage.floor ?? Math.round(vantage.altitudeMeters / 3)} ({vantage.altitudeMeters}m)
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={75}
            step={1}
            value={vantage.floor ?? Math.round(vantage.altitudeMeters / 3)}
            onChange={(e) => {
              const floor = Number(e.target.value);
              onChange({
                ...vantage,
                floor,
                altitudeMeters: floor * 3,
              });
            }}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Floor 1 (3m)</span>
            <span>Floor 25 (75m)</span>
            <span>Floor 75 (225m)</span>
          </div>
        </div>

        {/* Compass Bearing */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              Compass Heading
            </span>
            <span className="font-mono font-bold text-slate-900">
              {vantage.compassHeadingDeg}° ({getCompassDirectionLabel(vantage.compassHeadingDeg)})
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={vantage.compassHeadingDeg}
            onChange={(e) =>
              onChange({
                ...vantage,
                compassHeadingDeg: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0° N</span>
            <span>90° E</span>
            <span>180° S</span>
            <span>270° W</span>
          </div>
        </div>

        {/* Camera Pitch Tilt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Downward Camera Angle
            </span>
            <span className="font-mono font-bold text-slate-900">
              {Math.abs(vantage.cameraPitchDeg)}° Down
            </span>
          </div>
          <input
            type="range"
            min={-80}
            max={-15}
            step={1}
            value={vantage.cameraPitchDeg}
            onChange={(e) =>
              onChange({
                ...vantage,
                cameraPitchDeg: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>15° Shallow</span>
            <span>45° Moderate</span>
            <span>80° Steep Down</span>
          </div>
        </div>
      </div>

      {/* Gyroscope Auto-detection button */}
      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
        <span>Using your phone on a balcony right now?</span>
        <button
          onClick={enableGyroSensors}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{gyroActive ? 'Sensors Synced' : 'Sync Phone Orientation'}</span>
        </button>
      </div>
    </div>
  );
}
