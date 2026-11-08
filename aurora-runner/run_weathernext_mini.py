#!/usr/bin/env python3
"""
run_weathernext_mini.py — Google DeepMind WeatherNext Cyclones Mini inference.

Runs WeatherNextCyclones_Mini (1.0° resolution) on pre-processed ECMWF HRES
data, crops to India, and emits a schema-v1 payload for auroraFeed.js.

HARDWARE: Free Colab TPU v5e-1, or a P100+ GPU.

The recommended way to run this is as a Colab notebook — upload the companion
notebook (weathernext_dayli.ipynb) to Colab, set Runtime → TPU v5e-1, and
run all cells. This standalone script does the same thing for automated use.

DATA: The model expects pre-processed ECMWF HRES xarray data from the GCS
bucket `dm_graphcast`. The demo dataset is from Oct 7 2024 (20 × 6h steps).
For live forecasts in Dayli, use run_aifs_openmeteo.py (already verified and
working). This runner is for when you want WeatherNext model output
specifically.

Usage:
    python run_weathernext_mini.py --out weathernext_india.json
    python run_weathernext_mini.py --out weathernext_india.json --push https://host/internal/aurora/forecast
    python run_weathernext_mini.py --probe   # check TPU/GPU availability
"""

import argparse
import dataclasses
import datetime as dt
import json
import os
import sys
import time

INDIA = dict(lat_min=6.0, lat_max=38.0, lon_min=68.0, lon_max=98.0)


def log(msg):
    print(f"[weathernext] {msg}", flush=True)


def probe():
    """Report whether this host can run the job."""
    import jax
    backend = jax.default_backend()
    devices = jax.devices()
    log(f"JAX {jax.__version__}, backend={backend}, devices={len(devices)}")
    for d in devices:
        log(f"  {d}")
    if backend == "tpu":
        log("VERDICT: TPU available. WeatherNextCyclones_Mini will run.")
        return True
    elif backend == "gpu":
        log("VERDICT: GPU available. WeatherNextCyclones_Mini fits on a P100+.")
        return True
    else:
        log("VERDICT: no TPU or GPU. Set Colab runtime to TPU v5e-1.")
        return False


def load_data_and_weights(
    model_name="WeatherNextCyclones_Mini",
    split="2024",
    data_resolution="1.0",
    steps="20",
):
    """Download weights, config, and sample data from the GCS bucket."""
    import numpy as np
    import xarray
    from google.cloud import storage
    from weathernext.utils import checkpoint
    from weathernext.utils import fiddle_config_io
    from weathernext.weathernext2 import fgn

    config_name = f"weathernext2/configs/{model_name}"
    weights_path = f"weathernext2/params/{model_name}_<{split}.npz"
    data_path = (
        f"weathernext2/dataset/source-hres_forecast_init-2024-10-07 00:00:00"
        f"_res-{data_resolution}_levels-13_steps-{steps}.nc"
    )

    log("downloading from GCS bucket dm_graphcast...")
    gcs_client = storage.Client.create_anonymous_client()
    gcs_bucket = gcs_client.get_bucket("dm_graphcast")

    log(f"  loading data: {data_path}")
    with gcs_bucket.blob(data_path).open("rb") as f:
        example_batch = xarray.load_dataset(f).compute()

    log(f"  loading config: {config_name}")
    config = fiddle_config_io.get_fiddle_config_by_name(config_name)

    log(f"  loading weights: {weights_path}")
    with gcs_bucket.blob(weights_path).open("rb") as f:
        ckpt = checkpoint.load(f, fgn.CheckPoint)

    log(f"  data shape: {dict(example_batch.dims)}")
    log(f"  variables: {list(example_batch.data_vars)[:10]}...")
    return example_batch, config, ckpt


