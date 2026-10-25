import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceMeters,
  projectCoordinates,
  calculateTargetGroundPoint,
  normalizeBearing,
  getGoogleMapsDirectionsUrl,
  VantagePoint,
} from './geoCalc';

test('normalizeBearing wraps values correctly into 0..360', () => {
  assert.equal(normalizeBearing(0), 0);
  assert.equal(normalizeBearing(360), 0);
  assert.equal(normalizeBearing(450), 90);
  assert.equal(normalizeBearing(-90), 270);
  assert.equal(normalizeBearing(-45), 315);
});

test('calculateDistanceMeters calculates Haversine distance correctly', () => {
  // New York City to Empire State Building vicinity (~zero distance check)
  const dSame = calculateDistanceMeters(40.7484, -73.9857, 40.7484, -73.9857);
  assert.equal(Math.round(dSame), 0);

  // 1 degree latitude is approx 111,195 meters
  const dOneDegLat = calculateDistanceMeters(0, 0, 1, 0);
  assert.ok(Math.abs(dOneDegLat - 111195) < 500, `Expected ~111km, got ${dOneDegLat}`);
});

test('projectCoordinates projects point along bearing', () => {
  const originLat = 35.6586; // Tokyo Tower
  const originLon = 139.7454;
  const distance = 100; // 100 meters East (90 deg)
  const projected = projectCoordinates(originLat, originLon, distance, 90);

  // Moving East should maintain very close latitude and increase longitude
  assert.ok(Math.abs(projected.lat - originLat) < 0.0001);
  assert.ok(projected.lon > originLon);

  const measuredDist = calculateDistanceMeters(originLat, originLon, projected.lat, projected.lon);
  assert.ok(Math.abs(measuredDist - 100) < 1.0, `Expected ~100m, got ${measuredDist}`);
});

test('calculateTargetGroundPoint computes accurate ground distance and coordinates', () => {
  // Observer on 10th floor (~30m height), looking South (180deg) at -45deg pitch
  const vantage: VantagePoint = {
    lat: 37.7749,
    lon: -122.4194,
    altitudeMeters: 30,
    floor: 10,
    compassHeadingDeg: 180, // South
    cameraPitchDeg: -45, // 45 deg down
    hFovDeg: 60,
    vFovDeg: 45,
  };

  // Center of image click (0.5, 0.5)
  const centerResult = calculateTargetGroundPoint(vantage, 0.5, 0.5);

  // At 45 degree angle and 30m height, ground distance = 30 / tan(45) = 30m
  assert.equal(centerResult.groundDistanceMeters, 30);
  assert.equal(centerResult.altitudeDropMeters, 30);
  assert.equal(centerResult.bearingDeg, 180);
  assert.equal(centerResult.depressionAngleDeg, 45);
  // Slant distance = sqrt(30^2 + 30^2) = 42.4 ~ 42m
  assert.equal(centerResult.slantDistanceMeters, 42);

  // Since bearing is South (180), target latitude should be less than origin latitude
  assert.ok(centerResult.targetLat < vantage.lat);
  // Longitude should be virtually unchanged
  assert.ok(Math.abs(centerResult.targetLon - vantage.lon) < 0.0001);

  // Clicking lower down in the image (e.g. y = 0.9) means looking steeper down, closer to building
  const bottomResult = calculateTargetGroundPoint(vantage, 0.5, 0.9);
  assert.ok(bottomResult.groundDistanceMeters < centerResult.groundDistanceMeters);
  assert.ok(bottomResult.depressionAngleDeg > centerResult.depressionAngleDeg);

  // Clicking near top of image (y = 0.1) means looking further out towards horizon
  const topResult = calculateTargetGroundPoint(vantage, 0.5, 0.1);
  assert.ok(topResult.groundDistanceMeters > centerResult.groundDistanceMeters);
  assert.ok(topResult.depressionAngleDeg < centerResult.depressionAngleDeg);

  // Paper airplane rating should be populated
  assert.ok(centerResult.paperAirplaneFeasibility.scorePct > 0);
  assert.ok(centerResult.paperAirplaneFeasibility.verdict.length > 0);
});

test('getGoogleMapsDirectionsUrl returns properly formatted URL', () => {
  const url = getGoogleMapsDirectionsUrl(37.7749, -122.4194, 37.7755, -122.419);
  assert.ok(url.includes('google.com/maps/dir/'));
  assert.ok(url.includes('origin=37.7749,-122.4194'));
  assert.ok(url.includes('destination=37.7755,-122.419'));
  assert.ok(url.includes('travelmode=walking'));
});
