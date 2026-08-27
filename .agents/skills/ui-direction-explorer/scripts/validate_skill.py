#!/usr/bin/env python3
"""Portable sanity checks for this Agent Skill bundle.

This is not a replacement for the official/current Agent Skills validator.
It checks common structural mistakes with Python's standard library.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LINK_RE = re.compile(r"\[[^\]]+\]\((references/[^)]+|assets/[^)]+|scripts/[^)]+)\)")


def parse_simple_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        raise ValueError("SKILL.md must start with YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        raise ValueError("SKILL.md frontmatter is not closed")
    block = text[4:end]
    result: dict[str, str] = {}
    # Only fields needed by this validator; nested metadata is intentionally ignored.
    for line in block.splitlines():
        if not line or line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not SKILL.exists():
        print("ERROR: missing SKILL.md")
        return 1

    text = SKILL.read_text(encoding="utf-8")
    try:
        fm = parse_simple_frontmatter(text)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        return 1

    name = fm.get("name", "")
    description = fm.get("description", "")
    compatibility = fm.get("compatibility", "")

    if not NAME_RE.fullmatch(name):
        errors.append("name must contain lowercase letters/numbers/hyphens only")
    if name != ROOT.name:
        errors.append(f"name '{name}' must match directory '{ROOT.name}'")
    if not (1 <= len(name) <= 64):
        errors.append("name must be 1-64 characters")
    if not (1 <= len(description) <= 1024):
        errors.append("description must be 1-1024 characters")
    if compatibility and len(compatibility) > 500:
        errors.append("compatibility must be <= 500 characters")

    line_count = len(text.splitlines())
    if line_count > 500:
        warnings.append(f"SKILL.md has {line_count} lines; keep it under 500 where possible")

    for rel in sorted(set(LINK_RE.findall(text))):
        path = ROOT / rel
        if not path.exists():
            errors.append(f"referenced file does not exist: {rel}")
        # Agent Skills guidance recommends avoiding deep reference chains.
        if rel.startswith("references/") and len(Path(rel).parts) != 2:
            warnings.append(f"deep reference path: {rel}")

    expected_dirs = ["references", "assets", "scripts", "evals"]
    for directory in expected_dirs:
        if not (ROOT / directory).is_dir():
            warnings.append(f"expected bundle directory missing: {directory}/")

    print(f"Skill: {name or '<missing>'}")
    print(f"SKILL.md lines: {line_count}")
    print(f"Description chars: {len(description)}")
    print(f"Errors: {len(errors)} | Warnings: {len(warnings)}")
    for e in errors:
        print(f"ERROR: {e}")
    for w in warnings:
        print(f"WARN: {w}")

    if errors:
        return 1
    print("PASS: portable bundle sanity checks succeeded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
