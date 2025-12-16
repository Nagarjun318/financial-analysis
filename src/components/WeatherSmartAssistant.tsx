import React from 'react';
const { useState, useEffect } = React;
import { CloudRain, Cloud, Sun, Wind, Droplets, RefreshCw, X, ChevronDown, ChevronUp, Loader2, MapPin, Navigation } from 'lucide-react';
import { getWeatherData, generateWeatherGrocerySuggestions, WeatherData, WeatherGrocerySuggestion } from '../services/weatherService';
import { GEMINI_MODELS, GeminiModel } from '../services/geminiService';

interface WeatherSmartAssistantProps {
  location?: string; // Coordinates
  locationName?: string; // Display name
  onAddItems?: (items: string[]) => void;
  onLocationChange?: (coords: string, name: string) => void;
  onWeatherUpdate?: (condition: string, temp: number) => void;
}

const WeatherSmartAssistant: React.FC<WeatherSmartAssistantProps> = ({ 
  location = '',
  locationName = '',
  onAddItems,
  onLocationChange,
  onWeatherUpdate
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [suggestions, setSuggestions] = useState<WeatherGrocerySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedModel] = useState<GeminiModel>(GEMINI_MODELS.FLASH_LITE);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState(locationName || location);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Update locationInput when locationName changes
  useEffect(() => {
    if (locationName) {
      setLocationInput(locationName);
    }
  }, [locationName]);

  useEffect(() => {
    fetchWeatherAndSuggestions();
  }, [location]);

  const fetchWeatherAndSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[WeatherSmartAssistant] Fetching weather for location:', location);
      
      // Fetch weather data
      const weather = await getWeatherData(location);
      
      if (!weather) {
        throw new Error('Could not fetch weather data. Please check your API key and try again.');
      }
      
      console.log('[WeatherSmartAssistant] Weather data received:', weather);
      setWeatherData(weather);
      
      // Update parent component with weather data
      if (onWeatherUpdate && weather.temperature !== undefined) {
        console.log('[WeatherSmartAssistant] Updating weather:', weather.condition, weather.temperature);
        onWeatherUpdate(weather.condition, weather.temperature);
      } else {
        console.log('[WeatherSmartAssistant] No weather update callback or missing temp:', { onWeatherUpdate: !!onWeatherUpdate, temp: weather.temperature });
      }
      
      // Generate suggestions based on weather
      const weatherSuggestions = await generateWeatherGrocerySuggestions(weather, selectedModel);
      setSuggestions(weatherSuggestions);
      
    } catch (err) {
      console.error('[WeatherSmartAssistant] Error fetching weather suggestions:', err);
      setError(err instanceof Error ? err.message : 'Unable to load weather suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestedItems = (items: string[]) => {
    if (onAddItems) {
      onAddItems(items);
    }
  };

  const handleLocationSubmit = async () => {
    if (!locationInput.trim()) return;
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      // Geocode the location name to get coordinates
      const response = await fetch(`/api/geocode/json?address=${encodeURIComponent(locationInput.trim())}&key=${apiKey}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const coords = `${lat},${lng}`;
        
        if (onLocationChange) {
          onLocationChange(coords, locationInput.trim());
        }
        setShowLocationInput(false);
      } else {
        setError('Could not find location. Please try again.');
      }
    } catch (err) {
      console.error('Error geocoding location:', err);
      setError('Error finding location. Please try again.');
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude},${longitude}`;
          
          // Reverse geocode to get location name
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          const response = await fetch(`/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
          const data = await response.json();
          
          let locationName = 'Current Location';
          if (data.status === 'OK' && data.results[0]) {
            const addressComponents = data.results[0].address_components;
            const city = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name;
            const country = addressComponents.find((c: any) => c.types.includes('country'))?.long_name;
            locationName = city && country ? `${city}, ${country}` : data.results[0].formatted_address;
          }
          
          if (onLocationChange) {
            onLocationChange(coords, locationName);
            setLocationInput(locationName);
          }
        } catch (err) {
          console.error('Error getting location name:', err);
          setError('Could not determine location name');
        } finally {
          setGettingLocation(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Could not access your location. Please enter manually.');
        setGettingLocation(false);
      }
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'alert':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'alert':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-orange-700 dark:text-orange-300';
      default:
        return 'text-blue-700 dark:text-blue-300';
    }
  };

  if (loading && !weatherData) {
    return (
      <div className="glass-panel p-6 rounded-xl mb-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span className="text-gray-600 dark:text-gray-300">Fetching weather insights...</span>
        </div>
      </div>
    );
  }

  if (error && !weatherData) {
    return (
      <div className="glass-panel p-6 rounded-xl mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
          <button
            onClick={fetchWeatherAndSuggestions}
            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData) return null;

  return (
    <div className="glass-panel rounded-xl mb-6 overflow-hidden border-2 border-indigo-200 dark:border-indigo-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Cloud className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Weather-Smart Grocery Assistant</h3>
              <div className="flex items-center gap-2">
                <p className="text-white/80 text-sm">{weatherData.location}</p>
                <button
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className="p-1 hover:bg-white/20 rounded transition"
                  title="Change location"
                >
                  <MapPin className="h-3 w-3 text-white/80" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUseCurrentLocation}
              disabled={gettingLocation}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
              title="Use current location"
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 text-white" />
              )}
            </button>
            <button
              onClick={fetchWeatherAndSuggestions}
              disabled={loading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition disabled:opacity-50"
              title="Refresh weather"
            >
              <RefreshCw className={`h-4 w-4 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-white" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Location Input */}
        {showLocationInput && (
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLocationSubmit()}
                placeholder="e.g., Chennai, India or New York, USA"
                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                onClick={handleLocationSubmit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition"
              >
                Set
              </button>
              <button
                onClick={() => {
                  setShowLocationInput(false);
                  setLocationInput(locationName || location);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"
              >
                <X className="h-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Current Weather */}
        <div className="mt-4 flex items-center gap-6 text-white">
          <div className="flex items-center gap-2">
            <Sun className="h-8 w-8" />
            <span className="text-3xl font-bold">{weatherData.temperature}°C</span>
          </div>
          <div className="text-sm">
            <div>{weatherData.condition}</div>
            <div className="flex items-center gap-1 opacity-80">
              <Droplets className="h-3 w-3" />
              <span>{weatherData.humidity}% humidity</span>
            </div>
          </div>
        </div>

        {/* 3-Day Forecast */}
        {isExpanded && weatherData.forecast && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {weatherData.forecast.slice(0, 3).map((day, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
                <div className="text-white/80 text-xs font-medium">{day.day}</div>
                <div className="text-white text-sm font-semibold">{day.condition}</div>
                <div className="text-white/90 text-xs mt-1">
                  {day.maxTemp}° / {day.minTemp}°
                </div>
                {day.precipitation > 30 && (
                  <div className="flex items-center justify-center gap-1 text-white/80 text-xs mt-1">
                    <CloudRain className="h-3 w-3" />
                    <span>{day.precipitation}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {isExpanded && suggestions.length > 0 && (
        <div className="p-4 space-y-3">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 ${getSeverityColor(suggestion.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{suggestion.icon}</span>
                <div className="flex-1">
                  <h4 className={`font-bold text-lg ${getSeverityTextColor(suggestion.severity)}`}>
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {suggestion.suggestion}
                  </p>

                  {/* Suggested Items */}
                  {suggestion.suggestedItems.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                          Suggested Items:
                        </span>
                        {onAddItems && (
                          <button
                            onClick={() => handleAddSuggestedItems(suggestion.suggestedItems)}
                            className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                          >
                            + Add to List
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.suggestedItems.map((item, itemIdx) => (
                          <span
                            key={itemIdx}
                            className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-medium border border-gray-200 dark:border-gray-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Budget Impact */}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-600 dark:text-gray-400">Budget:</span>
                      <span className={`font-bold ${getSeverityTextColor(suggestion.severity)}`}>
                        {suggestion.budgetImpact}
                      </span>
                    </div>
                  </div>

                  {/* Saving Tips */}
                  {suggestion.savingTips.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase block mb-1">
                        💡 Money-Saving Tips:
                      </span>
                      <ul className="text-sm space-y-1">
                        {suggestion.savingTips.map((tip, tipIdx) => (
                          <li key={tipIdx} className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-green-600 dark:text-green-400">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No suggestions */}
      {isExpanded && suggestions.length === 0 && !loading && (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <Sun className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Perfect weather conditions! No special grocery adjustments needed.</p>
        </div>
      )}
    </div>
  );
};

export default WeatherSmartAssistant;
