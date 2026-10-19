# Codebase Conventions

_Scope: GharProof (DepositSafe) Backend_
_Runtime: Node.js (LTS) | Framework: NestJS | Database: MongoDB via Mongoose | Language: TypeScript_

---

## 1. Project structure & Layout

- **Layout**: Modular NestJS application, feature-based domain grouping.
- **Top-level `src/` layout**:
  ```text
  src/
  ├── main.ts                  # Bootstrap + ValidationPipe + Global Filters + CORS
  ├── app.module.ts            # Root module importing ConfigModule, DatabaseModule & feature modules
  ├── common/                  # Cross-cutting concerns
  │   ├── decorators/          # @CurrentUser(), @Roles(), @Public()
  │   ├── enums/               # index.ts - ALL system & domain enums defined here
  │   ├── filters/             # HttpExceptionFilter, MongoExceptionFilter
  │   ├── guards/              # JwtAuthGuard, RolesGuard
  │   ├── interceptors/        # TransformResponseInterceptor, LoggingInterceptor
  │   └── utils/               # crypto-hash.util.ts, canonical-sort.util.ts
  ├── config/                  # Configuration loader + env validation
  ├── database/                # DatabaseModule & DatabaseService (connection lifecycle & logging)
  ├── logger/                  # Structured LoggerService
  ├── modules/                 # Feature domain modules
  │   ├── auth/                # AuthController, AuthService, JwtStrategy, interfaces/
  │   ├── users/               # UserController, UserService, UserSchema, DTOs, interfaces/
  │   ├── rentals/             # RentalsController, RentalsService, RentalSchema, DTOs, interfaces/
  │   ├── inspections/         # InspectionsController, InspectionsService, InspectionSchema, RoomItemSchema, interfaces/
  │   ├── comparison/          # ComparisonController, ComparisonService, DTOs, interfaces/
  │   ├── disputes/            # DisputesController, DisputesService, DisputeSchema, DTOs, interfaces/
  │   ├── reports/             # ReportsController, ReportsService (PDFKit generator), interfaces/
  │   └── storage/             # StorageService (Multer disk storage + SHA-256 streaming)
  ```

---

## 2. Module conventions

- Feature modules must be self-contained:
  ```text
  src/modules/<feature>/
  ├── dto/
  │   ├── create-<feature>.dto.ts
  │   ├── update-<feature>.dto.ts
  │   └── <feature>-response.dto.ts
  ├── interfaces/
  │   └── <feature>.interface.ts  # ALL interfaces for this module defined strictly here
  ├── schemas/
  │   └── <feature>.schema.ts
  ├── <feature>.controller.ts
  ├── <feature>.service.ts
  ├── <feature>.module.ts
  └── <feature>.service.spec.ts
  ```
- **Strict Rule for Enums**: All enums MUST be defined in the central file `src/common/enums/index.ts`. Never create separate enum files inside module folders.
- **Strict Rule for Interfaces**: Every module MUST have its dedicated interface file `src/modules/<feature>/interfaces/<feature>.interface.ts`. ALL interfaces for that module MUST be defined strictly within that file. Never define interfaces inline inside services, controllers, or schemas.
- If a service or model is needed by another module, export it explicitly in `exports` of `<feature>.module.ts`.
- Circular dependencies between modules (e.g., `Rentals ↔ Inspections`) must be resolved using `forwardRef(() => XModule)` in both module imports and constructor injections.

---

## 3. Controllers & Routing

- Route prefix: **kebab-case** (`@Controller("rentals")`, `@Controller("inspections")`).
- Decorator order on handlers: `@Public()` / `@Roles()` → HTTP verb decorator (`@Get`, `@Post`, `@Patch`) → handler method.
- Controller methods must remain **thin**:
  - Accept validated DTOs, route params, query params, and authenticated user via `@CurrentUser() user: JwtPayload` (Option A pattern; never pluck via `@CurrentUser('userId')`).
  - Pass clean arguments to service methods.
  - Never execute Mongoose queries, file writes, or hash algorithms inside controllers.
- Mutations return `{ message: string, data?: any }` wrapped by standard `TransformResponseInterceptor`:
  ```json
  {
    "success": true,
    "timestamp": "2026-10-19T10:00:00.000Z",
    "data": { ... }
  }
  ```

---

## 4. Services & Business Logic

- Services are the single home for business logic, entity state validations, and database interactions.
- **Lock & Immutability checks**: Any service updating an inspection, room item, or photo must check:
  ```typescript
  if (inspection.status === InspectionStatus.LOCKED) {
    throw new ForbiddenException('Inspection is locked and cannot be modified');
  }
  ```
- Multi-document atomic operations must use Mongoose sessions/transactions when critical data integrity is at stake (e.g. final sign-off lock & root hash creation).
- Inject dependencies via constructor injection only — never instantiate services with `new`.

