/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  ExternalLink,
  ArrowDownRight,
  LocateFixed,
  SlidersHorizontal,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { calculateTargetGroundPoint, floorFromHeight, VantagePoint } from './utils/geoCalc';
import { acquireLocationFix, GpsStatus } from './utils/location';
import { PhotoViewfinder } from './components/PhotoViewfinder';
import { RouteMap } from './components/RouteMap';
import { RouteAnalysisCard } from './components/RouteAnalysisCard';
import { VantageCalibrationPanel } from './components/VantageCalibrationPanel';
import { ProductTourModal } from './components/ProductTourModal';
// High-resolution real high-ground sample image for instant testing without camera
import SAMPLE_IMAGE_URL from './assets/images/balcony_view_crossing_1792833670416.jpg';

export default function App() {
  // Photo state (null initially until user takes/uploads photo or clicks sample)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // User vantage state
  const [vantage, setVantage] = useState<VantagePoint & { locationName: string }>({
    locationName: 'My Balcony Vantage',
    lat: 40.7618,
    lon: -73.9822,
    floor: 15,
    altitudeMeters: 45,
    compassHeadingDeg: 335,
    cameraPitchDeg: -48,
    hFovDeg: 68,
    vFovDeg: 54,
  });

  // Target spot on the photo (normalized coordinates 0..1)
  const [selectedPoint, setSelectedPoint] = useState<{
    xRatio: number;
    yRatio: number;
    label?: string;
  } | null>(null);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  // Where the current vantage height came from; GPS must not clobber a manually set floor
  const [heightSource, setHeightSource] = useState<'default' | 'gps' | 'manual'>('default');
  const [heightAccuracy, setHeightAccuracy] = useState<number | null>(null);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);

  // Check if first-time user on mount
  useEffect(() => {
    try {
      const hasSeenTour = localStorage.getItem('dropspot_tour_seen');
      if (!hasSeenTour) {
        setShowTour(true);
      }
    } catch {
      // In case localStorage is blocked in some iframes
    }
  }, []);

  const handleCloseTour = () => {
    try {
      localStorage.setItem('dropspot_tour_seen', 'true');
    } catch {
      // ignore
    }
    setShowTour(false);
  };

  const handleOpenTour = () => {
    setShowTour(true);
  };

  // Camera input forces the rear camera on mobile; library input opens the photo gallery / file picker
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Acquire GPS position + height above ground. A GPS height never overwrites a height the user
  // set by hand unless they explicitly ask for a refresh (overrideManualHeight).
  const requestCurrentGps = async (overrideManualHeight = false) => {
    setGpsStatus('acquiring');
    setGpsMessage(null);
    try {
      const fix = await acquireLocationFix();
      const gpsHeight = fix.heightAboveGroundMeters;
      const applyHeight = gpsHeight !== null && (overrideManualHeight || heightSource !== 'manual');

      setVantage((prev) => ({
        ...prev,
        lat: fix.lat,
        lon: fix.lon,
        locationName: `GPS Fix (${fix.lat.toFixed(4)}, ${fix.lon.toFixed(4)})`,
        ...(applyHeight ? { altitudeMeters: gpsHeight, floor: floorFromHeight(gpsHeight) } : {}),
      }));
      if (applyHeight) {
        setHeightSource('gps');
        setHeightAccuracy(fix.heightAccuracyMeters);
      }
      setGpsStatus('locked');
      if (gpsHeight === null && heightSource !== 'manual') {
        setGpsMessage('Your device did not report a usable height. Set your floor in Height & Tilt.');
      }
    } catch (err) {
      setGpsStatus('error');
      setGpsMessage(err instanceof Error ? err.message : 'Could not get your location.');
    }
  };

  // Ask for the user's location as soon as the app opens
  useEffect(() => {
    requestCurrentGps();
  }, []);

  const handlePhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoUrl(result);
      setSelectedPoint({ xRatio: 0.5, yRatio: 0.65, label: 'Selected Target Spot' });
      if (gpsStatus !== 'locked') requestCurrentGps();
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    // Reset so picking the same file again still fires onChange
    e.target.value = '';
  };

  const handleLoadSample = () => {
    setPhotoUrl(SAMPLE_IMAGE_URL);
    setSelectedPoint({ xRatio: 0.22, yRatio: 0.65, label: 'Spotted Yellow Cafe Umbrellas' });
    if (gpsStatus !== 'locked') requestCurrentGps();
  };

  const heightLabel =
    heightSource === 'gps'
      ? `~${vantage.altitudeMeters}m above ground (GPS${heightAccuracy !== null ? ` ±${heightAccuracy}m` : ''})`
      : heightSource === 'manual'
        ? `${vantage.altitudeMeters}m above ground (manual)`
        : `${vantage.altitudeMeters}m above ground (default)`;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handlePhotoFile(file);
    }
  };

  // Compute calculated target ground point
  const targetCalculation = useMemo(() => {
    const pt = selectedPoint ?? { xRatio: 0.5, yRatio: 0.5 };
    return calculateTargetGroundPoint(vantage, pt.xRatio, pt.yRatio);
  }, [vantage, selectedPoint]);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col antialiased">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-tight">
              DropSpot
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:block">
              High-Ground Vantage Navigator
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* How it Works / Tour Button */}
          <button
            onClick={handleOpenTour}
            aria-label="How It Works & Product Tour"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0"
            title="Open Product Tour & Guide"
          >
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">How It Works</span>
            <span className="sm:hidden text-[11px]">Guide</span>
          </button>

          {photoUrl && (
            <button
              onClick={() => setShowCalibration(!showCalibration)}
              aria-label="Adjust Height and Tilt"
              className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
                showCalibration
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{showCalibration ? 'Close Tuning' : 'Height & Tilt'}</span>
            </button>
          )}

          <button
            onClick={() => libraryInputRef.current?.click()}
            aria-label="Choose photo from library"
            title="Choose from Library"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Take photo with camera"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{photoUrl ? 'New Photo' : 'Take Photo'}</span>
            <span className="sm:hidden">{photoUrl ? 'New' : 'Photo'}</span>
          </button>
        </div>
      </header>

      {/* Product Tour Modal (First-time user popup + clickable via Guide button) */}
      <ProductTourModal
        isOpen={showTour}
        onClose={handleCloseTour}
        onSelectSampleImage={(sampleUrl) => {
          setPhotoUrl(sampleUrl);
          setSelectedPoint({ xRatio: 0.5, yRatio: 0.5, label: 'Target Spot' });
          if (gpsStatus !== 'locked') requestCurrentGps();
        }}
      />

      {/* Main Experience Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col gap-5">
        {!photoUrl ? (
          /* Empty / Upload View (No photo yet) */
          <div className="flex-1 flex flex-col items-center justify-center py-10 sm:py-16">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => libraryInputRef.current?.click()}
              className={`w-full max-w-xl p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-sm'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Camera className="w-8 h-8" />
              </div>

              <div className="max-w-md">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">
                  Take or Upload High-Ground View
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Looking down from a building balcony, skyscraper window, or hilltop? Snap a photo of the street below and tap any spot to find its exact coordinates and route.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    libraryInputRef.current?.click();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl shadow-2xs transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  Choose from Library
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs sm:text-sm rounded-xl transition-colors"
                >
                  Try with Sample View
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span>Camera, photo library, or drag-and-drop</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTour();
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  Product Tour &amp; Guide
                </button>
              </div>
            </div>

            {/* Location status (requested automatically on load) */}
            <div className="w-full max-w-xl mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${gpsStatus === 'locked' ? 'bg-emerald-50 text-emerald-600' : gpsStatus === 'error' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    <LocateFixed className={`w-3.5 h-3.5 ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 block">
                      {gpsStatus === 'locked'
                        ? 'Your location is locked'
                        : gpsStatus === 'acquiring'
                          ? 'Finding your location…'
                          : gpsStatus === 'error'
                            ? 'Location unavailable'
                            : 'Location not requested yet'}
                    </span>
                    {gpsStatus === 'locked' && (
                      <span className="text-slate-500 block truncate">
                        <span className="font-mono tabular-nums">{vantage.lat.toFixed(5)}, {vantage.lon.toFixed(5)}</span>
                        {' · '}
                        {heightLabel}
                      </span>
                    )}
                  </div>
                </div>
                {gpsStatus !== 'acquiring' && gpsStatus !== 'locked' && (
                  <button
                    type="button"
                    onClick={() => requestCurrentGps(true)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] shrink-0 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
              {gpsMessage && (
                <div className="text-[11px] px-3 py-2 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{gpsMessage}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Active Experience (Photo loaded) */
          <>
            {/* GPS & Vantage Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs w-full">
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <div className={`p-1.5 rounded-lg shrink-0 ${gpsStatus === 'locked' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  <span className="font-semibold text-slate-800 shrink-0">Vantage GPS:</span>
                  <span className="font-mono text-slate-600 tabular-nums truncate">
                    {vantage.lat.toFixed(5)}, {vantage.lon.toFixed(5)}
                  </span>
                  {gpsStatus === 'locked' && (
                    <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Locked
                    </span>
                  )}
                  <span className="text-slate-500 flex items-center gap-1 shrink-0">
                    <Building className="w-3 h-3" />
                    {heightLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => requestCurrentGps(true)}
                  disabled={gpsStatus === 'acquiring'}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-[11px] flex items-center gap-1 transition-colors"
                >
                  <LocateFixed className={`w-3 h-3 ${gpsStatus === 'acquiring' ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{gpsStatus === 'acquiring' ? 'Locating...' : 'Refresh GPS'}</span>
                </button>
              </div>
            </div>

            {gpsMessage && (
              <div className="text-xs px-3 py-2 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{gpsMessage}</span>
              </div>
            )}

            {/* Expandable Calibration Panel */}
            {showCalibration && (
              <VantageCalibrationPanel
                vantage={vantage}
                gpsStatus={gpsStatus}
                onRequestGps={() => requestCurrentGps(true)}
                onChange={(updated) => {
                  if (updated.altitudeMeters !== vantage.altitudeMeters) setHeightSource('manual');
                  setVantage(updated);
                }}
                onReset={() => {
                  setHeightSource('default');
                  setVantage((prev) => ({
                    ...prev,
                    floor: 15,
                    altitudeMeters: 45,
                    cameraPitchDeg: -45,
                  }));
                }}
              />
            )}

            {/* Core Two-Column Experience */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Interactive Photo Viewfinder */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
                  <PhotoViewfinder
                    imageUrl={photoUrl}
                    clickPoint={selectedPoint}
                    onPointSelected={(pt) => setSelectedPoint(pt)}
                    altitudeMeters={vantage.altitudeMeters}
                    floor={vantage.floor ?? Math.round(vantage.altitudeMeters / 3)}
                  />
                </div>
              </div>

              {/* Right Column: Route Map & Navigation */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {/* Interactive Leaflet Route Map */}
                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Walking Route to Spotted Point
                    </span>
                    <span className="font-mono text-slate-600">
                      {targetCalculation.groundDistanceMeters}m ground path
                    </span>
                  </div>

                  <RouteMap
                    originLat={vantage.lat}
                    originLon={vantage.lon}
                    targetLat={targetCalculation.targetLat}
                    targetLon={targetCalculation.targetLon}
                    vantageTitle="Your Vantage Point"
                    targetLabel={selectedPoint?.label || 'Target Spot'}
                    groundDistanceMeters={targetCalculation.groundDistanceMeters}
                  />
                </div>

                {/* Route Analysis & Google Maps Button */}
                <RouteAnalysisCard
                  originLat={vantage.lat}
                  originLon={vantage.lon}
                  floor={vantage.floor ?? Math.round(vantage.altitudeMeters / 3)}
                  calculation={targetCalculation}
                  onFloorChange={(newFloor) => {
                    setHeightSource('manual');
                    setVantage((prev) => ({
                      ...prev,
                      floor: newFloor,
                      altitudeMeters: newFloor * 3,
                    }));
                  }}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile Sticky Action Bar */}
      {photoUrl && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 font-medium">Target Ground Point</div>
            <div className="font-mono text-xs font-bold text-slate-900 truncate">
              {targetCalculation.groundDistanceMeters}m · {targetCalculation.walkingEtaMinutes} min ETA
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${vantage.lat},${vantage.lon}&destination=${targetCalculation.targetLat},${targetCalculation.targetLon}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 active:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm shrink-0"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 sm:px-8 pb-16 sm:pb-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DropSpot · High-Ground Geolocation &amp; Route Finder</span>
          <span>No Login Required</span>
        </div>
      </footer>
    </div>
  );
}
