#!/usr/bin/env python3
"""
Smart Alembic migration runner for Render (and other hosted environments).

Problem: The production DB already has all tables created manually/directly,
but no `alembic_version` row exists. Running `alembic upgrade head` fails with:
  DuplicateTableError: relation "workspaces" already exists

Fix: If we detect that error, we stamp the DB with `alembic stamp head` to
tell Alembic "yes, you're already up to date" — then exit cleanly so uvicorn starts.
"""

import subprocess
import sys


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    print(f"[migrate] Running: {' '.join(cmd)}", flush=True)
    return subprocess.run(cmd, capture_output=True, text=True)


def main() -> None:
    result = run(["alembic", "upgrade", "head"])

    # Success
    if result.returncode == 0:
        print(result.stdout, flush=True)
        print("[migrate] Migrations applied successfully.", flush=True)
        sys.exit(0)

    stderr = result.stderr or ""
    stdout = result.stdout or ""
    combined = stderr + stdout

    print(stdout, flush=True)
    print(stderr, flush=True)

    # Tables already exist — DB was created before Alembic was introduced
    if "DuplicateTableError" in combined or "already exists" in combined:
        print(
            "[migrate] Tables already exist. Stamping DB with current head revision...",
            flush=True,
        )
        stamp = run(["alembic", "stamp", "head"])
        print(stamp.stdout, flush=True)
        print(stamp.stderr, flush=True)
        if stamp.returncode == 0:
            print("[migrate] DB stamped successfully. Starting server...", flush=True)
        else:
            print("[migrate] WARNING: stamp failed — server may still start.", flush=True)
        sys.exit(stamp.returncode)

    # Any other migration error — fail loudly so Render shows the real problem
    print("[migrate] Migration failed with an unexpected error. Aborting.", flush=True)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
