---
name: self-review
description: Use when the user wants a code review on recent NestJS changes before committing. Reviews the diff plus surrounding files for correctness, NestJS conventions (DTOs, DI, exception handling), Mongoose usage (queries, indexes, lean), security (auth guards, PII in logs), test coverage, and style. Outputs severity-labeled feedback (Blockers / Should-fix / Nits) and applies only approved fixes.
---

# Self Review

## What to do

1. **Check existing context first** (token-saver). If a ticket ID/slug is known, read `docs/workspace/tickets/{ID-OR-SLUG}.md` to learn what was decided, what's already been reviewed, and any earlier "Should-fix" items deferred. Don't re-flag things the team already discussed.

2. Run `git diff` (staged + unstaged) for the full change set.

3. **Read `docs/CODEBASE_CONVENTIONS.md`** if it exists. The "convention" half of any code review is comparing the diff to written rules — without the doc, you're guessing. Use it for naming, layering, error patterns, logging, validation, and what should NOT be logged (PII list).

4. **Read surrounding files for context.** If anything in the surrounding code is ambiguous — naming, error patterns, schema shape — surface that file to the user and ask. Don't assume consistency.

5. **Review against this checklist:**

   **Correctness & logic**
   - Does the code do what the plan/AC says?
   - Async/await used everywhere it's needed (no unhandled promises, no missed `await` on Mongoose ops)?
   - Error paths handled — `NotFoundException`, `BadRequestException`, `ConflictException` thrown appropriately?

   **NestJS conventions**
   - All controller inputs validated via DTO + class-validator decorators?
   - `ValidationPipe` settings respected (`whitelist`, `forbidNonWhitelisted`)?
   - Services injected via constructor, not instantiated manually?
   - New providers registered in the module's `providers` (and `exports` if cross-module)?
   - Guards/interceptors applied where needed (auth, rate limiting, logging)?
   - Response shapes — are we leaking Mongoose internals (`__v`, password hashes, internal flags)?
   - All enums defined in `src/common/enums/index.ts`?
   - All interfaces defined strictly in the module's `interfaces/<feature>.interface.ts` file?

   **Mongoose / MongoDB**
   - Queries that should use `.lean()` for read-only paths?
   - N+1 patterns disguised as loops over `findById`? Use `$in` or aggregation.
   - Indexes present for new query patterns? Flag missing ones.
   - `populate()` chains — are they needed, are they bounded?
   - Concurrent writes safe? Flag if optimistic locking or `findOneAndUpdate` with conditions would be safer.
   - Schema changes — any migration needed for existing documents?

   **Security**
   - Routes that should require `@UseGuards(AuthGuard)` but don't?
   - PII or secrets logged anywhere (email, tokens, password hashes, request bodies)?
   - User input flowing into `$where`, regex, or raw aggregation without sanitization?
   - Mass-assignment risk — accepting full DTO into `findByIdAndUpdate` without field whitelist?

   **Tests & style**
   - Test coverage for new behaviors and edge cases?
   - Naming consistent with neighboring files?
   - Dead code, commented-out blocks, leftover `console.log`?
   - ESLint/Prettier clean?

6. **Output feedback in this exact structure:**
   - **Blockers** — must fix before merge (correctness, security, breaking change)
   - **Should-fix** — strongly recommended (perf, missing index, weak validation)
   - **Nits** — optional polish (naming, dead code, minor style)

7. Ask which items to act on. Apply only approved fixes. Re-run `npm run lint` and `npm run test` after applying.
