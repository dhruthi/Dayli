# dayli.ai Climate Intelligence

## 1. Overview
Climate context is fetched live from **Open-Meteo** (no API key, fully open
data) and injected into the model prompt as a structured block. Nearby health
facilities come from **OpenStreetMap**. Both are grounding data: the model is
forbidden from stating any figure or facility that is not in the block.

---

## 2. Pipeline

```
Location resolution (in priority order)
  1. GPS pin shared in WhatsApp
  2. City name detected in the message  ──► Open-Meteo geocoding
  3. Location captured during onboarding (session profile)
  4. Per-user location cache
  5. Nothing  ──► no climate data is fetched and none is invented
                        ↓
        Open-Meteo forecast  +  Open-Meteo air quality
                        ↓
              Deterministic categorisation
              ├── Heat risk
              └── AQI category
                        ↓
              Summary block ──► model prompt context
                        ↓
              Safety core (feels-like raises the risk floor)
```

---

## 3. Fields Fetched

| Source | Fields |
|---|---|
| `api.open-meteo.com/v1/forecast` | `temperature_2m`, `apparent_temperature`, `relative_humidity_2m`, `uv_index`, `weather_code` |
| `air-quality-api.open-meteo.com/v1/air-quality` | `us_aqi`, `pm2_5`, `pm10` |

---

## 4. Deterministic Thresholds

**Heat risk** (on temperature °C, or feels-like where higher):

| Level | Trigger |
|---|---|
| Extreme heatwave danger | `temp ≥ 42` or `feels-like ≥ 45` |
| High heat stress | `temp ≥ 38` or `feels-like ≥ 40` |
| Moderate heat caution | `temp ≥ 33` |
| Normal | below that |

**Air quality** (US AQI):

| Category | Trigger |
|---|---|
| Very unhealthy / hazardous | `> 200` |
| Unhealthy for sensitive groups | `> 150` |
| Moderate / sensitive-group warning | `> 100` |
| Good | `≤ 100` |

A feels-like temperature of **45 °C or above** raises the clinical safety floor
to `moderate` and adds the `EXTREME_HEAT_EXPOSURE` reason code. Climate exposure
never creates an emergency on its own — see
[CLINICAL_SAFETY_ARCHITECTURE.md](CLINICAL_SAFETY_ARCHITECTURE.md).

---

## 5. Clinic Lookup

`findNearbyClinics()` queries OpenStreetMap around the resolved coordinates. A
curated per-city hospital list is used as a fallback **only when the user's city
is known**. When the lookup returns nothing, a `[NO CLINIC DATA]` instruction is
injected and the model is forbidden from naming any facility — a plausible but
wrong hospital in an emergency is worse than no answer.

---

## 6. Failure Behaviour

There is no mock weather provider. If Open-Meteo fails or no location is known,
no climate block is produced and the prompt carries an explicit
`[CLIMATE DATA UNAVAILABLE]` instruction telling the model to ask for a location
pin rather than state any value. Substituting synthetic readings for real ones
would report fabricated weather to a user as fact.

---

## 7. Environment

```bash
# "real" in production. Open-Meteo needs no key.
WEATHER_PROVIDER_TYPE=real

# Optional, only for OpenWeatherMap-style providers.
WEATHER_API_KEY=
WEATHER_CACHE_TTL_MINUTES=10
```
