---
name: implement-from-plan
description: Use after a ticket-kickoff plan has been approved and it's time to write NestJS code. Implements the plan incrementally one logical unit at a time, follows existing module/controller/service/schema/DTO conventions in the repo, runs ESLint/Prettier, and pauses on ambiguity instead of guessing.
---

# Implement From Plan

## What to do

1. **Load existing context first** (token-saver). Read `docs/workspace/tickets/{ID-OR-SLUG}.md` if a ticket ID/slug is known. This file may contain:
   - The approved plan from ticket-kickoff
   - Decisions and API contracts already agreed
   - Files already touched in earlier sessions
   - Open questions left by previous devs

   Trust this log. Don't re-derive things it already documents — only verify what's unclear or stale. If the file doesn't exist, fall back to the current conversation's plan, or run **ticket-kickoff** first.

2. **Read `docs/CODEBASE_CONVENTIONS.md`** — this is the project's source of truth on naming, layering, validation, error handling, logging, and testing patterns. Treat it as authoritative; if a rule there conflicts with what you'd otherwise default to, follow the doc. If the file doesn't exist, run **codebase-explorer** first or warn the user that conventions will be inferred from sampled neighbors.

3. **Sanity-check by sampling 2-3 neighboring files** in each layer you'll touch — the conventions doc captures the rules, neighbors show the practiced style:
   - **Module:** how providers/imports/exports are organized
   - **Controller:** decorator order, `@HttpCode`, response DTOs, guard usage
   - **Service:** constructor injection style, error throwing (`NotFoundException` vs custom), async patterns
   - **Schema:** Mongoose decorators (`@Prop`), `timestamps`, virtuals, indexes, `toJSON` transforms
   - **DTO:** class-validator decorators (`@IsString`, `@IsOptional`, `@ValidateNested`), `@Expose`/`@Transform` from class-transformer
   - **Tests:** file location (co-located vs `__tests__/`), mock patterns

4. **Implement incrementally — one logical unit at a time.** Suggested order:
   1. Schema changes first (the data shape)
   2. DTOs next (the contract)
   3. Service logic
   4. Controller wiring
   5. Module updates if needed

   After each unit, briefly state what you did so the user can push back before you go further.

5. **Hard rules:**
   - Use existing dependency injection — don't `new` services inline
   - All controller inputs go through DTOs with class-validator decorators
   - Don't expose Mongoose documents directly — return plain objects or response DTOs
   - Throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.), not raw `Error`
   - If you add a new `@Injectable()`, register it in the module's `providers`
   - If a service is consumed by another module, add it to `exports`
   - All enums must be defined in `src/common/enums/index.ts` — never create separate enum files in modules
   - All interfaces must be defined in the module's dedicated interface file (`interfaces/<feature>.interface.ts`) — never inline in services, controllers, or schemas
   - All Mongoose schemas must be defined in `src/mongoDb/schema/<entity>.schema.ts` — never create schemas in feature modules
   - All database queries must be encapsulated in `src/mongoDb/mongo-db-<entity>.service.ts` — never query Mongoose models directly in feature domain services
   - In MongoDB services, inject models with `@Inject(MODEL_TOKEN)` using constants from `src/mongoDb/type/constant.ts` (never use `@InjectModel(...)` or `MongooseModule.forFeature(...)`)
   - Apply `@UseGuards(...)` strictly at the route handler method level — never at the controller class level
   - In protected controller endpoints, inject the authenticated user as `@CurrentUser() user: JwtPayload` and access `user.userId`, `user.email`, `user.role`
   - Define populate configurations (`POPULATE_TAB`) at the very bottom of `mongo-db-<entity>.service.ts` files after the class, never at the top

6. **Stop on ambiguity.** Schema shape unclear? Multiple valid patterns in neighboring code? Unsure if a field should be indexed? Ask. Don't guess.

7. **After each unit, run:**
   ```
   npx eslint --fix <changed-files>
   npx prettier --write <changed-files>
   ```
   Fix any errors before moving on.

8. **When done**, append a `## Files changed` block to `docs/workspace/tickets/{ID-OR-SLUG}.md` via the **context-save** skill. The save tags your git author name so the next dev sees who wrote what.
