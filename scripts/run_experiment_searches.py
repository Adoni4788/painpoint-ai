#!/usr/bin/env python3
"""
Experiment 1: Run 50 searches (25 standard, 25 validate) to collect token usage data.

Usage:
  1. Start your backend (e.g. uvicorn backend.app.main:app)
  2. Run: python scripts/run_experiment_searches.py [--api-url http://localhost:8000]
  3. Let it run (~2 min per search = ~100 min total, or run in background)
  4. Collect logs from your backend, then run parse_usage_logs.py

The script runs searches sequentially so logs are easier to correlate.
"""

import argparse
import json
import sys
import time

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    sys.exit(1)

# 25 standard search queries (keyword-style)
STANDARD_QUERIES = [
    "email marketing software",
    "project management tool",
    "CRM for small business",
    "invoicing for freelancers",
    "password manager",
    "meal planning app",
    "habit tracker",
    "meditation app",
    "browser extension productivity",
    "note taking app",
    "calendar scheduling",
    "expense tracking",
    "team communication",
    "video editing software",
    "design tool for non-designers",
    "customer support software",
    "ecommerce platform",
    "landing page builder",
    "email deliverability",
    "remote work tools",
    "developer documentation",
    "API integration",
    "data backup",
    "cloud storage",
    "task automation",
]

# 25 validate ideas (sentence-style)
VALIDATE_IDEAS = [
    "A tool that helps remote teams run better daily standups.",
    "An app that reminds you to drink water throughout the day.",
    "A platform connecting local farmers directly with restaurants.",
    "A browser extension that summarizes YouTube videos into key points.",
    "A service for freelancers that automatically sends payment reminders.",
    "An app that tracks your mood and suggests activities to improve it.",
    "A tool that scans your inbox and unsubscribes you from spam.",
    "A platform for trading used textbooks among college students.",
    "A meal planner that adapts to your dietary restrictions.",
    "A habit tracker that turns your goals into a game with rewards.",
    "A password manager that works seamlessly across all devices.",
    "A meditation app that lets you practice with a friend remotely.",
    "A service that finds the cheapest gas stations near you.",
    "A tool that checks your writing for tone and clarity.",
    "A platform for discovering local volunteer opportunities.",
    "A tool for small businesses to manage inventory and orders.",
    "An app that helps parents coordinate pickups and dropoffs.",
    "A service that matches freelancers with short-term gigs.",
    "A tool that converts meeting notes into action items.",
    "An app that tracks recurring subscriptions and suggests cancellations.",
    "A platform for peer-to-peer skill swapping.",
    "A tool that helps writers overcome writer's block.",
    "An app that organizes family photos by face and event.",
    "A service that audits your cloud spending and suggests savings.",
    "A tool that generates accessibility reports for websites.",
]


def run_standard_search(api_url: str, query: str) -> dict:
    resp = requests.post(
        f"{api_url}/api/searches",
        json={"query": query, "sources": ["reddit", "hackernews", "amazon"]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def run_validate_search(api_url: str, idea: str) -> dict:
    resp = requests.post(
        f"{api_url}/api/validate-minimal",
        json={"idea": idea},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def wait_for_completion(api_url: str, search_id: str, poll_interval: int = 5) -> dict:
    while True:
        resp = requests.get(f"{api_url}/api/searches/{search_id}", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status", "")
        if status in ("completed", "failed"):
            return data
        time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="Run 50 experiment searches")
    parser.add_argument(
        "--api-url",
        default="http://localhost:8000",
        help="Backend API base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--output",
        default="experiment_searches.json",
        help="Output file for search IDs and metadata",
    )
    parser.add_argument(
        "--skip-wait",
        action="store_true",
        help="Don't wait for each search to complete (faster but logs will interleave)",
    )
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    results = {"standard": [], "validate": [], "api_url": api_url}

    print(f"API: {api_url}")
    print(f"Running 25 standard + 25 validate = 50 searches")
    if not args.skip_wait:
        print("Waiting for each search to complete (~2 min each). Use --skip-wait to fire-and-forget.")
    print()

    for i, query in enumerate(STANDARD_QUERIES, 1):
        print(f"[{i}/25] Standard: {query[:50]}...")
        try:
            search = run_standard_search(api_url, query)
            sid = search["id"]
            results["standard"].append({"id": sid, "query": query})
            if not args.skip_wait:
                final = wait_for_completion(api_url, sid)
                results["standard"][-1]["status"] = final.get("status")
                results["standard"][-1]["clusters"] = final.get("total_relevant_complaints", 0)
                print(f"       -> {final.get('status')} ({final.get('total_relevant_complaints', 0)} relevant)")
            else:
                print(f"       -> {sid}")
        except Exception as e:
            print(f"       ERROR: {e}")
            results["standard"].append({"query": query, "error": str(e)})

    for i, idea in enumerate(VALIDATE_IDEAS, 1):
        print(f"[{i}/25] Validate: {idea[:50]}...")
        try:
            search = run_validate_search(api_url, idea)
            sid = search["id"]
            results["validate"].append({"id": sid, "idea": idea})
            if not args.skip_wait:
                final = wait_for_completion(api_url, sid)
                results["validate"][-1]["status"] = final.get("status")
                results["validate"][-1]["clusters"] = final.get("total_relevant_complaints", 0)
                print(f"       -> {final.get('status')} ({final.get('total_relevant_complaints', 0)} relevant)")
            else:
                print(f"       -> {sid}")
        except Exception as e:
            print(f"       ERROR: {e}")
            results["validate"].append({"idea": idea, "error": str(e)})

    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone. Results saved to {args.output}")
    print("Next: collect backend logs and run parse_usage_logs.py")


if __name__ == "__main__":
    main()
