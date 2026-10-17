## Discovery Order

Before investigating, planning, or coding, run the Project Reference Docs Gate below: task-relevant config first (absent config is supported), then the docs index and `lessons.md`, each at its configured owner path. Never require default paths when owners are relocated. Answer a project question from its root Doc Lookup row and cite the doc read. For framework questions read `.claude/docs/README.md` (`/project-help`). When a required doc is missing, never invent rules or completion.

When you write or update a doc an agent reads (root context, reference docs, docs index, `lessons.md`), keep it discoverable: purpose and critical rules first, closing reminders last when long, and every pointer to another doc as `read <path> when <situation>` to a file that exists, routed from the Doc Lookup table or the docs index.

## Search Existing Code First

Before writing, read target code and `.claude/docs/development-rules.md`; grep 3+ similar patterns and cite `file:line`.

**First Principles:** (1) **Understanding > Output** — never ship code you can't explain. (2) **Design before mechanics** — write WHY before WHAT. (3) **Own your abstractions** — every dependency and platform choice is yours. (4) **Operational awareness** — code that can't be debugged, monitored, or rolled back is debt. (5) **Depth over breadth** — one understood solution beats ten generated variants.
