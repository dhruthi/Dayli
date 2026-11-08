#!/usr/bin/env python3
"""
run_aurora_india.py — real Microsoft Aurora inference, cropped to Telangana.

Runs Aurora 0.25° Fine-Tuned on the FULL GLOBAL grid from real ECMWF open-data
initial conditions (oper, step=0, i.e. IFS HRES T0 - the data this checkpoint
was fine-tuned on), then crops the output and emits a schema-v1 payload for
whatsapp-bridge/lib/auroraFeed.js.

WHY GLOBAL: Aurora's pretrained checkpoints do not accept a regional input.
Maintainer `wesselb`, microsoft/aurora#178: they "will not work out-of-the-box
if you give them data of limited spatial extent (like a local region)." The
supported approach is to run global and crop the OUTPUT.

WHY TELANGANA, NOT ALL-INDIA: the server's express.json() keeps the default
100 KB body limit. An all-India 0.25° crop is several MB and would be rejected
with HTTP 413. The Telangana box matches run_aifs_openmeteo.py (~40 KB).

HARDWARE: Microsoft documents ~40 GB of GPU memory in fp32. This script uses
upstream's `autocast=True`, which runs only the backbone in bfloat16 and keeps
the weights in float32, so it fits a 40 GB A100. --probe checks the GPU first.

PRECISION: do NOT cast the whole model to a half type. Aurora's forward() calls
batch.type(p.dtype), which would also cast metadata.lon; in bfloat16, 359.75
rounds to 358.0 and Aurora's validator rejects the grid. autocast avoids that
because the parameters, and therefore the batch, stay float32.

Usage:
    python run_aurora_india.py --probe
    python run_aurora_india.py --out aurora.json
    python run_aurora_india.py --out aurora.json --push https://host/internal/aurora/forecast
"""

import argparse
import base64
import datetime as dt
import json
import os
import sys
import time

# Same box as run_aifs_openmeteo.py. Output-only: a slice of a global run.
TELANGANA = dict(lat_min=16.0, lat_max=19.0, lon_min=77.0, lon_max=80.0)

LEVELS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000]
SURF = ["2t", "10u", "10v", "msl"]
PL = ["t", "u", "v", "q", "z"]

# Verified against the live ECMWF open-data index: the oper 0p25 stream publishes
# every one of these. `slt` is not there -- it comes from Aurora's static pickle.


def log(msg):
    print(f"[aurora] {msg}", flush=True)


def probe():
    """Report whether this host can plausibly run the job."""
    import torch

    log(f"torch {torch.__version__}, cuda={torch.cuda.is_available()}")
    if not torch.cuda.is_available():
        log("no GPU -> cannot run")
        return False
    total = 0.0
    for i in range(torch.cuda.device_count()):
        p = torch.cuda.get_device_properties(i)
        gb = p.total_memory / 1024**3
        total += gb
        log(f"  gpu {i}: {p.name}  {gb:.1f} GiB")
    biggest = max(
        torch.cuda.get_device_properties(i).total_memory / 1024**3
        for i in range(torch.cuda.device_count())
    )
    log(f"largest single GPU: {biggest:.1f} GiB  (total {total:.1f} GiB)")
    # autocast needs native bfloat16 (Ampere or newer). T4 and V100 lack it.
    if not torch.cuda.is_bf16_supported():
        log("VERDICT: this GPU has no bfloat16 support. Use an A100, L4 or H100.")
        return False
    # The model is not sharded, so only the largest single device matters.
    if biggest < 32:
        log("VERDICT: too small. Global 0.25 needs well over 24 GiB even with")
        log("         autocast. In Colab, choose the A100 GPU runtime.")
        return False
    log("VERDICT: plausible. Proceeding is reasonable.")
    return True


