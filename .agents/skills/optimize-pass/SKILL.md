---
name: optimize-pass
description: Use when the user wants optimization suggestions for recent NestJS changes. Looks for N+1 Mongoose queries, missing .lean(), missing indexes, sequential awaits that could be Promise.all, redundant population, missing pagination, missing caching opportunities. Behavior-preserving proposals only — categorizes Safe vs Proposal, never applies changes silently.
---

# Optimize Pass

## What to do

1. **Check existing context first** (token-saver). If a ticket ID/slug is known, read `docs/workspace/tickets/{ID-OR-SLUG}.md` — past devs may have already evaluated and rejected certain optimizations (e.g., "we discussed adding caching here, decided no"). Don't re-suggest things the team has explicitly declined.

2. Run `git diff` and read the surrounding code.

3. **Check `docs/CODEBASE_CONVENTIONS.md`** to see whether caching, pagination, or query-shape conventions are already defined for this project. Don't propose introducing Redis or a new layer if the doc already captures the project's stance.

4. **Look for these patterns:**

   **Mongoose / MongoDB**
   - `findById` inside a `for`/`map` loop → use `find({ _id: { $in: ids } })` or aggregation
   - Read-only queries missing `.lean()` (skips Mongoose document hydration — significant perf win)
   - `populate()` chains pulling more than needed → use `select` to narrow fields
   - Sequential `await` calls on independent queries → `Promise.all`
   - Missing indexes for new query patterns (suggest `@Prop({ index: true })` or compound `schema.index({...})`)
   - Counts done with `.find(...).length` instead of `.countDocuments(...)`
   - Aggregation pipelines that could benefit from `$match` earlier or `$project` to drop fields sooner
   - Missing pagination on list endpoints (`skip`/`limit` or cursor-based)

   **NestJS / app-level**
   - Sync work in async handlers blocking the event loop (heavy CPU, sync file I/O)
   - Missing caching layer for expensive reads (`@CacheKey` / `@CacheTTL`, or Redis)
   - DTO transforms running on every request that could be memoized
   - Unbounded payloads accepted by controllers (no `@MaxLength` / no body size limit)
   - Repeated config reads that could be `onModuleInit`

5. **Categorize each suggestion:**
   - **Safe** — pure, local, fully covered by existing tests (e.g., adding `.lean()` on a read path, swapping a loop for `$in`)
   - **Proposal** — needs user judgment (changes semantics subtly, touches concurrency, alters response shape, adds infrastructure like Redis, or isn't covered by tests)

6. **Do NOT apply anything yet.** Present all suggestions with rationale and rough impact (latency, query count, memory). Group by file.

7. Only after explicit user approval, apply selected changes. After each applied change:
   ```
   npm run lint
   npm run test
   ```
