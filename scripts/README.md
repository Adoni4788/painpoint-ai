# Experiment 1: Cost per Search

Scripts to run 50 test searches and parse token usage for cost analysis.

## Prerequisites

- Backend running (e.g. `uvicorn backend.app.main:app` or your deployed URL)
- Python 3.8+
- `pip install requests` (for run_experiment_searches.py)

## 1. Run the 50 searches

```bash
# With backend at localhost:8000 (default)
python scripts/run_experiment_searches.py

# With custom API URL (e.g. deployed backend)
python scripts/run_experiment_searches.py --api-url https://your-api.onrender.com

# Fire-and-forget (don't wait for each search - faster, but logs will interleave)
python scripts/run_experiment_searches.py --skip-wait
```

- Runs 25 standard searches + 25 validate searches sequentially
- Waits for each to complete (~2 min each) unless `--skip-wait`
- Saves search IDs to `experiment_searches.json`

## 2. Collect logs

Grab your backend logs from wherever they're stored (terminal output, Render logs, etc.). Look for lines like:

```
OPENAI_USAGE endpoint=expand_query model=gpt-4o-mini input_tokens=123 output_tokens=456
```

Save to a file, e.g. `usage.log`.

## 3. Parse and calculate cost

```bash
python scripts/parse_usage_logs.py --file usage.log

# Or pipe from stdin
cat usage.log | python scripts/parse_usage_logs.py

# Custom number of searches (if you ran fewer)
python scripts/parse_usage_logs.py --file usage.log --searches 25
```

Output includes:
- Total tokens and cost
- Average cost per search
- Breakdown by endpoint (expand_query, detect_complaints_and_relevance, etc.)

## Pricing

Default pricing is gpt-4o-mini (verify at platform.openai.com):
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

Override with `--input-price` and `--output-price` if needed.
