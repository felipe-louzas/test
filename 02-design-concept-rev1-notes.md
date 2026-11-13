# Specification Revision 1 Notes (`00-design-concept.md` v2.0)

**Target specification:** [`docs/00-design-concept.md`](./00-design-concept.md)  
**Basis:** Revision 1 architectural direction + [`docs/01-design-review.md`](./01-design-review.md)  
**Date:** 13 November 2026  

---

## 1. Major Architectural Changes

1. **Replaced Full-Stack Persistence Engine with API-First + Next.js BFF Architecture:** Eliminated all database persistence, ORM cascade, SQL transaction isolation, and server-side policy engine abstractions. Domain backend services (Sigma WMS, PIM, Retail, ERP) are authoritative for persistence, transactions, business invariants, and security.
2. **Strict Browser-to-BFF Boundary:** Mandated that the browser **never** calls Sigma backend APIs directly. All browser API traffic passes through same-origin Next.js HTTP BFF Route Handlers (`/api/bff/resources/[resource]/actions/[action]`), while Next.js Server Components (SSR) and BFF handlers invoke `RestTransport` with server-only credentials.
3. **True Two-Phase Compilation Pipeline:** Resolved the Phase A/B contradiction by separating `defineResource()` (Phase A: strictly local normalization, schema inspection, standard action/workspace synthesis, inline function extraction, cycle checks) from `buildCatalog()` (Phase B: cross-resource relation resolution, conservative `REFERENCES`/`OWNS` inference, 6-tier convention precedence, and environment artifact generation).
4. **Route-Scoped Serializable Client Manifests + Lazy Resource Chunks:** Replaced monolithic client catalog imports with lightweight `AppClientManifest` + route-scoped `RouteClientManifest` JSON payloads across RSC boundaries, paired with per-resource dynamic `import()` chunks (`ClientResourceChunk`) for Zod schemas and inline reactive functions.
5. **Inline Functions Without Manual Registration:** Reversed the prior prohibition on inline functions in descriptors. Pure reactive/computed rules (`compute`, `hidden`, `readOnly`, `required`, `defaultValue`, `validate`) and inline `client` action callbacks are authored inline, deterministically extracted into `LocalFunctionTable` during Phase A, and executed locally in the browser with zero server roundtrips per keystroke.
6. **Action-Bound Form Metamodel (`CompiledFormModel`):** Modeled forms explicitly around canonical action input schemas rather than assuming every form matches the persisted resource schema. Preserved strict zero-mode invariant (`create`/`edit`/`view` remain prohibited).
7. **`REFERENCES` vs. `OWNS` Relational Semantics:** Added explicit domain composition semantics with conservative Phase B inference and removed ORM/DDL `onDelete` cascade concepts. Added `editableCollection` section support for inline parent/child editing on `OWNS` compositions.

---

## 2. Obsolete Concepts Removed

- `ResourceRepository`, `ResourceDataAdapter`, `DataAdapterRegistry`, `DataSession`, and `ServerServiceContainer`
- `TransactionPolicy` (`read-committed`, `repeatable-read`, `serializable`) and `softDelete` persistence config
- `PolicyRegistry`, `ValidatorRegistry`, `PolicyDecision.rowFilter`, and `AuditPolicy` persistence/domain event publication
- `ServerActionHandlerRegistry` (replaced by `'api'` canonical actions + optional server-only `ServerBffHandlerRegistry`)
- `DataOperation` (`query | get | insert | patch | remove`) as a parallel CRUD vocabulary
- `dispatchResourceAction` Next.js Server Action as the canonical request transport
- `onDelete: 'restrict' | 'set-null' | 'cascade'` ORM relational semantics
- `QueryExpression` SQL-like filter AST and `ProjectionPlan` / `ProjectionSpec` compiler
- `buildModel()`, `ModelKey`, `ModelCatalog`, `HostManager`, `ActionDispatcher`, `ClientActionInvoker` (unified under `defineResource()`, `ResourceKey`, `ResourceCatalog`, `HostController`, `ActionExecutor`)
- Generic `.layer()` / `.extend()` registry composition API
- Redundant `id` properties inside keyed descriptor maps and redundant `defaults` blocks when standard IDs exist
- Runtime `CompilationReport` provenance embedded in production client payloads

---

## 3. New Concepts Introduced

- **Two-Stage Artifacts:** `LocalResourceModel` (Phase A), authoritative `ResourceModel` (Phase B), `AppClientManifest`, `RouteClientManifest`, `ClientResourceManifest`, and lazy `ClientResourceChunk`
- **Next.js BFF Transport & Route Handler:** `BffTransport`, `createBffRouteHandler()`, `ServerRequestContext`, and `ServerBffHandlerRegistry`
- **Inline Function Taxonomy & Extraction:** 6-category execution classification, `LocalFunctionTable`, and deterministic `FunctionRef` tokens
- **Explicit Suppression & Cascade Rules:** `false` shorthand on generated `actions` and `workspaces` with deterministic suppression of generated dependents vs. fatal errors on contradictory explicit references
- **`CompiledFormModel` & `ActionFormOverrides`:** Action-specific schemas, attribute refinements, and action-local relation descriptors
- **`REFERENCES` / `OWNS` & `editableCollection`:** Domain composition semantics with conservative inference and inline child editing section
- **`RegisteredResourceMap` & Typed `resourceRef()`:** Compile-time typed cross-resource handles preventing circular runtime imports and `TS7022` inference cycles
- **18-Stage `ApiRequest` Pipeline:** End-to-end deterministic transformation from `ResourceDescriptor` to backend HTTP request and client `ActionEffect`s

