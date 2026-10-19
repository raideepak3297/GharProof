# AGENTS.md

This file is read automatically by AI agents at the start of every session in this repo. It defines what this project is, how to behave in it, and which skills to use.

---

## 1. Project Overview

**What this is:** **GharProof** (DepositSafe) is a tamper-proof rental deposit verification and dispute-resolution backend platform. Landlords and tenants capture locked, SHA-256 timestamped room conditions at move-in and compare them at move-out to eliminate deposit refund disputes with verifiable proof.

**Scope:** Strictly **Backend (BE) Development**. Frontend/UI code must NOT be added to this repository.

**Tech stack**
- Runtime: Node.js (LTS)
- Framework: NestJS
- Database: MongoDB via Mongoose
- Validation: `class-validator` + `class-transformer`
- Hashing & Security: Node.js `crypto` (SHA-256), `bcrypt`
- Document Generation: `pdfkit`
- Testing: Jest

**Key entry points**
- `src/main.ts` — bootstrap, global pipes, filters, CORS
- `src/app.module.ts` — module wiring
- `src/modules/` — feature modules (`auth`, `users`, `rentals`, `inspections`, `comparison`, `disputes`, `reports`, `storage`)

**Where the source of truth lives**
- Conventions: [docs/CODEBASE_CONVENTIONS.md](file:///home/fiftyfive/learningProject/GharProof/docs/CODEBASE_CONVENTIONS.md) — naming, layering, patterns. **Read this before writing or reviewing code.**
- Specifications: [specs/](file:///home/fiftyfive/learningProject/GharProof/specs/) — architecture, schemas, API endpoints, tamper-proofing & PDF.
- Ticket logs: `docs/workspace/tickets/{ID-OR-SLUG}.md` — plans, decisions, blast radius, regression scenarios.

---

## 2. How to Use the Skills

These skills are installed in `.agents/skills/`. Use them by name during tasks:

**Starting work**
- New task → **`ticket-kickoff`** (produces acceptance criteria, file walkthrough, blast radius, edge cases, risks; does NOT write code)
- Picking up / resuming task → **`context-load`** (loads prior decisions and agreed contracts without wasting tokens)

**Doing work**
- Plan approved → **`implement-from-plan`** (incremental implementation one logical unit at a time, checks conventions, runs lint/format)
- Storing progress → **`context-save`** (appends decisions, contracts, and files touched to `docs/workspace/tickets/`)

**Wrapping up**
- Pre-commit review → **`self-review`** (reviews diff for correctness, NestJS conventions, Mongoose rules, security; outputs Blockers / Should-fix / Nits)
- Tests → **`test-companion`** (writes unit & e2e tests mocking Mongoose with `getModelToken()`)
- What might break → **`regression-check`** (lists caller surfaces, schema backward compatibility, manual test checklist)
- Performance review → **`optimize-pass`** (finds N+1 queries, missing `.lean()`, missing indexes)
- Commit + PR → **`ship-it`** (generates conventional commit message and clean PR description; does not commit automatically)

---

## 3. Coding Rules

### Must do
- **Define all enums in the common file (`src/common/enums/index.ts`)** — never create separate enum files inside feature modules; all application and domain enums (`Role`, `RentalStatus`, `InspectionStatus`, etc.) must live in this single centralized file.
- **Define all module interfaces in the module's dedicated interface file (`src/modules/<feature>/interfaces/<feature>.interface.ts`)** — all interfaces belonging to that module must be defined in only that file, never inline inside services, controllers, or schemas.
- **Validate every controller input via DTO + class-validator** — never accept raw `any` from `@Body()`, `@Query()`, or `@Param()`.
- **Use NestJS exceptions** (`NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`) — never throw raw `Error`.
- **Inject services via constructor** — never `new` a service inline.
- **Register every new `@Injectable()` provider** in its module's `providers`. If consumed cross-module, also export it in `exports`.
- **Use `.lean()` on read-only Mongoose queries** — avoids document hydration overhead.
- **Add an index** for any new query pattern. Use `@Prop({ index: true })` for single-field, `schema.index({...})` for compound indexes.
- **Enforce inspection locks**: Disallow any modifications to `inspections`, `room_items`, or photos once `status === 'locked'`.
- **Compute SHA-256 hashes** for all uploaded photos and compute composite `rootHash` when both parties sign off.
- **Run `npm run build` and `npm run lint`** before considering work done.
- **Update ticket log** in `docs/workspace/tickets/{ID-OR-SLUG}.md` as decisions happen.

### Never do
- **Never define enums inside feature module folders** — always add them to `src/common/enums/index.ts`.
- **Never define interfaces inline** across services, controllers, or schemas — always place them in the module's dedicated interface file.
- **Never expose Mongoose documents directly** in API responses. Return clean plain objects or response DTOs stripping `__v`, internal flags, and password hashes.
- **Never log PII or secrets** (passwords, auth tokens, phone numbers, email addresses).
- **Never use `findById` inside a `for`/`map` loop** (N+1 query). Use `find({ _id: { $in: ids } })` or aggregation.
- **Never allow modifying an inspection once locked**.
- **Never write frontend/UI code** in this repository.
- **Never run `git commit` or `git push` automatically.** `ship-it` generates messages and waits for user approval.

---

## 4. Anti-patterns to Avoid

- **Don't write code during planning skills (`ticket-kickoff`).** Wait for explicit approval.
- **Don't re-grep the whole repo when a ticket log or `specs/` already documents what you need.**
- **Don't guess conventions.** Read `docs/CODEBASE_CONVENTIONS.md`.
- **Don't generate fake test data that looks real** (e.g. real emails). Use `test-`, `example.com`.
- **Don't introduce new dependencies** without explicitly explaining why.
- **Don't reformat unrelated code while editing** — keep diffs minimal and targeted.

---

## 5. Project-Specific Notes

- **Tamper-proofing:** All media files must have their SHA-256 calculated on stream ingestion. Inspection sign-off locks compute a canonical JSON SHA-256 root hash.
- **Dual Sign-Off:** Move-in and move-out inspections require sign-off flags from both `landlord` and `tenant` before locking.
- **PDF Export:** Generated via `pdfkit`, incorporating both move-in & move-out photos, timestamps, SHA-256 hashes, and itemized deduction reconciliations.
