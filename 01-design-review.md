# Independent Architectural Review: Framework Architecture & Metamodel Specification

**Reviewed document:** [`docs/00-design-concept.md`](./00-design-concept.md) (Version 1.0, 12 November 2026)  
**Review role:** Independent Principal Software Architect  
**Review date:** 13 November 2026  
**Target ecosystem:** Sigma WMS, Sigma PIM, Sigma Retail, Sigma ERP, and future React / Next.js enterprise applications

---

## 1. Executive Summary

### Overall Assessment

The specification in `00-design-concept.md` contains an **excellent frontend metamodel core buried inside an over-engineered, mis-scoped full-stack persistence framework**.

If implemented as currently written, the team will spend months building a half-baked ORM, transaction coordinator, authorization engine, and SQL-like query compiler inside a Next.js Node server—duplicating responsibilities that belong to the domain backends of Sigma WMS, PIM, Retail, and ERP—while simultaneously shipping brittle TypeScript ergonomics, broken compilation-stage assumptions, and heavy client bundle overhead.

**Recommendation: REVISE BEFORE IMPLEMENTATION.**  
Do **not** begin coding Phase 1 against the current specification. Preserve the core product philosophy and frontend metamodel invariants, strip out the backend persistence/transaction/policy architecture in favor of an **API-first client and transport boundary**, fix the compile-time vs. catalog-time contradictions, simplify the registry and descriptor authoring ergonomics, and validate the TypeScript inference model with a targeted prototype first.

### Viability & Complexity

- **Is the core product architecture viable?** **Yes.** A declarative, schema-driven, headless metamodel with canonical actions, mode-free action-bound forms, separated workspaces/sections, and a centralized host stack is well suited for a multi-application enterprise suite (WMS/PIM/Retail/ERP) where UI consistency is a feature, not a bug.
- **Is the current specification unnecessarily complex?** **Yes—severely.** It attempts to solve backend persistence (`ResourceDataAdapter`, `DataSession`, `TransactionPolicy`, `AuditPolicy`, `softDelete`), backend authorization (`PolicyRegistry`, row-level `QueryExpression` filters, mass-assignment enforcement), Next.js Server Action RPC routing (`dispatchResourceAction`), and 10 separate registries inside one platform. It also duplicates responsibilities between `buildModel()` and `buildCatalog()` and introduces type contracts that contradict each other or fail to deliver the promised type inference.

### Strongest Ideas (Preserve)

1. **Canonical Action Identity (§0.1.3, §9):** Treating standard data operations, domain commands, client utilities, and workspace navigation as one unified `ActionDefinition` contract eliminates parallel CRUD pipelines and permission matrices.
2. **Mode-Free Forms Bound to Action Contracts (§0.1.5, §10.6):** Eliminating `mode: 'create' | 'edit' | 'view'` in favor of binding a form workspace to an action input schema and invocation context is an exceptionally clean design decision.
3. **Workspace vs. Section Separation (§0.1.6, §10):** Distinguishing independently hostable, stateful interaction boundaries (`Workspace`) from composable layout/content fragments (`Section`) prevents modal/routing chaos.
4. **Persisted Scalar Foreign Keys vs. Navigation Relations (§4.3, §8.3):** Keeping `customerId` in the schema while modeling `customer` as a separate relation avoids conflating persisted payloads with expanded DTOs.
5. **Headless Architecture & Centralized Host Stack (§14, §15, §18):** Decoupling domain metadata and state hooks from design-system renderers, while centralizing dialog/drawer stacks, dirty guards, and focus management in `HostManager`.

### Weakest Ideas (Eliminate or Redesign)

1. **Generic Backend Persistence Layer in a Frontend Platform (§11.4, §12, §13):** `ResourceDataAdapter`, `DataSession`, `TransactionPolicy` (with SQL isolation levels!), `softDelete`, `AuditPolicy`, domain event publication, and server-side row-level `PolicyRegistry` belong to backend microservices/domain servers, not a React/Next.js UI framework.
2. **Single-Endpoint Next.js Server Action Transport (`dispatchResourceAction`, §19.1):** Funneling all client reads and mutations through a single `'use server'` Server Action bottlenecks parallel queries (due to React transition queuing), breaks HTTP semantics (GET caching, ETags, `AbortController`), adds an unnecessary Next.js server hop when consuming REST APIs, and blocks WebSocket/streaming evolution.
3. **Compile-Time / Catalog-Time Split Contradictions (§5.4, §5.6, §8.4):** `buildModel()` promises to apply design-system and application-level convention overrides (§5.6) and compile cross-relation `ProjectionPlan`s (§5.4 step 13), yet runs in isolation with only `{ key, schema }` and zero access to application conventions or target models.
4. **Type-Level Bugs & Unproven Inference Promises (§3.5, §3.6, §15.4):** Public contracts in the spec contain duplicate conflicting aliases, leaky optional phantom brands (`FieldPath<T>` assignable from any `string`), erasure of action `I`/`O` types to `unknown` on `ResourceModel.getAction`, and stringly-typed authoring references that require repeating keys multiple times.
5. **10 Independent Registries & Overloaded `ResourceModel` Runtime Payload (§6.2, §11):** Requiring 10 separate registries, embedding `ModelCompileReport` provenance on every production runtime `ResourceModel`, and forcing `RuleRegistry` / `ValidatorRegistry` splits creates high ceremony and client bundle bloat.

### Most Important Changes Required Before Implementation

1. **Replace the Generic Data Layer (§12) and `@framework/runtime-server` persistence engine with an API-First Client & Transport Architecture** (REST-first, transport-portable to RPC/WebSocket).
2. **Separate Authoring, Local Compilation, and Application Catalog Composition** so app conventions and cross-resource projections are resolved once in `buildCatalog()` (or `createCatalog()`), not prematurely inside `buildModel()`.
3. **Fix the TypeScript Type System and Authoring Ergonomics** so resource definitions expose typed handles (`Resource.actions.issue`, `Resource.workspaces.browse`) instead of raw string IDs and erased `unknown` generics.
4. **Collapse the 10 Registries** into `ResourceCatalog` + a small, unified registry primitive for UI components, client handlers, codecs/formatters, and client-safe rules.
5. **Realign Next.js Integration (§19)** around direct `ApiClient` consumption in both RSCs (SSR) and Client Components (or a thin authenticated BFF proxy when credentials must stay server-side), rather than `'use server'` RPC tunneling.

---

## 2. Architecture Scorecard

| Dimension | Score (1–5) | Rationale |
|---|---|---|
| **Conceptual cohesion** | **2.5 / 5** | The frontend metamodel (resource → attributes/relations → canonical actions → workspaces/sections → hosts) is cohesive, but it is grafted onto a backend ORM/BFF runtime (`DataAdapter`, `TransactionPolicy`, `PolicyRegistry`, `AuditPolicy`) that belongs in a completely different system tier. |
| **Abstraction quality** | **2.5 / 5** | Mode-free forms and canonical actions are great abstractions. However, `DataOperation` (`query/get/insert/patch/remove`) duplicates `ActionId` (`list/get/create/update/delete`), `HostManager` vs. `HostController` leaks, `ActivitySourceRef` is ungrounded, and `FormWorkspaceDescriptor` duplicates `FieldsSectionDescriptor`. |
| **Developer experience** | **2.5 / 5** | Minimal authoring (`key` + `schema`) is promising, but customized authoring (§21.2) is verbose: keys are duplicated (`summary: { id: 'summary' }`), string IDs must be wrapped in brand helpers (`actionId`, `handlerId`, `policy`), and developers must wire 5–10 separate registries manually. |
| **Type safety** | **2.0 / 5** | Despite strong rhetoric in §3, the actual TypeScript contracts in §3.5–§3.6 have duplicate conflicting type definitions, `FieldPath<T>` accepts arbitrary `string`, `AttributeOverrides<T>` only supports top-level `keyof T`, and `getAction`/`useFormWorkspace` erase `I`/`O` to `unknown`. |
| **Convention over configuration** | **3.5 / 5** | The convention pipeline (§5.3) is thoughtfully scoped and inspectable, *except* §5.6 (application + design-system convention layers) cannot actually work with a standalone `buildModel({ key, schema })` signature, and `defaults` requires redundant wiring. |
| **Extensibility** | **3.5 / 5** | Escape hatches exist at every layer (custom workspaces, custom sections, custom components, custom actions, custom adapters), though extending a resource with a nonstandard API endpoint currently forces writing a Next.js server handler or full `ResourceDataAdapter`. |
| **Runtime efficiency** | **2.5 / 5** | Shipping full `ModelCompileReport` provenance, `RuntimeSchema` instances (Zod), and an entire `ModelCatalog` of 100+ ERP resources to the browser threatens bundle size and startup latency. React hook granularity and N+1 relation fetching (`deferred`) are unaddressed risks. |
| **API architecture** | **1.5 / 5** | **Major weakness.** The spec defines a database-style `ResourceDataAdapter` + Next.js Server Action tunnel instead of a real frontend API client. It lacks HTTP semantics (URL conventions, query serialization, ETags, `AbortSignal`, file upload/download, response envelopes, REST/RPC/WS transport boundaries). |
| **Maintainability** | **2.5 / 5** | Strict package boundaries (§2.2) are good, but maintaining a bespoke backend policy/transaction/adapter layer alongside real enterprise backends (WMS/PIM/ERP) creates long-term impedance mismatch and drift. |
| **Enterprise suitability** | **3.5 / 5** | Strong alignment with enterprise UI needs: composite keys, 4 relation cardinalities, lookups with quick-create, dirty-state overlay guards, i18n/ICU, accessibility, and enforced UI consistency. Weakened by assuming Next.js owns the database and security boundary. |

---

## 3. Critical Architectural Findings

### Issue Register

