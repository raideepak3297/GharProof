---
name: ship-it
description: Use when changes are reviewed and ready to commit. Generates conventional commit message, NestJS-aware PR description (with migration notes if schemas changed), and a short status comment for the ticket tracker. Does NOT push or commit automatically.
---

# Ship It

## What to do

1. **Check existing context first** (token-saver). Read `docs/workspace/tickets/{ID-OR-SLUG}.md` if available. The plan, decisions, files touched, schema changes, and regression scenarios are all there — pull the PR description content from this log instead of re-reading the diff to reverse-engineer it.

2. Run `git diff` and `git log <main>..HEAD` for the current branch to fill in any gaps not in the log (e.g., last-minute fixes).

3. **Generate three outputs, each in its own clearly labeled section:**

   ### Commit message
   Conventional commits format. Subject ≤72 chars. Body explains WHY, not what. Common scopes for this repo: module name (`users`, `auth`, `billing`), `schema`, `dto`, `config`.
   ```
   <type>(<scope>): <subject>

   <body>
   ```
   Types: `feat`, `fix`, `refactor`, `perf`, `test`, `chore`, `docs`.

   ### PR description
   - **Context:** what task, why this change. Link the ticket if there's an ID.
   - **What changed:** high-level bullets, grouped by layer if useful (schema / DTO / service / controller).
   - **Why this approach:** brief rationale, especially if alternatives were considered.
   - **Schema/data changes:** if any Mongoose schemas changed — note new fields, defaults, whether existing documents need a migration script, any new indexes.
   - **API changes:** new/changed endpoints with method + path. Flag breaking changes loudly.
   - **Testing done:** automated tests added, manual scenarios run.
   - **Risks / rollback plan:** short.

   ### Ticket tracker comment
   3-5 lines, plain text, no markdown. What was done, what was tested, any follow-ups.

4. **Do NOT run `git commit` or `git push`** unless the user explicitly asks.

5. Append a `## Shipped` section to the ticket context file with the commit SHA once committed, via the **context-save** skill (which records your author name and timestamp so the team sees who shipped what).
