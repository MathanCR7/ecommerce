// backend/utils/locationUtils.js

/**
 * Checks if a point is inside a polygon using the ray-casting algorithm.
 * @param {number[]} point - The point to check, as [longitude, latitude].
 * @param {number[][][]} polygonCoordinates - The polygon coordinates in GeoJSON format
 *                                         (array of linear rings, e.g., [[[lon,lat],...]]).
 * @returns {boolean} - True if the point is inside the polygon, false otherwise.
 */
export function isPointInPolygon(point, polygonCoordinates) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  if (
    !polygonCoordinates ||
    !Array.isArray(polygonCoordinates) ||
    polygonCoordinates.length === 0
  ) {
    console.warn("isPointInPolygon: Invalid polygonCoordinates provided.");
    return false; // Or true, depending on desired behavior for invalid polygon (e.g., allow delivery)
  }

  const x = point[0]; // longitude
  const y = point[1]; // latitude

  const vs = polygonCoordinates[0]; // Use the first linear ring (exterior boundary)

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], // Expected longitude of polygon vertex
      yi = vs[i][1]; // Expected latitude of polygon vertex
    const xj = vs[j][0],
      yj = vs[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Parses the delivery zone polygon coordinates from the .env file.
 * Assumes .env stores coordinates as [latitude, longitude] and transforms them to [longitude, latitude].
 * @returns {number[][][] | null} - The parsed and transformed polygon coordinates [[[lon,lat], ...]] or null.
 */
export const getDeliveryZonePolygon = () => {
  try {
    const polygonString = process.env.DELIVERY_ZONE_POLYGON_COORDINATES;
    if (!polygonString) {
      console.warn(
        "DELIVERY_ZONE_POLYGON_COORDINATES not set in .env. Delivery zone check will be skipped."
      );
      return null; // Skip check if not configured
    }

    // Assuming polygonString from .env is like '[[[lat1,lon1], [lat2,lon2], ...]]'
    const parsedOriginalFormatPolygon = JSON.parse(polygonString);

    // Basic validation for the original GeoJSON Polygon's "coordinates" structure
    if (
      !Array.isArray(parsedOriginalFormatPolygon) ||
      parsedOriginalFormatPolygon.length === 0 ||
      !Array.isArray(parsedOriginalFormatPolygon[0]) ||
      parsedOriginalFormatPolygon[0].length < 4 || // A polygon needs at least 3 distinct vertices + 1 closing vertex
      !parsedOriginalFormatPolygon[0].every(
        (coordPair) =>
          Array.isArray(coordPair) &&
          coordPair.length === 2 &&
          typeof coordPair[0] === "number" &&
          typeof coordPair[1] === "number"
      )
    ) {
      console.error(
        "Invalid DELIVERY_ZONE_POLYGON_COORDINATES format in .env. Expected an array containing one array of [value,value] pairs, e.g., [[[lat,lon],...]] or [[[lon,lat],...]])."
      );
      return null;
    }

    // Check if the original polygon is closed (first and last points of the outer ring are identical)
    const originalOuterRing = parsedOriginalFormatPolygon[0];
    const originalFirstPoint = originalOuterRing[0];
    const originalLastPoint = originalOuterRing[originalOuterRing.length - 1];
    if (
      originalFirstPoint[0] !== originalLastPoint[0] ||
      originalFirstPoint[1] !== originalLastPoint[1]
    ) {
      console.error(
        "DELIVERY_ZONE_POLYGON_COORDINATES in .env is not a closed polygon. The first and last coordinate pairs in the outer ring must be identical (e.g., [[[lat1,lon1],[lat2,lon2],...,[lat1,lon1]]])."
      );
      return null;
    }

    // Transform from [[latitude,longitude],...] (assumed .env format)
    // to [[longitude,latitude],...] (format expected by isPointInPolygon)
    const transformedPolygonForProcessing = parsedOriginalFormatPolygon.map(
      (linearRing) =>
        linearRing.map((coordPair) => [coordPair[1], coordPair[0]]) // Swap to [longitude, latitude]
    );

    console.log(
      "Successfully parsed delivery zone. Original format in .env (first 3 points):",
      JSON.stringify(parsedOriginalFormatPolygon[0].slice(0, 3)) + "..."
    );
    console.log(
      "Transformed to [lon, lat] for internal processing (first 3 points):",
      JSON.stringify(transformedPolygonForProcessing[0].slice(0, 3)) + "..."
    );

    return transformedPolygonForProcessing;
  } catch (error) {
    console.error(
      "Error parsing or transforming DELIVERY_ZONE_POLYGON_COORDINATES from .env:",
      error.message,
      error.stack // Added stack for more details
    );
    return null;
  }
};