def build_model(config, ckpt):
    """Build the JIT-compiled forward function."""
    import jax
    import haiku as hk
    import xarray_jax
    from weathernext.weathernext2 import fgn

    backend = jax.default_backend()
    transformer_kwargs = config.predictor_kwargs["noisy_function_kwargs"][
        "mesh_model_ctor"
    ].keywords["transformer_kwargs"]

    if backend == "gpu":
        transformer_kwargs["attention_type"] = "triblockdiag_mha"
    elif backend == "tpu":
        transformer_kwargs.update({
            "block_q": 128,
            "block_kv": 128,
            "block_kv_compute": 128,
            "block_q_dkv": 128,
            "block_kv_dkv": 128,
            "block_kv_dkv_compute": 128,
        })

    config_inference = fgn.PredictorConfig(
        task=config.task,
        predictor_constructor=config.predictor_constructor,
        predictor_kwargs=config.predictor_kwargs,
        predictor_wrappers=config.predictor_wrappers[:-1],
    )

    @hk.transform
    def run_forward(inputs, targets_template, forcings):
        predictor = fgn.construct_predictor(config_inference)
        return predictor(
            inputs, targets_template=targets_template, forcings=forcings
        )

    run_forward_jitted = jax.jit(
        lambda rng, i, t, f: run_forward.apply(ckpt.params, rng, i, t, f)
    )

    log(f"model built on {backend}")
    return run_forward_jitted, config


def run_inference(run_forward_jitted, example_batch, config):
    """Run autoregressive rollout and return predictions as xarray."""
    import jax
    import numpy as np
    import xarray
    import xarray_jax
    from weathernext.utils import rollout
    from weathernext.utils import data_utils

    task_config = config.task
    eval_inputs, eval_targets, eval_forcings = (
        data_utils.extract_inputs_targets_forcings(
            example_batch,
            target_lead_times=slice(
                "6h", f"{(example_batch.sizes['time'] - 2) * 6}h"
            ),
            **dataclasses.asdict(task_config),
        )
    )

    log(f"inputs: {dict(eval_inputs.dims)}")
    log(f"targets: {dict(eval_targets.dims)}")

    # Single ensemble member for speed (Dayli needs one forecast, not an ensemble)
    num_ensemble_members = 1
    rng = jax.random.PRNGKey(0)
    rngs = np.stack(
        [jax.random.fold_in(rng, i) for i in range(num_ensemble_members)],
        axis=0,
    )

    run_forward_pmap = xarray_jax.pmap(run_forward_jitted, dim="sample")

    log("running autoregressive rollout...")
    t0 = time.time()
    chunks = []
    for i, chunk in enumerate(
        rollout.chunked_prediction_generator_multiple_runs(
            predictor_fn=run_forward_pmap,
            rngs=rngs,
            inputs=eval_inputs,
            targets_template=eval_targets * np.nan,
            forcings=eval_forcings,
            num_steps_per_chunk=1,
            num_samples=num_ensemble_members,
            pmap_devices=jax.local_devices(),
        )
    ):
        chunks.append(chunk)
        elapsed = time.time() - t0
        log(f"  step {i+1} ({elapsed:.1f}s)")
        t0 = time.time()

    predictions = xarray.combine_by_coords(chunks)
    log(f"inference complete: {dict(predictions.dims)}")
    return predictions


