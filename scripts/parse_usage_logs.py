#!/usr/bin/env python3
"""
Experiment 1: Parse OPENAI_USAGE logs and calculate cost per search.

Usage:
  python scripts/parse_usage_logs.py < logfile.txt
  python scripts/parse_usage_logs.py --file backend.log
  cat backend.log | python scripts/parse_usage_logs.py

Expects log lines like:
  OPENAI_USAGE endpoint=expand_query model=gpt-4o-mini input_tokens=123 output_tokens=456

Pricing (gpt-4o-mini, as of 2024 - verify at platform.openai.com):
  Input:  $0.15 / 1M tokens
  Output: $0.60 / 1M tokens
"""

import argparse
import re
import sys
from collections import defaultdict

# gpt-4o-mini pricing (per 1M tokens) - update from platform.openai.com
INPUT_PRICE_PER_M = 0.15
OUTPUT_PRICE_PER_M = 0.60

PATTERN = re.compile(
    r"OPENAI_USAGE\s+endpoint=(\S+)\s+model=(\S+)\s+input_tokens=(\d+)\s+output_tokens=(\d+)"
)


def parse_line(line: str) -> dict | None:
    m = PATTERN.search(line)
    if not m:
        return None
    return {
        "endpoint": m.group(1),
        "model": m.group(2),
        "input_tokens": int(m.group(3)),
        "output_tokens": int(m.group(4)),
    }


def main():
    parser = argparse.ArgumentParser(description="Parse OpenAI usage logs and calculate cost")
    parser.add_argument("--file", "-f", help="Log file (default: stdin)")
    parser.add_argument("--searches", type=int, default=50, help="Number of searches (for avg cost)")
    parser.add_argument(
        "--input-price",
        type=float,
        default=INPUT_PRICE_PER_M,
        help=f"Input $/1M tokens (default: {INPUT_PRICE_PER_M})",
    )
    parser.add_argument(
        "--output-price",
        type=float,
        default=OUTPUT_PRICE_PER_M,
        help=f"Output $/1M tokens (default: {OUTPUT_PRICE_PER_M})",
    )
    args = parser.parse_args()

    source = open(args.file) if args.file else sys.stdin

    by_endpoint = defaultdict(lambda: {"input": 0, "output": 0, "calls": 0})
    total_input = 0
    total_output = 0

    for line in source:
        if isinstance(line, bytes):
            line = line.decode("utf-8", errors="ignore")
        rec = parse_line(line)
        if rec:
            by_endpoint[rec["endpoint"]]["input"] += rec["input_tokens"]
            by_endpoint[rec["endpoint"]]["output"] += rec["output_tokens"]
            by_endpoint[rec["endpoint"]]["calls"] += 1
            total_input += rec["input_tokens"]
            total_output += rec["output_tokens"]

    if args.file and hasattr(source, "close"):
        source.close()

    # Cost calculation
    input_cost = (total_input / 1_000_000) * args.input_price
    output_cost = (total_output / 1_000_000) * args.output_price
    total_cost = input_cost + output_cost

    # Print report
    print("=" * 60)
    print("OPENAI USAGE REPORT")
    print("=" * 60)
    print(f"\nTotal: {total_input:,} input + {total_output:,} output tokens")
    print(f"Total cost: ${total_cost:.4f}")
    print(f"  Input:  ${input_cost:.4f}")
    print(f"  Output: ${output_cost:.4f}")

    if args.searches > 0:
        avg_per_search = total_cost / args.searches
        print(f"\nAvg cost per search ({args.searches} searches): ${avg_per_search:.4f}")
        if avg_per_search < 0.10:
            print("  -> Budgeting not urgent (< $0.10)")
        elif avg_per_search > 0.50:
            print("  -> Prioritize usage controls (> $0.50)")
        else:
            print("  -> Moderate cost")

    print("\n--- By endpoint ---")
    for ep, data in sorted(by_endpoint.items()):
        inc = (data["input"] / 1_000_000) * args.input_price
        outc = (data["output"] / 1_000_000) * args.output_price
        ep_cost = inc + outc
        print(f"  {ep}: {data['calls']} calls, {data['input']:,} in / {data['output']:,} out = ${ep_cost:.4f}")

    print()


if __name__ == "__main__":
    main()