| ID | Area | Severity | Current design | Identified problem | Recommendation |
|---|---|---|---|---|---|
| **F-01** | API / Data Layer | **Critical** | `ResourceDataAdapter`, `DataAdapterRegistry`, `DataSession`, `TransactionPolicy`, `AuditPolicy`, `softDelete` (§3.5, §11.4, §12, §13.5) | Leaks backend persistence, database transactions, ORM concepts, and domain event publishing into the frontend platform. | Replace `@framework/runtime-server` persistence layer with an **API-First Client & Transport** (`ApiClient`, `ApiTransport`, `ResourceApiConfig`). Remove DB/transaction abstractions. |
| **F-02** | Next.js / Transport | **Critical** | Single exported Server Action `dispatchResourceAction` as primary client-to-server transport (§19.1) | React Server Actions are POST-only, transition-queued, non-cacheable by HTTP/CDN, lack `AbortController` cancellation, and force every API call through Next.js. | Use `ApiClient` directly over HTTP/REST (client → API or client → thin BFF proxy) and in RSCs for SSR; reserve Server Actions for explicit Next.js-only form mutations if desired, never as the canonical transport. |
| **F-03** | Compiler / Catalog | **Critical** | `buildModel()` compiles cross-relation `ProjectionPlan`s (§5.4 step 13) and claims app/DS convention precedence (§5.6) without catalog or app config | `buildModel()` has no access to target models (forbidden by §0.1.8) nor to app/design-system convention configs (§5.1). Both claims are impossible as specified. | Split into `defineResource()` (pure local normalization + local validation) and `buildCatalog(resources, config)` (applies app/DS conventions, resolves relations, compiles cross-model projections). |
| **F-04** | Security Boundary | **Critical** | `@framework/runtime-server` enforces RBAC, tenant scoping, row-level `QueryExpression`, field read/write, and mass assignment (§13.2) | Assumes Next.js is the authoritative backend. In Sigma WMS/PIM/ERP, the domain backend API is authoritative; duplicating a partial policy engine in Next.js creates drift and false security assumptions. | Make backend APIs authoritative for authz/row/field security. Frontend consumes capability hints (`allowedActions`, `readonlyFields`) for UI presentation and uses BFF only for session/token forwarding. |
| **F-05** | Type Safety | **Critical** | Duplicate `SectionDescriptorMap`/`WorkspaceDescriptorMap` (§3.5 vs §3.6), optional `__fieldPath?` brand, `keyof T` in `AttributeOverrides`, `unknown` erasure in `getAction` | Code snippets in the spec do not type-check cleanly; `FieldPath<T>` accepts arbitrary strings; `useFormWorkspace` and `getAction` cannot infer `I`/`O` as promised in §15.4. | Fix type contracts; require opaque/validated path helpers or recursive template-literal paths; preserve action/workspace/section literal maps on compiled resource handles. |
| **F-06** | Action Model | **High** | `ActionBehavior` splits backend execution into `data` (`DataOperation`: `query/get/insert/patch/remove`) vs `handler` (`runtime: 'server'`) (§9.2, §9.4) | Redundant 5-verb `DataOperation` vocabulary duplicates standard `ActionId`s; custom backend endpoints require writing Next.js server handlers rather than binding API operations. | Replace `'data'` + `'handler'(server)` with `'api'` (conventional resource operation or custom endpoint/operation binding); keep `'client'` and `'navigate'`. |
| **F-07** | Registries | **High** | 10 separate registries/catalogs (§11.1–§11.5), string IDs without static links, `ValidatorRegistry` is server-only while `AttributeDescriptor.validators` is shared | Excessive bootstrap ceremony; synchronous client field validators have no valid registry home; `RuleId`/`PolicyId`/`HandlerId` errors are deferred until bootstrap tests. | Consolidate to `ResourceCatalog` + 4 lightweight registries (`ComponentRegistry`, `ClientActionRegistry`, `RuleRegistry`, `FormatterRegistry`) built on one shared `Registry` primitive; support typed reference handles. |
| **F-08** | Bundle & Runtime | **High** | `ResourceModel` embeds `RuntimeSchema` (Zod) + `ModelCompileReport` provenance (§6.2); `ModelCatalog` holds all app resources | Importing `ModelCatalog` in the browser pulls all 100+ enterprise resource schemas and compile provenance reports into client JS bundles; deep-freezing `RuntimeSchema` can break or slow cold starts. | Strip `ModelCompileReport` from runtime `CompiledResource` (move to `inspectResource()` / dev tooling); enable code-split / lazy resource chunks per route rather than monolithic client `ModelCatalog` imports. |
| **F-09** | Workspaces & Sections | **High** | `FormWorkspaceDescriptor` duplicates `FieldsSectionDescriptor` (`fields` + `columns`); `RelatedCollectionSection` has pagination/selection/actions without workspace state | Blurred boundary between workspaces and sections: `RelatedCollection` *is* an embedded stateful collection view, while `FormWorkspace` embeds section layout fields inline. | Allow `FormWorkspace` to auto-generate a `fields` section or reference sections cleanly; model `RelatedCollectionSection` explicitly as a **scoped embedded grid state** (reusing collection state primitives without hostability). |
| **F-10** | Relational Model | **High** | `RelationDescriptor` includes `onDelete` (`cascade`/`restrict`), `ownership`, `loading: 'deferred' | 'include' | 'select-in'`, `through` join tables (§8.2) | Mixes backend DDL/ORM cascading rules with frontend API hydration needs; `display.fields` must be manually repeated on the source model (§21.2 line 2501). | Remove `onDelete` cascade semantics (backend owns referential integrity); derive default `display.fields` from the target resource during `buildCatalog()`; reframe `loading` as API hydration strategy (`embed` / `batch` / `on-demand`). |
| **F-11** | Authoring DX | **Medium** | Key duplication (`summary: { id: 'summary' }`), mandatory branding helpers vs. unbranded examples (§3.1 vs §21.2), redundant `defaults` block | High boilerplate in non-trivial models (§21.2 is 125 lines); spec examples violate its own branded type signatures. | Accept unbranded `string` keys at authoring time (keyed maps supply `id` automatically); brand/normalize during compilation; infer `defaults` automatically when standard IDs (`browse`, `record`, `input`, `lookup`) exist. |
| **F-12** | Spec Consistency | **Medium** | Dangling `HostController` reference (§9.7); `ActivitySourceRef` unspecified (§10.4); `LookupWorkspace` lacks `quickCreate` (placed on `RelationDescriptor` instead) | Incomplete and inconsistent contracts across sections will cause AI coding agents to invent incompatible implementations. | Reconcile `HostManager` naming; define `ActivitySection` data contract as a standard API query or defer it; support `quickCreate` cleanly via action ref / lookup invocation options. |
| **F-13** | Rule Dependency Graph | **Medium** | `buildModel()` compiles rule dependency graphs & rejects cycles (§5.4 step 12), but `hidden`/`readOnly`/`required` take opaque `RuleRef`s without `dependsOn` | Compiler cannot statically detect dependencies or cycles of opaque `RuleId` strings registered elsewhere. | Either require `dependsOn` on `RuleRef` / `RuleExpression` metadata or limit static cycle checking to `computed` fields and inline `RuleExpression` ASTs. |
| **F-14** | Validation & Serialization | **Medium** | §2.2/§2.3 forbid non-serializable functions in shared models, yet `ResourceModel` and `ActionDefinition` embed `RuntimeSchema` instances (§6.2, §9.2) | `RuntimeSchema` (e.g., Zod) contains functions/closures and cannot be serialized over RSC boundaries or deep-frozen safely; §2.3 vs §6.2 wording is muddled. | Clarify that **Compiled Metadata (`SchemaNode`, JSON-serializable)** is distinct from **Validator Functions (`RuntimeSchema`)**; keep `ResourceModel` serializable or explicitly document schema modules as dual-environment JS modules (never passed across RSC props). |
| **F-15** | Naming Alignment | **Low** | Entry points are `browse` / `input` while workspace kinds are `grid` / `form` (§10.3 vs §10.7); `ModelKey` vs `ResourceDescriptor` | Terminology shifts between `Resource` and `Model`, and between semantic entry points and structural workspace kinds. | Standardize on `Resource` terminology (`ResourceKey`, `CompiledResource`, `ResourceCatalog`) and clarify entry point vs. workspace kind naming. |

### Detailed Rationale for Top Critical Findings

1. **F-01 & F-02 (Persistence Leakage & Next.js Bottleneck):** Sections 11.4, 12, 13, and 19 effectively design a monolithic BFF/ORM framework. Notice §12.6 lists "resource-to-table mapping", "schema-to-column mapping", "soft-delete", and "common transaction and concurrency semantics", while §9.8 step 11 publishes domain events after database commit. In an enterprise ecosystem comprising Sigma WMS, PIM, Retail, and ERP, domain invariants, SQL transactions, soft-deletes, row-level authorization, and domain events live in the respective backend services. Routing every frontend grid query (`list`) through a single `'use server'` Next.js Server Action (`dispatchResourceAction`, §19.1) is especially damaging: React Server Actions serialize sequentially in transitions, use `POST` requests, cannot be cached at HTTP/CDN layers, and lack clean `AbortSignal` support for fast typing in lookups/filters.
2. **F-03 (Impossible Compiler Pipeline):** §0.1 Rule 2 and Rule 8 state `buildModel()` is pure and isolated per resource, and cross-model references are resolved later in `buildCatalog()`. Yet §5.4 Step 13 requires `buildModel()` to compile `ProjectionPlan`s—which §12.4 says must include "related relation display projections" derived from target metadata and policy (§8.4 line 1139). Similarly, §5.6 requires `buildModel()` to honor design-system defaults and application-level convention overrides, even though `buildModel({ key, schema })` (§5.1) accepts no application or design-system configuration.
3. **F-05 (Demonstrable TypeScript Defects):**
   - `SectionDescriptorMap<T>` is declared twice with incompatible types (`Readonly<Record<string, SectionDescriptor<T>>>` on line 635 vs. `SectionDescriptor<T>` on line 664; same for `WorkspaceDescriptorMap<T>` on lines 636 and 665).
   - `FieldPath<T>` (line 315) is `string & { readonly __fieldPath?: T }`. Because `__fieldPath` is optional, TypeScript allows assigning `'nonexistent.path'` to `FieldPath<Invoice>`, completely defeating §3.3's stated invariant.
   - `ActionDefinitionFor<T, K>` (line 673) returns `ActionDefinition<unknown, unknown> & { readonly id: K }`, discarding input/output schemas and types so `useFormWorkspace` (§15.4) cannot actually infer `I` and `O` from `model.getAction(id)`.

---

## 4. Nomenclature Review

