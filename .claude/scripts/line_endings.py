"""Read and write a text file while keeping its own line-ending style, on every OS.

Python's text mode hides a file's newline style on read and, on write, emits the HOST
newline: `Path.write_text` turns an LF file into CRLF on Windows, and `newline="\\n"` turns a
CRLF file into LF everywhere. The block injectors edit shipped markdown in place, so either
flip rewrites every line of every touched file. They read and write through this pair instead:
code works on LF text, and the file keeps the style it had.

Style rule: a file that contains any CRLF is CRLF; otherwise LF. A new file is LF.
"""
from __future__ import annotations

import os
from typing import Union

PathLike = Union[str, "os.PathLike[str]"]


def read_text(path: PathLike) -> tuple[str, str]:
    """(text with LF newlines, the file's own newline: "\\r\\n" or "\\n")."""
    with open(path, "r", encoding="utf-8", newline="") as f:
        raw = f.read()
    newline = "\r\n" if "\r\n" in raw else "\n"
    return raw.replace("\r\n", "\n"), newline


def write_text(path: PathLike, text: str, newline: str = "\n") -> None:
    """Write LF `text` using `newline` (the value `read_text` returned for this file)."""
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text.replace("\n", newline) if newline != "\n" else text)
