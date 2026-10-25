from __future__ import annotations

import asyncio
import math
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
PERIOD_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
PERIOD_END = datetime(2026, 2, 1, tzinfo=timezone.utc)
DAY_AHEAD_HOURS = 24
CACHE_SECONDS = int(os.getenv("CACHE_SECONDS", "900"))

app = FastAPI(
    title="Northstar Wind Intelligence API",
    description="UK national WIND generation and day-ahead forecast accuracy for January 2026.",
    version="1.0.0",
)

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

_dashboard_cache: dict[str, Any] = {"expires_at": 0.0, "data": None}
_refresh_lock = asyncio.Lock()


def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _field(row: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in row:
            return row[name]
    return None


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def _records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("data", "items", "results"):
            if isinstance(payload.get(key), list):
                return [row for row in payload[key] if isinstance(row, dict)]
    raise ValueError("BMRS response did not contain a records list")


async def _fetch_dataset(client: httpx.AsyncClient, dataset: str) -> list[dict[str, Any]]:
    if dataset == "FUELHH":
        params = {
            "settlementDateFrom": "2026-01-01",
            "settlementDateTo": "2026-01-31",
            "fuelType": "WIND",
        }
    else:
        params = {
            "PublishDateTimeFrom": "2025-12-31T00:00:00Z",
            "PublishDateTimeTo": "2026-02-01T00:00:00Z",
        }
    try:
        response = await client.get(f"{BASE_URL}/{dataset}/stream", params=params)
        response.raise_for_status()
        return _records(response.json())
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve or parse the BMRS {dataset} dataset: {exc}",
        ) from exc


def _timestamp_key(value: datetime) -> str:
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")


def _build_dashboard(actual_rows: list[dict[str, Any]], forecast_rows: list[dict[str, Any]]) -> dict[str, Any]:
    actual_versions: dict[datetime, tuple[datetime, float]] = {}
    for row in actual_rows:
        start = _parse_time(_field(row, "startTime", "start_time"))
        published = _parse_time(_field(row, "publishTime", "publish_time"))
        generation = _number(_field(row, "generation"))
        if start and PERIOD_START <= start < PERIOD_END and generation is not None:
            version_time = published or start
            if start not in actual_versions or version_time >= actual_versions[start][0]:
                actual_versions[start] = (version_time, generation)
    actuals = {start: generation for start, (_, generation) in actual_versions.items()}

    forecasts: dict[datetime, list[tuple[datetime, float]]] = defaultdict(list)
    for row in forecast_rows:
        start = _parse_time(_field(row, "startTime", "start_time"))
        published = _parse_time(_field(row, "publishTime", "publish_time"))
        generation = _number(_field(row, "generation"))
        if start and published and PERIOD_START <= start < PERIOD_END and generation is not None:
            forecasts[start].append((published, generation))

    points = []
    for start in sorted(set(actuals) | set(forecasts)):
        eligible = [
            (published, generation)
            for published, generation in forecasts.get(start, [])
            if published <= start - timedelta(hours=DAY_AHEAD_HOURS)
        ]
        selected = max(eligible, key=lambda item: item[0]) if eligible else None
        forecast = selected[1] if selected else None
        publish_time = selected[0] if selected else None
        actual = actuals.get(start)
        error = forecast - actual if forecast is not None and actual is not None else None
        lead = (start - publish_time).total_seconds() / 3600 if publish_time else None
        points.append(
            {
                "start_time": _timestamp_key(start),
                "forecast_mw": forecast,
                "actual_mw": actual,
                "publish_time": _timestamp_key(publish_time) if publish_time else None,
                "lead_hours": round(lead, 2) if lead is not None else None,
                "error_mw": error,
            }
        )

    matched = [point for point in points if point["error_mw"] is not None]
    errors = [point["error_mw"] for point in matched]
    absolute_errors = [abs(error) for error in errors]
    nonzero_absolute_errors = sorted(error for error in absolute_errors if error > 0)
    high_error_threshold = (
        nonzero_absolute_errors[math.ceil(0.9 * len(nonzero_absolute_errors)) - 1]
        if nonzero_absolute_errors
        else None
    )
    for point in points:
        point["high_error"] = (
            high_error_threshold is not None
            and point["error_mw"] is not None
            and abs(point["error_mw"]) >= high_error_threshold
        )
    actual_nonzero = [point for point in matched if point["actual_mw"] != 0]
    mae = sum(absolute_errors) / len(absolute_errors) if errors else None
    rmse = math.sqrt(sum(error * error for error in errors) / len(errors)) if errors else None
    bias = sum(errors) / len(errors) if errors else None
    mape = (
        sum(abs(point["error_mw"] / point["actual_mw"]) for point in actual_nonzero)
        / len(actual_nonzero)
        * 100
        if actual_nonzero
        else None
    )

    hour_errors: dict[int, list[float]] = defaultdict(list)
    lead_errors: dict[int, list[float]] = defaultdict(list)
    for point in matched:
        start = _parse_time(point["start_time"])
        lead = point["lead_hours"]
        if start:
            hour_errors[start.hour].append(abs(point["error_mw"]))
        if lead is not None:
            # 24-hour bands make the curve stable while retaining delivery lead detail.
            band = max(DAY_AHEAD_HOURS, int(lead // 24) * 24)
            lead_errors[band].append(abs(point["error_mw"]))

    latest_forecast = next(
        (point for point in reversed(points) if point["forecast_mw"] is not None),
        None,
    )
    return {
        "period_start": "2026-01-01T00:00:00Z",
        "period_end": "2026-02-01T00:00:00Z",
        "fuel_type": "WIND",
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "Elexon BMRS",
        "selection_rule": (
            "For each half-hour delivery interval, select the latest WINDFOR forecast "
            "published at least 24 hours before delivery. Compare against FUELHH WIND actuals."
        ),
        "high_error_threshold_mw": high_error_threshold,
        "high_error_count": sum(point["high_error"] for point in points),
        "latest_forecast": latest_forecast,
        "points": points,
        "metrics": {
            "count": len(matched),
            "mae_mw": mae,
            "rmse_mw": rmse,
            "bias_mw": bias,
            "mape_pct": mape,
        },
        "hourly_accuracy": [
            {"hour": hour, "mae_mw": sum(values) / len(values), "count": len(values)}
            for hour, values in sorted(hour_errors.items())
        ],
        "lead_accuracy": [
            {"lead_hours": lead, "mae_mw": sum(values) / len(values), "count": len(values)}
            for lead, values in sorted(lead_errors.items())
        ],
        "residuals": errors,
    }


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard")
async def dashboard(refresh: bool = Query(default=False)) -> dict[str, Any]:
    now = time.monotonic()
    if not refresh and _dashboard_cache["data"] is not None and now < _dashboard_cache["expires_at"]:
        return _dashboard_cache["data"]

    async with _refresh_lock:
        now = time.monotonic()
        if not refresh and _dashboard_cache["data"] is not None and now < _dashboard_cache["expires_at"]:
            return _dashboard_cache["data"]
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            actual_rows, forecast_rows = await asyncio.gather(
                _fetch_dataset(client, "FUELHH"),
                _fetch_dataset(client, "WINDFOR"),
            )
        result = _build_dashboard(actual_rows, forecast_rows)
        _dashboard_cache.update(data=result, expires_at=time.monotonic() + CACHE_SECONDS)
        return result
