"""Entry point for: python .claude/scripts/code_graph <command>"""
import os
import sys

# Fix package resolution when invoked as `python /path/to/directory`
_dir = os.path.dirname(os.path.abspath(__file__))
_parent = os.path.dirname(_dir)
if _parent not in sys.path:
    sys.path.insert(0, _parent)

# Use absolute import to avoid __package__ deprecation warning
from code_graph.cli import main

main()
