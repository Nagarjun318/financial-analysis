import React from 'react';
const { createContext, useContext, useState } = React;

interface WeatherContextType {
  condition: string;
  temperature: number | undefined;
  setWeather: (condition: string, temperature?: number) => void;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [condition, setCondition] = useState('Clear');
  const [temperature, setTemperature] = useState<number | undefined>(25);

  const setWeather = (newCondition: string, newTemperature?: number) => {
    setCondition(newCondition);
    setTemperature(newTemperature);
  };

  return (
    <WeatherContext.Provider value={{ condition, temperature, setWeather }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within WeatherProvider');
  }
  return context;
};
