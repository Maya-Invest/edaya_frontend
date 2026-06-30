# @edaya/api-client

Type-safe, domain-shaped HTTP client for the Edaya Core API.

This package provides a **maintainable SDK** for calling `/core/*` endpoints from TypeScript consumers (today: the SvelteKit webapp). Instead of hand-writing URL strings and generic `fetch` wrappers, you work with a structured client:

```ts
const client = getSchoolClient()

await client.entities.students.list({ schoolId })
await client.commands.registerStudent({ schoolId, firstName, lastName, ... })
await client.queries.getOverdueFeeCount({ schoolId })
await client.authorization.effectiveGrants()
```

The design optimizes for **easy iteration**: when the API registry changes, run one codegen command and the client surface updates automatically.

---

## Table of contents

- [Design goals](#design-goals)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Client API](#client-api)
  - [Entities](#entities)
  - [Commands](#commands)
  - [Queries](#queries)
  - [Authorization](#authorization)
- [Type safety](#type-safety)
- [Transport layer](#transport-layer)
- [Error handling](#error-handling)
- [Code generation](#code-generation)
- [Adding API surface](#adding-api-surface)
- [Package layout](#package-layout)
- [Webapp integration](#webapp-integration)
- [What to edit (and what not to)](#what-to-edit-and-what-not-to)
- [Limitations](#limitations)

---

## Design goals

| Goal | How this package achieves it |
|------|------------------------------|
| **Maintainability** | Entity CRUD is implemented once in `EntityResource`. Only names and type bindings are generated. |
| **Fast iteration** | Bindings are derived from the API registry (`coreEntities`, `coreCommands`, `coreQueries`), not hand-maintained. |
| **Type safety** | Request/response types come from OpenAPI (`components['schemas']` in the webapp). The client wires schema names to methods. |
| **Runtime portability** | HTTP details live in a `Transport` interface. SvelteKit, tests, or future mobile clients can each provide their own adapter. |
| **Small generated diffs** | Codegen emits a single bindings file (~600 lines) instead of one method per endpoint. |

This package intentionally does **not** try to be a generic OpenAPI Generator output. It understands the regular shape of the Edaya API.

---

## Architecture

The client is split into three layers:

```text
┌─────────────────────────────────────────────────────────────┐
│  Consumer (e.g. SvelteKit webapp)                           │
│  - imports OpenAPI types: components['schemas']             │
│  - provides Transport (cookies, base URL, headers)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  @edaya/api-client (runtime — hand-written, stable)         │
│  - createSchoolClient()                                     │
│  - EntityResource (list / one / count / get / save / …)     │
│  - ApiError                                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  client-bindings.ts (generated from API registry)           │
│  - entity keys → publicName + schemaName                    │
│  - command keys → publicName + request/response schema names│
│  - query keys → publicName + request/response schema names  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  API registry (apps/api — source of truth)                  │
│  coreEntities · coreCommands · coreQueries                  │
└─────────────────────────────────────────────────────────────┘
```

**Types** are not duplicated inside this package. The consumer passes its OpenAPI schema map as a generic parameter:

```ts
createSchoolClient<components['schemas']>(transport)
```

That keeps `@edaya/api-client` free of a dependency on the webapp while still giving full inference at the call site.

---

## Installation

This is a private workspace package. Add it as a dependency in the consuming app:

```json
{
  "dependencies": {
    "@edaya/api-client": "workspace:*"
  }
}
```

Then run `bun install` from the monorepo root.

---

## Quick start

### 1. Implement a transport

A transport handles HTTP: base URL, headers, cookies, error mapping.

```ts
import { ApiError, createSchoolClient, type Transport } from '@edaya/api-client'
import type { components } from '$lib/api/schema'

const transport: Transport = {
  async request(method, path, options) {
    const response = await fetch(`https://api.example.com${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      throw new ApiError(response.status, await response.json())
    }

    return response.json()
  },
}

const client = createSchoolClient<components['schemas']>(transport)
```

### 2. Call the API

```ts
const students = await client.entities.students.list({})
const school = await client.entities.schools.get(schoolId)
const result = await client.commands.enrollStudent({ studentId, classGroupId, ... })
```

See [Webapp integration](#webapp-integration) for the production SvelteKit setup.

---

## Client API

`createSchoolClient()` returns a `SchoolClient` with four namespaces.

### Entities

Entity resources are keyed by **camelCase service names** from the API registry (`serviceName`):

| Registry `serviceName` | HTTP `publicName` | Example call |
|------------------------|-------------------|--------------|
| `students` | `students` | `client.entities.students.list({})` |
| `academicYears` | `academic-years` | `client.entities.academicYears.list({})` |
| `guardianLinks` | `guardian-links` | `client.entities.guardianLinks.list({})` |
| `staffMembers` | `staff-members` | `client.entities.staffMembers.one({ id })` |

Each entity exposes the same operations, mapped to the API's standard entity routes:

| Method | HTTP | Description |
|--------|------|-------------|
| `list(query?)` | `POST /core/entities/{name}/list` | List entities matching a filter |
| `one(query)` | `POST /core/entities/{name}/one` | Return a single match |
| `count(query?)` | `POST /core/entities/{name}/count` | Count matches |
| `get(id)` | `GET /core/entities/{name}/{id}` | Fetch by ID |
| `save(entity)` | `POST /core/entities/{name}/save` | Create or update |
| `delete({ id })` | `POST /core/entities/{name}/delete` | Delete by ID |
| `batchSave({ entities })` | `POST /core/entities/{name}/batch-save` | Batch upsert |
| `batchDelete({ ids })` | `POST /core/entities/{name}/batch-delete` | Batch delete |

#### Query filters

`list`, `one`, and `count` accept an `EntityQuery` object. The API supports MongoDB-style operators (`$eq`, `$in`, `$and`, …) plus pagination:

```ts
await client.entities.students.list({
  schoolId,
  status: 'active',
  $orderBy: [{ field: 'lastName', direction: 'asc' }],
  $limit: 50,
  $offset: 0,
})
```

> **Note:** Entities with `allowDirectSave: false` in the registry (e.g. `students`, `enrollments`, `payments`) omit `.save()` and `.batchSave()` from their client type. Use the appropriate domain command instead. Read and delete operations remain available under the current server policy.

### Commands

Commands are keyed by **camelCase method names** from the registry (`methodName`):

```ts
await client.commands.registerStudent({
  schoolId: '...',
  firstName: 'Ada',
  lastName: 'Lovelace',
  // ...
})

await client.commands.enrollStudent({
  studentId: '...',
  classGroupId: '...',
  // ...
})
```

Each command maps to `POST /core/commands/{kebab-case-public-name}`.

### Queries

Read-side aggregate queries:

```ts
const { count } = await client.queries.getOverdueFeeCount({ schoolId })
const { count: published } = await client.queries.getPublishedReportCardCount({ schoolId })
```

Each query maps to `POST /core/queries/{kebab-case-public-name}`.

### Authorization

```ts
const session = await client.authorization.effectiveGrants()
// typed as EffectiveGrantsResponse when using components['schemas']
```

Maps to `GET /core/authorization/effective-grants`.

---

## Type safety

Types flow from OpenAPI into the consumer, through a generic parameter:

```ts
import type { components } from '$lib/api/schema'

type Schemas = components['schemas']
const client = createSchoolClient<Schemas>(transport)

// TEntity is inferred as components['schemas']['Student']
const students = await client.entities.students.list({})

// Payload and return type are inferred from OpenAPI command schemas
const created = await client.commands.registerStudent({ ... })
```

The generated `client-bindings.ts` file stores **schema name strings** (e.g. `"Student"`, `"RegisterStudentCommand"`). At compile time, those are resolved against `TSchemas` to produce fully typed method signatures.

If a schema name in the bindings does not exist in your `TSchemas` map, the corresponding type resolves to `never`, which surfaces as a compile error at the call site.

---

## Transport layer

The `Transport` interface is intentionally minimal:

```ts
interface Transport {
  request: <T>(
    method: string,
    path: string,
    options?: { body?: unknown },
  ) => Promise<T>
}
```

Responsibilities of a transport implementation:

- Prefix paths with the API base URL
- Forward authentication (cookies, bearer tokens, etc.)
- Forward request context headers (e.g. `X-Academic-Year-Id`)
- Serialize/deserialize JSON
- Map non-2xx responses to `ApiError`

The package does **not** ship framework-specific adapters. Each consumer provides its own. The webapp's browser adapter lives at `apps/webapp/src/lib/api/browser-transport.ts`.

---

## Error handling

Failed API responses throw `ApiError`:

```ts
import { ApiError } from '@edaya/api-client'

try {
  await client.entities.students.get('unknown-id')
}
catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status)  // e.g. 404
    console.error(error.body)    // parsed JSON or text from the API
  }
}
```

---

## Code generation

Bindings are regenerated as part of the monorepo OpenAPI pipeline:

```bash
# from the repo root
bun run openapi:generate
```

This runs three steps in order:

| Step | Script | Output |
|------|--------|--------|
| 1. Export OpenAPI spec | `bun run export-openapi` | `apps/webapp/src/lib/api/openapi.json` (includes `info.x-edaya-client-bindings`) |
| 2. Generate TypeScript types | `apps/webapp openapi:generate` | `apps/webapp/src/lib/api/schema.d.ts` |
| 3. Generate client bindings | `tooling/repo/openapi/generate-bindings.ts` | `package/generated-api-client/src/generated/client-bindings.ts` |

The exported OpenAPI document embeds client bindings under `info.x-edaya-client-bindings`. The Flutter `edaya_mobile` repo consumes that extension to generate its Dart client — no shared checkout required.

You can also run step 3 alone during API development:

```bash
bun tooling/repo/openapi/generate-bindings.ts
```

The codegen script (`tooling/repo/openapi/generate-bindings.ts`) reads `info.x-edaya-client-bindings` from the committed OpenAPI document. **Do not edit the generated bindings file by hand.**

---

## Adding API surface

### New entity

1. Add the entity to `coreEntities` in `apps/api/src/lib/school-api/registry/index.ts`
2. Add corresponding Zod schemas in `entities.schemas.ts`
3. Run `bun run openapi:generate`
4. Use the new resource immediately:

   ```ts
   await client.entities.myNewEntity.list({})
   ```

### New command

1. Add the command to `coreCommands` in the registry
2. Add request/response schemas in `commands.schemas.ts` and `command-response.schemas.ts`
3. Run `bun run openapi:generate`
4. Call it:

   ```ts
   await client.commands.myNewCommand({ ... })
   ```

### New query

1. Add the query to `coreQueries` in the registry
2. Run `bun run openapi:generate`
3. Call it:

   ```ts
   await client.queries.myNewQuery({ schoolId })
   ```

No changes to `@edaya/api-client` runtime code are needed for any of the above.

---

## Package layout

```text
generated-api-client/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                  # public exports
    ├── errors.ts                 # ApiError
    ├── transport.ts              # Transport interface
    ├── entity-resource.ts        # generic entity CRUD wrapper
    ├── create-client.ts          # createSchoolClient factory
    └── generated/
        └── client-bindings.ts    # AUTO-GENERATED — do not edit
```

---

## Webapp integration

The static SvelteKit webapp wires the client in `apps/webapp/src/lib/api/school-client.ts`:

```ts
import { getBrowserSchoolClient } from '$lib/api/school-client'

const client = getBrowserSchoolClient()
const students = await client.entities.students.list({})
```

The webapp transport forwards:

- browser cookies through `credentials: 'include'` (session auth)
- `X-Academic-Year-Id` when present
- `PUBLIC_API_URL` as the browser base URL, or same-origin paths when it is empty

In local development, same-origin requests are forwarded by Vite to the private `API_URL` proxy target.

---

## What to edit (and what not to)

| File | Edit? |
|------|-------|
| `src/entity-resource.ts` | Yes — when entity operation semantics change |
| `src/create-client.ts` | Yes — when adding new client namespaces |
| `src/transport.ts` | Yes — when the transport contract changes |
| `src/generated/client-bindings.ts` | **No** — regenerate via `openapi:generate` |
| `apps/api/src/lib/school-api/registry/` | Yes — this is the source of truth for API surface |

---

## Limitations

- **Auth routes** (`/auth/*`) are not covered. The webapp uses `better-auth` directly for authentication.
- **Entity query types** are currently loose (`EntityQuery`). OpenAPI generates opaque `Filter_N` schema names for query bodies; stricter per-entity query typing would require naming those schemas in the API layer.
- **Transport policy belongs to consumers.** The webapp supplies its browser-specific base URL, cookie, and academic-year behavior; the package remains runtime-agnostic.

---

## Development

Type-check and test the package:

```bash
bun run --cwd package/generated-api-client check
bun run --cwd package/generated-api-client test
```

Type-check the webapp (includes client usage):

```bash
bun run --cwd apps/webapp check
```
