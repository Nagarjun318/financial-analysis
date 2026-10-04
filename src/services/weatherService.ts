import { callGeminiAPI, GeminiModel, DEFAULT_GEMINI_MODEL } from './geminiService';
import { apiFetch, isFunctionConfigured } from './apiClient.ts';

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  forecast: {
    day: string;
    condition: string;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
  }[];
}

export interface WeatherGrocerySuggestion {
  condition: string;
  icon: string;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  suggestion: string;
  suggestedItems: string[];
  budgetImpact: string;
  savingTips: string[];
}

/** Raw Google payloads (same wire format via Function proxy or direct fetch). */
export interface GoogleCurrentPayload {
  weatherCondition?: { type?: string };
  weatherCode?: string;
  temperature?: { degrees?: number; value?: number };
  relativeHumidity?: number | { value?: number };
}

export interface GoogleForecastDayPayload {
  date?: string;
  time?: string;
  weatherCode?: string;
  condition?: string;
  temperatureHigh?: { value?: number };
  temperatureLow?: { value?: number };
  temperature?: { max?: { value?: number }; min?: { value?: number } };
  maxTemp?: number;
  minTemp?: number;
  precipitationProbability?: { value?: number };
  precipitation?: number;
}

export interface GoogleForecastPayload {
  dailyForecasts?: GoogleForecastDayPayload[];
  forecasts?: GoogleForecastDayPayload[];
}

/**
 * Phase 4: Function proxy for raw Google payloads (the Google key stays
 * server-side). Returns null when the Function is unconfigured/unreachable so
 * the caller falls back to direct provider calls (local-dev keys only).
 */
async function fetchWeatherViaServer(
  location: string
): Promise<{ current: GoogleCurrentPayload; forecast: GoogleForecastPayload; locationName: string } | null> {
  if (!isFunctionConfigured()) return null;
  try {
    return await apiFetch('/api/weather/by-location', { query: { location } });
  } catch (error) {
    console.warn('[WeatherService] Function weather fetch failed, trying direct:', error);
    return null;
  }
}

/**
 * Fetch weather data: Function proxy when configured, direct Google Weather
 * API only as a local-dev fallback (needs a client-side key).
 */
