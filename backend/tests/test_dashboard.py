from datetime import datetime, timezone

from app.main import _build_dashboard, _parse_time


def test_selects_latest_forecast_published_at_least_one_day_ahead():
    actuals = [
        {"startTime": "2026-01-02T12:00:00Z", "generation": 8000},
        {"startTime": "2026-01-02T12:30:00Z", "generation": 9000},
    ]
    forecasts = [
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T10:00:00Z", "generation": 7000},
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-01T11:59:00Z", "generation": 7500},
        {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-02T08:00:00Z", "generation": 7900},
        {"startTime": "2026-01-02T12:30:00Z", "publishTime": "2026-01-01T12:31:00Z", "generation": 8500},
    ]

    result = _build_dashboard(actuals, forecasts)

    assert result["metrics"]["count"] == 1
    assert result["points"][0]["forecast_mw"] == 7500
    assert result["points"][0]["error_mw"] == -500
    assert result["points"][0]["lead_hours"] == 24.02
    assert result["points"][1]["forecast_mw"] is None
    assert result["metrics"]["mae_mw"] == 500
    assert result["metrics"]["bias_mw"] == -500
    assert result["latest_forecast"]["forecast_mw"] == 7500
    assert result["high_error_threshold_mw"] == 500
    assert result["high_error_count"] == 1
    assert result["points"][0]["high_error"] is True
    assert result["points"][1]["high_error"] is False


def test_scope_filters_outside_january_and_invalid_values():
    result = _build_dashboard(
        [
            {"startTime": "2025-12-31T23:30:00Z", "generation": 100},
            {"startTime": "2026-02-01T00:00:00Z", "generation": 200},
            {"startTime": "2026-01-01T00:00:00Z", "generation": "not-a-number"},
        ],
        [{"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-30T00:00:00Z", "generation": 300}],
    )

    assert len(result["points"]) == 1
    assert result["points"][0]["forecast_mw"] == 300
    assert result["points"][0]["actual_mw"] is None
    assert result["metrics"]["count"] == 0
    assert result["metrics"]["mae_mw"] is None


def test_time_parser_normalizes_naive_and_z_times_to_utc():
    assert _parse_time("2026-01-01T00:00:00Z") == datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert _parse_time("2026-01-01T00:00:00") == datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert _parse_time("bad") is None


def test_uses_latest_published_actual_revision():
    result = _build_dashboard(
        [
            {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-02T13:00:00Z", "generation": 8000},
            {"startTime": "2026-01-02T12:00:00Z", "publishTime": "2026-01-02T14:00:00Z", "generation": 8100},
        ],
        [],
    )

    assert result["points"][0]["actual_mw"] == 8100