def crop_payload(predictions, init_time_str, region=INDIA):
    """Extract India from the xarray predictions and build schema-v1 JSON."""
    import numpy as np

    # Take the first ensemble member (sample=0) and first batch
    pred = predictions.isel(sample=0, batch=0)

    lat = pred.coords["lat"].values
    lon = pred.coords["lon"].values

    lat_mask = (lat >= region["lat_min"]) & (lat <= region["lat_max"])
    lon_mask = (lon >= region["lon_min"]) & (lon <= region["lon_max"])

    lats_cropped = lat[lat_mask]
    lons_cropped = lon[lon_mask]
    log(f"cropped to {len(lats_cropped)} x {len(lons_cropped)} cells")

    # Variable names in WeatherNext output
    t2m_name = "2m_temperature"
    u10_name = "10m_u_component_of_wind"
    v10_name = "10m_v_component_of_wind"

    init_time = np.datetime64(init_time_str)
    lead_times = pred.coords["time"].values

    steps = []
    for t_idx, lead_time in enumerate(lead_times):
        valid_time = init_time + lead_time
        valid_time_str = str(np.datetime_as_string(valid_time, unit="s")) + "Z"

        # Extract and crop the fields
        t2m_raw = pred[t2m_name].isel(time=t_idx).values
        u10_raw = pred[u10_name].isel(time=t_idx).values
        v10_raw = pred[v10_name].isel(time=t_idx).values

        t2m = t2m_raw[np.ix_(lat_mask, lon_mask)] - 273.15  # K → °C
        u10 = u10_raw[np.ix_(lat_mask, lon_mask)]
        v10 = v10_raw[np.ix_(lat_mask, lon_mask)]
        wind = np.sqrt(u10**2 + v10**2) * 3.6  # m/s → km/h

        steps.append({
            "valid_time": valid_time_str,
            "t2m_c": [[round(float(x), 2) for x in row] for row in t2m],
            "wind10m_kph": [[round(float(x), 2) for x in row]
                           for row in wind],
        })

    return {
        "schema_version": 1,
        "provenance": "weathernext-inference",
        "model": "Google WeatherNextCyclones_Mini 1.0°, global run cropped to India",
        "initial_conditions": "ECMWF HRES forecast (GCS sample data)",
        "init_time": init_time_str,
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
        "grid": {
            "lats": [round(float(v), 4) for v in lats_cropped],
            "lons": [round(float(v), 4) for v in lons_cropped],
        },
        "steps": steps,
    }


def main():
    ap = argparse.ArgumentParser(
        description="Run WeatherNextCyclones_Mini inference"
    )
    ap.add_argument(
        "--probe", action="store_true", help="check hardware and exit"
    )
    ap.add_argument("--out", default="weathernext_india_latest.json")
    ap.add_argument("--push", help="POST the payload to this URL")
    ap.add_argument(
        "--token",
        default=os.environ.get("DAYLI_INTERNAL_API_KEY", ""),
        help="API key for --push (or set DAYLI_INTERNAL_API_KEY)",
    )
    ap.add_argument("--steps", default="20", help="forecast steps in dataset")
    args = ap.parse_args()

    if args.probe:
        sys.exit(0 if probe() else 1)
    if not probe():
        log("no TPU or GPU; use --probe to inspect")
        sys.exit(1)

    example_batch, config, ckpt = load_data_and_weights(steps=args.steps)
    run_forward_jitted, config = build_model(config, ckpt)
    predictions = run_inference(run_forward_jitted, example_batch, config)

    # The sample data init time is embedded in the dataset
    init_time = str(
        example_batch.isel(batch=0, time=1).datetime.values
    ).replace(" ", "T")
    if not init_time.endswith("Z"):
        init_time = init_time.split(".")[0] + "Z"

    payload = crop_payload(predictions, init_time)
    log(f"payload: {len(payload['steps'])} steps, "
        f"{len(payload['grid']['lats'])}x{len(payload['grid']['lons'])} grid")

    with open(args.out, "w") as f:
        json.dump(payload, f)
    log(f"wrote {args.out} ({os.path.getsize(args.out) / 1024:.1f} KB)")

    if args.push:
        import base64
        import urllib.request

        if not args.token:
            log("ERROR: --push needs an API key. Set DAYLI_INTERNAL_API_KEY.")
            sys.exit(1)
        body = json.dumps(payload).encode()
        # server.js opsAuth() uses HTTP Basic and ignores the username.
        cred = base64.b64encode(f"dayli:{args.token}".encode()).decode()
        req = urllib.request.Request(
            args.push,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {cred}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            log(f"pushed: HTTP {r.status}")


if __name__ == "__main__":
    main()
