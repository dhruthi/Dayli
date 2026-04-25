interface OpenMeteoCurrent {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  wind_speed_10m?: number;
  uv_index?: number;
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
  current_units?: Record<string, string>;
}

interface OpenMeteoAirResponse {
  current?: {
    us_aqi?: number;
    pm2_5?: number;
  };
}

export type HeatRisk = "low" | "moderate" | "high" | "very_high" | "extreme";
export type AirRisk =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export interface ConditionsSnapshot {
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
  tempC: number | null;
  feelsLikeC: number | null;
  humidity: number | null;
  windKph: number | null;
  uvIndex: number | null;
  aqiUs: number | null;
  pm25: number | null;
  summary: string;
  heatRisk: HeatRisk;
  airRisk: AirRisk;
  observedAt: string;
}

function classifyHeat(feelsLike: number | null | undefined): HeatRisk {
  if (feelsLike == null) return "low";
  if (feelsLike >= 54) return "extreme";
  if (feelsLike >= 41) return "very_high";
  if (feelsLike >= 32) return "high";
  if (feelsLike >= 27) return "moderate";
  return "low";
}

function classifyAir(aqi: number | null | undefined): AirRisk {
  if (aqi == null) return "good";
  if (aqi >= 301) return "hazardous";
  if (aqi >= 201) return "very_unhealthy";
  if (aqi >= 151) return "unhealthy";
  if (aqi >= 101) return "unhealthy_sensitive";
  if (aqi >= 51) return "moderate";
  return "good";
}

export async function fetchConditions(
  lat: number,
  lon: number,
  city: string | null = null,
  country: string | null = null,
): Promise<ConditionsSnapshot> {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(lat));
  weatherUrl.searchParams.set("longitude", String(lon));
  weatherUrl.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,uv_index",
  );
  weatherUrl.searchParams.set("wind_speed_unit", "kmh");
  weatherUrl.searchParams.set("timezone", "auto");

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", String(lat));
  airUrl.searchParams.set("longitude", String(lon));
  airUrl.searchParams.set("current", "us_aqi,pm2_5");

  const [weatherRes, airRes] = await Promise.allSettled([
    fetch(weatherUrl, { signal: AbortSignal.timeout(5000) }).then(
      (r) => r.json() as Promise<OpenMeteoResponse>,
    ),
    fetch(airUrl, { signal: AbortSignal.timeout(5000) }).then(
      (r) => r.json() as Promise<OpenMeteoAirResponse>,
    ),
  ]);

  const w = weatherRes.status === "fulfilled" ? weatherRes.value.current ?? {} : {};
  const a = airRes.status === "fulfilled" ? airRes.value.current ?? {} : {};

  const tempC = typeof w.temperature_2m === "number" ? Math.round(w.temperature_2m * 10) / 10 : null;
  const feelsLikeC =
    typeof w.apparent_temperature === "number" ? Math.round(w.apparent_temperature * 10) / 10 : null;
  const humidity =
    typeof w.relative_humidity_2m === "number" ? Math.round(w.relative_humidity_2m) : null;
  const windKph = typeof w.wind_speed_10m === "number" ? Math.round(w.wind_speed_10m * 10) / 10 : null;
  const uvIndex = typeof w.uv_index === "number" ? Math.round(w.uv_index * 10) / 10 : null;
  const aqiUs = typeof a.us_aqi === "number" ? Math.round(a.us_aqi) : null;
  const pm25 = typeof a.pm2_5 === "number" ? Math.round(a.pm2_5 * 10) / 10 : null;

  const heatRisk = classifyHeat(feelsLikeC ?? tempC);
  const airRisk = classifyAir(aqiUs);

  const place = city ? city : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  const parts: string[] = [];
  if (tempC != null) {
    parts.push(`${tempC}°C`);
    if (feelsLikeC != null && Math.abs(feelsLikeC - tempC) >= 2) {
      parts.push(`feels like ${feelsLikeC}°C`);
    }
  }
  if (humidity != null) parts.push(`${humidity}% humidity`);
  if (aqiUs != null) parts.push(`AQI ${aqiUs}`);
  const summary = parts.length > 0 ? `Today in ${place}: ${parts.join(", ")}` : `Conditions for ${place}`;

  return {
    lat,
    lon,
    city,
    country,
    tempC,
    feelsLikeC,
    humidity,
    windKph,
    uvIndex,
    aqiUs,
    pm25,
    summary,
    heatRisk,
    airRisk,
    observedAt: new Date().toISOString(),
  };
}
