import { useEffect, useState } from "react";
import {
  buildFarmTips,
  type ForecastDay,
} from "@/lib/weatherFarmTips";

type WeatherApiForecastDay = {
  date: string;
  day?: {
    avgtemp_c?: number;
    avghumidity?: number;
    maxwind_kph?: number;
    daily_chance_of_rain?: string | number;
    condition?: {
      text?: string;
    };
  };
};

type WeatherApiResponse = {
  forecast?: {
    forecastday?: WeatherApiForecastDay[];
  };
};

const fallbackForecast = (): ForecastDay[] => [
  {
    day: "Today",
    date: "Now",
    temp: 32,
    text: "Sunny",
    humidity: "48%",
    wind: "12 km/h",
    rainChance: "10%",
    tips: buildFarmTips(32, 10, 48, 12, "Sunny"),
  },
  {
    day: "Fri",
    date: "Tomorrow",
    temp: 31,
    text: "Partly cloudy",
    humidity: "55%",
    wind: "14 km/h",
    rainChance: "20%",
    tips: buildFarmTips(31, 20, 55, 14, "Partly cloudy"),
  },
  {
    day: "Sat",
    date: "Day 3",
    temp: 29,
    text: "Rain chance",
    humidity: "68%",
    wind: "18 km/h",
    rainChance: "45%",
    tips: buildFarmTips(29, 45, 68, 18, "Rain chance"),
  },
  {
    day: "Sun",
    date: "Day 4",
    temp: 30,
    text: "Light showers",
    humidity: "72%",
    wind: "16 km/h",
    rainChance: "55%",
    tips: buildFarmTips(30, 55, 72, 16, "Light showers"),
  },
  {
    day: "Mon",
    date: "Day 5",
    temp: 33,
    text: "Sunny",
    humidity: "46%",
    wind: "10 km/h",
    rainChance: "8%",
    tips: buildFarmTips(33, 8, 46, 10, "Sunny"),
  },
];

type Args = {
  pincode: string;
  district: string;
  state: string;
};

export const useFarmWeatherForecast = ({ pincode, district, state }: Args) => {
  const [selectedForecastDay, setSelectedForecastDay] = useState(0);
  const [forecast, setForecast] = useState<ForecastDay[]>(fallbackForecast);
  const weatherApiKey = import.meta.env.VITE_WEATHERAPI_KEY as string | undefined;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!pincode || !weatherApiKey) return;
      try {
        const requestForecast = async (query: string): Promise<WeatherApiResponse | null> => {
          const q = encodeURIComponent(query);
          const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${q}&days=5&aqi=no&alerts=no`,
          );
          if (!res.ok) return null;
          return (await res.json()) as WeatherApiResponse;
        };

        let data = await requestForecast(`${pincode},IN`);
        const resolvedCountry = (data as { location?: { country?: string } } | null)?.location?.country;

        if ((!data || resolvedCountry !== "India") && district && state) {
          data = await requestForecast(`${district}, ${state}, India`);
        }

        if (!data) return;
        const mapped: ForecastDay[] = (data.forecast?.forecastday ?? []).map((item, idx: number) => {
          const tempC = Math.round(item.day?.avgtemp_c ?? 0);
          const humidity = Math.round(item.day?.avghumidity ?? 0);
          const wind = Math.round(item.day?.maxwind_kph ?? 0);
          const rainChance = Number(item.day?.daily_chance_of_rain ?? 0);
          const conditionText = item.day?.condition?.text ?? "Weather update";

          return {
            day:
              idx === 0
                ? "Today"
                : new Date(item.date).toLocaleDateString("en-IN", { weekday: "short" }),
            date: new Date(item.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
            temp: tempC,
            text: conditionText,
            humidity: `${humidity}%`,
            wind: `${wind} km/h`,
            rainChance: `${rainChance}%`,
            tips: buildFarmTips(tempC, rainChance, humidity, wind, conditionText),
          };
        });
        if (mounted && mapped.length > 0) {
          setForecast(mapped);
          setSelectedForecastDay(0);
        }
      } catch {
        // keep fallback
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [pincode, district, state, weatherApiKey]);

  return {
    forecast,
    selectedForecastDay,
    setSelectedForecastDay,
    weatherApiConfigured: Boolean(weatherApiKey),
  };
};
