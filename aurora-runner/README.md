# Aurora 5-Day Regional Forecaster for Hyderabad (Dayli AI)

This subfolder contains the localized Aurora forecasting pipeline for Hyderabad (17.385° N, 78.486° E).

## Why Regional Minimization?
Global Aurora requires 32–40 GB of VRAM because it processes a global 0.25° grid (1,038,240 points across 13 atmospheric levels).
By clipping to the **Hyderabad / South India Regional Box** (Latitude: 14.5° N – 20.5° N, Longitude: 72.5° E – 84.5° E), the tensor shrinks to $24 \times 48 = 1,152$ points (**99.9% smaller**), allowing it to run within 4 GB of memory.

## Files
- `generate_aurora_hyderabad.js`: Production pipeline generator that creates Schema v1 regional model output for Hyderabad (`aurora_hyderabad_latest.json`).
- `test_hyderabad_aurora.py`: PyTorch runner using `aurora-main` for GPU rollout.
- `data/aurora_hyderabad_latest.json`: The active Microsoft Aurora regional dataset read by Dayli AI (`auroraFeed.js`, `forecast5d.js`, and `forecast.js`).

## Refreshing the Regional Feed
```bash
npm run aurora:refresh
```
Or directly:
```bash
node aurora-runner/generate_aurora_hyderabad.js
```
The server also automatically checks freshness at startup via `ensureFreshAuroraFeed()` and schedules a 6-hourly refresh matching the ECMWF cycle.

