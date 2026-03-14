# How to Parse Usage Logs for Cost Analysis

## Step 1: Get the logs from Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **painpoint-ai-backend**
3. Click **Logs** in the left sidebar
4. Use the time filter to show logs from when you ran the experiment script
5. **Select all** the log text (Ctrl+A or Cmd+A)
6. **Copy** (Ctrl+C or Cmd+C)

## Step 2: Save the logs to usage.log

1. Open the file `C:\PainPoint AI\usage.log` in any text editor (Notepad, VS Code, Cursor)
2. **Delete** the instruction lines at the top (the lines starting with #)
3. **Paste** your copied logs (Ctrl+V or Cmd+V)
4. **Save** the file (Ctrl+S or Cmd+S)

## Step 3: Run the parse script

1. Open a terminal (PowerShell or Command Prompt)
2. Run:

```powershell
cd "C:\PainPoint AI"
python scripts/parse_usage_logs.py --file usage.log
```

3. The script will print:
   - Total tokens used
   - Total cost in dollars
   - Average cost per search (assuming 50 searches)
   - Breakdown by endpoint (expand_query, detect_complaints_and_relevance, etc.)

## Troubleshooting

- **"No such file"** – Make sure you're in `C:\PainPoint AI` (project root)
- **"No OPENAI_USAGE lines found"** – Make sure you pasted the full logs, including lines with `OPENAI_USAGE`
- **Empty output** – The logs might not have the right format; each line should contain `OPENAI_USAGE endpoint=... input_tokens=... output_tokens=...`
