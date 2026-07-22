#!/usr/bin/env python3
"""Fail closed when private applicant data could enter a Career HQ release."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path


SKIP_DIRS = {".git", "node_modules", ".next", ".vinext", ".wrangler", "coverage", "tmp", "work", "outputs", "__pycache__"}
TEXT_SUFFIXES = {".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", ".css", ".html", ".xml", ".csv"}
RESUME_SUFFIXES = {".doc", ".docx", ".pdf", ".rtf", ".odt"}
EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b", re.IGNORECASE)
PHONE = re.compile(r"(?<!\d)(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-])\d{3}[ .-]\d{4}(?!\d)")
WINDOWS_USER_PATH = re.compile(r"[A-Z]:[\\/]+Users[\\/]+[^\\/\s]+", re.IGNORECASE)
MAC_USER_PATH = re.compile(r"/Users/[^/\s]+")
LINUX_HOME_PATH = re.compile(r"/home/[^/\s]+")


def tracked_files(root: Path) -> list[str]:
    try:
        result = subprocess.run(["git", "ls-files"], cwd=root, check=True, capture_output=True, text=True)
    except (OSError, subprocess.CalledProcessError):
        return []
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def iter_release_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file() or any(part in SKIP_DIRS for part in path.relative_to(root).parts):
            continue
        if ".job-search" in path.relative_to(root).parts:
            continue
        yield path


def scan(root: Path, denied_names: list[str], release: bool) -> list[str]:
    findings: list[str] = []
    tracked = tracked_files(root)
    for relative in tracked:
        parts = Path(relative).parts
        if ".job-search" in parts:
            findings.append(f"tracked private runtime file: {relative}")
        if Path(relative).suffix.lower() in RESUME_SUFFIXES and not relative.startswith(("templates/", "sample-data/")):
            findings.append(f"tracked resume/document artifact outside an approved fixture/template path: {relative}")

    for sensitive_surface in ("app", "dashboard", "public", "sample-data", "dist"):
        candidate = root / sensitive_surface / ".job-search"
        if candidate.exists():
            findings.append(f"private runtime folder inside public surface: {candidate.relative_to(root)}")

    for path in iter_release_files(root):
        relative = path.relative_to(root).as_posix()
        if path.suffix.lower() in RESUME_SUFFIXES and not relative.startswith(("templates/", "sample-data/")):
            findings.append(f"resume/document artifact in release contents: {relative}")
        if path.suffix.lower() not in TEXT_SUFFIXES or relative == "scripts/privacy_scan.py":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for match in EMAIL.finditer(text):
            domain = match.group(1).lower()
            if domain not in {"example.test", "example.invalid", "example.com"}:
                findings.append(f"email-like personal data in {relative}: {match.group(0)}")
        for match in PHONE.finditer(text):
            findings.append(f"phone-like personal data in {relative}: {match.group(0)}")
        for pattern, label in ((WINDOWS_USER_PATH, "Windows user path"), (MAC_USER_PATH, "macOS user path"), (LINUX_HOME_PATH, "Linux home path")):
            if match := pattern.search(text):
                findings.append(f"{label} in {relative}: {match.group(0)}")
        lowered = text.casefold()
        for denied in denied_names:
            if denied and denied.casefold() in lowered:
                findings.append(f"denied personal name in {relative}: {denied}")

    if release and (root / "dist").exists():
        for path in (root / "dist").rglob("*"):
            if path.is_file() and ".job-search" in path.parts:
                findings.append(f"private runtime file in public build: {path.relative_to(root)}")
    return sorted(set(findings))


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan Career HQ release contents for private data")
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--release", action="store_true")
    parser.add_argument("--deny-name", action="append", default=[])
    args = parser.parse_args()
    env_names = [value.strip() for value in os.getenv("CAREER_HQ_PRIVATE_NAMES", "").split(",") if value.strip()]
    root = Path(args.root).resolve()
    findings = scan(root, args.deny_name + env_names, args.release)
    if findings:
        print("Career HQ privacy scan failed:", file=sys.stderr)
        for finding in findings:
            print(f"- {finding}", file=sys.stderr)
        raise SystemExit(1)
    print(f"Career HQ privacy scan passed: {root}")


if __name__ == "__main__":
    main()