def latest_cycle(lag_hours=10):
    """Most recent 6-hourly ECMWF cycle old enough to be published.

    lag=10h was checked against the server for all 24 hours of the day; both
    this cycle and the t-6 one were always already available.
    """
    t = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=lag_hours)
    return t.replace(hour=(t.hour // 6) * 6, minute=0, second=0, microsecond=0)


def download(cycle, prev, outdir="ic"):
    from ecmwf.opendata import Client

    client = Client(source="ecmwf")
    os.makedirs(outdir, exist_ok=True)

    def grab(when, levtype, params, target, levelist=None):
        if os.path.exists(target) and os.path.getsize(target) > 0:
            log(f"  {target} ({os.path.getsize(target)/1024**2:.1f} MB, cached)")
            return
        req = dict(
            date=when.strftime("%Y%m%d"), time=when.hour, type="fc", step=0,
            levtype=levtype, param=params, target=target,
        )
        if levelist:
            req["levelist"] = levelist
        client.retrieve(**req)
        log(f"  {target} ({os.path.getsize(target)/1024**2:.1f} MB)")

    for tag, when in (("t", cycle), ("p", prev)):
        grab(when, "sfc", SURF, f"{outdir}/{tag}_sfc.grib2")
        grab(when, "pl", PL, f"{outdir}/{tag}_pl.grib2", LEVELS)


def load_state(tag, outdir="ic"):
    """Read one analysis time into arrays on Aurora's expected grid."""
    import numpy as np
    import xarray as xr

    def open_grib(path, **filters):
        return xr.open_dataset(
            path, engine="cfgrib",
            backend_kwargs={"indexpath": "", "filter_by_keys": filters},
        )

    # A surface GRIB mixes level types: 2t on heightAboveGround=2, 10u/10v on
    # heightAboveGround=10, msl on meanSea. cfgrib refuses to build one dataset
    # from conflicting coordinates and SILENTLY SKIPS the clashing variables,
    # surfacing as a KeyError on u10. Open once per level type.
    sfc = f"{outdir}/{tag}_sfc.grib2"
    d2 = open_grib(sfc, typeOfLevel="heightAboveGround", level=2)
    d10 = open_grib(sfc, typeOfLevel="heightAboveGround", level=10)
    dms = open_grib(sfc, typeOfLevel="meanSea")
    surf = {
        "2t": d2["t2m"].values, "10u": d10["u10"].values,
        "10v": d10["v10"].values, "msl": dms["msl"].values,
    }

    pl = open_grib(f"{outdir}/{tag}_pl.grib2", typeOfLevel="isobaricInhPa")
    pl = pl.sel(isobaricInhPa=LEVELS)
    atmos = {k: pl[k].values for k in PL}

    # ECMWF publishes longitude as [-180, 179.75]; Aurora requires [0, 360)
    # strictly increasing. Roll the axis and every data array together.
    lon_raw = d2["longitude"].values.astype("float32")
    shift = -int(np.argmin(lon_raw % 360))
    lon = np.roll(lon_raw % 360, shift)
    surf = {k: np.roll(v, shift, axis=-1) for k, v in surf.items()}
    atmos = {k: np.roll(v, shift, axis=-1) for k, v in atmos.items()}
    lat = d2["latitude"].values.astype("float32")

    assert lat[0] > lat[-1], "latitude must be decreasing"
    assert np.all(np.diff(lon) > 0), "longitude must be strictly increasing"
    assert lon.min() >= 0 and lon.max() < 360, "longitude must be in [0, 360)"
    return surf, atmos, lat, lon


def build_batch(cycle, outdir="ic"):
    import numpy as np
    import pickle
    import torch
    from aurora import Batch, Metadata
    from huggingface_hub import hf_hub_download

    surf_t, atmos_t, lat, lon = load_state("t", outdir)
    surf_p, atmos_p, _, _ = load_state("p", outdir)

    static_path = hf_hub_download(
        repo_id="microsoft/aurora", filename="aurora-0.25-static.pickle")
    with open(static_path, "rb") as f:
        static_raw = pickle.load(f)
    static_vars = {
        k: torch.as_tensor(np.asarray(static_raw[k]), dtype=torch.float32)
        for k in ("lsm", "z", "slt")
    }

    def t2(a, b):
        return torch.from_numpy(np.stack([a, b])[None].astype(np.float32))

    batch = Batch(
        surf_vars={k: t2(surf_p[k], surf_t[k]) for k in SURF},
        static_vars=static_vars,
        atmos_vars={k: t2(atmos_p[k], atmos_t[k]) for k in PL},
        metadata=Metadata(
            lat=torch.from_numpy(lat),
            lon=torch.from_numpy(lon),
            time=(cycle.replace(tzinfo=None),),
            atmos_levels=tuple(LEVELS),
        ),
    )
    return batch, lat, lon


def run(batch, steps):
    """Global rollout. Yields (2t, 10u, 10v) per step, on CPU."""
    import numpy as np
    import torch
    import aurora
    from aurora import rollout

    os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

    # `Aurora` is the IFS HRES T0 fine-tune and defaults to exactly our variable
    # set (4 surf, 3 static, 5 atmos). AuroraV1p5 needs 19 surface + 36 static
    # variables, which these initial conditions do not provide.
    # autocast=True: backbone in bfloat16, weights and batch stay float32.
    model = aurora.Aurora(autocast=True)
    model.load_checkpoint()
    model.eval()
    model = model.to("cuda")

    batch_gpu = batch.to("cuda")
    log(f"weights+batch on GPU: "
        f"{torch.cuda.max_memory_allocated()/1024**3:.2f} GiB")

    out = []
    t0 = time.time()
    with torch.inference_mode():
        for i, pred in enumerate(rollout(model, batch_gpu, steps=steps)):
            fields = {}
            for v in ("2t", "10u", "10v"):
                a = pred.surf_vars[v][0, -1].float().cpu().numpy()
                # A forecast of NaN must never be mistaken for a successful run.
                if not np.isfinite(a).all():
                    raise RuntimeError(f"non-finite {v} at step {i+1}")
                fields[v] = a
            out.append(fields)
            log(f"  step {i+1}/{steps}  ({time.time()-t0:.1f}s, "
                f"peak {torch.cuda.max_memory_allocated()/1024**3:.2f} GiB)")
            t0 = time.time()
    return out


def crop_payload(preds, lat, lon, cycle, region=TELANGANA):
    """Slice the global output to `region` and build the schema-v1 payload."""
    import numpy as np

    li = np.where((lat >= region["lat_min"]) & (lat <= region["lat_max"]))[0]
    oi = np.where((lon >= region["lon_min"]) & (lon <= region["lon_max"]))[0]
    lats = [round(float(v), 4) for v in lat[li]]
    lons = [round(float(v), 4) for v in lon[oi]]
    log(f"cropped to {len(lats)} x {len(lons)} cells "
        f"({region['lat_min']}-{region['lat_max']}N, "
        f"{region['lon_min']}-{region['lon_max']}E)")

    steps = []
    for i, f in enumerate(preds):
        t2m = f["2t"][np.ix_(li, oi)] - 273.15
        u = f["10u"][np.ix_(li, oi)]
        v = f["10v"][np.ix_(li, oi)]
        wind = np.sqrt(u**2 + v**2) * 3.6
        steps.append({
            "valid_time": (cycle + dt.timedelta(hours=6 * (i + 1)))
                          .strftime("%Y-%m-%dT%H:%M:%SZ"),
            "t2m_c": [[round(float(x), 2) for x in row] for row in t2m],
            "wind10m_kph": [[round(float(x), 2) for x in row] for row in wind],
        })

    return {
        "schema_version": 1,
        "provenance": "aurora-inference",
        "model": "Microsoft Aurora 0.25 (IFS HRES T0 fine-tuned), global run cropped to Telangana",
        "initial_conditions": "ECMWF IFS HRES open data (oper, step=0)",
        "init_time": cycle.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generated_at": dt.datetime.now(dt.timezone.utc)
                          .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "grid": {"lats": lats, "lons": lons},
        "steps": steps,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true",
                    help="report host capability and exit")
    ap.add_argument("--steps", type=int, default=20, help="6-hourly steps")
    ap.add_argument("--out", default="aurora_telangana_latest.json")
    ap.add_argument("--push", help="POST the payload to this URL")
    ap.add_argument("--token", default=os.environ.get("DAYLI_INTERNAL_API_KEY", ""),
                    help="API key for --push (or set DAYLI_INTERNAL_API_KEY)")
    ap.add_argument("--icdir", default="ic")
    args = ap.parse_args()

    if args.probe:
        sys.exit(0 if probe() else 1)
    if not probe():
        log("refusing to start on insufficient hardware; use --probe to inspect")
        sys.exit(1)

    cycle = latest_cycle()
    prev = cycle - dt.timedelta(hours=6)
    log(f"ECMWF cycle {cycle:%Y-%m-%d %H}Z (history from {prev:%H}Z)")

    download(cycle, prev, args.icdir)
    batch, lat, lon = build_batch(cycle, args.icdir)
    preds = run(batch, args.steps)
    payload = crop_payload(preds, lat, lon, cycle)

    with open(args.out, "w") as f:
        json.dump(payload, f)
    log(f"wrote {args.out} ({os.path.getsize(args.out)/1024**2:.1f} MB, "
        f"{len(payload['steps'])} steps)")

    if args.push:
        import urllib.error
        import urllib.request
        if not args.token:
            log("ERROR: --push needs an API key. Set DAYLI_INTERNAL_API_KEY.")
            sys.exit(1)
        # server.js opsAuth() uses HTTP Basic and ignores the username.
        cred = base64.b64encode(f"dayli:{args.token}".encode()).decode()
        req = urllib.request.Request(
            args.push, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json",
                     "Authorization": f"Basic {cred}"},
            method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                log(f"pushed: HTTP {r.status} {r.read().decode()[:300]}")
        except urllib.error.HTTPError as e:
            log(f"push failed: HTTP {e.code} {e.read().decode()[:300]}")
            sys.exit(1)


if __name__ == "__main__":
    main()