export async function getWeatherData(location: string = 'Mumbai, India'): Promise<WeatherData | null> {
  try {
    // Validate location
    if (!location || location.trim() === '') {
      console.error('[WeatherService] Empty location provided');
      return null;
    }

    // Server path: one round trip (geocode + current + forecast + revgeo).
    const viaServer = await fetchWeatherViaServer(location);
    if (viaServer) {
      return toWeatherData(viaServer.current, viaServer.forecast, viaServer.locationName);
    }

    // Legacy direct path (dev fallback — no keys ship in production builds).
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[WeatherService] No Function configured and no dev API key available.');
      return null;
    }

    // Parse location - can be either "lat,lon" or "City, Country"
    let lat: number, lon: number;
    
    const parts = location.split(',').map(s => s.trim());
    const isCoordinates = parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]));
    
    if (isCoordinates) {
      // Location is coordinates
      [lat, lon] = parts.map(s => parseFloat(s));
    } else {
      // Location is city name - need to geocode first
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
        console.error('Geocoding failed:', geocodeData.status, geocodeData);
        return null;
      }
      
      lat = geocodeData.results[0].geometry.location.lat;
      lon = geocodeData.results[0].geometry.location.lng;
    }


    // Fetch current weather using correct Google Weather API endpoint
    const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lon}`;
    
    const weatherResponse = await fetch(weatherUrl, {
      cache: 'no-store', // Prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error('Weather API error:', weatherResponse.status, errorText);
      return null;
    }
    
    const weatherData = await weatherResponse.json();

    // Fetch daily forecast (3 days)
    const forecastUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lon}&days=3`;
    
    const forecastResponse = await fetch(forecastUrl, {
      cache: 'no-store', // Prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

    // Get location name from reverse geocoding
    const locationName = await getLocationName(lat, lon, apiKey);

    return toWeatherData(weatherData, forecastData, locationName);
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Shape raw Google payloads (server or direct — same wire format) into
 * WeatherData. Pure from here down: no keys, no fetching.
 * Ref: https://developers.google.com/maps/documentation/weather/reference/rest
 */
function toWeatherData(weatherData: GoogleCurrentPayload, forecastData: GoogleForecastPayload | null, locationName: string): WeatherData {
    // Google Weather API actual structure
    const condition = mapGoogleWeatherCondition(
      weatherData.weatherCondition?.type ||
      weatherData.weatherCode ||
      'CLEAR'
    );

    const temperature = Math.round(
      weatherData.temperature?.degrees ||
      weatherData.temperature?.value ||
      25
    );

    const humidityRaw = weatherData.relativeHumidity;
    const humidity = Math.round(
      typeof humidityRaw === 'number' ? humidityRaw : (humidityRaw?.value ?? 50)
    );


    // Parse forecast - handle different response structures
    const forecast = (forecastData?.dailyForecasts || forecastData?.forecasts || []).slice(0, 3).map((day) => {
      const when = day.date || day.time;
      return {
        day: when ? new Date(when).toLocaleDateString('en-US', { weekday: 'short' }) : '—',
        condition: mapGoogleWeatherCondition(day.weatherCode || day.condition || 'CLEAR'),
        maxTemp: Math.round(day.temperatureHigh?.value || day.temperature?.max?.value || day.maxTemp || 30),
        minTemp: Math.round(day.temperatureLow?.value || day.temperature?.min?.value || day.minTemp || 20),
        precipitation: day.precipitationProbability?.value || day.precipitation || 0,
      };
    });

    const result = {
      location: locationName,
      temperature,
      condition,
      humidity,
      forecast
    };

    return result;
}

/**
 * Location display name for coordinates (Phase 4 transport). Server-first
 * (`/api/weather/revgeo`); direct Google revgeo only as a local-dev fallback.
 * Exported for pages that need just the name (e.g. GroceriesPage weather).
 */
export async function getLocationName(lat: number, lon: number, apiKey?: string): Promise<string> {
  const fallback = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  if (isFunctionConfigured()) {
    try {
      const data = await apiFetch<{ name?: string }>('/api/weather/revgeo', {
        query: { lat, lon },
      });
      if (data?.name) return data.name;
    } catch (error) {
      console.warn('[WeatherService] Function revgeo failed, trying direct:', error);
    }
  }
  if (!apiKey) return fallback;
  return getLocationNameDirect(lat, lon, apiKey);
}

/**
 * Get location name from coordinates using reverse geocoding
 */
async function getLocationNameDirect(lat: number, lon: number, apiKey: string): Promise<string> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results[0]) {
      // Get city and country from address components
      const addressComponents = data.results[0].address_components;
      const city = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name;
      const country = addressComponents.find((c: any) => c.types.includes('country'))?.long_name;
      return city && country ? `${city}, ${country}` : data.results[0].formatted_address;
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
  }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

/**
 * Map Google Weather condition codes to simple conditions
 * Ref: https://developers.google.com/maps/documentation/weather/reference/rest/v1/WeatherCode
 */
function mapGoogleWeatherCondition(code: string): string {
  const codeUpper = code.toUpperCase();
  
  // Map Google Weather API codes to our simple conditions
  if (codeUpper.includes('RAIN') || codeUpper.includes('DRIZZLE') || codeUpper.includes('SHOWERS')) return 'Rainy';
  if (codeUpper.includes('THUNDER') || codeUpper.includes('STORM')) return 'Stormy';
  if (codeUpper.includes('SNOW') || codeUpper.includes('SLEET') || codeUpper.includes('ICE')) return 'Snowy';
  if (codeUpper.includes('CLOUD') || codeUpper.includes('OVERCAST') || codeUpper.includes('PARTLY')) return 'Cloudy';
  if (codeUpper.includes('FOG') || codeUpper.includes('MIST') || codeUpper.includes('HAZE')) return 'Foggy';
  if (codeUpper.includes('CLEAR') || codeUpper.includes('SUNNY') || codeUpper.includes('FAIR')) return 'Sunny';
  
  return 'Clear';
}

/**
 * Generate smart grocery suggestions based on weather conditions
 */
export async function generateWeatherGrocerySuggestions(
  weatherData: WeatherData,
  model: GeminiModel = DEFAULT_GEMINI_MODEL
): Promise<WeatherGrocerySuggestion[]> {
  try {
    const prompt = `Based on the following weather data, provide smart grocery shopping suggestions for a household in India.

Weather Data:
- Location: ${weatherData.location}
- Current: ${weatherData.temperature}°C, ${weatherData.condition}
- Humidity: ${weatherData.humidity}%
- 3-Day Forecast: ${JSON.stringify(weatherData.forecast)}

Analyze the weather and provide 2-3 actionable suggestions. Consider:
1. Temperature extremes (stock cold drinks if hot, comfort food if cold)
2. Rain/storms (delivery costs increase, stock essentials)
3. Humidity (food spoilage risk, buy smaller quantities)
4. Weekend weather (outdoor plans vs stay-home)

Return JSON array (no markdown):
[
  {
    "condition": "<weather condition triggering this>",
    "icon": "<emoji like ☀️🌧️❄️⛈️🌡️>",
    "severity": "info|warning|alert",
    "title": "<catchy short title>",
    "suggestion": "<brief explanation 1-2 sentences>",
    "suggestedItems": ["<item1>", "<item2>", "<item3>"],
    "budgetImpact": "<estimated cost like +₹200 or Save ₹300>",
    "savingTips": ["<tip1>", "<tip2>"]
  }
]`;

    const response = await callGeminiAPI(prompt, model);
    
    // Try to extract JSON array from response
    const responseText = typeof response === 'string' ? response : response.text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions;
    }
    
    console.error('Could not parse suggestions from Gemini response');
    return [];
  } catch (error) {
    console.error('Error generating weather suggestions:', error);
    return [];
  }
}
