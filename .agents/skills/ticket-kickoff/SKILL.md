---
name: ticket-kickoff
description: Use at the start of a backend task in this NestJS/Mongoose project. Trigger when the user pastes a ticket, describes a feature/bug in prose, or says they're "picking up" something new. Produces acceptance criteria, file-level walkthrough across modules/controllers/services/schemas/DTOs, blast-radius analysis of every caller (other modules, guards, interceptors, event subscribers, queue consumers), edge cases, risks, and clarifying questions. Does NOT write code. Saves the plan to the shared context store.
---

# Ticket Kickoff

## What to do

1. **Identify the work.** Read whatever the user pasted — a ticket, a bug report, or a free-form description. Note any ticket ID if present (used as filename). If none, ask for a short kebab-case slug (e.g., `user-bulk-import`).

2. **Check existing context first** (token-saver). Look in `docs/workspace/tickets/` — if a file already exists for this ID/slug, **read it first** and report what's there before doing anything else. Someone may have already started this. If they have:
   - Tell the user who worked on it last and when
   - Summarize what's already decided
   - Ask: "Should I extend the existing plan, or are we starting fresh?"
   - Skip steps 3-4 below if the existing plan is still valid; jump to step 5.

3. **Read `docs/CODEBASE_CONVENTIONS.md` first** if it exists — it tells you the project's module layout, naming, validation patterns, and error-handling style so the plan you produce matches the project. If the file is missing, suggest running **codebase-explorer** before starting; for one-off tasks, proceed but flag that conventions are inferred.

4. **Explore the repo independently.** Don't trust the description alone. Check:
   - `src/modules/` (or equivalent) for related feature modules
   - `*.controller.ts` for affected routes
   - `*.service.ts` for business logic
   - `*.schema.ts` for Mongoose models in the area
   - `*.dto.ts` for request/response shapes and class-validator rules
   - `app.module.ts` for module wiring
   - Global `guards/`, `interceptors/`, `pipes/`, `filters/` for cross-cutting concerns

5. **Produce the walkthrough in this exact structure:**

   **Task:** {ticket ID or slug} — {one-line title}

   **Acceptance criteria:** bullet list. If the description is vague, draft what they likely should be and mark each `[needs confirmation]`.

   **Files to change:** grouped by layer, one-line reason each:
   - *Schemas:* `user.schema.ts` — add `lastLoginAt` field
   - *DTOs:* `update-user.dto.ts` — new optional field with `@IsDate()`
   - *Services:* `user.service.ts` — update method signature
   - *Controllers:* `user.controller.ts` — wire new query param
   - *Module wiring:* if any new providers/imports needed

   **Logic changes:** prose. What changes in behavior — request flow, validation, persistence, side effects.

   **Blast radius:** every consumer of the code being touched. Grep for:
   - Imports of changed services/schemas across the repo
   - Other controllers calling the same service methods
   - Event listeners (`@OnEvent`), queue processors (`@Process`), schedulers (`@Cron`)
   - Public API routes — flag any breaking response shape changes
   - Mongoose populate chains and lean projections that depend on schema shape
   - Indexes that need updating if query patterns change

   **Edge cases:** empty arrays, nulls, missing optional fields, concurrent writes (Mongo doesn't have transactions by default — flag if needed), pagination boundaries, validation failures, timezone/date issues.

   **Risks:** what could break, what's unknown, any migration needed for existing documents.

   **Clarifying questions:** anything ambiguous. Ask BEFORE finalizing.

6. **Do NOT write code.** Wait for the user to approve or refine the plan.

7. After approval, save the plan via the **context-save** skill using the task ID or slug as the filename. The save will be tagged with your `git config user.name` so the next dev knows who wrote it.