In a declarative framework, naming determines whether developers form an accurate mental model from the public API alone. Several terms in `00-design-concept.md` suffer from backend/ORM leakage, internal inconsistency (`Resource` vs. `Model`), or overloaded meanings.

### Detailed Term-by-Term Review

| Current Name | Problem | Alternatives | Recommended Name | Rationale |
|---|---|---|---|---|
| **Resource** | Strong term, *but* immediately abandoned for `ModelKey`, `buildModel()`, `ResourceModel`, `ModelCatalog`. | `Entity`, `Model`, `Resource` | **`Resource`** | `Entity` implies DB/ORM persistence; `Model` is overloaded (data model, view model, ML model). `Resource` accurately describes an API-backed domain capability (including virtual/non-persisted resources). |
| **ResourceDescriptor** | Good, consistent with `WorkspaceDescriptor` / `SectionDescriptor`. | `ResourceConfig`, `ResourceSpec`, `ResourceDescriptor` | **`ResourceDescriptor`** | Keeps the `*Descriptor` suffix uniform across all authoring inputs (`ResourceDescriptor`, `ActionDescriptor`, `WorkspaceDescriptor`, `SectionDescriptor`). |
| **ResourceModel** (and `buildModel()`) | Overloaded `Model` term; breaks `Resource` consistency; obscures whether it is authoring metadata, compiled metadata, or an active runtime instance with methods. | `CompiledResource`, `ResourceDefinition`, `ResourceMetadata` | **`CompiledResource`** (produced by `compileResource()` or `defineResource()`) | Clearly signals "immutable compiled output of a `ResourceDescriptor`" with zero confusion about whether it executes DB queries or holds mutable state. |
| **ModelCatalog** (and `ModelKey`) | Shifts away from `Resource`; `Catalog` is good for a read-only resolved graph. | `ResourceRegistry`, `ResourceGraph`, `ResourceCatalog` | **`ResourceCatalog`** (and **`ResourceKey`**) | Aligns all top-level nouns under `Resource*` and reserves `Registry` for implementation bindings (components, handlers, codecs). |
| **ActionDefinition** | Breaks the `*Descriptor` / `Compiled*` naming symmetry; blurs action contract vs. execution behavior (`data` vs `handler` vs `navigate`). | `ActionDescriptor`, `CapabilityDescriptor`, `ActionSpec` | **`ActionDescriptor`** (authoring) / **`CompiledAction`** (compiled) | Makes all four metamodel building blocks follow one predictable pattern: `Resource*`, `Action*`, `Workspace*`, `Section*`. |
| **ActionDispatcher** (server) & **ClientActionInvoker** (client) | Two different names (`Dispatcher` vs `Invoker`) for executing the same canonical action; `Dispatcher` sounds like Redux/event bus or backend command bus. | `ActionRunner`, `ActionExecutor`, `ActionClient` | **`ActionExecutor`** (or `executeAction` on `WorkspaceRuntime` / `ActionClient`) | Unifies client and server/SSR execution under one verb (`execute`) without Redux or backend message-bus baggage. |
| **Workspace** | Good distinction from `Section`, though in SaaS apps "Workspace" often means top-level tenant/app shell. Entry points (`browse`, `input`) don't match workspace kinds (`grid`, `form`). | `Screen`, `Surface`, `Interaction`, `Workspace` | **`Workspace`** (keep; align kinds/entry points) | `Screen`/`Page` imply full-page routing and fail for dialogs/drawers; `Workspace` works well if explicitly scoped as "interaction workspace" and if entry points (`browse`, `record`, `input`, `lookup`) are clearly explained as *semantic roles* satisfied by structural kinds (`grid`, `record`, `form`, `lookup`, `wizard`). |
| **Section** | Appropriate for non-hostable UI fragments, though `RelatedCollectionSection` acts like an embedded stateful grid. | `Fragment`, `Panel`, `Block`, `Section` | **`Section`** | Familiar, intuitive, and clearly subordinate to `Workspace`. |
| **Host / HostManager** (and dangling `HostController` in §9.7) | `Host` (`PageHost`, `DialogHost`, `DrawerHost`) is clear. `HostManager` is generic Java-style naming, and §9.7 leaks `HostController`. | `HostStack`, `HostController`, `OverlayHost`, `HostManager` | **`HostController`** (or **`HostManager`** — pick one and purge the other) | `HostController` accurately reflects imperative UI control (`open`, `close`, `canNavigate`) without "Manager" bloat. |
| **ComponentRegistry** | Clear for React devs, though it actually registers `ComponentDefinition`s (component + propsSchema + capabilities). | `RendererRegistry`, `WidgetRegistry`, `ComponentRegistry` | **`ComponentRegistry`** | Standard in React ecosystems; keep `ComponentRole` (`field`, `cell`, `filter`, etc.) to distinguish slots. |
| **ServerActionHandlerRegistry** & **ClientActionHandlerRegistry** | Split stems from the BFF persistence architecture. Under API-first, backend commands are API operations, not local Next.js handlers. | `ClientActionRegistry`, `HandlerRegistry` | **`ClientHandlerRegistry`** (eliminate `ServerActionHandlerRegistry`) | Only browser-only custom logic needs a handler registry in the frontend framework. Backend commands map to API operations. |
| **DataAdapter / DataOperation / DataSession / DataContext** | **Severe ORM/persistence leakage.** `insert`/`patch`/`remove` and `DataSession` belong to database drivers/repositories, not frontend APIs. | `ApiClient`, `ApiTransport`, `OperationBinding`, `RequestContext` | **`ApiClient`**, **`ApiTransport`**, **`ApiOperation`**, **`RequestContext`** | Communicates exact frontend boundary: calling remote APIs over a transport with request context. |
| **QuerySpec / ProjectionPlan** | `QuerySpec` is good. `ProjectionPlan` sounds like a SQL query optimizer execution plan. | `QuerySpec` / `FieldProjection` / `ProjectionSpec` / `SelectSpec` | **`QuerySpec`** & **`ProjectionSpec`** (or **`FieldSelection`**) | Keeps query vocabulary clean and API-oriented rather than database-planner-oriented. |
| **RuntimeSchema** | Accurate and distinct from compile-time TypeScript types. | `SchemaAdapter`, `ValidationSchema`, `RuntimeSchema` | **`RuntimeSchema`** | Clearly communicates "schema inspectable and executable at runtime". |

### Consolidated Proposed Glossary

| Term | Canonical Definition |
|---|---|
| **Resource** | A named domain-facing API capability (backed by an endpoint or virtual command), described by a `RuntimeSchema` and compiled into a `CompiledResource`. |
| **ResourceKey** | A stable, namespaced identifier for a resource (e.g., `sales.invoice`). |
| **ResourceDescriptor** | Authoring-time declarative configuration for a resource, its attributes, relations, actions, sections, workspaces, and API conventions. |
| **CompiledResource** | Immutable, locally normalized resource metadata produced by `defineResource()` / `compileResource()`. |
| **ResourceCatalog** | Immutable application-level graph built by `buildCatalog()`, applying app/design-system conventions, validating cross-resource references, and compiling cross-resource projections. |
| **RuntimeSchema** | Vendor-neutral runtime validation and structural introspection facade (`parse`, `safeParse`, `inspect`). |
| **Attribute** | A scalar or structured property derived from the resource schema, enriched with semantic format, behavior, and UI hints. |
| **Relation** | A typed navigation link to another resource (`one-to-one`, `many-to-one`, `one-to-many`, `many-to-many`), separate from scalar foreign-key attributes. |
| **Action** (`ActionDescriptor` / `CompiledAction`) | The single canonical unit of executable capability: an `'api'` operation (standard or custom), a `'client'` handler, or a `'navigate'` workspace transition. |
| **ActionExecutor** | Client/SSR facade that validates input, dispatches `'api'` actions through `ApiClient`, runs `'client'` handlers, triggers `'navigate'` via `HostController`, and applies UI `ActionEffect`s. |
| **Workspace** | A hostable, addressable interaction boundary owning lifecycle and interaction state (`grid`, `record`, `form`, `lookup`, `wizard`, `custom`). |
| **Section** | A reusable, non-hostable UI fragment composed inside a workspace or parent section (`fields`, `summary`, `relatedCollection`, `tabs`, `accordion`, `activity`, `custom`). |
| **Host / HostController** | Presentation container (`PageHost`, `DialogHost`, `DrawerHost`) and controller managing the overlay stack, promises, focus, and dirty-state navigation guards. |
| **ApiClient** | Framework-owned typed client that executes resource operations and custom API actions over a pluggable `ApiTransport`, handling auth context, caching integration, cancellation, and error normalization. |
| **ApiTransport** | Pluggable protocol adapter (`RestTransport` initially; `RpcTransport` / `WsTransport` later) translating canonical operations, `QuerySpec`, `ProjectionSpec`, and `RequestContext` onto the wire. |
| **QuerySpec / ProjectionSpec** | Transport-agnostic ASTs describing filtering, sorting, pagination, and field/relation selection. |
| **ComponentRegistry** | Client-only registry mapping `ComponentKey` + `ComponentRole` + capabilities to React renderers. |

---

## 5. Recommended API Architecture

This section replaces §11.4 (`DataAdapterRegistry`), §12 (`Generic data layer`), §13's backend persistence/policy responsibilities, and §19.1 (`dispatchResourceAction`).

### 5.1. Architectural Boundaries: Frontend Platform vs. Backend Domain Execution

The frontend framework's boundary ends at the **API Contract**.

- **The Frontend Framework Owns:**
  - Resource metadata, schemas, UI conventions, workspaces, sections, and host lifecycle.
  - Canonical action identity and input/output structural validation.
  - Serializing queries (`QuerySpec`), projections (`ProjectionSpec`), keys (`KeyObject`), and action payloads for an `ApiTransport`.
  - Attaching authentication headers/tokens, correlation IDs, locale, idempotency keys, and optimistic concurrency tokens.
  - Normalizing API errors into `ActionError`, managing `AbortSignal` cancellation, retry policies for safe requests, cache invalidation, and applying UI `ActionEffect`s.
