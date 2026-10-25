/**
 * GroundPoint / DropSpot Calculation Engine
 * Calculates the real-world ground coordinates (lat, lon) of any pixel clicked in a high-ground photo.
 */

export interface VantagePoint {
  lat: number;
  lon: number;
  altitudeMeters: number; // Height above ground level (e.g. 15th floor = ~45m)
  floor?: number;
  compassHeadingDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
  cameraPitchDeg: number; // Negative = looking downward (e.g. -45deg is looking down at 45 degree angle)
  hFovDeg?: number; // Horizontal field of view (typical phone ~68deg)
  vFovDeg?: number; // Vertical field of view (typical phone ~54deg)
}

export interface TargetCalculationResult {
  targetLat: number;
  targetLon: number;
  groundDistanceMeters: number; // Horizontal distance from building base
  slantDistanceMeters: number; // Direct 3D line-of-sight distance
  altitudeDropMeters: number;
  bearingDeg: number; // True azimuth bearing toward the target
  depressionAngleDeg: number; // Angle below horizontal (positive value in degrees)
  walkingEtaMinutes: number;
  stairsDescentMinutes: number;
  elevatorDescentMinutes: number;
  estimatedSteps: number;
  caloriesBurned: number;
  paperAirplaneFeasibility: {
    scorePct: number;
    verdict: string;
    advice: string;
  };
}

