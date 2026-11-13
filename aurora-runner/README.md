# aurora-runner

Intended home of the real Microsoft Aurora inference job for Dayli AI.

## Status: empty. No runner exists yet.

This directory previously contained two scripts, both removed because neither
produced a forecast:

- `generate_aurora_hyderabad.js` — called `generateHyderabadAuroraPayload()`, a
  **sine-wave generator** (`baseT = 31.0` plus `Math.sin(...)` for the diurnal
  cycle). It stamped the output `provenance: "aurora-inference"`, `model:
  "Microsoft Aurora 0.25° Regional"`, `initial_conditions: "ECMWF IFS HRES open
  data"`. None of that was true, and the result was fed into maternal-health
  heat advice via `forecast.js` and `forecast5d.js`.
- `test_hyderabad_aurora.py` — loaded `AuroraSmallPretrained` but built its
  input batch from `torch.randn`, i.e. **random noise as initial conditions**.
  It was a copy of the upstream docs' "random batch" smoke test, which exists
  only to check that the model executes. Its output file was orphaned; nothing
  read it.

Until a real runner lands, `lib/auroraFeed.js` stays empty and every forecast
path falls back to Open-Meteo. That fallback is implemented and tested.

## Constraints any real runner must respect

Three findings from the upstream project, each of which rules out an approach
that looks attractive:

1. **You cannot feed Aurora a regional box.** Aurora maintainer `wesselb` in
   [microsoft/aurora#178](https://github.com/microsoft/aurora/issues/178):
   pretrained models *"will not work out-of-the-box if you give them data of
   limited spatial extent (like a local region)."* A Telangana box, an
   all-India box and a buffered peninsular box are all equally invalid. Adding
   buffer does not fix it.

   The supported approach is the one he recommends: **run the model on the full
   global grid, then slice the output** to the region you care about. Boundary
   physics stay intact because the model saw the whole atmosphere; only the
   output array is cropped.

2. **`AuroraSmallPretrained` is not a forecast model.** Upstream docs: *"Use
   this model for debugging purposes. We do not recommend any other use."* It
   must not drive health advice. Use `AuroraV1p5` (upstream's recommended
   variant) or `AuroraPretrained`.

3. **Global 0.25° inference is memory-hungry.** The full model is documented at
   ~40 GB VRAM, Aurora 1.5 at ~32 GB. A free Kaggle T4/P100 has 16 GB. Whether
   `AuroraV1p5` fits in 16 GB in fp16 at inference is **unverified** and is the
   main open risk. Measure it before building anything on top.

## Licensing

- Aurora code and weights: **MIT** (HuggingFace `microsoft/aurora` repo
  metadata and the `microsoft-aurora` PyPI package). The CC-BY-NC-SA claim that
  circulates in third-party blog posts is not supported by the official sources.
- ECMWF open data (initial conditions): **CC-BY-4.0**, free, no API key.
- Note upstream's own caveat: Aurora *"has not been developed nor tested for
  non-academic purposes"* and is *"not designed or evaluated for direct
  operational decision-making without expert review."*

## Runners

Three runners, all emitting the same schema-v1 JSON for `auroraFeed.js`:

### 1. `run_aifs_openmeteo.py` — ECMWF AIFS via Open-Meteo (RECOMMENDED)

**No GPU. No API key. Runs anywhere with Python 3.10+.**

ECMWF AIFS is a real, operational AI weather model run by ECMWF. Open-Meteo
serves it over plain HTTP, free, CC-BY-4.0.

```bash
# Fetch and save locally:
python run_aifs_openmeteo.py --out aifs_latest.json

# Fetch and push to the server:
export DAYLI_INTERNAL_API_KEY=...   # same key the server has
python run_aifs_openmeteo.py --push https://your-host/internal/aurora/forecast

# Dry run (print grid info only):
python run_aifs_openmeteo.py --dry-run

# Use a different Open-Meteo model:
python run_aifs_openmeteo.py --model ecmwf_ifs025 --out ifs_latest.json
```

Deps: Python stdlib only (no pip install needed).

**Auth:** `server.js` `opsAuth()` uses HTTP **Basic**, not Bearer, against
`DAYLI_INTERNAL_API_KEY`. The username is ignored. The runner handles this;
if you push by hand use `curl -u "dayli:$DAYLI_INTERNAL_API_KEY"`.

**Verified end to end on 2026-11-07:** 169 grid points fetched, 20 steps
(5 days), pushed HTTP 200, feed reported `loaded: true, fresh: true`, and
`sampleAuroraPoint()` returned a real Hyderabad diurnal cycle (21.9–30.1 °C).

### Scheduling

AIFS publishes every 6h, and `auroraFeed.js` treats a forecast older than
`AURORA_MAX_AGE_HOURS` (default 30h) as absent. Refresh every 6h.

`.github/workflows/aifs-forecast.yml` does this on GitHub Actions. It needs two
repo secrets:

- `DAYLI_INTERNAL_API_KEY` — the same value the server has
- `DAYLI_HOST` — e.g. `https://api.dayli.ai` (no trailing slash)

Alternatively, local cron or a server crontab running the same command:

```
20 1,7,13,19 * * * cd /path/to/Dayli\ AI && DAYLI_INTERNAL_API_KEY=... \
  python3 aurora-runner/run_aifs_openmeteo.py --push https://api.dayli.ai/internal/aurora/forecast
```

Check the feed any time with:

```bash
curl -u "dayli:$DAYLI_INTERNAL_API_KEY" https://your-host/ops/aurora
```

### 2. `run_weathernext_mini.py` — Google DeepMind WeatherNext 2-mini

**Free Colab/Kaggle TPU, or any GPU >= 8 GB.**

WeatherNext 2-mini is open-sourced by Google DeepMind (Apache 2.0, Aug 2026).
Runs on the full global 0.25° grid from real ECMWF initial conditions, same
as Aurora.

```bash
pip install weathernext ecmwf-opendata cfgrib eccodes jax[tpu]

python run_weathernext_mini.py --probe          # check hardware
python run_weathernext_mini.py --out wn_latest.json
python run_weathernext_mini.py --device gpu --out wn_latest.json   # GPU mode
```

**API note:** The model loading API was written from the August 2026 release
docs. If the imports fail, check `github.com/google-deepmind/weathernext` for
the latest API and update `load_model_tpu()` / `load_model_gpu()`.

### 3. `run_aurora_india.py` — Microsoft Aurora (needs large GPU)

**A100 40GB or similar. Does NOT fit on free Kaggle T4.**

Global 0.25° inference from today's ECMWF data, cropped to Telangana (same
box as AIFS). Uses Aurora's `autocast=True` (bfloat16 backbone, float32
weights) so it fits a 40 GB A100. On Colab, upload `aurora_dayli_colab.ipynb`
and choose the A100 runtime; it embeds this script.

