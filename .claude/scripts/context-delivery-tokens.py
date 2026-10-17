"""Tokenize the public synthetic renderer JSON on stdin. Optional: pip install tiktoken.

Windows: py -3 .claude/scripts/context-delivery-tokens.py
macOS/Linux: python3 .claude/scripts/context-delivery-tokens.py
This estimate excludes private host messages and actual later model/tool traffic.
"""
import json
import sys
import importlib.metadata
import tiktoken

data = json.load(sys.stdin)
encoder = tiktoken.get_encoding("o200k_base")
for profile in data["profiles"].values():
    for row in profile["payloads"]:
        row["tokens"] = len(encoder.encode(row["text"]))
    profile["tokens"] = sum(row["tokens"] for row in profile["payloads"])
    profile["laterCatalogTokens"] = len(encoder.encode(profile["laterCatalog"]))
    profile["laterDiagnosisTokens"] = len(encoder.encode(profile["laterDiagnosis"]))
before = data["profiles"]["compatible"]["tokens"]
after = data["profiles"]["concise"]["tokens"]
data["measurement"] = {
    "tokenizer": "tiktoken " + importlib.metadata.version("tiktoken") + " / o200k_base",
    "reduction": (before - after) / before,
    "scopedBudgetPassed": after <= 2500 and after <= before * 0.4,
    "wholeSession": "UNVERIFIED: requires paired runtime trajectories, including later reads",
}
json.dump(data, sys.stdout, indent=2)
sys.stdout.write("\n")
