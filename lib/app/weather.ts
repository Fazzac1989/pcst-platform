import 'server-only';

/**
 * Daily destination weather via Open-Meteo (free, no API key).
 * Cached for an hour per destination.
 */

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Light showers', icon: '🌦️' },
  81: { label: 'Showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm', icon: '⛈️' },
  99: { label: 'Hailstorm', icon: '⛈️' },
};

export type DayForecast = {
  date: string;
  icon: string;
  label: string;
  maxC: number;
  minC: number;
};

export async function getDestinationWeather(destination: string): Promise<{
  place: string;
  days: DayForecast[];
} | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.split(',')[0])}&count=1&language=en`,
      { next: { revalidate: 86400 } }
    );
    if (!geoRes.ok) return null;
    const geo = await geoRes.json();
    const hit = geo.results?.[0];
    if (!hit) return null;

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`,
      { next: { revalidate: 3600 } }
    );
    if (!wxRes.ok) return null;
    const wx = await wxRes.json();
    const d = wx.daily;
    if (!d?.time) return null;

    return {
      place: [hit.name, hit.country].filter(Boolean).join(', '),
      days: d.time.map((date: string, i: number) => {
        const code = WEATHER_CODES[d.weather_code[i]] ?? { label: '—', icon: '🌡️' };
        return {
          date,
          icon: code.icon,
          label: code.label,
          maxC: Math.round(d.temperature_2m_max[i]),
          minC: Math.round(d.temperature_2m_min[i]),
        };
      }),
    };
  } catch {
    return null;
  }
}
