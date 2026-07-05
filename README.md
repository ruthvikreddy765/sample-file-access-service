# Sample File Access Service

A small HTTP service that controls access to research data files with QC gating.

## How to run

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The server starts on **http://localhost:3000**

### Run tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/samples` | Register a sample |
| `POST` | `/samples/:sampleId/access` | Grant a user access |
| `PATCH` | `/files/:fileId/qc` | QC callback |
| `GET` | `/files/:fileId/download?userId=` | Request a download URL |

## Key choices

### Node.js + Express + TypeScript
My strongest backend stack. Express is minimal and easy to walk through in a code review. TypeScript catches bugs at compile time and makes the data model explicit.

### In-memory storage
The task explicitly says in-memory is fine. Zero setup, fast for tests, easy to reset. The Store class is the only place that touches data, so swapping it for SQLite later is a one-file change.

### QC status transitions are terminal
Once a file is passed or failed it cannot be updated again (returns 409). Letting the pipeline flip a passed file to failed would be a data integrity bug.

### Owner auto-access
When a sample is registered, the owner is added to the access list automatically.

## Alternatives considered

**Nest.js** — adds structure but too much boilerplate for a small service.

**SQLite** — would survive restarts but adds complexity not needed here.

**JWT tokens** — a real implementation would sign URLs with HMAC. The fake URL here uses a UUID for simplicity.

## Assumptions

- userId values are trusted strings passed in by the caller.
- The QC pipeline is trusted — no API key check on the PATCH endpoint.
- The download URL token is fake and not stored or validated.

## Known weaknesses

- No persistence across restarts.
- No authentication.
- No pagination.
- File ID collisions if two files in a sample share the same name.

## What I'd do with more time

- Replace in-memory store with SQLite.
- Add authentication and API key for QC callback.
- Sign download URLs with HMAC-SHA256.
- Add GET /samples/:id endpoint.
- Add structured logging with pino.
- Add OpenAPI spec.