- **The Backend Domain API Owns:**
  - Database persistence, ORMs, SQL/NoSQL queries, table/column mapping, and soft-delete storage mechanisms.
  - Database transactions and isolation levels (`read-committed`, `serializable`, etc.).
  - Authoritative authentication verification, tenant isolation, RBAC/ABAC, row-level security, and field-level access enforcement.
  - Business invariants, state machines, cross-resource orchestration, audit logging, and domain event publication.

### 5.2. Evaluation of Alternative API Architectures

| Criterion | Alt A: REST-First Hardcoded Client | Alt B: Transport-Independent Logical Operation Abstraction | Alt C: API Client + Protocol Adapters *(Recommended Core)* | Alt D: Resource-Centric Per-Model API Config |
|---|---|---|---|---|
| **Simplicity** | Very high initially; zero abstraction layers. | Moderate–High; requires defining universal operation envelopes early. | **High** when scoped to request/response + optional stream. | Medium; spreads HTTP/transport details into every `ResourceDescriptor`. |
| **Type safety** | Strong for REST paths/queries; awkward for RPC. | Strongest around action `(I) => Promise<O>`. | **Very strong**; `ApiClient` types map directly from `CompiledAction<I, O>`. | Risky; mixing transport overrides into shared descriptors blurs client/server concerns. |
| **Developer experience** | Zero config for standard REST. | Requires mapping every resource action to transport descriptors. | **Best balance:** zero-config REST conventions + clean per-resource/action overrides. | Verbose descriptors; changes to API routing require editing shared resource files. |
| **REST → RPC/WS Portability** | **Poor**; REST concepts (URLs, HTTP verbs, status codes) leak into hooks/models. | **High**, if capabilities aren't over-abstracted. | **High**; metamodel stays clean, `ApiTransport` swaps wire mapping. | **Poor**; REST path templates inside `ResourceDescriptor` resist RPC/WS migration. |
| **Streaming / Live Updates** | Hard (SSE bolted on separately). | Supported if `subscribe` is a first-class operation kind. | Supported via optional `subscribe` capability on `ApiTransport`. | Hard; resource descriptors become protocol-specific. |
| **Request Cancellation & Caching** | Native `fetch` + `AbortSignal` + HTTP cache/TanStack Query. | Must build custom cancellation token + cache key normalization. | **Clean:** `AbortSignal` is first-class; cache keys derive from `(resourceKey, actionId, canonicalInput)`. | Same as A or C depending on client. |
| **SSR / Next.js Integration** | Native `fetch` in RSC with `cookies()`/`headers()`. | Works cleanly if transport uses server-configured fetch/client. | **Excellent:** same `ApiClient` runs in RSC (server token/cookie context) and Browser (client auth/BFF context). | Same as C, but forces URL logic into shared models. |

#### Verdict: Combine **Alternative C (API Client with Protocol Transports)** + **Convention-Driven Resource API Metadata**

Why not pure Alternative A? Because leaking HTTP verbs, URL templates, or status codes into `ActionDefinition`, `WorkspaceDescriptor`, or `useGridWorkspace` breaks RPC/WebSocket portability.  
Why not pure Alternative B? Because designing a "universal protocol" before shipping REST invites speculative over-engineering (custom binary framing, universal streaming state machines).

**The Real Coupling Points (and How to Decouple Them):**  
Claiming "protocol independence" merely by introducing an `interface ApiTransport` is a common architectural illusion. Real coupling happens in five specific places:

1. **Query & Projection Serialization:** REST encodes filters/sort/page/include into URL query strings (or `POST /search` bodies), whereas RPC/WS send structured JSON objects. **Decoupling rule:** `CompiledResource` and headless hooks emit **structured ASTs (`QuerySpec`, `ProjectionSpec`)**. Only `RestTransport` knows how to serialize them into `?filter=...&sort=...&include=...`.
2. **Record & Operation Addressing:** REST identifies records via URL templates (`/invoices/{id}` or `/order-items/{orderId}/{lineNo}`), whereas RPC/WS invoke procedures (`sales.invoice.get`, `{ key }`). **Decoupling rule:** `ResourceDescriptor.api` expresses **logical identity** (optional `endpoint` name like `'invoices'`, default derived from `ResourceKey`) and `ActionDescriptor` uses `operation` / `input` / `target`. `RestTransport` resolves default REST routes (`GET /{resource}`, `POST /{resource}`, `PATCH /{resource}/{key}`, `POST /{resource}/{key}/{action}`) and accepts optional REST route-mapping overrides in `RestTransportConfig`, keeping REST paths out of `ActionDefinition` whenever possible!
3. **Concurrency & Idempotency Tokens:** REST uses `If-Match` / `ETag` and `Idempotency-Key` HTTP headers; RPC/WS use envelope fields. **Decoupling rule:** `ActionExecutionOptions` and `ActionResultMeta` carry opaque `concurrencyToken?: string` and `idempotencyKey?: string`. The REST transport translates them to/from HTTP headers; RPC/WS transports pass them in envelope headers.
4. **Error Semantics:** REST uses HTTP status codes (`404`, `409`, `422`, `429`); RPC/WS use application error codes. **Decoupling rule:** Each `ApiTransport` normalizes wire errors into the canonical `ActionError` union (`NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `RATE_LIMITED`, etc.).
5. **Streaming vs. Request-Response:** REST is request-response (plus optional SSE); WebSockets allow multiplexed subscriptions. **Decoupling rule:** The baseline `ApiTransport` contract requires `execute()` (request-response with `AbortSignal`). Transports MAY optionally implement `subscribe()` for live query/record invalidation or streaming actions without forcing REST to fake WebSockets.

### 5.3. Responsibilities of the `ApiClient`

1. **Operation Execution:** Single entry point `execute(request)` accepting `{ resource, action, input, key?, projection?, options? }`.
2. **Auth & Request Context Injection:** Calls a configurable `getRequestContext()` hook (injecting bearer tokens, tenant header/context, locale, correlation ID) cleanly on both browser and Next.js RSC.
3. **Request Cancellation & Timeouts:** Accepts `AbortSignal`, merges with configured default timeouts, and aborts in-flight requests cleanly when components unmount or grid filters change.
4. **Concurrency & Idempotency:** Forwards `concurrencyToken` and generates/forwards `idempotencyKey` (for actions marked `idempotent: true`).
5. **Retries:** Automatic bounded exponential backoff **only** for idempotent reads or explicitly `idempotent: true` commands on transient `UNAVAILABLE` / `RATE_LIMITED` errors.
6. **Error Normalization:** Maps network errors, timeouts, HTTP status codes, and backend validation payloads (`ValidationIssue[]`) into typed `ActionResult<O>`.
7. **Cache & Invalidation Integration:** Provides canonical cache-key derivation (`[resourceKey, actionId, stableHash(input)]`) and triggers invalidation hooks (integrating cleanly with TanStack Query, SWR, or Next.js `revalidateTag`).
8. **File Uploads & Downloads:** Handles `FormData` / multipart or pre-signed URL upload flows and streaming `Blob` downloads cleanly outside JSON-only constraints.

### 5.4. Illustrative Public Contracts (`@framework/api`)

```typescript
export interface ApiRequest<I = unknown> {
  readonly resource: ResourceKey;
  readonly action: ActionId;
  /** Logical operation name: 'list' | 'get' | 'create' | 'update' | 'delete' | custom action ID */
  readonly operation: string;
  readonly target: ActionTarget;
  readonly key?: KeyObject<unknown>;
  readonly input: I;
  readonly projection?: ProjectionSpec;
  readonly apiHints?: ResourceApiMetadata;
  readonly actionHints?: ActionApiMetadata;
}

export interface ApiExecutionOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly concurrencyToken?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly headers?: Readonly<Record<string, string>>;
  /** Next.js RSC / cache tags integration */
  readonly cache?: { readonly tags?: readonly string[]; readonly revalidate?: number | false };
}