---

## 4. Important Contracts Redefined

| Contract | Revision 1 Definition |
|---|---|
| `FieldPath<T>` | Recursive depth-4 template-literal path union (rejects invalid paths at compile time; falls back to `string` only for `unknown`) |
| `RuntimeSchema<T>` | Zod-backed facade adding `partial()`, `pick()`, `omit()`, `extend()` for Phase A action schema synthesis, cleanly separated from JSON `SchemaNode` |
| `CompiledAction` / `ActionBehaviorDescriptor` | Unified `'api'` (`operation`, `intent: 'query' \| 'command'`, `idempotent`, `contentType`, `responseType`), `'client'` (inline `execute` or `handler`), and `'navigate'` |
| `QuerySpec<T>` | Minimal normalized `{ filters?, sort?, pagination? }` typed against `FieldPath<T>`; search uses ordinary filter keys (`'q'` or field key) |
| `ApiRequest` / `ApiTransport` | Transport-agnostic request (`resource`, `action`, `operation`, `intent`, `target`, `key`, `query`, `input`); HTTP verbs/URLs isolated in `RestTransportConfig` |
| `CapabilitySnapshot` | Presentation-only hints (`allowedActions`, `deniedReasons`, `readOnlyFields`) supplied by backend/BFF; never authoritative security |
| `ComponentResolver` | 4-tier resolution precedence (explicit `ComponentRef` -> app overrides -> design-system semantic mappings -> generic fallback with warning) owned directly by `ComponentResolver` |

---

## 5. Compilation Decisions

- **Pure Phase A / Phase B Split:** `defineResource()` operates strictly locally with zero global mutation; `buildCatalog()` resolves the full graph, applies the 6-tier convention precedence, validates cross-resource invariants, and fails startup deterministically on fatal diagnostics.
- **No Implicit Array Merging:** Descriptor arrays (`columns`, `fields`, `effects`, `actions.row`) deterministically replace defaults; keyed maps merge by key; `undefined` inherits; `false` suppresses.
- **No `Object.freeze` on Zod Objects:** Only plain metadata descriptors are frozen in dev/test builds.

---

## 6. API and BFF Decisions

- **HTTP Route Handlers over Server Actions:** `/api/bff/resources/[resource]/actions/[action]` handles `GET` (for `intent: 'query'`) and `POST` (for `intent: 'command'`), enabling concurrent reads, `AbortSignal` cancellation, multipart uploads, and binary `Blob` downloads.
- **4-Tier REST Endpoint Precedence:** Action override -> Resource override -> Application `RestTransportConfig` -> Default REST conventions (`GET/POST/PATCH/DELETE` derived from `resourcePath` and `operation`).
- **Unsupported Filter/Sort Handling:** Rejected explicitly via `ActionError` (`VALIDATION_FAILED`) rather than silently ignored.
- **Deferred Capabilities:** RPC/WebSocket `ApiTransport`s, client query cache adapters (TanStack/SWR), and realtime subscriptions remain explicitly out of Revision 1 scope.

---

## 7. Type-System and Reference Decisions

- **Eliminated `TS7022` Circular Inference:** Generated `.magesti/resources.d.ts` (`RegisteredResourceMap`) emits flattened literal unions (`actions`, `workspaces`, `sections`, `relations`) and schema record types instead of circular `typeof XResource` references.
- **Zero Runtime Cross-Imports:** `*.resource.ts` modules use `resourceRef('target.key')` (~40-byte token) or `import type` with `resourceRefFrom`, ensuring circular relationships (`Customer <-> Invoice`) cause zero runtime TDZ errors and zero cross-resource bundle bleed.
- **Preserved Action `I`/`O` Types:** `ActionRef<K, A, I, O>` carries input/output contracts through `useFormWorkspace` and `useAction`.

---

## 8. Areas Requiring Technical Validation Before Implementation

1. **Spike 1 — TypeScript `RegisteredResourceMap` & `FieldPath<T>` Performance:** Empirically measure `tsc` type-checking latency and autocomplete responsiveness across 50+ field schemas and bidirectional circular relations.
2. **Spike 2 — Next.js Manifest Generation & Per-Resource Chunk Splitting:** Verify `RouteClientManifest` serialization and Webpack/Turbopack dynamic `import()` chunk isolation with `'server-only'` enforcement.
3. **Spike 3 — Inline Function Extraction (`LocalFunctionTable`):** Validate deterministic path-keyed extraction in `defineResource()` and local browser evaluation inside `useFormWorkspace` across RSC boundaries.
4. **Spike 4 — `RestTransport` & BFF Against Sigma Backend Conventions:** Test `QuerySpec` serialization, composite keys, `If-Match` concurrency tokens, and `422` `ValidationIssue[]` normalization against live Sigma WMS/PIM/Retail/ERP API envelopes.
