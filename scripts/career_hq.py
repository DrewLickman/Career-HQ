#!/usr/bin/env python3
"""Repository entry point for the Career HQ skill script."""

from pathlib import Path
import runpy

SCRIPT = Path(__file__).resolve().parents[1] / ".agents" / "skills" / "career-hq" / "scripts" / "career_hq.py"
runpy.run_path(str(SCRIPT), run_name="__main__")
