export interface Coords {
  lat: number;
  lng: number;
  accuracy: number; // meters
}

// Resolves the device's current position. Requires a secure context — works on
// localhost in dev; needs HTTPS in production. Rejects with a clear message.
export function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser doesn't support location access."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Your location is unavailable right now. Try again in a moment.",
          3: "Getting your location timed out. Try again.",
        };
        reject(new Error(messages[err.code] ?? "Couldn't get your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
