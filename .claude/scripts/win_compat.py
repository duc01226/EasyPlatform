#!/usr/bin/env python3
"""Windows compatibility utilities for ClaudeKit scripts.

Provides UTF-8 encoding support for Windows console (cp1252).
Import this module early in scripts that output Unicode content.

Usage:
    # At top of script, after imports:
    from win_compat import safe_print, ensure_utf8_stdout, ensure_utf8_stderr

    # Option 1: Configure streams in place before writing output
    ensure_utf8_stdout()
    ensure_utf8_stderr()
    print("Unicode content: emojis, symbols, etc.")

    # Option 2: Use safe_print for individual calls
    safe_print("Unicode content: emojis, symbols, etc.")
"""

import io
import sys


def ensure_utf8_stream(stream, errors=None):
    """Configure an output stream for UTF-8 without closing its current buffer.

    Modern text streams are reconfigured in place. On older wrappers that do not
    support ``reconfigure``, detach the buffer before creating a replacement so
    the old wrapper cannot close a buffer that the new wrapper still uses.
    Streams without either capability are returned unchanged.
    """
    if stream is None:
        return stream

    reconfigure = getattr(stream, 'reconfigure', None)
    if callable(reconfigure):
        options = {'encoding': 'utf-8'}
        if errors is not None:
            options['errors'] = errors
        try:
            reconfigure(**options)
        except (AttributeError, io.UnsupportedOperation, ValueError):
            # A legacy/custom wrapper may expose an unsupported reconfigure
            # method. Fall through only to the detach-before-replacement path.
            pass
        else:
            return stream

    buffer = getattr(stream, 'buffer', None)
    detach = getattr(stream, 'detach', None)
    if buffer is None or not callable(detach):
        return stream

    previous_errors = getattr(stream, 'errors', None) or 'strict'
    line_buffering = bool(getattr(stream, 'line_buffering', False))
    write_through = bool(getattr(stream, 'write_through', False))
    try:
        detached_buffer = detach()
    except (AttributeError, OSError, ValueError):
        return stream

    return io.TextIOWrapper(
        detached_buffer,
        encoding='utf-8',
        errors=errors if errors is not None else previous_errors,
        line_buffering=line_buffering,
        write_through=write_through,
    )


def ensure_utf8_stdout(errors=None):
    """Configure stdout for UTF-8 on Windows without replacing its live buffer.

    Call this early in script execution, before writing output. Repeated calls
    are safe because supported streams are configured in place.
    """
    if sys.platform == 'win32':
        sys.stdout = ensure_utf8_stream(sys.stdout, errors=errors)


def ensure_utf8_stderr(errors=None):
    """Configure stderr for UTF-8 on Windows without closing captured pipes."""
    if sys.platform == 'win32':
        sys.stderr = ensure_utf8_stream(sys.stderr, errors=errors)


def safe_print(text):
    """Print with Unicode fallback for Windows cp1252 console.

    Use this for individual print calls when the stream encoding is unsupported.
    Falls back to replacing unencodable characters with '?'.

    Args:
        text: String to print (can contain any Unicode characters)
    """
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback: replace unencodable chars
        encoding = getattr(sys.stdout, 'encoding', 'utf-8') or 'utf-8'
        print(text.encode(encoding, errors='replace').decode(encoding))
