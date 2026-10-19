---
name: context-load
description: Use at the start of a session — especially when picking up someone else's work or resuming after a break — to load the shared ticket log from docs/workspace/tickets/{ID-OR-SLUG}.md. Reading this file before doing any code exploration saves significant tokens because the prior dev's plan, decisions, and blast-radius analysis are already there.
---

# Context Load

## What to do

1. **Read** `docs/workspace/tickets/{ID-OR-SLUG}.md`. If it doesn't exist, tell the user clearly and stop — don't fabricate context. Suggest running **ticket-kickoff** if this is a new task.

2. **Summarize, but don't dump the whole file.** Pull out:
   - **Who has worked on this** (list authors from the create line + each `## Update:` heading)
   - **Latest status** — what was the most recent update, by whom, when
   - **Decisions already made** — so we don't re-litigate them
   - **API contracts / DTOs agreed** — so we don't break what was promised
   - **Schema / data model changes** — flagged loudly if migrations are involved
   - **Files touched so far** — these are the high-context spots
   - **Open questions** — anything blocking
   - **Notes for the next dev** — explicitly written for whoever picks up next

3. **List the section headings** found in the file so the user can ask for any specific one in full.

4. **Ask: "What are we working on now?"** Tie the loaded context to the immediate task. If the user is continuing the same work, no further skill needed. If they're shifting to a new sub-task, suggest the relevant skill (e.g., implement-from-plan, self-review).

5. **Token-efficiency reminder:** because this file exists, you should NOT re-grep the whole repo for things already documented (existing imports, blast radius, conventions). Trust the log; only verify points that are unclear or stale.
