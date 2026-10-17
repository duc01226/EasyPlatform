## Code Responsibility Hierarchy

Place logic with the owner selected by the project's documented architecture. Resolve it from project config, reference docs, accepted decisions, and existing code; do not assume entity/model/service/component layers or assign mappings, constants, or display rules to a fixed type. Trace origin → failing consumer and bypass paths before fixing. Protect all consumers at one authoritative owner; never scatter symptom patches. Apply YAGNI/KISS/DRY.