---

## 5. Mongoose Schemas & MongoDB Conventions

- **Schema definition**:
  - Always use `@Schema({ timestamps: true, collection: 'plural_name' })`.
  - Use explicit `@Prop({ required: true })`, `@Prop({ index: true })`, and enum validations.
  - Model definitions: Export both `Document` type and `SchemaFactory.createForClass(MyClass)`.
- **Compound Indexes**: Define compound indexes directly after `SchemaFactory.createForClass()`:
  ```typescript
  export const InspectionSchema = SchemaFactory.createForClass(Inspection);
  InspectionSchema.index({ rentalId: 1, type: 1 }, { unique: true });
  ```
- **Read-only queries**:
  - **Always use `.lean()` on read-only queries** to avoid Mongoose document hydration overhead.
- **N+1 Avoidance**:
  - Never call `findById` inside loops (`for`, `map`, `forEach`). Use `find({ _id: { $in: ids } })` or MongoDB aggregation pipelines.

---

## 6. DTOs & Validation

- Every request body, query, and param must have an explicit DTO with `class-validator` and `class-transformer` decorators.
- Global `ValidationPipe` is configured with:
  ```typescript
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  })
  ```
- Nested DTOs must use `@ValidateNested({ each: true })` + `@Type(() => NestedDto)`.
- **Never expose raw Mongoose documents directly in API responses.** Strip `__v`, internal flags, and password hashes before returning.

---

## 7. Tamper-Proofing & Cryptographic Hashing

- **Photo hashing**:
  - Every uploaded file must be streamed into Node.js `crypto.createHash('sha256')`.
  - The resulting 64-character lowercase hex digest is stored in `RoomItem.photos[].sha256Hash`.
- **Root Hash**:
  - When both landlord and tenant sign off on an inspection, construct a canonical sorted representation of all items, conditions, notes, and photo hashes.
  - Calculate `SHA-256` digest over canonical JSON string.
  - Store `rootHash` on the `Inspection` document and set `status = InspectionStatus.LOCKED`.

---

## 8. Error Handling

- Always throw built-in NestJS `HttpException` subclasses:
  - `NotFoundException` (entity not found)
  - `BadRequestException` (invalid inputs / state transition)
  - `ForbiddenException` (unauthorized access to resource / inspection locked)
  - `ConflictException` (duplicate unique constraint, e.g. move-in inspection already exists)
  - `UnauthorizedException` (invalid credentials or expired token)
- Never throw raw `Error('...')`.
- Global `HttpExceptionFilter` formats all exceptions into a consistent shape:
  ```json
  {
    "success": false,
    "timestamp": "2026-10-19T10:00:00.000Z",
    "statusCode": 404,
    "message": "Rental not found",
    "error": "Not Found"
  }
  ```

---

## 9. Auth & Authorization

- Current authenticated user: Always injected into controllers using `@CurrentUser() user: JwtPayload` (from `src/modules/auth/interfaces/auth.interface.ts`). Always access `user.userId`, `user.email`, `user.role` from the injected object (do not pluck individual properties via `@CurrentUser('userId')`).
- Ownership verification: Landlords can only modify their own properties; tenants can only view/sign rentals they are invited to.

---

## 10. Logging & Observability

- Injected structured logger in every service constructor:
  ```typescript
  constructor(@Inject(Logger) private readonly logger: Logger) {}
  ```
- **Never log PII or secrets**:
  - Do NOT log passwords, plain JWT tokens, full phone numbers, or email addresses in standard info logs.

---

## 11. Testing Standards

- **Unit tests**:
  - Co-located `*.spec.ts` files beside the source code.
  - Isolate services using NestJS `Test.createTestingModule({...})`.
  - Mock Mongoose models using `getModelToken(ModelName.name)`:
    ```typescript
    {
      provide: getModelToken(Rental.name),
      useValue: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        findOneAndUpdate: jest.fn(),
      },
    }
    ```
- **E2E tests**:
  - Located in `test/` for critical end-to-end flows (auth, inspection sign-off lock, comparison diff).

---

## 12. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Files | `kebab-case.<role>.ts` | `rentals.service.ts`, `inspection.schema.ts` |
| Classes | `PascalCase` | `RentalsService`, `InspectionsController` |
| DTOs | `VerbNounDto` or `NounResponseDto` | `CreateRentalDto`, `InspectionResponseDto` |
| Enums | `PascalCase` enum, `UPPER_SNAKE` values | `InspectionStatus.LOCKED` |
| Mongoose Collections | plural snake_case | `"rentals"`, `"inspections"`, `"room_items"` |
| Modules | `kebab-case` folder | `modules/rentals/` |
