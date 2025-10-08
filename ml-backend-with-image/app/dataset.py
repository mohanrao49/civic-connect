import json
from pathlib import Path

DATA_FILE = Path("data/dataset.jsonl")
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

def save_report(report_dict: dict):
    """Append raw report to dataset.jsonl (build dataset dynamically)."""
    with DATA_FILE.open("a", encoding="utf8") as f:
        f.write(json.dumps(report_dict, ensure_ascii=False) + "\n")
