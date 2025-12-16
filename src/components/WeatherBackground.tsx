import React from 'react';
const { useEffect, useState } = React;

interface WeatherBackgroundProps {
  condition: string;
  temperature?: number;
}

const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ condition, temperature }) => {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  const getWeatherTheme = () => {
    // Show neutral theme while loading
    if (!condition) {
      return {
        gradient: 'from-gray-100 via-gray-200 to-gray-300',
        overlay: 'bg-white/5',
        particleType: 'loading'
      };
    }
    
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return {
        gradient: 'from-slate-700 via-slate-800 to-slate-900',
        overlay: 'bg-blue-900/20',
        particleType: 'rain'
      };
    } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return {
        gradient: 'from-gray-900 via-purple-950 to-black',
        overlay: 'bg-purple-600/10',
        particleType: 'storm'
      };
    } else if (conditionLower.includes('cloud')) {
      return {
        gradient: 'from-gray-400 via-gray-500 to-gray-600',
        overlay: 'bg-white/10',
        particleType: 'clouds'
      };
    } else if (conditionLower.includes('snow')) {
      return {
        gradient: 'from-blue-200 via-blue-100 to-white',
        overlay: 'bg-blue-100/30',
        particleType: 'snow'
      };
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      return {
        gradient: 'from-gray-300 via-gray-200 to-gray-100',
        overlay: 'bg-gray-400/20',
        particleType: 'fog'
      };
    } else if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      // Hot sunny day if temp > 30
      if (temperature && temperature > 30) {
        return {
          gradient: 'from-yellow-300 via-orange-400 to-red-400',
          overlay: 'bg-yellow-200/20',
          particleType: 'sun'
        };
      }
      return {
        gradient: 'from-sky-300 via-blue-400 to-indigo-500',
        overlay: 'bg-yellow-100/20',
        particleType: 'clear'
      };
    } else {
      return {
        gradient: 'from-blue-100 via-blue-200 to-blue-300',
        overlay: 'bg-white/10',
        particleType: 'clear'
      };
    }
  };

  const theme = getWeatherTheme();

  // Generate particles for rain/snow
  useEffect(() => {
    if (theme.particleType === 'rain' || theme.particleType === 'storm' || theme.particleType === 'snow') {
      const particleCount = theme.particleType === 'snow' ? 50 : 100;
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: theme.particleType === 'snow' ? 3 + Math.random() * 4 : 0.5 + Math.random() * 1
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [theme.particleType]);

  // Debug log
  useEffect(() => {
    console.log('[WeatherBackground] Rendering with:', { condition, temperature, theme });
  }, [condition, temperature]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-all duration-1000 opacity-50`} />
      
      {/* Overlay */}
      <div className={`absolute inset-0 ${theme.overlay} transition-all duration-1000`} />

      {/* Rain Effect */}
      {theme.particleType === 'rain' && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-0.5 h-12 bg-gradient-to-b from-blue-200/80 to-transparent animate-fall"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Storm Effect (Rain + Lightning) */}
      {theme.particleType === 'storm' && (
        <>
          <div className="absolute inset-0">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute w-0.5 h-16 bg-gradient-to-b from-blue-300/90 to-transparent animate-fall"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-white/0 animate-lightning" />
        </>
      )}

      {/* Snow Effect */}
      {theme.particleType === 'snow' && (
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 bg-white rounded-full opacity-80 animate-snowfall"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Clouds Effect */}
      {theme.particleType === 'clouds' && (
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-32 bg-white/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-32 right-20 w-96 h-40 bg-white/15 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-64 left-1/3 w-80 h-36 bg-white/10 rounded-full blur-3xl animate-float-slow" />
        </div>
      )}

      {/* Fog Effect */}
      {theme.particleType === 'fog' && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-400/30 via-gray-300/20 to-transparent animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-400/40 to-transparent" />
        </div>
      )}

      {/* Sun Effect */}
      {theme.particleType === 'sun' && (
        <div className="absolute top-20 right-20">
          <div className="relative">
            <div className="w-32 h-32 bg-yellow-300 rounded-full blur-2xl animate-pulse-slow" />
            <div className="absolute inset-0 w-32 h-32 bg-yellow-400/50 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          </div>
        </div>
      )}

      {/* Clear Sky Effect */}
      {theme.particleType === 'clear' && (
        <div className="absolute top-24 right-24">
          <div className="w-24 h-24 bg-yellow-200 rounded-full blur-xl opacity-60 animate-pulse-slow" />
        </div>
      )}
    </div>
  );
};

export default WeatherBackground;
