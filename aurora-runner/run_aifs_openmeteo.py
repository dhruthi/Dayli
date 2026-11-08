#!/usr/bin/env python3
"""
run_aifs_openmeteo.py — fetch ECMWF AIFS 0.25° forecasts via Open-Meteo.

No GPU, no API key, no infrastructure. Open-Meteo serves ECMWF's operational
AI weather model (AIFS) over plain HTTP, free, CC-BY-4.0.

ECMWF AIFS is a real, operational AI weather model — not a statistical
downscaler or a demo. It runs on ECMWF's own infrastructure using their IFS
initial conditions. The forecast is genuine.

This script:
  1. Queries Open-Meteo for the AIFS model across a Telangana grid
  2. Resamples to 6-hourly steps (matching the Aurora schema)
  3. Emits a schema-v1 JSON payload for whatsapp-bridge/lib/auroraFeed.js
  4. Optionally pushes the payload to the server

Usage:
    python run_aifs_openmeteo.py --out aifs_latest.json
    python run_aifs_openmeteo.py --out aifs_latest.json --push https://host/internal/aurora/forecast
    python run_aifs_openmeteo.py --dry-run   # print grid info, don't fetch
"""

import argparse
import base64
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# Grid covering greater Telangana at 0.25° spacing.
# North-to-south (descending lats) to match Aurora convention.
LATS = [round(19.0 - 0.25 * i, 2) for i in range(13)]   # 19.0 → 16.0
LONS = [round(77.0 + 0.25 * i, 2) for i in range(13)]   # 77.0 → 80.0

STEP_HOURS = 6
N_STEPS = 20        # 5 days
BATCH_SIZE = 50      # max grid points per API request


def log(msg):
    print(f"[aifs] {msg}", flush=True)