```bash
pip install microsoft-aurora ecmwf-opendata cfgrib eccodes

python run_aurora_india.py --probe
python run_aurora_india.py --out aurora_telangana_latest.json
```

All runners crop to Telangana because the server's `express.json()` keeps the
default 100 KB body limit; an all-India 0.25° payload is several MB and would
be rejected with HTTP 413.

### Switching between models

All three runners output the same schema-v1 JSON and push to the same endpoint
(`POST /internal/aurora/forecast`). `auroraFeed.js` accepts all three
provenances (`aurora-inference`, `aifs-inference`, `weathernext-inference`) and
always serves the freshest forecast.

To switch: just run a different runner. The feed automatically picks up the
newest forecast regardless of which model produced it. You can even run
multiple runners on different schedules as redundancy — the feed uses
whichever is freshest.

## Aurora spike notebook

**`spike_global_aurora.ipynb`** — *written, not yet run.* Pulls a real ECMWF
cycle via `ecmwf-opendata`, runs `AuroraV1p5` on the full global grid in
fp16/bf16, and prints peak VRAM and seconds/step. Upload to Kaggle with
**Accelerator: GPU T4** and **Internet: On**. Its final cell prints the
verdict. This decides whether Aurora is feasible on free hardware.

### Verified against ECMWF open data (2026-11-06)

Checked directly against the live `oper` 0p25 index, so the spike should not
stall on missing inputs:

- Pressure levels: **all 13** Aurora levels (50–1000 hPa) published.
- Pressure-level params: `t`, `u`, `v`, `q`, `z` all present (`gh` too, so no
  geopotential-height conversion is needed).
- Surface params: `2t`, `10u`, `10v`, `msl` all present.
- `slt` is *not* in open data — it comes from Aurora's own
  `aurora-0.25-static.pickle`, along with `lsm` and surface `z`.
- Cycle selection with a 10 h lag lands on a published cycle at every hour of
  the day (tested against the server for all 24).

Still unknown, and the only reason the spike exists: **peak VRAM**.

### If the spike fails

ECMWF **AIFS** is a genuine operational AI weather model, run by ECMWF, free,
CC-BY-4.0, global 0.25°, 6-hourly — and Open-Meteo already serves it over plain
HTTP (`models=ecmwf_aifs025_single`). It gives real AI-model forecasts covering
all of Telangana with no GPU and no infrastructure, and the bot already calls
Open-Meteo. That is the fallback, and it is an honest claim.

## Rule

Nothing in this directory may write forecast data it did not get from a model
run on real initial conditions. If there is no run, there is no feed.