export interface RouteWaypoint {
  lat: number;
  lon: number;
  instruction: string;
  distanceMeters: number;
  type: 'start' | 'elevator' | 'lobby' | 'street' | 'target';
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normalizes an angle into [0, 360)
 */
export function normalizeBearing(deg: number): number {
  let b = deg % 360;
  if (b < 0) b += 360;
  return b;
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Computes destination latitude and longitude given start point, distance (meters), and bearing (degrees).
 */
export function projectCoordinates(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDeg: number
): { lat: number; lon: number } {
  if (distanceMeters <= 0) {
    return { lat, lon };
  }

  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDeg);
  const lat1 = toRadians(lat);
  const lon1 = toRadians(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: Number(toDegrees(lat2).toFixed(6)),
    lon: Number(toDegrees(lon2).toFixed(6)),
  };
}

/**
 * Calculates ground target coordinates from a photo click:
 * - clickXRatio: 0 (left edge) to 1 (right edge)
 * - clickYRatio: 0 (top edge) to 1 (bottom edge)
 */
export function calculateTargetGroundPoint(
  vantage: VantagePoint,
  clickXRatio: number,
  clickYRatio: number
): TargetCalculationResult {
  const hFov = vantage.hFovDeg ?? 68; // standard wide camera
  const vFov = vantage.vFovDeg ?? 54;
  const heightMeters = Math.max(1, vantage.altitudeMeters);

  // Optical center is at (0.5, 0.5)
  // normX in [-1, 1], positive = to the right
  // normY in [-1, 1], positive = towards bottom
  const normX = (clickXRatio - 0.5) * 2;
  const normY = (clickYRatio - 0.5) * 2;

  // Yaw deviation relative to camera center
  const deltaYaw = normX * (hFov / 2);

  // Pitch deviation relative to camera center
  // Looking lower down in the picture means a steeper downward angle
  const deltaPitch = -normY * (vFov / 2);

  // Overall ray pitch angle (negative is looking downward)
  // E.g., if camera pitch is -45deg, and click is at bottom of image (normY = 1),
  // deltaPitch is -27deg, total pitch is -72deg (steeper down).
  const rayPitchDeg = vantage.cameraPitchDeg + deltaPitch;

  // Depression angle is how far below horizon the ray is aimed
  // Clamp between 2 deg (near horizon) and 89.5 deg (almost straight down)
  let depressionAngleDeg = -rayPitchDeg;
  if (depressionAngleDeg < 2) depressionAngleDeg = 2;
  if (depressionAngleDeg > 89.5) depressionAngleDeg = 89.5;

  const depressionAngleRad = toRadians(depressionAngleDeg);

  // Horizontal ground distance from building base: D = H / tan(depression)
  const groundDistanceMeters = heightMeters / Math.tan(depressionAngleRad);

  // Direct 3D line-of-sight slant distance: S = sqrt(H^2 + D^2)
  const slantDistanceMeters = Math.hypot(heightMeters, groundDistanceMeters);

  // Target compass bearing
  const targetBearing = normalizeBearing(vantage.compassHeadingDeg + deltaYaw);

  // Project destination GPS
  const destination = projectCoordinates(
    vantage.lat,
    vantage.lon,
    groundDistanceMeters,
    targetBearing
  );

  // Human metrics:
  // Walking speed approx 1.4 m/s (84 m/min or ~5 km/h)
  const walkingEtaMinutes = Math.max(
    1,
    Math.ceil(groundDistanceMeters / 80 + (vantage.floor ?? Math.round(heightMeters / 3)) * 0.4)
  );

  const floorCount = vantage.floor ?? Math.max(1, Math.round(heightMeters / 3));
  const stairsDescentMinutes = Math.round((floorCount * 18) / 60 * 10) / 10; // ~18 seconds per floor descent
  const elevatorDescentMinutes = Math.round((floorCount * 3 + 20) / 60 * 10) / 10; // wait + ~3s/floor
  const estimatedSteps = Math.round(groundDistanceMeters / 0.75 + floorCount * 18);
  const caloriesBurned = Math.round(floorCount * 2.5 + groundDistanceMeters * 0.045);

  // Funny Paper Airplane feasibility rating:
  // Typical paper airplane glide ratio is ~4:1 in still air
  const glideRatio = groundDistanceMeters / heightMeters;
  let scorePct = Math.round(Math.max(5, Math.min(99, 100 - (glideRatio - 2.5) * 20)));
  let verdict = 'Feasible Glide!';
  let advice = 'Standard dart fold with a gentle flick should glide right into the target zone.';

  if (glideRatio <= 1.5) {
    scorePct = 96;
    verdict = 'Direct Drop Target! 🎯';
    advice = 'Nearly straight below! Fold a weighted nose-cone or drop a napkin parachute.';
  } else if (glideRatio <= 3.5) {
    scorePct = 88;
    verdict = 'Prime Gliding Range! ✈️';
    advice = 'Optimal lift-to-drag zone. Watch out for building thermal updrafts.';
  } else if (glideRatio <= 6.0) {
    scorePct = 52;
    verdict = 'Long-Distance Gamble 🌬️';
    advice = 'Needs an aerodynamic glider fold (Nakamura lock) and favorable tailwind.';
  } else {
    scorePct = 14;
    verdict = 'Impossible Mission 🚀';
    advice = 'Target is too far down the horizon. Better stick to the elevator and walk!';
  }

  return {
    targetLat: destination.lat,
    targetLon: destination.lon,
    groundDistanceMeters: Math.round(groundDistanceMeters),
    slantDistanceMeters: Math.round(slantDistanceMeters),
    altitudeDropMeters: Math.round(heightMeters),
    bearingDeg: Math.round(targetBearing * 10) / 10,
    depressionAngleDeg: Math.round(depressionAngleDeg * 10) / 10,
    walkingEtaMinutes,
    stairsDescentMinutes,
    elevatorDescentMinutes,
    estimatedSteps,
    caloriesBurned,
    paperAirplaneFeasibility: {
      scorePct,
      verdict,
      advice,
    },
  };
}

/**
 * Creates Google Maps Directions URL
 */
export function getGoogleMapsDirectionsUrl(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${targetLat},${targetLon}&travelmode=walking`;
}

/**
 * Creates Google Maps Search / Pin URL
 */
export function getGoogleMapsPinUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/**
 * Generates an estimated walking navigation route with realistic street grid turn waypoints.
 */
export function generateShortestWalkingRoute(
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number,
  floorCount: number
): RouteWaypoint[] {
  // Building exit waypoint (approx 15 meters out from building base)
  const dLat = targetLat - originLat;
  const dLon = targetLon - originLon;

  const exitRatio = 0.08;
  const lobbyLat = originLat + dLat * exitRatio;
  const lobbyLon = originLon + dLon * exitRatio;

  // Midpoint corner turn (L-shape urban walking route simulation)
  const cornerLat = originLat + dLat * 0.65;
  const cornerLon = lobbyLon;

  const totalDist = calculateDistanceMeters(originLat, originLon, targetLat, targetLon);

  return [
    {
      lat: originLat,
      lon: originLon,
      instruction: `Start at Floor ${floorCount} Balcony/Window vantage point`,
      distanceMeters: 0,
      type: 'start',
    },
    {
      lat: originLat,
      lon: originLon,
      instruction: `Take Elevator or South Fire Stairs down ${floorCount} floors`,
      distanceMeters: floorCount * 3,
      type: 'elevator',
    },
    {
      lat: lobbyLat,
      lon: lobbyLon,
      instruction: 'Exit through ground lobby doors onto street sidewalk',
      distanceMeters: Math.round(totalDist * exitRatio),
      type: 'lobby',
    },
    {
      lat: cornerLat,
      lon: cornerLon,
      instruction: 'Head straight along the avenue, cross pedestrian intersection',
      distanceMeters: Math.round(totalDist * 0.6),
      type: 'street',
    },
    {
      lat: targetLat,
      lon: targetLon,
      instruction: 'Arrive at spotted ground location pinpointed from above!',
      distanceMeters: Math.round(totalDist),
      type: 'target',
    },
  ];
}
