# GharProof Backend

> **GharProof** (DepositSafe) is a tamper-proof rental deposit verification and dispute-resolution backend platform. Landlords and tenants capture locked, SHA-256 timestamped room conditions at move-in and compare them at move-out to eliminate deposit refund disputes with verifiable proof.

---

## Scope

This repository is strictly for **Backend (BE) Development**. It provides the REST API, cryptographic tamper-proofing, MongoDB persistence, and PDF report generation services. Frontend/UI code must not be added to this repository.

---

## Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: NestJS
- **Database**: MongoDB via Mongoose
- **Validation**: `class-validator` + `class-transformer`
- **Security & Hashing**: Node.js `crypto` (SHA-256), `bcrypt`, `@nestjs/jwt`
- **Document Export**: `pdfkit`
- **Testing**: Jest

---

## Getting Started

### Prerequisites

- **Node.js**: LTS version (v18+ or v20+)
- **MongoDB**: Active MongoDB instance (locally or via MongoDB Atlas)

### 1. Environment Configuration

Copy the template `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Ensure required environment variables (`PORT`, `MONGO_URI`, `JWT_SECRET`) are configured.

### 2. Install Dependencies

```bash
npm install
```

### 3. Running the Application

```bash
# Development mode (watch / hot reload)
npm run start:dev

# Standard start
npm start

# Debug mode
npm run start:debug

# Production mode
npm run build
npm run start:prod
```

### 4. Health Check Verification

Once started, the API base route is at `http://localhost:4000/api/v1`. Verify the server is running:

```bash
curl http://localhost:4000/api/v1/health
```

### 5. Testing & Code Quality

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Check code formatting & linting
npm run lint

# Automatically format code
npm run format
```

---

## Architecture & Specifications

All technical specifications and codebase conventions are maintained in the repository:

- **Codebase Conventions**: [docs/CODEBASE_CONVENTIONS.md](docs/CODEBASE_CONVENTIONS.md) — Architectural layering, Mongoose rules, DTO patterns, error handling, and testing.
- **System Architecture**: [specs/01-architecture.md](specs/01-architecture.md) — Modular design and request flow.
- **Data Models**: [specs/02-data-models.md](specs/02-data-models.md) — MongoDB schemas and indexes.
- **API Endpoints**: [specs/03-api-endpoints.md](specs/03-api-endpoints.md) — Complete REST API contracts.
- **Tamper-Proofing & PDF**: [specs/04-tamper-proofing-and-pdf.md](specs/04-tamper-proofing-and-pdf.md) — SHA-256 hashing and PDF structure.
- **Development Roadmap**: [specs/05-development-roadmap.md](specs/05-development-roadmap.md) — Phased implementation plan.

---

## AI Agent Development Workflow

This repository uses the agentic skill framework in `.agents/skills/` (governed by [AGENTS.md](AGENTS.md)):

| Phase            | Skill                           | Purpose                                                                                                                     |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Planning**     | `ticket-kickoff`                | Produces acceptance criteria, blast-radius analysis, and file walkthrough. No code written.                                 |
| **Context**      | `context-load` / `context-save` | Resumes and persists task state across sessions in `docs/workspace/tickets/`.                                               |
| **Execution**    | `implement-from-plan`           | Incremental implementation following conventions (Schema $\rightarrow$ DTO $\rightarrow$ Service $\rightarrow$ Controller). |
| **Testing**      | `test-companion`                | Generates unit and integration tests with mocked Mongoose models.                                                           |
| **Review**       | `self-review`                   | Code quality review (Blockers, Should-fix, Nits).                                                                           |
| **Regression**   | `regression-check`              | Identifies caller impacts and generates manual test checklists.                                                             |
| **Optimization** | `optimize-pass`                 | Detects missing indexes, N+1 queries, and missing `.lean()`.                                                                |
| **Shipping**     | `ship-it`                       | Generates conventional commit message and PR description.                                                                   |