export interface ApiContext {
  readonly correlationId: string;
  readonly locale: string;
  readonly authToken?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface ApiTransport {
  readonly kind: 'rest' | 'rpc' | 'websocket' | (string & {});
  execute<I, O>(
    request: ApiRequest<I>,
    context: ApiContext,
    options?: ApiExecutionOptions,
  ): Promise<ActionResult<O>>;

  /** Optional capability for live updates / streaming transports (WS, SSE) */
  subscribe?<I, E>(
    request: ApiRequest<I>,
    context: ApiContext,
    onEvent: (event: E) => void,
  ): () => void;
}

export interface ApiClient {
  execute<I, O>(
    request: ApiRequest<I>,
    options?: ApiExecutionOptions,
  ): Promise<ActionResult<O>>;
  canSubscribe(): boolean;
  subscribe?<I, E>(request: ApiRequest<I>, onEvent: (event: E) => void): () => void;
}
```

### 5.5. REST Implementation & Resource Conventions

Out of the box, `createRestTransport(config)` handles ordinary resources with **zero per-resource boilerplate**:

- **Default Endpoint Derivation:** `sales.invoice` → `/invoices` (configurable pluralizer/prefix or `api: { path: 'sales/invoices' }` in `ResourceDescriptor`).
- **Standard Operation Mapping:**
  - `list` → `GET /{path}` with serialized `QuerySpec` (`filter`, `sort`, `page`, `size`, `cursor`, `include`, `fields`)
  - `get` → `GET /{path}/{encodedKey}` with `ProjectionSpec` (`include`, `fields`)
  - `create` → `POST /{path}` with JSON body
  - `update` → `PATCH /{path}/{encodedKey}` (or `PUT` via config) + `If-Match: {concurrencyToken}`
  - `delete` → `DELETE /{path}/{encodedKey}` + `If-Match: {concurrencyToken}`
  - Custom `record` action (e.g., `issue`) → `POST /{path}/{encodedKey}/issue`
  - Custom `collection`/`none` action (e.g., `export`, `recalculateAll`) → `POST /{path}/export`
- **Composite Keys in URLs:** Configurable codec—either path segments (`/{path}/{k1}/{k2}`) or query parameters (`/{path}/by-key?orderId=...&lineNo=...`) so unusual backend routes never force abandoning the REST client.
- **Query Serialization & Response Envelope Adapters:** Sigma ERP, WMS, PIM, and Retail backends may use different query conventions (e.g., OData, JSON:API, Spring Data `?page=0&size=20&sort=name,asc`, or custom `{ items, total }` vs `{ data, meta: { pagination } }`). `createRestTransport` accepts pluggable `querySerializer` and `responseMapper` functions at the **application level** (with per-resource overrides) so nonstandard backend envelopes never require writing custom per-resource API clients!
- **Multipart / File Uploads & Downloads:** If an `ActionDescriptor`'s input contains `File`/`Blob` (or `contentType: 'multipart'`), `RestTransport` encodes `FormData` instead of `application/json`; if `responseType: 'blob'`, it returns a typed download handle without attempting `JSON.parse`.

### 5.6. Query, Projection, Caching, Errors, and SSR Mechanics

- **Query & Projection Representation:** Keep `QuerySpec` (`where`, `orderBy`, `page`, `includeTotal`) and `ProjectionSpec` (`fields`, `relations`) in `@framework/metamodel` as transport-agnostic ASTs. `buildCatalog()` derives each workspace's `ProjectionSpec` from its visible columns/fields and relation display fields, ensuring the frontend never over-fetches entire ERP aggregates unless configured. On the wire, `RestTransport` serializes them into query parameters (or `POST /search` bodies when query ASTs exceed URL length budgets).
- **Error Normalization & Concurrency:** `RestTransport` translates HTTP `400`/`422` field error maps into canonical `ValidationIssue[]` (`VALIDATION_FAILED`), `401`/`403` into `FORBIDDEN`, `404` into `NOT_FOUND`, `409`/`412` into `CONFLICT`, and `429` into `RATE_LIMITED` (with `retryable: true` and `Retry-After` handling). When a resource declares `versionField` or returns an `ETag` in `ActionResultMeta`, `ApiClient` automatically sends `If-Match` / `concurrencyToken` on `update`, `delete`, and record mutations.
- **Caching & Invalidation:** `ApiClient` exposes deterministic query keys (`['resource', resourceKey, actionId, canonicalInput]`) and cache-adapter hooks (`onInvalidate({ resources, records, tags })`) so `ActionEffect`s drive TanStack Query / SWR invalidation on the client and `revalidateTag()` in Next.js server mutations without coupling `@framework/api` to one cache library.
- **Authentication & SSR (Next.js App Router):** In Server Components, a server-instantiated `ApiClient` reads `cookies()` / session tokens via `getContext()` and attaches `next: { tags, revalidate }` options to `fetch`, loading initial data in parallel without a Server Action bottleneck. On the client, `ApiClient` either authenticates directly (Bearer/CORS) or points at a thin HTTP BFF proxy (`/api/bff/[...path]`) that forwards HttpOnly session cookies safely.

### 5.7. Portability Demonstration: REST Today, RPC/WebSocket Tomorrow

Because `ResourceDescriptor` and `ActionDefinition` express **logical capability**, not wire syntax:

- A resource declares:
  - `key: 'sales.invoice'`
  - standard actions + custom action `issue` (`target: 'record'`, `behavior: { type: 'api', idempotent: true }`)
- **With `RestTransport`:** `execute` maps `issue` to `POST /sales/invoices/{id}/issue` with `Idempotency-Key` header and maps HTTP `409` → `ActionError { code: 'CONFLICT' }`.
- **With `RpcTransport` (e.g., tRPC / ConnectRPC / JSON-RPC):** `execute` maps `issue` to RPC procedure `sales.invoice.issue({ key: { id }, input, meta: { idempotencyKey } })`.
- **With `WsTransport`:** `execute` sends `{ type: 'req', id, op: 'sales.invoice.issue', key, input }` over the socket and awaits matching `{ type: 'res', id }`; `useGridWorkspace` can additionally subscribe to `{ op: 'sales.invoice.changed' }` to auto-invalidate queries!
- **Zero changes** to `ResourceDescriptor`, `CompiledResource`, `ActionDescriptor`, `WorkspaceDescriptor`, `SectionDescriptor`, or headless hooks.

### 5.8. Backend Concepts to Remove vs. Reframe

| Concept in `00-design-concept.md` | Disposition | Rationale & Replacement |
|---|---|---|
| `ResourceDataAdapter`, `DataAdapterRegistry`, `DataSession` | **Remove entirely** | Persistence ports belong in backend services, not the frontend framework. Replaced by `ApiClient` + `ApiTransport`. |
| `TransactionPolicy` (`read-committed`, `serializable`) | **Remove entirely** | Database transaction isolation is strictly a backend implementation detail. |
| `ResourceDataOptions.softDelete` (`{ field, deletedValue }`) | **Remove entirely** | Backend handles soft-delete transparently behind `DELETE` or an explicit `archive` API action. Frontend should not inspect DB soft-delete columns unless explicitly filtering an `archivedAt`/`status` domain field. |
| `PolicyRegistry`, `PolicyDecision.rowFilter`, `readableFields`/`writableFields` enforcement | **Remove from frontend runtime; Reframe as UI capability hints** | Backend API enforces row/field/action security. Frontend receives `CapabilitySnapshot` (`allowedActions`, `deniedReasons`, `readOnlyFields`) from an API capability endpoint/record metadata for presentation only. |
| Domain Event Publication (§9.8 step 11, §13.5) | **Remove entirely** | Backend publishes domain events post-commit. Frontend uses `ActionEffect` (`invalidate`, `toast`, `navigate`) post-API-success. |
| `AuditPolicy` (`enabled`, `includeInput`) | **Reframe** | Backend owns audit trails. Keep only an optional **UI prompt flag** on `ActionDescriptor` (`requireReason?: boolean` or `confirm.requireReason`) that collects an audit reason string and sends it as part of API input/context. |
| `IdempotencyPolicy` (`ttlSeconds`) | **Reframe** | Backend owns TTL/deduplication store. Frontend keeps `idempotent?: boolean` on `'api'` actions so `ApiClient` generates/attaches an `idempotencyKey` and allows safe automatic retries. |
| `ConcurrencyPolicy` (`versionField`) | **Reframe** | Keep `versionField` (or opaque `_etag`/`_version` extraction) as an API hint so `ApiClient` sends `concurrencyToken` (`If-Match`) and recognizes `CONFLICT` responses. |
| `ServerActionHandlerRegistry` | **Remove from core framework** | Backend business commands are API endpoints (`type: 'api'`), not Next.js handlers. (If an app builds a custom Next.js BFF endpoint, it uses standard Next.js route handlers outside the core metamodel.) |

---

## 6. Simplification Opportunities

1. **Eliminate the `@framework/runtime-server` Persistence/Policy/Transaction Engine:** Removes `DataAdapterRegistry`, `ResourceDataAdapter`, `ServerActionHandlerRegistry`, `PolicyRegistry`, `ValidatorRegistry`, `TransactionPolicy`, `DataSession`, and `ServerServiceContainer`. Cuts framework code size, test matrix complexity, and architectural confusion by ~40%.
2. **Collapse 10 Registries into `ResourceCatalog` + 1 Generic `Registry` Primitive (4 Specialized Instances):** Instead of 10 bespoke interfaces and builders (`ModelCatalog`, `ComponentRegistry`, `ServerActionHandlerRegistry`, `ClientActionHandlerRegistry`, `DataAdapterRegistry`, `PolicyRegistry`, `ValidatorRegistry`, `RuleRegistry`, `CodecRegistry`, `FormatterRegistry`), implement one generic immutable `Registry<K, V>` (with `has`, `get`, `require`, `keys`, `extend/layer`) and instantiate:
   - `ComponentRegistry` (client UI renderers)
   - `ClientHandlerRegistry` (browser-only actions)
   - `RuleRegistry` (shared pure reactive/computed functions when `RuleExpression` AST is insufficient)
   - `CodecRegistry` (combining `CodecRegistry` + `FormatterRegistry` for semantic formats like `cpf`, `cnpj`, `currency`, `date`)
3. **Eliminate `DataOperation` (`query/get/insert/patch/remove`) Redundancy:** Standard action IDs are already `list`, `get`, `create`, `update`, `delete`. Remove the duplicate 5-item `DataOperation` enum and simply configure `standardActions?: readonly StandardActionId[] | false`.
4. **Infer `ResourceEntryPoints` (`defaults`) Automatically:** If a workspace is named `browse`, `record`, `input`, or `lookup`, infer `defaults` automatically instead of forcing authors to declare `defaults: { browse: 'browse', record: 'record', input: 'input' }` (§21.2 lines 2604–2608).
5. **Remove Duplicate `id` Fields Inside Keyed Descriptor Maps:** In `sections: { summary: { id: 'summary', ... } }` (§21.2), omit `id` from authoring objects inside keyed records and inject it during `compileResource()`.
6. **Strip `ModelCompileReport` Provenance from Runtime `CompiledResource`:** Move `inspectModel()` / provenance generation into a dedicated dev/CLI/diagnostics function (`compileResourceWithReport()` or `inspectResource(descriptor)`) rather than carrying provenance trees on every production runtime object.
7. **Defer Speculative Contracts:** Remove `ActivitySectionDescriptor` (`ActivitySourceRef` has no defined backend contract), `WizardWorkspace` multi-workspace embedding ambiguity, and `RuleRegistry` cycle detection across opaque functions from v1 core until concrete requirements are pinned.

---

## 7. Recommended Changes by Architectural Area

### 7.1. Metamodel, Compiler, and Catalog (`buildModel` → `defineResource` + `buildCatalog`)

- **Current flaw:** `buildModel()` tries to be pure and isolated (§0.1.2) while simultaneously claiming to apply app/design-system convention layers (§5.6) and compile cross-model `ProjectionPlan`s (§5.4 step 13).
- **Recommended design (Two-Stage Compilation):**
  1. **`defineResource(descriptor)` (Local Compile):** Inspects `RuntimeSchema`, normalizes attributes/relations/actions/sections/workspaces, validates local paths and local references, freezes local compiled metadata, and returns a strongly-typed `CompiledResource` handle carrying typed reference accessors (`Invoice.actions.issue`, `Invoice.workspaces.browse`).
  2. **`buildCatalog(resources, options?)` (App-Level Graph Compile):** Receives `{ resources, conventions?, designSystemDefaults? }`. Applies app/design-system convention layers deterministically, synthesizes missing default workspaces/sections, validates all cross-resource relations and inverse mappings, derives target `display.fields` when omitted on relations, compiles cycle-safe `ProjectionSpec`s per workspace, and produces an immutable `ResourceCatalog`.

### 7.2. Runtime Schemas and TypeScript Inference

- **Fix `FieldPath<T>`:** Replace `string & { readonly __fieldPath?: T }` (which accepts any string!) with a recursive TypeScript template-literal `Paths<T>` (bounded to depth 4–5 to protect TS compiler latency) or typed path builders.
- **Fix `AttributeOverrides<T>`:** Use recursive nested object mapping or `Partial<Record<FieldPath<T>, Partial<AttributeDescriptor>>>` so nested attributes (`address.city`) can be overridden cleanly.
- **Preserve Literal Types on `CompiledResource`:** Make `defineResource` return `CompiledResource<T, Actions, Workspaces, Sections, Relations>` so `resource.action('issue')` returns `ActionRef<IssueInput, Invoice>` with full `I`/`O` inference in `useFormWorkspace` and `ActionExecutor`.
- **Clarify `RuntimeSchema` vs. Serializable Metadata:** `RuntimeSchema` (e.g., Zod) contains functions/closures and is **not JSON-serializable**. Document clearly that `CompiledResource` is a *dual-environment JS module* imported independently by server and client, while `SchemaNode` (from `schema.inspect()`) is the serializable structural representation for dev tools/AI introspection.

### 7.3. Canonical Action Model

- **Simplify `ActionBehavior` to 3 Clean Variants:**
  - `api`: `{ type: 'api'; operation?: string; method?: 'query' | 'command'; idempotent?: boolean; endpoint?: Partial<ActionEndpointHint> }` — covers both generated standard actions (`list`, `get`, `create`, `update`, `delete`) and custom backend endpoints (`issue`, `approve`, `export`).
  - `client`: `{ type: 'client'; handler: HandlerId }` — browser-only utilities (copy, print, local export, multi-step client orchestration).
  - `navigate`: `{ type: 'navigate'; workspace: WorkspaceRef; host?: HostKind; mapping?: RecordMapping; bindAction?: ActionId }` — transitions to a workspace.
- **Decouple Input/Output Contracts from `ActionOverrides`:** When overriding a generated navigation action (`open`, `edit`, `new`), allow partial overrides (`label`, `confirm`, `presentation`, `host`) without requiring the author to re-specify `input` or `behavior`.

### 7.4. Workspaces and Sections

- **Keep the Workspace/Section split, fix the leaks:**
  - Remove inline `fields` + `columns` duplication from `FormWorkspaceDescriptor` (or make `fields` a strict shorthand compiled into an implicit `fields` section so runtime renderers only handle sections!).
  - Acknowledge that `RelatedCollectionSectionDescriptor` is an **embedded collection controller** (it owns local pagination/sort/filter state scoped to `relationContext`, without owning URL routing or host stack lifecycle).
  - Align `LookupWorkspaceDescriptor` with `GridWorkspaceDescriptor` (share base collection/column/filter contracts) and allow `quickCreate` to be configured consistently either on `RelationDescriptor.lookup` or `LookupWorkspaceDescriptor` via a standard `ActionRef`.
  - Defer `ActivitySectionDescriptor` until its API contract (cursor pagination, actor/timestamp/event shape) is specified, or implement it simply as a `RelatedCollectionSection` backed by an `audit-event` resource!

### 7.5. Relational Metamodel

- **Remove DDL/ORM Leakage:** Remove `onDelete: 'restrict' | 'set-null' | 'cascade'` from `RelationDescriptor` (the backend enforces referential integrity; the frontend only shows confirm prompts or handles API conflict errors).
- **Derive `display.fields` in `buildCatalog()`:** Allow `RelationDescriptor.display` to be omitted; during `buildCatalog()`, infer display fields from the target resource's `displayField` / conventional title fields (`name`, `title`, `code`, `label`) rather than requiring the source model to hardcode target fields (§21.2 line 2501).
- **Reframe `loading` as `hydration`:** `'embedded' | 'batch' | 'deferred'` describes how the frontend expects/requests relation display data from the API (`?include=customer` vs. batched `POST /customers/lookup` for grid rows vs. on-demand fetch), avoiding ORM `select-in` SQL terminology.

### 7.6. Host Management, React, and Next.js Boundaries

- **Eliminate `dispatchResourceAction` as primary transport (§19.1):** Use `ApiClient` directly from both Next.js Server Components (for SSR initial data with Next.js `fetch` caching/tags) and Browser Client Components (with `AbortSignal` and TanStack Query / SWR). If backend credentials cannot be exposed to the browser, place a thin authenticated HTTP BFF proxy route (`/api/proxy/[...path]`) or token-exchange endpoint—preserving HTTP verbs, caching, parallel reads, and cancellation.
- **Consolidate `HostController` naming** and clarify URL synchronization (`query-param` vs `route-segment`) for `DialogHost`/`DrawerHost` with Next.js App Router (`useSearchParams` / intercepting routes), which is notoriously subtle during browser back/forward navigation.

### 7.7. Performance, Bundle Size, and Runtime Costs

- **Avoid Monolithic Client `ModelCatalog` Imports:** In a 150-resource ERP, importing every `ResourceDescriptor` and Zod schema on the main dashboard bundle is unsustainable. Design `ResourceCatalog` for **route-level code splitting** or lightweight **metadata manifests** (serializable `SchemaNode` + labels + action IDs for cross-resource navigation) while lazy-loading full schemas/workspaces per route!
- **Granular Subscription Hooks:** `useGridWorkspace` and `useFormWorkspace` should avoid monolithic state objects that re-render the entire toolbar/grid/form on every keystroke; expose selector-friendly state or integrate with established headless primitives (e.g., TanStack Table / TanStack Form / React Hook Form / Zustand-style stores under the hood).
- **Avoid Recursive `Object.freeze` on `RuntimeSchema`:** Freeze plain metadata descriptors in dev/test mode (`NODE_ENV !== 'production'`) or freeze shallowly; never freeze third-party schema library instances (like Zod objects) that may rely on internal lazy caching.

### 7.8. Registries and Reference Resolution

- **Unify on One Registry Kernel:** Provide a single generic `createRegistry<K, V>()` with immutable `.layer()` / `.extend()` composition, duplicate-key diagnostics, and `has/get/require/keys`. Instantiate `ComponentRegistry`, `ClientHandlerRegistry`, `RuleRegistry`, and `CodecRegistry` from it.
- **Prefer Typed Resource Handles Over Raw Strings:** Allow cross-resource references via `CustomerResource.workspaces.lookup` or `InvoiceResource.actions.issue` in addition to string keys checked by `buildCatalog()`, reducing stringly-typed refactor risk.

### 7.9. Security and Responsibility Boundaries

- **Authoritative Backend Enforcement:** Authentication, tenant isolation, RBAC/ABAC, row-level filters, field-level readability/writability, and mass-assignment rejection live exclusively in the backend service(s).
- **Frontend Presentation Hints Only:** Keep `CapabilitySnapshot` (`allowedActions`, `deniedReasons`, `readOnlyFields`) as a UI presentation mechanism fetched from backend metadata/endpoints; remove `PolicyRegistry` and `rowFilter` AST execution from the frontend codebase.

### 7.10. Localization and Formatting

- **Keep ICU `MessageRef` & `CodecRegistry`:** Preserve `MessageDescriptor` (`message('key', values, fallback)`), `Intl`-based formatting, date vs. instant separation, and explicit decimal/currency structures (avoiding IEEE-754 floats for money). Simplify `ResourceLabels` by keeping `gender`/`forms` optional and entirely consumed by the application's ICU message templates rather than baked into framework strings.

### 7.11. Developer Tooling and Diagnostics

- **High-Leverage DX Tooling Only:** Prioritize (1) `inspectResource()` / `inspectCatalog()` CLI & dev-only inspector showing generated defaults and overrides, (2) a catalog contract validator (`validateCatalog()`) runnable in CI/Vitest to verify all component keys, client handlers, rules, and cross-resource refs, and (3) an optional OpenAPI/JSON-Schema → `ResourceDescriptor` scaffold generator to cut initial boilerplate for large Sigma ERP/WMS APIs. Avoid building visual drag-and-drop descriptor editors.

---

## 8. Enterprise Tradeoffs and Limitations

The specification intentionally enforces a consistent, predictable enterprise UI. Below is a strict classification of the resulting boundaries:

1. **Intentional Limitations Reinforcing Product Consistency (Keep):**
   - No arbitrary per-page form/grid invention; standard grids, forms, record views, and lookups follow uniform design-system renderers.
   - Mode-free forms bound to action schemas (`create`, `update`, `issue`, `approve`) rather than `create/edit/view` modes.
   - Centralized `HostController` owning modal/drawer stacks, dirty-state navigation guards, and focus restoration.
   - Single canonical `ActionDescriptor` preventing ad-hoc button `onClick` handlers from inventing divergent error/loading/confirmation patterns.

2. **Legitimate Weaknesses That Must Be Corrected (Fix):**
   - Treating the frontend platform as a backend persistence/ORM/policy server.
   - Routing all queries/mutations through a single Next.js Server Action.
   - Shipping full compile provenance and all app schemas into one monolithic client bundle.
   - TypeScript definitions that fail to infer `I`/`O` contracts or validate paths.

3. **Tradeoffs to Accept:**
   - **Indirection vs. Uniformity:** Developers write declarative descriptors and register components/handlers by ID rather than writing raw JSX pages for standard CRUD/master-data screens. This creates a modest learning curve on day 1 in exchange for massive consistency across 4+ Sigma apps on day 100.
   - **Runtime Schema Requirement:** Requiring Zod (or similar) instead of pure TS interfaces adds authoring work when backend OpenAPI/JSON Schemas already exist—mitigated later by an OpenAPI-to-`ResourceDescriptor` codegen tool.

4. **Risks Requiring Clean Escape Hatches:**
   - **Complex Multi-Line Master-Detail Forms (e.g., ERP Sales Order / Invoice with inline editable line items):** A flat `FormWorkspace` + read-only `RelatedCollectionSection` does not natively cover transactional parent+children inline grid editing. *Mitigation:* Support nested array schemas in `RuntimeSchema` with dedicated editable-table field/section components, plus `CustomSectionDescriptor` for specialized editors.
   - **Unusual Backend Endpoints & Legacy Payloads:** Real ERP/WMS APIs often have non-RESTful endpoints or wrapped envelopes. *Mitigation:* `RestTransport` request/response mappers per resource/action, and custom `api` operation handlers.

5. **Capabilities That Should Remain Outside the Framework:**
   - **Analytical Dashboards, BI Charts, Maps, Kanban Boards, Spatial Warehouse Maps (WMS), and POS Checkout Terminals (Retail):** High-density bespoke operational consoles and data-visualization screens are poorly served by a resource-record metamodel. They should remain **ordinary React / Next.js pages** (or `CustomWorkspace` shells) that may reuse `@framework/api` and design-system primitives without forcing them into `ResourceDescriptor`s.

---

## 9. Proposed Revised Architecture

### 9.1. Revised Conceptual Model & Package Boundaries

```text
AUTHORING LAYER (@application/resources)
  RuntimeSchema + ResourceDescriptor (pure metadata + schema)
          |
          v  defineResource()  [local normalization + strict typing]
COMPILED RESOURCE
  CompiledResource<T, Actions, Workspaces, Sections, Relations>
          |
          v  buildCatalog(resources, { conventions, designSystem })
APPLICATION GRAPH (@application/catalog)
  ResourceCatalog (cross-resource validation, app conventions, ProjectionSpecs)
          |
   +------+-----------------------------------------------+
   |                                                      |
   v                                                      v
SSR / RSC BOUNDARY                               BROWSER CLIENT RUNTIME
  ApiClient (server AuthContext / fetch cache)     WorkspaceRuntime + Headless Hooks
   |                                               ActionExecutor + HostController
   | (initial serialized data + IDs)               ComponentRegistry + ClientHandlerRegistry
   +-----------------------+                              |
                           v                              v
                     API TRANSPORT (@framework/api)   Design-System Renderers
                     RestTransport (v1)               (@application/design-system)
                     RpcTransport / WsTransport (v2)
                           |
                           v
              AUTHORITATIVE BACKEND APIs
        (Sigma WMS / PIM / Retail / ERP Services)
```

| Package | Owns | MUST NOT Depend On |
|---|---|---|
| `@framework/metamodel` | `RuntimeSchema` facade, descriptors, `defineResource()`, `buildCatalog()`, `QuerySpec`, `ProjectionSpec`, `KeyObject` codec, diagnostics | React, Next.js, DOM/browser APIs, HTTP/fetch, backend DB drivers |
| `@framework/api` | `ApiClient`, `ApiTransport`, `RestTransport`, query/projection serializers, error normalization, retry/concurrency/idempotency headers, auth context hooks | React, DOM-only APIs (runs identically in Node/Edge RSC and Browser) |
| `@framework/runtime-client` | `ActionExecutor`, `WorkspaceRuntime`, `HostController`, headless hooks (`useGridWorkspace`, `useFormWorkspace`, etc.), `ComponentRegistry`, `ClientHandlerRegistry`, `RuleRegistry`, `CodecRegistry` | Server secrets, Node-only APIs, specific design system implementations |
| `@framework/react` | `PageHost`, `DialogHost`, `DrawerHost`, focus/scroll/a11y primitives, default layout renderers, Next.js App Router bridge | Application-specific schemas or design tokens |
| `@application/resources` | Shared resource definitions (`CustomerResource`, `InvoiceResource`) + catalog composition | React components, HTTP secrets, browser-only handlers |
| `@application/design-system` | Concrete React renderers registered in `ComponentRegistry` | Backend logic |

### 9.2. Key Architectural Flows

- **Reference Resolution:** Resources export strongly-typed handles (`InvoiceResource`). Within a resource or across imported resources, authors pass typed refs (`InvoiceResource.actions.issue`, `CustomerResource.workspaces.lookup`) or local string keys validated at compile time by TypeScript generics. `ResourceCatalog` validates the full graph once at build/test/startup.
- **API Execution Flow:** `useFormWorkspace.submit()` → `ActionExecutor.execute(actionRef, input)` → client structural validation via `RuntimeSchema` → `ApiClient.execute(request, { signal, concurrencyToken, idempotencyKey })` → `RestTransport` serializes request & calls backend → normalizes response to `ActionResult<O>` → `ActionExecutor` runs declared `ActionEffect`s (`invalidate`, `toast`, `closeHost`, `navigate`).
- **Workspace & Section Composition:** Workspaces own interaction state (query, pagination, selection, draft values, wizard step) and host lifecycle (`PageHost` / `DialogHost` / `DrawerHost`). Sections render inside workspaces and consume parent workspace state or, for `RelatedCollectionSection`, instantiate a scoped embedded collection state bound to a `RelationRef` without registering on `HostController`.

---

## 10. Revised Developer Experience (Illustrative TypeScript)

> Note: These examples illustrate the coherent target authoring API for the revised architecture.

### Example A — Minimal Resource

```typescript
import { z } from 'zod';
import { defineResource, zodSchema } from '@framework/metamodel';

export const CustomerSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    taxId: z.string(),
    email: z.string().email().optional(),
    active: z.boolean().default(true),
  }),
);

