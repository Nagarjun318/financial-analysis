import { callGeminiAPI, GeminiModel, GEMINI_MODELS } from './geminiService';

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

/**
 * Fetch weather data using Google Weather API via proxy
 */
export async function getWeatherData(location: string = 'Mumbai, India'): Promise<WeatherData | null> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Validate location
    if (!location || location.trim() === '') {
      console.error('[WeatherService] Empty location provided');
      return null;
    }
    
    // Parse location - can be either "lat,lon" or "City, Country"
    let lat: number, lon: number;
    
    const parts = location.split(',').map(s => s.trim());
    const isCoordinates = parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]));
    
    if (isCoordinates) {
      // Location is coordinates
      [lat, lon] = parts.map(s => parseFloat(s));
      console.log('[WeatherService] Using coordinates:', { lat, lon });
    } else {
      // Location is city name - need to geocode first
      console.log('[WeatherService] Geocoding location:', location);
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
        console.error('Geocoding failed:', geocodeData.status, geocodeData);
        return null;
      }
      
      lat = geocodeData.results[0].geometry.location.lat;
      lon = geocodeData.results[0].geometry.location.lng;
      console.log('[WeatherService] Geocoded to:', { lat, lon });
    }

    console.log('[WeatherService] Fetching weather for coordinates:', { lat, lon });

    // Fetch current weather using correct Google Weather API endpoint
    const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lon}`;
    console.log('[WeatherService] Weather API URL (without key):', `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lon}`);
    
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
    console.log('[WeatherService] Raw Google Weather response:', weatherData);

    // Fetch daily forecast (3 days)
    const forecastUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lon}&days=3`;
    console.log('[WeatherService] Forecast API URL (without key):', `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${lat}&location.longitude=${lon}&days=3`);
    
    const forecastResponse = await fetch(forecastUrl, {
      cache: 'no-store', // Prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
    console.log('[WeatherService] Forecast data:', forecastData);

    // Get location name from reverse geocoding
    const locationName = await getLocationName(lat, lon, apiKey);

    // Parse Google Weather API response
    // Ref: https://developers.google.com/maps/documentation/weather/reference/rest
    console.log('[WeatherService] Parsing weather data. Full structure:', JSON.stringify(weatherData, null, 2));
    
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
    
    const humidity = Math.round(
      weatherData.relativeHumidity || 
      weatherData.relativeHumidity?.value || 
      50
    );
    
    console.log('[WeatherService] Extracted values:', { condition, temperature, humidity });

    // Parse forecast - handle different response structures
    const forecast = (forecastData?.dailyForecasts || forecastData?.forecasts || []).slice(0, 3).map((day: any) => ({
      day: new Date(day.date || day.time).toLocaleDateString('en-US', { weekday: 'short' }),
      condition: mapGoogleWeatherCondition(day.weatherCode || day.condition || 'CLEAR'),
      maxTemp: Math.round(day.temperatureHigh?.value || day.temperature?.max?.value || day.maxTemp || 30),
      minTemp: Math.round(day.temperatureLow?.value || day.temperature?.min?.value || day.minTemp || 20),
      precipitation: day.precipitationProbability?.value || day.precipitation || 0
    }));

    const result = {
      location: locationName,
      temperature,
      condition,
      humidity,
      forecast
    };

    console.log('[WeatherService] Parsed weather data:', result);
    return result;
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Get location name from coordinates using reverse geocoding
 */
async function getLocationName(lat: number, lon: number, apiKey: string): Promise<string> {
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
  model: GeminiModel = GEMINI_MODELS.FLASH_LITE
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