def latest_cycle(lag_hours=8):
    """Most recent 6-hourly ECMWF cycle old enough to be published."""
    t = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=lag_hours)
    return t.replace(hour=(t.hour // 6) * 6, minute=0, second=0, microsecond=0)


def fetch_batch(flat_lats, flat_lons, model="ecmwf_aifs025_single"):
    """Fetch hourly forecasts for a batch of coordinate pairs from Open-Meteo."""
    params = urllib.parse.urlencode({
        "latitude": ",".join(str(v) for v in flat_lats),
        "longitude": ",".join(str(v) for v in flat_lons),
        "hourly": "temperature_2m,wind_speed_10m",
        "models": model,
        "forecast_days": 6,
        "timezone": "UTC",
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"

    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())

    if isinstance(data, dict) and "hourly" in data:
        return [data]
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "error" in data:
        raise RuntimeError(f"Open-Meteo error: {data['error']}")
    raise RuntimeError(f"unexpected response shape: {list(data.keys()) if isinstance(data, dict) else type(data)}")


def fetch_grid(model="ecmwf_aifs025_single"):
    """Fetch the full grid, batching requests to stay within URL length limits."""
    pairs = [(lat, lon) for lat in LATS for lon in LONS]
    all_results = []

    n_batches = math.ceil(len(pairs) / BATCH_SIZE)
    log(f"fetching {len(pairs)} grid points in {n_batches} batch(es) from Open-Meteo ({model})...")

    for b in range(n_batches):
        chunk = pairs[b * BATCH_SIZE : (b + 1) * BATCH_SIZE]
        blats = [p[0] for p in chunk]
        blons = [p[1] for p in chunk]

        for attempt in range(3):
            try:
                results = fetch_batch(blats, blons, model)
                break
            except (urllib.error.URLError, TimeoutError) as e:
                if attempt == 2:
                    raise
                log(f"  batch {b+1} attempt {attempt+1} failed ({e}), retrying...")
                time.sleep(2 ** attempt)

        if len(results) != len(chunk):
            raise RuntimeError(
                f"batch {b+1}: expected {len(chunk)} results, got {len(results)}")
        all_results.extend(results)

        if n_batches > 1 and b < n_batches - 1:
            time.sleep(0.5)

    log(f"fetched {len(all_results)} grid points")
    return all_results


def build_payload(results, cycle, model_name):
    """Transform Open-Meteo results into schema-v1 JSON."""
    n_lats = len(LATS)
    n_lons = len(LONS)

    if len(results) != n_lats * n_lons:
        raise ValueError(f"expected {n_lats * n_lons} results, got {len(results)}")

    times = results[0]["hourly"]["time"]

    # Find the first 6-hourly step at or after the cycle time.
    cycle_str = cycle.strftime("%Y-%m-%dT%H:%M")
    start_idx = None
    for i, t_str in enumerate(times):
        if t_str >= cycle_str and i % STEP_HOURS == 0:
            start_idx = i
            break

    if start_idx is None:
        # Fall back: find any 6-hour-aligned step after the cycle.
        for i, t_str in enumerate(times):
            t = dt.datetime.fromisoformat(t_str)
            if t.hour % 6 == 0 and t_str >= cycle_str:
                start_idx = i
                break

    if start_idx is None:
        raise ValueError("could not find a 6-hourly forecast step after the cycle time")

    steps = []
    for step in range(N_STEPS):
        idx = start_idx + step * STEP_HOURS
        if idx >= len(times):
            break

        t2m_grid = []
        wind_grid = []
        for lat_i in range(n_lats):
            t2m_row = []
            wind_row = []
            for lon_j in range(n_lons):
                point_idx = lat_i * n_lons + lon_j
                r = results[point_idx]
                temp = r["hourly"]["temperature_2m"][idx]
                wind = r["hourly"]["wind_speed_10m"][idx]
                t2m_row.append(round(temp, 2) if temp is not None else 0.0)
                wind_row.append(round(wind, 2) if wind is not None else 0.0)
            t2m_grid.append(t2m_row)
            wind_grid.append(wind_row)

        valid_time = dt.datetime.fromisoformat(times[idx]).replace(
            tzinfo=dt.timezone.utc)
        steps.append({
            "valid_time": valid_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "t2m_c": t2m_grid,
            "wind10m_kph": wind_grid,
        })

    if len(steps) < 4:
        raise ValueError(f"only {len(steps)} steps produced, need at least 4")

    return {
        "schema_version": 1,
        "provenance": "aifs-inference",
        "model": model_name,
        "initial_conditions": "ECMWF IFS (AIFS operational initialization)",
        "init_time": cycle.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_at": dt.datetime.now(dt.timezone.utc)
                          .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "grid": {"lats": list(LATS), "lons": list(LONS)},
        "steps": steps,
    }


def sanity_check(payload):
    """Quick physical sanity check on the payload."""
    hyd_lat, hyd_lon = 17.385, 78.487
    for step in payload["steps"][:4]:
        lats = payload["grid"]["lats"]
        lons = payload["grid"]["lons"]
        lat_i = min(range(len(lats)), key=lambda i: abs(lats[i] - hyd_lat))
        lon_j = min(range(len(lons)), key=lambda j: abs(lons[j] - hyd_lon))
        t = step["t2m_c"][lat_i][lon_j]
        w = step["wind10m_kph"][lat_i][lon_j]
        if not (-10 <= t <= 55):
            raise ValueError(f"implausible temperature {t}°C near Hyderabad at {step['valid_time']}")
        if not (0 <= w <= 200):
            raise ValueError(f"implausible wind {w} km/h near Hyderabad at {step['valid_time']}")
    log(f"sanity check passed (Hyderabad temps look physical)")


def main():
    ap = argparse.ArgumentParser(description="Fetch ECMWF AIFS forecasts via Open-Meteo")
    ap.add_argument("--out", default="aifs_telangana_latest.json",
                    help="output JSON file (default: aifs_telangana_latest.json)")
    ap.add_argument("--push", help="POST the payload to this URL")
    ap.add_argument("--token", default=os.environ.get("DAYLI_INTERNAL_API_KEY", ""),
                    help="API key for --push (or set DAYLI_INTERNAL_API_KEY)")
    ap.add_argument("--model", default="ecmwf_aifs025_single",
                    help="Open-Meteo model name (default: ecmwf_aifs025_single)")
    ap.add_argument("--dry-run", action="store_true",
                    help="print grid info and exit without fetching")
    args = ap.parse_args()

    cycle = latest_cycle()
    log(f"ECMWF cycle: {cycle:%Y-%m-%d %H}Z")
    log(f"grid: {len(LATS)} lats × {len(LONS)} lons = {len(LATS)*len(LONS)} points")
    log(f"lats: {LATS[0]} → {LATS[-1]}  lons: {LONS[0]} → {LONS[-1]}")
    log(f"model: {args.model}")

    if args.dry_run:
        log("dry-run: exiting")
        return

    model_label = {
        "ecmwf_aifs025_single": "ECMWF AIFS 0.25° Single (via Open-Meteo)",
        "ecmwf_aifs025": "ECMWF AIFS 0.25° Ensemble (via Open-Meteo)",
        "ecmwf_ifs025": "ECMWF IFS 0.25° (via Open-Meteo)",
    }.get(args.model, f"{args.model} (via Open-Meteo)")

    results = fetch_grid(args.model)
    payload = build_payload(results, cycle, model_label)
    sanity_check(payload)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(payload, f)
    size_kb = os.path.getsize(args.out) / 1024
    log(f"wrote {args.out} ({size_kb:.1f} KB, {len(payload['steps'])} steps)")

    if args.push:
        if not args.token:
            log("ERROR: --push needs an API key. Set DAYLI_INTERNAL_API_KEY "
                "or pass --token.")
            sys.exit(1)
        body = json.dumps(payload).encode()
        # server.js opsAuth() uses HTTP Basic and ignores the username.
        cred = base64.b64encode(f"dayli:{args.token}".encode()).decode()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {cred}",
        }
        req = urllib.request.Request(args.push, data=body,
                                    headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                resp = json.loads(r.read())
                log(f"pushed: HTTP {r.status} — {resp.get('message', '')}")
                if resp.get("status"):
                    log(f"feed now: {resp['status']}")
        except urllib.error.HTTPError as e:
            log(f"push failed: HTTP {e.code} — {e.read().decode()[:300]}")
            sys.exit(1)


if __name__ == "__main__":
    main()
