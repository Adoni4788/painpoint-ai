"""
Pytest configuration and shared fixtures.
"""
import pytest


# Mark all async tests with asyncio mode
pytest_plugins = ["pytest_asyncio"]
