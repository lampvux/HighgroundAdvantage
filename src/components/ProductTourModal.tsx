import React, { useState } from 'react';
import {
  Camera,
  Target,
  Calculator,
  Navigation,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import balconyViewImg from '../assets/images/balcony_view_crossing_1792833670416.jpg';
import rooftopParkImg from '../assets/images/rooftop_park_fountain_1792833683045.jpg';
import waterfrontDeckImg from '../assets/images/waterfront_promenade_deck_1792833696233.jpg';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleImage?: (imageUrl: string) => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  exampleImage: string;
  exampleCaption: string;
  hasTargetOverlay?: boolean;
  targetPos?: { x: string; y: string; label: string };
  icon: React.ReactNode;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    badge: 'Step 1 of 4',
    title: 'Snap Your High-Ground View',
    subtitle: 'From a balcony, high-rise window, rooftop, or observation deck',
    description: 'Look down from your building and snap a photo of the streets or courtyard below.',
    exampleImage: balconyViewImg,
    exampleCaption: '18th-floor balcony view looking down at street crosswalks and outdoor cafes.',
    icon: <Camera className="w-5 h-5 text-blue-600" />,
  },
  {
    badge: 'Step 2 of 4',
    title: 'Tap Any Spot on the Ground',
    subtitle: 'Pinpoint any cafe table, crosswalk, fountain, or person',
    description: 'Click anywhere in the photo to lock on your destination with real-time aim reticle.',
    exampleImage: rooftopParkImg,
    exampleCaption: 'Tapping the central park fountain from a 12th-floor residential rooftop.',
    hasTargetOverlay: true,
    targetPos: { x: '50%', y: '50%', label: 'Central Fountain' },
    icon: <Target className="w-5 h-5 text-rose-500" />,
  },
  {
    badge: 'Step 3 of 4',
    title: 'Visual Triangulation & GPS',
    subtitle: 'Translating image pixels into real latitude and longitude',
    description: 'Combines vantage GPS, floor level, and camera tilt to compute ground coordinates.',
    exampleImage: waterfrontDeckImg,
    exampleCaption: 'Targeting a blue food truck on a riverside boardwalk (32m drop, 45m distance).',
    hasTargetOverlay: true,
    targetPos: { x: '43%', y: '45%', label: 'Riverside Food Truck' },
    icon: <Calculator className="w-5 h-5 text-indigo-600" />,
  },
  {
    badge: 'Step 4 of 4',
    title: 'Walk There via Google Maps',
    subtitle: 'Shortest route right from your building lobby to the spot',
    description: 'See the shortest walking path and open turn-by-turn navigation in Google Maps.',
    exampleImage: balconyViewImg,
    exampleCaption: '30m ground path, 7-minute descent ETA, and 1-tap Google Maps walking directions.',
    hasTargetOverlay: true,
    targetPos: { x: '22%', y: '65%', label: 'Cafe Terrace' },
    icon: <Navigation className="w-5 h-5 text-emerald-600" />,
  },
];

export function ProductTourModal({
  isOpen,
  onClose,
  onSelectSampleImage,
}: ProductTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleUseThisExample = () => {
    if (onSelectSampleImage) {
      onSelectSampleImage(currentStep.exampleImage);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl h-[90vh] max-h-[820px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Product Tour
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-medium">
              {currentStep.badge}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close product tour"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body (Flex column, image takes >50% of height) */}
        <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 gap-3.5 overflow-hidden">
          {/* Step Title Header (Compact) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              {currentStep.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="tour-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {currentStep.title}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {/* LARGE EXAMPLE IMAGE VIEW (> 50% of modal height) */}
          <div className="relative flex-1 min-h-[52%] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner group">
            <img
              src={currentStep.exampleImage}
              alt={currentStep.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Target Reticle Overlay */}
            {currentStep.hasTargetOverlay && currentStep.targetPos && (
              <div
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: currentStep.targetPos.x,
                  top: currentStep.targetPos.y,
                }}
              >
                <div className="absolute -inset-4 rounded-full border-2 border-rose-500 animate-ping opacity-75"></div>
                <div className="relative w-12 h-12 rounded-full border-2 border-rose-400 bg-rose-500/30 backdrop-blur-xs flex items-center justify-center shadow-xl shadow-rose-950/60">
                  <div className="absolute w-full h-[1.5px] bg-white"></div>
                  <div className="absolute h-full w-[1.5px] bg-white"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white border border-rose-600"></div>
                </div>
                <div className="absolute top-13 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-rose-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-lg">
                  🎯 {currentStep.targetPos.label}
                </div>
              </div>
            )}

            {/* Top Badge */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-white text-[10px] font-mono tracking-wider">
              HIGH-GROUND EXAMPLE
            </div>

            {/* One-click Action to test with this view */}
            {onSelectSampleImage && (
              <button
                type="button"
                onClick={handleUseThisExample}
                className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-900 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Test With This View</span>
              </button>
            )}
          </div>

          {/* Concise Single-Line Guide Text & Caption below image */}
          <div className="shrink-0 flex flex-col gap-1 px-1 min-w-0 max-w-full overflow-hidden">
            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
              {currentStep.description}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-1 break-words">
              {currentStep.exampleCaption}
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 shrink-0 pt-0.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-7 bg-blue-600'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Sticky Footer Controls */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{isLast ? "Got it! Let's Go" : 'Next'}</span>
              {isLast ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
