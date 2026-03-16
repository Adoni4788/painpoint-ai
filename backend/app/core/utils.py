"""Shared utility functions used across the application."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """
    Return the current UTC time as a timezone-naive datetime.

    Uses the modern datetime.now(timezone.utc) API (replaces the deprecated
    datetime.utcnow()) while keeping the value timezone-naive for compatibility
    with the existing DateTime columns (which store naive UTC).
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
