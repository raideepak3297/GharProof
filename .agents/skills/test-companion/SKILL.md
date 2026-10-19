---
name: test-companion
description: Use when the user wants to add or update tests for recent NestJS changes. Generates unit tests using NestJS TestingModule with mocked Mongoose models, follows existing project patterns (file location, mock style, assertion style), runs the suite, iterates until green.
---

# Test Companion

## What to do

1. **Check existing context first** (token-saver). If a ticket ID/slug is known, read `docs/workspace/tickets/{ID-OR-SLUG}.md` for the kickoff plan's edge cases and any tests already noted as written. Don't duplicate tests another dev already added.

2. Run `git diff` to see what changed and identify which services/controllers need coverage.

3. **Read `docs/CODEBASE_CONVENTIONS.md`** if present — section 11 (Testing) tells you the file location pattern, mock style for Mongoose, and TestingModule setup the project uses. Match that exactly.

4. **Find existing tests in the same area** — read 2-3 of them before writing new ones. The doc gives you the rules; neighbors give you the practiced patterns. Match:
   - File location (co-located `*.spec.ts` next to source vs `test/` folder)
   - Test framework conventions in the repo (Jest is standard for Nest)
   - Mock style — `jest.fn()`, `createMock()` from `@golevelup/ts-jest`, manual mock objects
   - How Mongoose models are mocked (token: `getModelToken('User')`)
   - `Test.createTestingModule({...}).compile()` setup pattern
   - Assertion style — `toEqual` vs `toMatchObject` vs custom matchers

5. **Cover three layers of behavior:**
   - **Happy path** for each changed method/endpoint
   - **Edge cases** from the kickoff plan (empty arrays, nulls, missing optional fields, validation failures)
   - **Regression guards** for existing behaviors that could have broken

6. **NestJS-specific test patterns to use:**
   - Unit-test services in isolation with mocked model providers:
     ```ts
     {
       provide: getModelToken(User.name),
       useValue: { findOne: jest.fn(), create: jest.fn(), ... }
     }
     ```
   - Test controllers with mocked services
   - For DTO validation, use `validate()` from class-validator directly — no need to spin up Nest
   - Don't hit a real database in unit tests; if integration coverage is needed, ask the user first

7. **Run the tests:**
   ```
   npm run test -- <path-or-pattern>
   ```
   If they fail, iterate. Show each failure briefly — don't hide them.

8. **When green**, summarize: "N tests added in `<files>`, all passing." Note any uncovered branches the user might want to add later.
