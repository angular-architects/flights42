export type Condition = 'rainy' | 'sunny' | 'cloudy';

export interface Weather {
  city: string;
  condition: Condition;
  temperature: number;
}

const CONDITIONS: Condition[] = ['rainy', 'sunny', 'cloudy'];

// Cache the generated weather per city so repeated lookups stay stable.
const weatherCache = new Map<string, Weather>();

function randomCondition(): Condition {
  return CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
}

function randomTemperature(): number {
  return Math.floor(Math.random() * 16) + 10;
}

export function getWeather(city: string): Weather {
  const normalized = city.trim().toLowerCase();

  const cached = weatherCache.get(normalized);
  if (cached) {
    return cached;
  }

  const weather: Weather = {
    city,
    condition: randomCondition(),
    temperature: randomTemperature(),
  };
  weatherCache.set(normalized, weather);
  return weather;
}
