"""Shared data models and utilities for the code graph package."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NodeInfo:
    kind: str  # File, Class, Function, Type, Test
    name: str
    file_path: str
    line_start: int
    line_end: int
    language: str = ""
    parent_name: Optional[str] = None  # enclosing class/module
    params: Optional[str] = None
    return_type: Optional[str] = None
    modifiers: Optional[str] = None
    is_test: bool = False
    extra: dict = field(default_factory=dict)


@dataclass
class EdgeInfo:
    kind: str  # CALLS, IMPORTS_FROM, INHERITS, IMPLEMENTS, CONTAINS, TESTED_BY, DEPENDS_ON
    source: str  # qualified name or path
    target: str  # qualified name or path
    file_path: str
    line: int = 0
    extra: dict = field(default_factory=dict)


def qualify(name: str, file_path: str, enclosing_class: Optional[str] = None) -> str:
    """Create a qualified name: file_path::ClassName.name or file_path::name."""
    if enclosing_class:
        return f"{file_path}::{enclosing_class}.{name}"
    return f"{file_path}::{name}"