// Zero boilerplate: standard actions (list, get, create, update, delete, new, edit, open),
// standard workspaces (browse, record, input, lookup), and REST endpoint (/customers)
// are derived by convention.
export const CustomerResource = defineResource({
  key: 'crm.customer',
  schema: CustomerSchema,
});
```

### Example B — Customized Resource

```typescript
export const InvoiceResource = defineResource({
  key: 'sales.invoice',
  schema: InvoiceSchema,
  labels: {
    singular: message('invoice.singular'),
    plural: message('invoice.plural'),
    gender: 'feminine',
  },
  api: {
    path: 'sales/invoices',
    versionField: 'version',
  },
  attributes: {
    number: {
      label: message('invoice.number'),
      readOnly: rule('invoice.number.immutableAfterIssue'),
    },
    totalAmount: {
      format: 'currency',
      component: componentRef('ds.currency-input', 'field'),
    },
  },
  relations: {
    customer: {
      target: 'crm.customer',
      cardinality: 'many-to-one',
      sourceKey: ['customerId'],
      targetKey: ['id'],
      hydration: 'embed', // display fields derived from CustomerResource in buildCatalog()
      lookup: { workspace: 'crm.customer:lookup' },
    },
    items: {
      target: 'sales.invoice-item',
      cardinality: 'one-to-many',
      sourceKey: ['id'],
      targetKey: ['invoiceId'],
      hydration: 'deferred',
    },
  },
  actions: {
    issue: {
      label: message('invoice.issue'),
      input: IssueInvoiceInputSchema,
      output: InvoiceSchema,
      target: 'record',
      behavior: { type: 'api', idempotent: true },
      confirm: { severity: 'warning', requireReason: true },
      effects: [
        { type: 'invalidate', resources: ['sales.invoice'] },
        { type: 'toast', message: message('invoice.issue.success'), tone: 'success' },
      ],
    },
    open: { label: message('invoice.open') }, // partial override on generated nav action
  },
  sections: {
    // Notice: no redundant `id: 'summary'` inside keyed maps!
    summary: {
      kind: 'fields',
      fields: ['number', 'customer', 'issueDate', 'totalAmount', 'status'],
      columns: 2,
    },
    items: {
      kind: 'relatedCollection',
      relation: 'items',
      columns: ['product', 'quantity', 'unitPrice', 'total'],
      pageSize: 20,
    },
    details: {
      kind: 'tabs',
      tabs: [
        { id: 'overview', label: message('common.overview'), section: 'summary' },
        { id: 'items', label: message('invoice.items'), section: 'items' },
      ],
    },
  },
  workspaces: {
    browse: {
      kind: 'grid',
      columns: ['number', 'customer', 'issueDate', 'totalAmount', 'status'],
      searchable: ['number'],
      filterable: ['status', 'issueDate'],
      actions: { toolbar: ['new'], row: ['open', 'edit', 'issue', 'delete'] },
      primaryAction: 'open',
    },
    record: {
      kind: 'record',
      sections: ['details'],
      actions: { recordHeader: ['edit', 'issue', 'delete'] },
    },
    input: {
      kind: 'form',
      sections: ['summary'],
      warnOnUnsavedChanges: true,
    },
  },
  // `defaults` inferred automatically from workspace IDs 'browse', 'record', 'input'!
});
```

### Example C — REST API Configuration (Application + Resource Overrides)

```typescript
import { createApiClient, createRestTransport } from '@framework/api';

