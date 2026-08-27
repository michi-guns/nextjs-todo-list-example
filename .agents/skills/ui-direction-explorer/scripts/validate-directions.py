#!/usr/bin/env python3
"""Structural lint for UI Direction Explorer manifests.

Usage:
    python3 scripts/validate-directions.py .ui-explorations/<slug>

This script intentionally uses only the Python standard library.
It catches deterministic structural problems; it does not judge UX quality.
"""

from __future__ import annotations

import argparse
import json
import sys
from itertools import combinations
from pathlib import Path
from typing import Any

HIGH_IMPACT = (
    "information_architecture",
    "workflow_model",
    "navigation_model",
    "composition_model",
    "content_hierarchy",
)

MEDIUM_IMPACT = (
    "density",
    "disclosure",
    "interaction_model",
    "search_filter_model",
)

LOW_IMPACT = ("visual_language",)
ALL_AXES = HIGH_IMPACT + MEDIUM_IMPACT + LOW_IMPACT
VALID_DEPTHS = {"brief", "prototype", "integrated"}


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ValueError(f"Missing required file: {path}") from None
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from None


def norm(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())


def nonempty(value: Any) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return bool(value)
    return value is not None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exploration_dir", type=Path)
    args = parser.parse_args()

    root = args.exploration_dir.resolve()
    errors: list[str] = []
    warnings: list[str] = []

    try:
        exploration = load_json(root / "exploration.json")
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    expected_count = exploration.get("direction_count")
    if not isinstance(expected_count, int) or expected_count < 1:
        errors.append("exploration.json: direction_count must be an integer >= 1")

    depth = exploration.get("spike_depth")
    if depth not in VALID_DEPTHS:
        errors.append(
            "exploration.json: spike_depth must be one of "
            + ", ".join(sorted(VALID_DEPTHS))
        )

    for key in ("goal", "critical_tasks", "constraints"):
        if not nonempty(exploration.get(key)):
            errors.append(f"exploration.json: missing/non-empty {key}")

    fixture_path = root / "fixture.json"
    if not fixture_path.exists():
        errors.append("Missing fixture.json; directions cannot be compared fairly")
        fixture = {}
    else:
        try:
            fixture = load_json(fixture_path)
            for key in ("scenario", "required_capabilities"):
                if not nonempty(fixture.get(key)):
                    errors.append(f"fixture.json: missing/non-empty {key}")
        except ValueError as exc:
            errors.append(str(exc))
            fixture = {}

    directions_dir = root / "directions"
    files = sorted(directions_dir.glob("*.json")) if directions_dir.exists() else []

    if not files:
        errors.append("No direction manifests found in directions/*.json")

    manifests: list[dict[str, Any]] = []
    ids: set[str] = set()

    for path in files:
        try:
            item = load_json(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        if not isinstance(item, dict):
            errors.append(f"{path.name}: manifest must be a JSON object")
            continue

        did = norm(item.get("id"))
        if not did:
            errors.append(f"{path.name}: missing id")
        elif did in ids:
            errors.append(f"{path.name}: duplicate direction id '{did}'")
        else:
            ids.add(did)

        for key in ("name", "hypothesis", "optimize_for", "tradeoff"):
            if not nonempty(item.get(key)):
                errors.append(f"{path.name}: missing/non-empty {key}")

        axes = item.get("axes")
        if not isinstance(axes, dict):
            errors.append(f"{path.name}: axes must be an object")
            axes = {}
        for axis in HIGH_IMPACT:
            if not norm(axes.get(axis)):
                errors.append(f"{path.name}: missing high-impact axis '{axis}'")
        for axis in MEDIUM_IMPACT + LOW_IMPACT:
            if not norm(axes.get(axis)):
                warnings.append(f"{path.name}: missing axis '{axis}'")

        fixture_id = item.get("fixture_id")
        expected_fixture_id = fixture.get("id") if isinstance(fixture, dict) else None
        if expected_fixture_id and fixture_id != expected_fixture_id:
            errors.append(
                f"{path.name}: fixture_id {fixture_id!r} does not match "
                f"fixture.json id {expected_fixture_id!r}"
            )

        manifests.append(item)

    if isinstance(expected_count, int) and expected_count >= 1:
        if len(manifests) != expected_count:
            errors.append(
                f"Direction count mismatch: expected {expected_count}, found {len(manifests)}"
            )

    declared_ids = exploration.get("direction_ids", [])
    if declared_ids:
        declared = {norm(x) for x in declared_ids}
        found = {norm(x.get("id")) for x in manifests}
        if declared != found:
            warnings.append(
                "exploration.json direction_ids does not exactly match directions/*.json"
            )

    for a, b in combinations(manifests, 2):
        aid = a.get("id", a.get("name", "A"))
        bid = b.get("id", b.get("name", "B"))
        axes_a = a.get("axes") if isinstance(a.get("axes"), dict) else {}
        axes_b = b.get("axes") if isinstance(b.get("axes"), dict) else {}

        high_diffs = sum(norm(axes_a.get(k)) != norm(axes_b.get(k)) for k in HIGH_IMPACT)
        total_diffs = sum(norm(axes_a.get(k)) != norm(axes_b.get(k)) for k in ALL_AXES)

        if high_diffs == 0:
            errors.append(
                f"{aid} vs {bid}: no categorical difference on high-impact axes; "
                "perform semantic divergence review"
            )
        elif total_diffs < 3:
            warnings.append(
                f"{aid} vs {bid}: only {total_diffs} categorical axis differences; "
                "verify the pair represents a meaningful product decision"
            )

        if norm(a.get("hypothesis")) == norm(b.get("hypothesis")):
            errors.append(f"{aid} vs {bid}: identical normalized hypotheses")

    print(f"UI Direction Explorer validation: {root}")
    print(f"Directions: {len(manifests)}")
    print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")

    for message in errors:
        print(f"ERROR: {message}")
    for message in warnings:
        print(f"WARN: {message}")

    if errors:
        return 1

    print("PASS: structural checks succeeded. Semantic UX review is still required.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
