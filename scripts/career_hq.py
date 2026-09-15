#!/usr/bin/env python3
"""Repository entry point for the Career HQ skill script."""

from pathlib import Path
import runpy
import sys

from procedural import CAPABILITIES, main

SCRIPT = Path(__file__).resolve().parents[1] / ".agents" / "skills" / "career-hq" / "scripts" / "career_hq.py"
if len(sys.argv) > 1 and sys.argv[1] in {"capabilities", *CAPABILITIES}:
    sys.exit(main(sys.argv[1:]))
runpy.run_path(str(SCRIPT), run_name="__main__")