export const apiClient = createApiClient({
  transport: createRestTransport({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    // Shared Sigma ERP envelope & query conventions
    querySerializer: sigmaErpQuerySerializer,
    responseMapper: sigmaErpResponseMapper,
    // Resource/action endpoint overrides kept in API layer, not polluting domain descriptors
    endpoints: {
      'sales.invoice': {
        path: 'v2/billing/invoices',
        actions: {
          // Override default `POST /v2/billing/invoices/{id}/issue` -> PUT finalize
          issue: { method: 'PUT', path: 'v2/billing/invoices/{id}/finalize' },
          // Non-standard search endpoint using POST instead of GET
          list: { method: 'POST', path: 'v2/billing/invoices/search' },
        },
      },
    },
  }),
  getContext: async () => ({
    correlationId: crypto.randomUUID(),
    locale: getActiveLocale(),
    authToken: await getSessionToken(),
  }),
});
```

### Example D — Custom API Operation (Non-Standard Endpoint Without Custom Resource Infrastructure)

```typescript
// 1. Declare custom action on InvoiceResource (descriptor remains transport-agnostic)
actions: {
  exportPdf: {
    label: message('invoice.exportPdf'),
    input: z.object({ id: z.string().uuid(), includeQrCode: z.boolean().default(true) }),
    output: DownloadHandleSchema,
    target: 'record',
    behavior: { type: 'api', method: 'query' },
  },
}

