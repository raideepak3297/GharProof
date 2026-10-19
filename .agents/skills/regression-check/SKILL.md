---
name: regression-check
description: Use after implementation is done, before manual testing. Lists existing NestJS behaviors that could break from this diff — affected routes, other modules consuming the changed service, Mongoose query/index implications, event listeners, queue jobs — and produces a manual test scenarios checklist beyond the happy path.
---

# Regression Check

## What to do

1. **Check existing context first** (token-saver). If a ticket ID/slug is known, read `docs/workspace/tickets/{ID-OR-SLUG}.md` for the blast-radius analysis already in the kickoff plan and any regression scenarios already added. Build on what's there; don't repeat it.

2. Run `git diff` (staged + unstaged) to see the changes.

3. **Skim `docs/CODEBASE_CONVENTIONS.md`** for the auth model, logging rules (PII list), and which event/queue/scheduler systems are actually in use — these define the real blast radius for this project. Skip subsections that don't apply.

4. **For each changed function/method/schema, identify:**
   - What behavior existed before
   - What could now behave differently for callers
   - Any shared state, caches, indexes, or side effects that could be affected

5. **NestJS/Mongoose-specific things to check:**
   - **Other consumers:** grep for imports of changed services across modules. Each is a regression surface.
   - **API contract:** if controllers or response DTOs changed, what clients depend on the old shape?
   - **Event listeners (`@OnEvent`)** subscribing to events the changed code emits — still firing correctly?
   - **Queue processors (`@Process`)** consuming jobs the changed code produces — payload shape still compatible?
   - **Schedulers (`@Cron`)** that touch the same data
   - **Mongoose schema changes:** existing documents in the collection that don't have the new field — do reads still work? Does validation still pass on legacy docs?
   - **Index changes:** removed indexes that other queries silently depended on?
   - **Populate chains:** changed schema field that other modules `populate()`?
   - **Guards/interceptors:** changed user/auth shape that other guards read?

6. **Output a "Manual test scenarios" checklist.** Concrete API-level scenarios to hit locally (Postman, curl, or the FE). Happy path + at least 3 non-obvious cases:
   - Empty / missing optional fields
   - Validation failure path (verify error message + status code)
   - Concurrent writes to the same document
   - Legacy documents without the new field
   - Auth boundary — unauthorized user gets correct rejection
   - Pagination edge — last page, page beyond range

7. Append the checklist to `docs/workspace/tickets/{ID-OR-SLUG}.md` under a `## Regression scenarios` section via the **context-save** skill (which tags your author name).
