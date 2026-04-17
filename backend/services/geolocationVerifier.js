const ZONE_COORDS = {
  "Chennai - Velachery":     { lat: 12.9698, lon: 80.2425, radius: 5 },
  "Chennai - Adyar":         { lat: 13.0012, lon: 80.2565, radius: 5 },
  "Chennai - Tambaram":      { lat: 12.9249, lon: 80.1000, radius: 6 },
  "Mumbai - Dharavi":        { lat: 19.0176, lon: 72.8479, radius: 5 },
  "Delhi - Noida":           { lat: 28.5355, lon: 77.3910, radius: 7 },
  "Delhi - Saket":           { lat: 28.5244, lon: 77.2066, radius: 5 },
  "Bangalore - Koramangala": { lat: 12.9352, lon: 77.6245, radius: 5 },
  "Hyderabad - Hitech City": { lat: 17.4435, lon: 78.3772, radius: 6 },
};

// Haversine formula — returns distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Verify if a GPS coordinate is within the worker's registered zone.
 * @param {string} zone - registered zone name
 * @param {number} claimLat - claim latitude
 * @param {number} claimLon - claim longitude
 * @returns {{ valid: boolean, distance: number, reason: string|null }}
 */
function verifyLocation(zone, claimLat, claimLon) {
  const coords = ZONE_COORDS[zone];

  if (!coords) {
    return { valid: false, distance: null, reason: "UNKNOWN_ZONE" };
  }

  if (claimLat == null || claimLon == null) {
    // No GPS provided — skip location check (don't block)
    return { valid: true, distance: null, reason: null };
  }

  const distance = haversineDistance(coords.lat, coords.lon, claimLat, claimLon);

  if (distance > coords.radius) {
    console.log(`[GeoVerifier] MISMATCH zone=${zone} distance=${distance.toFixed(2)}km radius=${coords.radius}km`);
    return { valid: false, distance, reason: "LOCATION_MISMATCH" };
  }

  return { valid: true, distance, reason: null };
}

function getZoneCoords(zone) {
  return ZONE_COORDS[zone] || null;
}

module.exports = { verifyLocation, getZoneCoords, ZONE_COORDS };