// 2. Map unusual REST response / binary stream in RestTransport configuration
endpoints: {
  'sales.invoice': {
    actions: {
      exportPdf: {
        method: 'GET',
        path: 'v2/billing/invoices/{id}/pdf',
        responseType: 'blob',
        mapQuery: (input) => ({ qr: input.includeQrCode }),
      },
    },
  },
}
```

### Example E — Alternative Transport (RPC / WebSocket Portability)

```typescript
// Same CustomerResource, InvoiceResource, ActionDescriptors, and React hooks!
// Swap only the transport at app bootstrap:
export const rpcTransport: ApiTransport = {
  kind: 'rpc',
  async execute(request, context, options) {
    const res = await fetch(`${rpcBaseUrl}/${request.resource}.${request.operation}`, {
      method: 'POST',
      signal: options?.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': context.correlationId,
        ...(context.authToken ? { Authorization: `Bearer ${context.authToken}` } : {}),
      },
      body: JSON.stringify({
        key: request.key,
        input: request.input,
        projection: request.projection,
        meta: {
          concurrencyToken: options?.concurrencyToken,
          idempotencyKey: options?.idempotencyKey,
        },
      }),
    });
    return normalizeRpcEnvelope(res);
  },
  // WebSocket transport additionally implements `subscribe()` so `useGridWorkspace`
  // receives invalidation events automatically when backend records change.
};
```

### Example F — Custom Client Behavior (Without Bypassing the Framework)

```typescript
// 1. Declare canonical client action on the resource
actions: {
  copyFiscalKey: {
    label: message('invoice.copyKey'),
    input: KeyOnlySchema,
    target: 'record',
    behavior: { type: 'client', handler: 'invoice.copy-fiscal-key' },
  },
}

// 2. Register implementation in ClientHandlerRegistry (client-only bundle)
clientHandlers.register('invoice.copy-fiscal-key', async (input, ctx) => {
  const res = await ctx.actions.execute(InvoiceResource.action('get'), { key: input });
  if (!res.ok) return res;
  await navigator.clipboard.writeText(res.data.fiscalKey);
  ctx.notify({ message: message('invoice.keyCopied'), tone: 'info' });
});
```

---

## 11. Migration Impact on `00-design-concept.md`

| Section(s) in `00-design-concept.md` | Impact | Action Required |
|---|---|---|
| **§0.1 Core Decisions** | **Revise** | Replace Rule 9/10 (`DataAdapter`, server `PolicyRegistry`) with API-first transport & authoritative backend boundary; update Rule 2/8 for two-stage `defineResource` + `buildCatalog`. |
| **§1 & §2 (Goals, Packages)** | **Revise** | Remove `@framework/runtime-server` persistence/policy engine; introduce `@framework/api`; update logical diagram and bundle-splitting rules. |
| **§3 (Types & References)** | **Revise** | Fix duplicate `SectionDescriptorMap`/`WorkspaceDescriptorMap`; fix `FieldPath<T>` branding; preserve typed `ActionRef<I, O>` inference; purge `DataSession`, `TransactionPolicy`, `ServerServiceContainer`. |
| **§4 (Runtime Schema)** | **Keep (minor edit)** | Keep `RuntimeSchema<T>` facade; explicitly separate serializable `SchemaNode` from non-serializable `RuntimeSchema` closures. |
| **§5 & §6 (`buildModel`, `ResourceModel`)** | **Revise** | Split into `defineResource()` + `buildCatalog()`; remove `ModelCompileReport` from production runtime object; drop redundant `defaults` and keyed `id` boilerplate. |
| **§7 (Attributes)** | **Keep (minor edit)** | Clarify client vs. async validation (`RuleRegistry` vs. API server validation errors mapped to `ValidationIssue[]`). |
| **§8 (Relations)** | **Revise** | Remove `onDelete` cascade DDL concepts; rename `loading` to `hydration`; defer `display.fields` resolution to `buildCatalog()`. |
| **§9 (Canonical Actions)** | **Revise** | Replace `data` + `handler(server)` with `'api'`; remove `DataOperation` enum; remove `transaction`/`audit` policies; fix `HostController` typo. |
| **§10 (Workspaces & Sections)** | **Minor Revision** | Align `FormWorkspaceDescriptor` inline fields vs. sections; define `RelatedCollectionSection` scoped state; defer or specify `ActivitySectionDescriptor`. |
| **§11 (Registries)** | **Major Revision** | Remove `DataAdapterRegistry`, `ServerActionHandlerRegistry`, `PolicyRegistry`, `ValidatorRegistry`; consolidate remaining 4 client/shared registries on one base primitive. |
| **§12 (Generic Data Layer)** | **Remove & Replace** | Delete §12 and replace with **Section 12: API Client, Transports, and Query/Projection Serialization**. |
| **§13 (Security & Validation)** | **Major Revision** | Redefine responsibility boundary: backend API is authoritative; frontend uses capability hints (`CapabilitySnapshot`), structural schema validation, and optional BFF auth proxy. |
| **§14, §15, §16, §17, §18** | **Keep (mostly intact)** | Strongest parts of the spec (`HostManager`, headless hooks, structured `KeyObject` codec, i18n/ICU, component resolution). |
| **§19 (Next.js Integration)** | **Revise** | Replace `dispatchResourceAction` Server Action tunnel with `ApiClient` usage in RSCs (SSR) and Client Components (or thin HTTP BFF proxy). |
| **§20, §21, §23, §24** | **Revise** | Update authoring examples, phase sequence (API transport in Phase 2/3), and test matrix to match API-first model. |

---

## 12. Recommended Architectural Decisions

| # | Decision | Recommended Choice | Alternatives Considered | Rationale | Confidence | Spike? |
|---|---|---|---|---|---|---|
| **AD-01** | Data / Execution Scope | **API-First Client & Transport (`@framework/api`)**, backend owns persistence/authz/transactions | Keep `ResourceDataAdapter` BFF/ORM engine in Next.js | Enterprise apps (WMS/PIM/ERP) already have authoritative backends; duplicating persistence/policy in Next.js creates drift and wrong abstractions. | **High** | No |
| **AD-02** | Transport Strategy | **REST-first `RestTransport` behind capability-scoped `ApiTransport`** | Hardcoded REST client; or full generic RPC protocol from day 1 | Delivers zero-config REST immediately while decoupling `QuerySpec`, addressing, headers, and errors so RPC/WS can plug in later without metamodel changes. | **High** | **Yes** |
| **AD-03** | Next.js Data Path | **Direct `ApiClient` (RSC + Client / thin HTTP BFF proxy)** | Single `'use server'` `dispatchResourceAction` tunnel | Avoids React transition queuing on reads, enables `AbortSignal`, preserves HTTP caching, and allows direct WS/streaming later. | **High** | No |
| **AD-04** | Compilation Lifecycle | **Two-stage: `defineResource()` (local) + `buildCatalog()` (app conventions + cross-model projections)** | Single `buildModel()` trying to resolve app conventions and projections | Resolves §5.4/§5.6 contradictions; enables isolated unit testing of resources and accurate cross-model projection planning. | **High** | **Yes** |
| **AD-05** | Action Behavior Taxonomy | **`api` \| `client` \| `navigate`** | `data(5 ops)` \| `handler(server/client)` \| `navigate` | Eliminates redundant `DataOperation` vocabulary and aligns custom backend commands with standard REST/RPC operations. | **High** | No |
| **AD-06** | Type Inference Model | **Typed `CompiledResource` handles with literal action/workspace maps + recursive `FieldPath<T>`** | `Record<string, ...>` maps + optional phantom brand strings | Fixes broken `I`/`O` inference in `useFormWorkspace` / `ActionExecutor` and eliminates typo-prone raw strings. | **Medium-High** | **Yes** |
| **AD-07** | Client Bundle Strategy | **Split lightweight catalog manifest from route-lazy resource/schema chunks; strip compile provenance at runtime** | Import full `ModelCatalog` + all Zod schemas + `ModelCompileReport` in client bundle | Prevents multi-megabyte client bundles in large ERP/WMS suites. | **High** | **Yes** |
| **AD-08** | Registry Architecture | **`ResourceCatalog` + 1 generic `Registry` primitive for 4 UI/client registries** | 10 independent bespoke registry interfaces and builders | Reduces bootstrap boilerplate and maintenance surface while preserving strict environment isolation. | **High** | No |

---

## 13. Open Questions and Validation Experiments

Before revising `00-design-concept.md` into an implementation specification, run **4 focused, time-boxed (1–3 day) technical spikes** rather than building full workspaces:

1. **Spike 1 — TypeScript Inference & Path Ergonomics (2 days)**  
   - *Question:* Can TypeScript infer `FieldPath<T>` (depth 4, including nested objects/arrays) and preserve literal `ActionRef<I, O>` types through `defineResource()` + `useFormWorkspace(resource.action('issue'))` without degrading IDE autocomplete speed on a 50-field ERP invoice schema?  
   - *Success criteria:* Zero `as` casts in authoring Examples A–F; `tsc --noEmit` completes under target threshold with accurate error messages on invalid paths or mismatched action inputs.

2. **Spike 2 — `RestTransport` vs. Real Sigma Backend Envelopes & Query Conventions (2 days)**  
   - *Question:* How cleanly can `RestTransport` serialize `QuerySpec` + `ProjectionSpec` and map responses for the actual REST conventions currently used by Sigma WMS, PIM, Retail, and ERP (e.g., pagination format, nested filters, composite keys, validation error shapes)?  
   - *Success criteria:* One `RestTransport` implementation handles at least two differing Sigma backend conventions purely via `querySerializer` / `responseMapper` config without touching `ResourceDescriptor`.

3. **Spike 3 — Client Bundle Size & Route Code-Splitting with Zod Schemas (1 day)**  
   - *Question:* What is the client JS bundle impact of importing 50+ `CompiledResource` modules (with Zod schemas) in Next.js App Router, and how cleanly can cross-resource navigation (`ActionRef` / `WorkspaceRef`) work without eagerly importing target resource Zod schemas?  
   - *Success criteria:* Cross-resource references resolve via lightweight keys/manifests so navigating from `Invoice` to `Customer` does not bundle all 50 ERP Zod schemas into `/invoices`.

4. **Spike 4 — Next.js App Router + `HostController` URL-Synced Overlays (2 days)**  
   - *Question:* How do `DialogHost` / `DrawerHost` with URL synchronization (`query-param` or `route-segment`), browser back/forward buttons, and dirty-state guards (`beforeunload` + Next.js router interception) behave under Next.js App Router?  
   - *Success criteria:* Nested lookup → quick-create dialog → dirty-guard cancel → browser back button settles all `HostResult` promises cleanly with zero orphaned state or focus-trap leaks.
