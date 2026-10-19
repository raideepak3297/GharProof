---
name: context-save
description: Use to save the current task's working context to docs/workspace/tickets/{ID-OR-SLUG}.md — a shared, in-repo log readable by every dev on the team. Auto-invoked by ticket-kickoff, implement-from-plan, ship-it, and others, or manually by the user. Always appends with author tag and timestamp; never overwrites.
---

# Context Save

## What to do

1. **Identify the file name.** Use the ticket ID if known, otherwise ask for a short kebab-case slug (e.g., `user-bulk-import`). The file path is `docs/workspace/tickets/{ID-OR-SLUG}.md`.

2. **Get the author name** by running `git config user.name`. If empty, ask the user once and remember it for the rest of the session.

3. **Get the repo name** (basename of the git root) so cross-repo handoffs are traceable.

4. **Read the file first if it exists.** Don't blindly append — check what's already there so you don't duplicate sections. If the same dev is updating their own recent entry (within an hour), update in place. Otherwise append a new dated section so handoffs are visible.

5. **First write to a file uses this header + sections:**

   ```markdown
   # {ID-OR-SLUG}: {title}

   _Created: {YYYY-MM-DD HH:MM} by {author}_
   _Repo: {current repo name}_

   ## Plan
   <from ticket-kickoff if present>

   ## Decisions made
   - ...

   ## API contracts / DTOs agreed
   - POST /users/bulk → BulkCreateUsersDto, returns BulkResultDto
   - ...

   ## Schema / data model changes
   - User schema: added `lastLoginAt: Date` (optional, no default — existing docs unaffected)
   - New compound index: `{ email: 1, deletedAt: 1 }`
   - Migration needed: no / yes (script at: ...)

   ## Files touched
   - src/modules/users/users.service.ts — added bulkCreate method
   - ...

   ## Open questions
   - ...

   ## Notes for next dev / future me
   - ...
   ```

6. **Subsequent appends use this format** (added at the bottom of the file):

   ```markdown
   ---

   ## Update: {YYYY-MM-DD HH:MM} — {author}

   <whatever new content: decisions, files touched, regression scenarios, shipped notes, etc.>
   ```

   Never edit older sections. Treat them as immutable history — that's how the next dev knows what happened.

7. **Confirm the file path** back to the user. Suggest committing the file: "Don't forget to commit `docs/workspace/tickets/{ID-OR-SLUG}.md` so the team sees this."
