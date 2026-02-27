#!/usr/bin/env bash
# TC-ID Coverage Validation
# Extracts TC-IDs from test specs and test files, reports gaps.
#
# Usage:
#   bash .claude/scripts/test-coverage-check.sh
#   bash .claude/scripts/test-coverage-check.sh --strict  # exit 1 if gaps found
#
# Outputs:
#   - GitHub Actions: ::warning annotations
#   - Azure DevOps: ##vso[task.logissue] warnings
#   - Local: human-readable summary

set -euo pipefail

SPEC_DIR="docs/test-specs"
BACKEND_TEST_DIR="src/Backend/PlatformExampleApp.Tests.Integration"
FRONTEND_TEST_DIR="src/Frontend/e2e"
STRICT_MODE="${1:-}"

# Temp files (use mktemp for cross-platform safety)
EXPECTED_TCS=$(mktemp)
ACTUAL_TCS=$(mktemp)
MISSING_TCS=$(mktemp)
ORPHAN_TCS=$(mktemp)

# Cleanup on exit
cleanup() {
    rm -f "$EXPECTED_TCS" "$ACTUAL_TCS" "$MISSING_TCS" "$ORPHAN_TCS"
}
trap cleanup EXIT

echo "=== TC-ID Coverage Check ==="
echo ""

# --- Step 1: Extract TC-IDs from specs ---
if [ ! -d "$SPEC_DIR" ]; then
    echo "WARNING: Spec directory '$SPEC_DIR' not found. Skipping coverage check."
    exit 0
fi

grep -rohE 'TC-[A-Z]+-[A-Z]+-[0-9]+' "$SPEC_DIR" 2>/dev/null | sort -u > "$EXPECTED_TCS" || true
# Also extract INT-NNN style IDs from integration test specs
grep -rohE 'INT-[0-9]+' "$SPEC_DIR" 2>/dev/null | sort -u >> "$EXPECTED_TCS" || true
# Also extract PERF-NNN style IDs
grep -rohE 'PERF-[0-9]+' "$SPEC_DIR" 2>/dev/null | sort -u >> "$EXPECTED_TCS" || true
# Re-sort and deduplicate after adding all patterns
sort -u -o "$EXPECTED_TCS" "$EXPECTED_TCS"

EXPECTED_COUNT=$(wc -l < "$EXPECTED_TCS" | tr -d ' ')
echo "Expected TC-IDs from specs: $EXPECTED_COUNT"

# --- Step 2: Extract TC-IDs from test files ---
{
    # Backend: C# test files only (exclude bin/obj binary artifacts)
    if [ -d "$BACKEND_TEST_DIR" ]; then
        grep -rohEI --include='*.cs' 'TC-[A-Z]+-[A-Z]+-[0-9]+' "$BACKEND_TEST_DIR" 2>/dev/null || true
        grep -rohEI --include='*.cs' 'INT-[0-9]+' "$BACKEND_TEST_DIR" 2>/dev/null || true
        grep -rohEI --include='*.cs' 'PERF-[0-9]+' "$BACKEND_TEST_DIR" 2>/dev/null || true
    fi
    # Frontend: TypeScript test files only
    if [ -d "$FRONTEND_TEST_DIR" ]; then
        grep -rohEI --include='*.spec.ts' --include='*.test.ts' 'TC-[A-Z]+-[A-Z]+-[0-9]+' "$FRONTEND_TEST_DIR" 2>/dev/null || true
        grep -rohEI --include='*.spec.ts' --include='*.test.ts' 'INT-[0-9]+' "$FRONTEND_TEST_DIR" 2>/dev/null || true
        grep -rohEI --include='*.spec.ts' --include='*.test.ts' 'PERF-[0-9]+' "$FRONTEND_TEST_DIR" 2>/dev/null || true
    fi
} | sort -u > "$ACTUAL_TCS"

ACTUAL_COUNT=$(wc -l < "$ACTUAL_TCS" | tr -d ' ')
echo "Implemented TC-IDs in tests: $ACTUAL_COUNT"

# --- Step 3: Find missing coverage (in spec but not in tests) ---
comm -23 "$EXPECTED_TCS" "$ACTUAL_TCS" > "$MISSING_TCS"
MISSING_COUNT=$(wc -l < "$MISSING_TCS" | tr -d ' ')

# --- Step 4: Find orphaned tests (in tests but not in spec) ---
comm -13 "$EXPECTED_TCS" "$ACTUAL_TCS" > "$ORPHAN_TCS"
ORPHAN_COUNT=$(wc -l < "$ORPHAN_TCS" | tr -d ' ')

# --- Step 5: Calculate coverage percentage ---
if [ "$EXPECTED_COUNT" -gt 0 ]; then
    COVERED=$((EXPECTED_COUNT - MISSING_COUNT))
    COVERAGE_PCT=$((COVERED * 100 / EXPECTED_COUNT))
else
    COVERAGE_PCT=100
fi

echo ""
echo "--- Coverage Summary ---"
echo "Coverage: $COVERAGE_PCT% ($((EXPECTED_COUNT - MISSING_COUNT))/$EXPECTED_COUNT)"
echo ""

# --- Step 6: Report missing TC-IDs ---
if [ "$MISSING_COUNT" -gt 0 ]; then
    echo "MISSING COVERAGE ($MISSING_COUNT TC-IDs):"
    while IFS= read -r tc_id; do
        echo "  - $tc_id"
    done < "$MISSING_TCS"
    echo ""

    # CI-specific annotations
    MISSING_LIST=$(paste -sd, "$MISSING_TCS")

    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "::warning::Missing test coverage for $MISSING_COUNT TC-IDs: $MISSING_LIST"
    fi

    if [ -n "${TF_BUILD:-}" ]; then
        echo "##vso[task.logissue type=warning]Missing test coverage for $MISSING_COUNT TC-IDs: $MISSING_LIST"
    fi
else
    echo "All TC-IDs have test coverage!"
fi

# --- Step 7: Report orphaned TC-IDs ---
if [ "$ORPHAN_COUNT" -gt 0 ]; then
    echo ""
    echo "ORPHANED TC-IDs ($ORPHAN_COUNT - in tests but not in specs):"
    while IFS= read -r tc_id; do
        echo "  - $tc_id"
    done < "$ORPHAN_TCS"

    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        ORPHAN_LIST=$(paste -sd, "$ORPHAN_TCS")
        echo "::notice::Orphaned TC-IDs found (in tests but not in specs): $ORPHAN_LIST"
    fi
fi

# --- Step 8: Exit code ---
echo ""
echo "=== Coverage Check Complete ==="

if [ "$STRICT_MODE" = "--strict" ] && [ "$MISSING_COUNT" -gt 0 ]; then
    echo "STRICT MODE: Exiting with error due to missing coverage."
    exit 1
fi

exit 0
