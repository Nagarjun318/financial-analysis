/**
 * Server-side Google Weather / Geocoding fetchers (Phase 4). The Google key
 * lives only here — the browser calls `/api/weather/*` with its user JWT.
 * Response shaping (condition mapping etc.) stays client-side in
 * `weatherService`, which consumes these raw payloads.
 */

export interface WeatherEnv {
  GOOGLE_API_KEY?: string;
}

function requireKey(env: WeatherEnv): string {
  const key = env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not configured on the server.');
  return key;
}

async function getJson(url: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // keep null — caller decides
  }
  return { ok: res.ok, status: res.status, data };
}

export interface Coords {
  lat: number;
  lon: number;
}

/** Pure helper (unit-tested): parse "lat,lon" or return null for place names. */
export function parseCoords(location: string): Coords | null {
  const parts = location.split(',').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export async function geocodeAddress(address: string, env: WeatherEnv): Promise<Coords> {
  const key = requireKey(env);
  const { ok, data } = await getJson(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
  );
  const d = data as { status?: string; results?: Array<{ geometry?: { location?: Coords } }> };
  if (!ok || d?.status !== 'OK' || !d?.results?.[0]?.geometry?.location) {
    throw new Error(`Geocoding failed: ${d?.status ?? 'request error'}`);
  }
  return d.results[0].geometry.location as Coords;
}

export async function currentConditions(lat: number, lon: number, env: WeatherEnv): Promise<unknown> {
  const key = requireKey(env);
  const { ok, status, data } = await getJson(
    `https://weather.googleapis.com/v1/currentConditions:lookup?key=${key}&location.latitude=${lat}&location.longitude=${lon}`
  );
  if (!ok) throw new Error(`Weather API error: ${status}`);
  return data;
}

export async function dailyForecast(
  lat: number,
  lon: number,
  days: number,
  env: WeatherEnv
): Promise<unknown> {
  const key = requireKey(env);
  const safeDays = Math.min(Math.max(days || 3, 1), 10);
  const { ok, status, data } = await getJson(
    `https://weather.googleapis.com/v1/forecast/days:lookup?key=${key}&location.latitude=${lat}&location.longitude=${lon}&days=${safeDays}`
  );
  if (!ok) throw new Error(`Forecast API error: ${status}`);
  return data;
}

export async function reverseGeocode(lat: number, lon: number, env: WeatherEnv): Promise<string> {
  const key = requireKey(env);
  try {
    const { data } = await getJson(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${key}`
    );
    const d = data as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name?: string; types?: string[] }>;
      }>;
    };
    const first = d?.results?.[0];
    if (d?.status === 'OK' && first) {
      const city = first.address_components?.find((c) => c.types?.includes('locality'))?.long_name;
      const country = first.address_components?.find((c) => c.types?.includes('country'))?.long_name;
      return city && country ? `${city}, ${country}` : (first.formatted_address ?? '');
    }
  } catch (error) {
    console.error('[weather] reverse geocode failed:', error);
  }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}
