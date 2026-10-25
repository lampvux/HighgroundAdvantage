/**
 * Browser location acquisition: GPS position plus height above ground.
 * Kept separate from geoCalc.ts because it touches browser APIs and the network.
 */

import { estimateHeightAboveGround } from './geoCalc';

export type GpsStatus = 'idle' | 'acquiring' | 'locked' | 'error';

export interface LocationFix {
  lat: number;
  lon: number;
  /** Observer height above the terrain, or null when the device gives no usable altitude. */
  heightAboveGroundMeters: number | null;
  /** Vertical accuracy reported by the device (meters), if any. */
  heightAccuracyMeters: number | null;
}

const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation';

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  });
}

function describeGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Allow location access in your browser settings, or set your position manually.';
    case err.POSITION_UNAVAILABLE:
      return 'Your location is unavailable right now. Try again outdoors or near a window.';
    case err.TIMEOUT:
      return 'Locating took too long. Tap Refresh GPS to try again.';
    default:
      return 'Could not get your location.';
  }
}

/**
 * Looks up the terrain elevation (meters above sea level) at a coordinate.
 * Returns null on any network or parsing failure so callers can fall back to manual height.
 */
async function fetchGroundElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(`${ELEVATION_API_URL}?latitude=${lat}&longitude=${lon}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { elevation?: number[] };
    const elevation = data.elevation?.[0];
    return typeof elevation === 'number' && Number.isFinite(elevation) ? elevation : null;
  } catch {
    return null;
  }
}

/**
 * Requests the user's position (triggering the browser permission prompt on first use)
 * and estimates their height above ground from GPS altitude minus terrain elevation.
 * Rejects with a user-readable Error if location cannot be obtained.
 */
export async function acquireLocationFix(): Promise<LocationFix> {
  if (!navigator.geolocation) {
    throw new Error('Location is not supported by this browser. Set your position manually.');
  }

  let pos: GeolocationPosition;
  try {
    pos = await getCurrentPosition();
  } catch (err) {
    throw new Error(describeGeolocationError(err as GeolocationPositionError));
  }

  const { latitude, longitude, altitude, altitudeAccuracy } = pos.coords;
  const lat = Number(latitude.toFixed(6));
  const lon = Number(longitude.toFixed(6));

  let heightAboveGroundMeters: number | null = null;
  if (altitude !== null) {
    const groundElevation = await fetchGroundElevation(lat, lon);
    if (groundElevation !== null) {
      heightAboveGroundMeters = estimateHeightAboveGround(altitude, groundElevation);
    }
  }

  return {
    lat,
    lon,
    heightAboveGroundMeters,
    heightAccuracyMeters: altitudeAccuracy !== null ? Math.round(altitudeAccuracy) : null,
  };
}
