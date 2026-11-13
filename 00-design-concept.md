# Framework Architecture and Metamodel Specification

**Document type:** Normative implementation specification  
**Status:** Target architecture (Revision 1)  
**Version:** 2.0  
**Date:** 13 November 2026  
**Intended audience:** AI coding agents, framework engineers, application engineers, and maintainers  
**Primary platform:** TypeScript, React, Next.js App Router, and Zod  

---

## 0. How to Use This Specification

This document is the canonical technical specification for the Sigma Declarative Enterprise UI Framework. It supersedes all prior drafts and resolves all architectural findings from the Revision 1 review. Separate AI coding agents and engineering teams MUST treat this document as the single authoritative source of truth for types, compilation phases, runtime boundaries, API/BFF contracts, and developer ergonomics.

Requirement keywords follow RFC 2119 semantics:

- **MUST** / **SHALL**: mandatory for conformance.
- **MUST NOT** / **SHALL NOT**: strictly prohibited by the architecture.
- **SHOULD**: recommended default; deviations require explicit justification.
- **MAY**: optional extension point.

### 0.1. Core Architectural Invariants

Every subsystem MUST preserve these non-negotiable invariants:

1. **API-First Frontend Platform:** The framework owns declarative UI metadata, action-bound interaction state, client/BFF API execution, and presentation infrastructure. It MUST NOT implement database persistence, ORMs, SQL query planners, database transaction coordination, backend domain event publication, or authoritative security enforcement. Domain backend services own those responsibilities.
2. **Browser-to-BFF Exclusive Boundary:** The browser MUST NEVER call backend domain APIs directly. All browser-originated API traffic MUST pass through the Next.js Backend-for-Frontend (BFF). Backend base URLs, service credentials, and bearer tokens MUST remain strictly server-only.
3. **Three-Layer Metamodel & Two-Phase Compilation:** Developer intent (`ResourceDescriptor`), framework/application conventions, and compiled runtime metadata (`ResourceModel`) are distinct layers. Compilation MUST proceed in two pure phases: Phase A (strictly local resource compilation via `defineResource`) and Phase B (cross-resource and application-convention compilation via `buildCatalog`). Compilation MUST NEVER mutate a process-global singleton.
4. **Canonical Action Abstraction:** Every executable capability—standard CRUD operations, custom backend domain commands, client-side actions, and workspace navigation—MUST compile into one canonical `CompiledAction` contract. Parallel CRUD permission maps, `DataOperation` verbs, or separate CRUD execution pipelines are prohibited.
5. **Mode-Free Action-Bound Forms:** There MUST NOT be `create`, `edit`, or `view` modes anywhere in descriptors, reactive contexts, hooks, components, or workspace runtime state. Every form binds to a canonical action's input schema and invocation context.
6. **Workspace vs. Section Separation:** A `Workspace` is an independently hostable, addressable interaction boundary; a `Section` is a non-hostable composable content or data-view fragment. They have separate descriptor types, separate maps on `ResourceModel`, and distinct runtime contracts.
7. **Persisted Foreign Keys vs. Navigation Relations (`REFERENCES` & `OWNS`):** Scalar foreign-key attributes reside in the resource schema; navigation relations reside separately in `relations` across all four cardinalities (`one-to-one`, `many-to-one`, `one-to-many`, `many-to-many`) with explicit or conservatively inferred `references` vs. `owns` semantics. ORM/DDL delete cascades are excluded.
8. **Typed References & Circular Resource Safety:** Compile-time authoring MUST provide strict TypeScript autocomplete and typo rejection across resources, actions, workspaces, sections, relations, and fields—including bidirectional circular relationships—without forcing runtime cross-imports of entire target resource modules or raw unvalidated strings.
9. **Server/Client Artifact Isolation:** Compilation produces a conceptually authoritative immutable `ResourceModel`, materialized into server-only executable artifacts and route-optimized, strictly JSON-serializable client manifests. Inline pure reactive/computed functions are supported seamlessly without manual registration and are loaded via route-scoped client chunks, never serialized across the React Server Component (RSC) boundary.

---

## 1. Purpose, Objectives, Non-Goals, and Architectural Principles

### 1.1. Product Scope and Objectives

The framework serves as the canonical visual, interaction, and application foundation across the Sigma enterprise suite—**Sigma WMS**, **Sigma PIM**, **Sigma Retail**, **Sigma ERP**—and future independent React and Next.js applications.

Its primary objectives are:

- **Minimal Developer Authoring:** A developer declaring only a resource key and a runtime schema immediately obtains derived attributes, canonical standard actions (`list`, `get`, `create`, `update`, `delete`, `new`, `edit`, `open`), and conventional workspaces (`browse`, `record`, `input`, `lookup`).
- **Predictable Enterprise Consistency:** Grids, forms, record views, lookups, wizards, dialogs, drawers, validation feedback, and notifications follow uniform interaction contracts across applications.
- **Explicit Override & Extension Points:** Conventions are inspectable and selectively suppressible or overridable without forking framework internals. Applications can also implement completely custom workspaces while reusing BFF authentication, `ApiClient`, `ActionExecutor`, `HostController`, localization, and error normalization.
- **Next.js App Router Native:** Supports parallel Server Component (SSR) data loading, route-scoped client code splitting, and an authenticated HTTP BFF without bundling all application schemas into every route.

### 1.2. UI Philosophy

A consistent, predictable ("intentionally boring") enterprise UI is a core product requirement, not an accident. The framework standardizes enterprise interaction patterns rather than encouraging ad-hoc per-screen JSX layouts for routine master-data and transactional workflows. When conventional patterns are insufficient, developers customize via action-bound forms, custom sections, custom components, or custom workspaces—without turning the framework into an unrestricted low-code page builder.

### 1.3. Non-Goals and Excluded Capabilities

The following capabilities are explicitly excluded or deferred in Revision 1 and MUST NOT be implemented:

| Capability | Disposition | Boundary Owner |
|---|---|---|
| Database persistence / ORM / SQL generation | Excluded | Backend domain APIs |
| ORM-like delete cascade rules (`onDelete`) | Excluded | Backend domain APIs |
| Database transaction & isolation orchestration | Excluded | Backend domain APIs |
| Backend domain event publication | Excluded | Backend domain APIs |
| Authoritative RBAC / ABAC / row / field security | Excluded | Backend domain APIs |
| Generic SQL-like query AST (`and`/`or`/nested predicates) | Excluded | Deferred / Backend search |
| Field/relation projection compiler (`ProjectionPlan`) | Excluded initially | Backend DTOs / API config |
| Query cache engine (TanStack Query / SWR adapter) | Excluded initially | Application choice later |
| Realtime / WebSocket event subscriptions | Excluded initially | Separate future architecture |
| RPC or WebSocket `ApiTransport` implementations | Deferred | Future `ApiTransport` plugins |
| OpenAPI-to-resource code generation | Excluded | Separate CLI tooling later |
| Generic registry `.layer()` / `.extend()` API | Excluded initially | Component resolution precedence |
| Generic page / BI dashboard builder | Excluded | Standard React/Next.js pages |
| Manual registration of ordinary inline functions | Avoided | Compiler `LocalFunctionTable` |
| Next.js Server Action as universal transport | Excluded | HTTP BFF Route Handlers |

---

## 2. Terminology and Core Conceptual Model

### 2.1. Canonical Glossary

| Term | Canonical Definition |
|---|---|
| **Resource** | A named domain-facing API capability (persisted entity or virtual command surface) identified by a `ResourceKey` and backed by a `RuntimeSchema`. |
| **ResourceKey** | A stable, namespaced identifier for a resource (e.g., `'sales.invoice'`, `'crm.customer'`). |
| **ResourceDescriptor** | Authoring-time declarative specification of a resource's schema, labels, attributes, relations, actions, sections, workspaces, and resource-level conventions. |
| **LocalResourceModel** | Immutable Phase A compiled output of `defineResource()`, containing locally normalized metadata, local function/schema tables, and typed reference accessors. |
| **ResourceModel** | The single authoritative Phase B compiled metadata contract for a resource within a `ResourceCatalog`, with all application conventions and cross-resource links resolved. |
| **ResourceCatalog** | Immutable application-level graph produced by `buildCatalog()`, validating all cross-resource references and generating server artifacts and client manifests. |
| **RuntimeSchema** | Framework-owned Zod-based schema facade providing runtime validation (`parse`, `safeParse`), TypeScript type inference, structural introspection (`inspect()` -> `SchemaNode`), and schema derivation (`pick`, `omit`, `partial`). |
| **SchemaNode** | Pure JSON-serializable AST describing the structure and constraints of a `RuntimeSchema`. |
| **Attribute** | A scalar or structured property derived from the resource schema, separating storage type, semantic format, UI component, and behavior. |
| **Relation** | A typed navigation link to another resource (`one-to-one`, `many-to-one`, `one-to-many`, `many-to-many`) carrying `references` or `owns` semantics, distinct from scalar foreign-key attributes. |
| **Action (`ActionDescriptor` / `CompiledAction`)** | The single canonical unit of executable capability: `'api'`, `'client'`, or `'navigate'`. |
| **FormModel (`FormDescriptor` / `CompiledFormModel`)** | Action-bound form contract combining an action's input schema, inherited `ResourceModel` attribute/relation metadata, and form-specific overrides/sections. |
| **Workspace** | An independently hostable, addressable interaction boundary owning lifecycle and interaction state (`grid`, `record`, `form`, `lookup`, `wizard`, `custom`). |
| **Section** | A non-hostable, reusable UI or data-view fragment composed inside a workspace or parent section (`fields`, `summary`, `relatedCollection`, `editableCollection`, `tabs`, `accordion`, `custom`). |
| **Host / HostController** | Presentation container (`PageHost`, `DialogHost`, `DrawerHost`) and client controller managing the overlay stack, result promises, focus restoration, URL sync, and dirty-state guards. |
| **ApiClient** | Framework request/response client executing canonical API operations over an `ApiTransport` (`BffTransport` in browser; `RestTransport` on server). |
| **ApiTransport** | Pluggable request/response protocol adapter (`RestTransport` and `BffTransport` in v1; `RpcTransport` / `WsTransport` in future versions). |
| **QuerySpec** | Minimal normalized query contract (`filters`, `sort`, `pagination`) typed against resource attributes. |
| **ClientManifest** | Strictly JSON-serializable metadata payload (`AppClientManifest` / `RouteClientManifest` / `ClientResourceManifest`) delivered across the Next.js RSC boundary to the browser. |
| **ComponentRegistry** | Client-only registry mapping `ComponentKey` + `ComponentRole` + `ComponentCapability` to React components. |

### 2.2. High-Level Conceptual Architecture

```text
DEVELOPER INTENT (@application/resources)
  RuntimeSchema (Zod facade) + ResourceDescriptor + Inline Pure Functions
        │
        ▼  Phase A: defineResource() [strictly local normalization & validation]
LOCAL COMPILED RESOURCE (LocalResourceModel + LocalFunctionTable + LocalSchemaTable)
        │
        ▼  Phase B: buildCatalog() [cross-resource graph + app/DS conventions]
AUTHORITATIVE RESOURCE CATALOG (ResourceModel[] + CompilationReport)
        │
        ├───────────────────────────────────────┐
        ▼                                       ▼
SERVER ARTIFACTS (Node / RSC / BFF)     CLIENT MANIFESTS (JSON-Serializable)
  • Full ResourceModel + RuntimeSchema    • AppClientManifest (lightweight nav/index)
  • ServerFunctionTable                   • ClientResourceManifest (route-scoped)
  • ServerBffHandlerRegistry              • Lazy ClientResourceChunk loaders
  • ApiClient + RestTransport             • ApiClient + BffTransport
  • AuthContextProvider                   • ActionExecutor + WorkspaceRuntime
        │                                 • HostController + ComponentRegistry
        │                                       │
        │        ◄── HTTP /api/bff/... ─────────┘
        │            (JSON / Multipart / Blob; NEVER direct to backend)
        ▼
SIGMA BACKEND DOMAIN APIs (WMS / PIM / Retail / ERP)
  • Authoritative AuthZ, Tenant Scope, Persistence, Transactions, Domain Events
```

---

## 3. Package Architecture and Dependency Boundaries

The framework enforces separation of concerns at the package and module import boundary. Next.js build tooling MUST enforce `'server-only'` markers so server credentials, backend endpoint maps, and server handlers can never enter client bundles.

### 3.1. Package Matrix

| Package | Execution Environment | Owns | MUST NOT Depend On |
|---|---|---|---|
| `@framework/metamodel` | Isomorphic (Node, Edge, Browser) | Branded IDs, typed refs, `RuntimeSchema` Zod facade, `SchemaNode`, descriptors, `defineResource()`, `buildCatalog()`, `ResourceModel`, `ResourceCatalog`, `QuerySpec`, `KeyObject` codec, manifest types, diagnostics | React, `next/*`, DOM/browser APIs, `fetch`, Node `fs`/secrets, concrete design system |
| `@framework/api` | Subpath-split: `.` (shared), `./client` (Browser), `./server` (`'server-only'`) | Shared `ApiClient`, `ApiRequest`, `ApiTransport`, `ActionResult`, `ActionError`. `./client`: `BffTransport`. `./server`: `RestTransport`, `RestTransportConfig`, `AuthContextProvider`, `ServerRequestContext` | React, DOM APIs in `.` or `./server`; `./client` MUST NOT import `./server` |
| `@framework/bff-next` | Server-Only (`'server-only'`) | `createBffRouteHandler()`, `createServerRuntime()`, RSC `buildRouteManifest()`, `ServerBffHandlerRegistry`, Next.js request/session/cookie extraction | React Client Components, DOM APIs, browser registries |
| `@framework/runtime-client` | Client-Only (`'use client'`) | `ActionExecutor`, `WorkspaceRuntime`, `HostController`, `ComponentRegistry`, `ComponentResolver`, `ClientHandlerRegistry`, `ClientResourceLoader`, `Formatters`, headless workspace/section hooks | `@framework/api/server`, `@framework/bff-next`, server secrets, Node-only APIs, concrete design system |
| `@framework/react` | Client-Only (`'use client'`) | `FrameworkProvider`, `PageHost`, `DialogHost`, `DrawerHost`, Next.js App Router URL/navigation bridge, focus trap & accessibility primitives | Application schemas, `@framework/api/server` |
| `@application/resources` | Isomorphic definitions (chunk-split per resource) | `*.schema.ts`, `*.resource.ts`, `.magesti/resources.d.ts` (`RegisteredResourceMap`), client lazy loader map | React UI components, server secrets, `RestTransportConfig`, server BFF handlers |
| `@application/design-system` | Client-Only | Concrete React renderers registered in `ComponentRegistry` + `DesignSystemMappings` | Backend logic, `@framework/api/server` |
| `@application/web` | Next.js App Router Application | `src/server/*` (`'server-only'` `catalog`, `restTransport`, `bffHandlers`), `src/app/api/bff/.../route.ts`, `src/app/**/page.tsx` (RSC), `src/client/*` (`ComponentRegistry`, `BffApiClient`) | Browser importing `src/server/*` |

### 3.2. Dependency Graph

```text
@application/web (Next.js App)
  ├── src/server ('server-only') ──► @framework/bff-next ──► @framework/api/server
  │                                        │                       │
  │                                        ▼                       ▼
  │                               @application/resources ──► @framework/metamodel
  │                                        ▲
  └── src/client ('use client') ───────────┴── (route-lazy import of active resource chunk only)
        ├── @framework/react ──► @framework/runtime-client ──► @framework/api/client
        └── @application/design-system
```

### 3.3. Strict Boundary Rules

1. `@application/resources/*.resource.ts` MUST NOT import another `*.resource.ts` at runtime; cross-resource typing uses `RegisteredResourceMap` or `import type` (Section 14).
2. Client components MUST NOT import the monolithic server `ResourceCatalog` directly. Client components receive a JSON-serializable `RouteClientManifest` from the Server Component and dynamically `import()` only the active route's resource chunk when runtime schemas or inline reactive functions are needed (Section 23).
3. All `RestTransportConfig`, backend base URLs (`process.env.SIGMA_ERP_API_URL`), and authentication token providers MUST reside under `'server-only'` modules. `NEXT_PUBLIC_*` variables MUST NEVER hold backend API URLs or credentials.

---

## 4. Runtime Schema Facade

### 4.1. Purpose and Design Strategy

TypeScript interfaces are erased at runtime and cannot supply validation, structural inspection, defaults, enum discovery, or schema algebra. The framework adopts **Zod** as its runtime schema engine, wrapped behind a slim, framework-owned `RuntimeSchema<T>` facade in `@framework/metamodel`.

The facade:
- Isolates framework compiler and runtime code from arbitrary Zod internal APIs;
- Exposes only the operations required by metamodel compilation, action schema synthesis, validation, and form generation;
- Separates **executable validation (`RuntimeSchema<T>`)** from **JSON-serializable structural metadata (`SchemaNode`)**.

### 4.2. Facade Contract

```typescript
export type ScalarType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'instant'
  | 'time'
  | 'uuid'
  | 'decimal'
  | 'object'
  | 'array'
  | 'file'
  | 'unknown';

export interface SchemaNode {
  readonly kind: ScalarType | 'enum' | 'literal' | 'union';
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly properties?: Readonly<Record<string, SchemaNode>>;
  readonly requiredProperties?: readonly string[];
  readonly items?: SchemaNode;
  readonly enumValues?: readonly SerializableValue[];
  readonly literalValue?: SerializableValue;
  readonly options?: readonly SchemaNode[];
  readonly constraints?: {
    readonly min?: number;
    readonly max?: number;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: string;
  };
  readonly defaultValue?: SerializableValue;
  readonly semanticHint?: SemanticFormat;
  readonly labelHint?: string;
}

export interface ValidationIssue {
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: MessageRef;
  readonly params?: Readonly<Record<string, SerializableValue>>;
}

export type ValidationResult<T = unknown> =
  | { readonly success: true; readonly data: T; readonly issues: readonly [] }
  | { readonly success: false; readonly issues: readonly ValidationIssue[] };

export interface RuntimeSchema<T = unknown> {
  /** Type-level marker for InferSchema<S>; never accessed at runtime. */
  readonly _output: T;
  readonly _schemaKind: 'RuntimeSchema';

  parse(input: unknown): T;
  safeParse(input: unknown): ValidationResult<T>;
  inspect(): SchemaNode;

  /** Schema algebra used by Phase A compiler to synthesize action input schemas. */
  partial(): RuntimeSchema<Partial<T>>;
  pick<K extends keyof T & string>(keys: readonly K[]): RuntimeSchema<Pick<T, K>>;
  omit<K extends keyof T & string>(keys: readonly K[]): RuntimeSchema<Omit<T, K>>;
  extend<U extends Record<string, unknown>>(
    extension: RuntimeSchema<U>,
  ): RuntimeSchema<Omit<T, keyof U> & U>;
}

export type InferSchema<S> = S extends RuntimeSchema<infer T> ? T : never;

export interface SchemaMetaHints {
  readonly format?: SemanticFormat;
  readonly label?: MessageRef;
  readonly description?: MessageRef;
  readonly placeholder?: MessageRef;
}

export function zodSchema<Z extends { _output: unknown }>(zodType: Z): RuntimeSchema<Z['_output']>;
export function schemaMeta(hints: SchemaMetaHints): string;
```

### 4.3. Authoring with the Zod Adapter

Framework authors wrap Zod schemas with `zodSchema()` (and optional `.meta()` / semantic helpers from `@framework/metamodel`):

```typescript
import { z } from 'zod';
import { zodSchema, schemaMeta } from '@framework/metamodel';

export const CustomerSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(120),
    taxId: z.string().describe(schemaMeta({ format: 'cnpj', label: 'CNPJ' })),
    email: z.string().email().optional(),
    customerType: z.enum(['retail', 'wholesale']).default('retail'),
    creditLimit: z.number().nonnegative().describe(schemaMeta({ format: 'currency' })),
    active: z.boolean().default(true),
  }),
);
```

### 4.4. Serialization Rule for Schemas

- `RuntimeSchema<T>` contains Zod validation closures and **MUST NOT** cross the RSC-to-Client JSON prop boundary or be deeply frozen with `Object.freeze`.
- `SchemaNode` returned by `schema.inspect()` is strictly immutable plain JSON and IS embedded inside `ClientResourceManifest` and compilation reports.
- Client-side synchronous form validation loads `RuntimeSchema<T>` from the route's lazy-imported `ClientResourceChunk` (Section 23).

---

## 5. Resource Descriptors and Type Contracts

### 5.1. Branded Identifiers and Typed Paths

Branded string types prevent accidental mixing of identifier categories while preserving serializability:

```typescript
declare const __brand: unique symbol;
export type Brand<T, Name extends string> = T & { readonly [__brand]: Name };

export type ResourceKey = Brand<string, 'ResourceKey'>;
export type ActionId = Brand<string, 'ActionId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type SectionId = Brand<string, 'SectionId'>;
export type RelationId = Brand<string, 'RelationId'>;
export type ComponentKey = Brand<string, 'ComponentKey'>;
export type HandlerId = Brand<string, 'HandlerId'>;
export type FunctionId = Brand<string, 'FunctionId'>;
export type SerializedKey = Brand<string, 'SerializedKey'>;
```

Safe recursive path types (bounded to depth 4 for TypeScript compiler performance) reject nonexistent paths at compile time while falling back cleanly to `string` only when `T` is `unknown`:

```typescript
type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date;
type PrevDepth = [never, 0, 1, 2, 3, 4];

export type FieldPath<T = unknown, D extends number = 4> =
  unknown extends T
    ? string
    : [D] extends [never]
      ? never
      : T extends Primitive
        ? never
        : T extends readonly (infer Item)[]
          ? `${number}` | (Item extends Primitive ? never : `${number}.${FieldPath<Item, PrevDepth[D]>}`)
          : {
              [K in keyof T & string]: NonNullable<T[K]> extends Primitive
                ? K
                : K | `${K}.${FieldPath<NonNullable<T[K]>, PrevDepth[D]>}`;
            }[keyof T & string];

export type RelationPath<R extends string = string> = R | `${R}.${string}`;
export type ValuePath<T = unknown, R extends string = string> = FieldPath<T> | RelationPath<R>;
```

### 5.2. Shared Vocabulary Types

```typescript
export type SerializableScalar = string | number | boolean | null;
export type SerializableValue =
  | SerializableScalar
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

export interface MessageDescriptor {
  readonly kind: 'MessageDescriptor';
  readonly key: string;
  readonly values?: Readonly<Record<string, SerializableValue>>;
  readonly fallback?: string;
}
export type MessageRef = string | MessageDescriptor;

export function message(
  key: string,
  values?: Readonly<Record<string, SerializableValue>>,
  fallback?: string,
): MessageDescriptor;

export interface ResourceLabels {
  readonly singular?: MessageRef;
  readonly plural?: MessageRef;
  readonly gender?: 'masculine' | 'feminine' | 'neuter';
  readonly forms?: Readonly<Record<string, MessageRef>>;
}

export type HostKind = 'page' | 'dialog' | 'drawer';

export interface KeyComponent<T = unknown> {
  readonly field: FieldPath<T>;
  readonly type: ScalarType;
}
export interface KeyDescriptor<T = unknown> {
  readonly components: readonly KeyComponent<T>[];
}
export type KeyDescriptorInput<T> =
  | FieldPath<T>
  | readonly FieldPath<T>[]
  | KeyDescriptor<T>;

export interface KeyObject<T = unknown> {
  readonly __keyBrand?: T;
  readonly values: readonly SerializableScalar[];
}

export interface ActionRef<
  K extends string = string,
  A extends string = string,
  I = unknown,
  O = unknown,
> {
  readonly kind: 'ActionRef';
  readonly resource: K;
  readonly action: A;
  readonly __contract?: { readonly input: I; readonly output: O };
}

export interface WorkspaceRef<K extends string = string, W extends string = string, R = unknown> {
  readonly kind: 'WorkspaceRef';
  readonly resource: K;
  readonly workspace: W;
  readonly __result?: R;
}

export interface SectionRef<K extends string = string, S extends string = string> {
  readonly kind: 'SectionRef';
  readonly resource: K;
  readonly section: S;
}

export interface RelationRef<K extends string = string, Rel extends string = string> {
  readonly kind: 'RelationRef';
  readonly resource: K;
  readonly relation: Rel;
}

export interface ComponentRef<Role extends ComponentRole = ComponentRole> {
  readonly kind: 'ComponentRef';
  readonly key: ComponentKey;
  readonly role: Role;
}

export interface FunctionRef {
  readonly kind: 'FunctionRef';
  readonly id: FunctionId;
}

export interface SchemaRef {
  readonly kind: 'SchemaRef';
  readonly id: string;
}

export type StandardWorkspaceId = 'browse' | 'record' | 'input' | 'lookup';

export function resourceKey(value: string): ResourceKey;
export function componentRef<R extends ComponentRole>(key: string, role: R): ComponentRef<R>;
```

### 5.3. `ResourceDescriptor` Contract

Developers author resources via `defineResource(descriptor)`. Map keys supply IDs automatically (`attributes`, `relations`, `actions`, `sections`, `workspaces`)—developers MUST NOT repeat `id` inside keyed map entries.

```typescript
export interface ResourceDescriptor<
  K extends string = string,
  S extends RuntimeSchema<any> = RuntimeSchema<any>,
  R extends Record<string, RelationDescriptor<InferSchema<S>>> = Record<string, RelationDescriptor<InferSchema<S>>>,
  A extends ActionOverrideMap<InferSchema<S>, Extract<keyof R, string>> = ActionOverrideMap<InferSchema<S>, Extract<keyof R, string>>,
  Sec extends SectionDescriptorMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>> = SectionDescriptorMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>>,
  W extends WorkspaceOverrideMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>, Extract<keyof Sec, string>> = WorkspaceOverrideMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>, Extract<keyof Sec, string>>,
> {
  readonly key: K;
  readonly schema: S;
  readonly labels?: ResourceLabels;
  readonly primaryKey?: KeyDescriptorInput<InferSchema<S>> | false;
  readonly displayField?: FieldPath<InferSchema<S>>;
  readonly api?: ResourceApiHints<InferSchema<S>>;
  readonly attributes?: AttributeOverrideMap<InferSchema<S>>;
  readonly relations?: R;
  readonly actions?: A;
  readonly sections?: Sec;
  readonly workspaces?: W;
  readonly defaults?: ResourceEntryPoints<Extract<keyof W, string>>;
  readonly conventions?: ResourceConventionOverrides<InferSchema<S>>;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export interface ResourceApiHints<T = unknown> {
  /** Logical resource endpoint segment (e.g., 'customers'). Physical URLs live in server RestTransportConfig. */
  readonly resourcePath?: string;
  /** Optimistic concurrency version/ETag attribute hint. */
  readonly versionField?: FieldPath<T>;
  /** Key fields auto-generated by the backend (omitted from default `create` input schema). */
  readonly generatedFields?: readonly FieldPath<T>[];
}

export interface ResourceConventionOverrides<T = unknown> {
  readonly defaultPageSize?: number;
  readonly defaultHost?: HostKind;
  readonly excludeFromDefaultLayout?: readonly FieldPath<T>[];
  readonly includeInDefaultSearch?: readonly FieldPath<T>[];
  readonly defaultComponentMappings?: Readonly<Record<string, ComponentKey>>;
}

export interface ResourceEntryPoints<W extends string = string> {
  readonly browse?: W | StandardWorkspaceId;
  readonly record?: W | StandardWorkspaceId;
  readonly input?: W | StandardWorkspaceId;
  readonly lookup?: W | StandardWorkspaceId;
}
```

### 5.4. Minimal Authoring Contract

Given ONLY `key` and `schema`:

```typescript
export const CustomerResource = defineResource({
  key: 'crm.customer',
  schema: CustomerSchema,
});
```

Phase A and Phase B automatically synthesize:
- `primaryKey`: `['id']` if `id` exists in `CustomerSchema`.
- `attributes`: one `CompiledAttribute` per schema property (supports nested paths like `address.city`).
- `actions`: `list`, `get`, `create`, `update`, `delete`, plus navigation actions `new`, `edit`, `open`.
- `sections`: default `fields` and `summary` sections for generated workspaces.
- `workspaces`: `browse` (`grid`), `record` (`record`), `input` (`form`), and `lookup` (`lookup`).
- `defaults`: `{ browse: 'browse', record: 'record', input: 'input', lookup: 'lookup' }`.

---

## 6. Attribute Metamodel

### 6.1. Four Independent Axes

Attribute metadata strictly separates four orthogonal axes:

| Axis | Examples | Owner |
|---|---|---|
| **Storage / Value Type** | `string`, `number`, `integer`, `boolean`, `date`, `instant`, `decimal`, `object`, `array`, `file` | Derived from `RuntimeSchema` (`SchemaNode`) |
| **Semantic Format** | `text`, `rich-text`, `currency`, `percentage`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`, `phone`, `email`, `url`, `color`, `duration` | Derived from schema hints or `AttributeDescriptor.format`; rendered via `Formatters` |
| **Visual Component** | `ComponentRef<'field'>`, `ComponentRef<'cell'>`, `ComponentRef<'filter'>` | Resolved on client via `ComponentResolver` |
| **Behavior & Presentation Hints** | `hidden`, `readOnly`, `required`, `defaultValue`, `compute`, `searchable`, `filterable`, `sortable` | Compiled into `CompiledAttribute`; reactive rules execute locally |

### 6.2. `AttributeDescriptor` and `CompiledAttribute`

```typescript
export type SemanticFormat =
  | 'text'
  | 'rich-text'
  | 'currency'
  | 'percentage'
  | 'cpf'
  | 'cnpj'
  | 'cpf-cnpj'
  | 'cep'
  | 'phone'
  | 'email'
  | 'url'
  | 'color'
  | 'duration'
  | (string & {});

export interface CapabilitySnapshot {
  readonly allowedActions: ReadonlySet<ActionId>;
  readonly deniedReasons: ReadonlyMap<ActionId, MessageRef>;
  readonly readOnlyFields: ReadonlySet<string>;
}

export type RuleExpression =
  | { readonly op: 'equals' | 'notEquals'; readonly path: string; readonly value: SerializableValue }
  | { readonly op: 'in'; readonly path: string; readonly values: readonly SerializableValue[] }
  | { readonly op: 'isPresent'; readonly path: string }
  | { readonly op: 'and' | 'or'; readonly terms: readonly RuleExpression[] }
  | { readonly op: 'not'; readonly term: RuleExpression };

export type CompiledRule<R> =
  | { readonly kind: 'static'; readonly value: R }
  | { readonly kind: 'expression'; readonly expr: RuleExpression }
  | { readonly kind: 'function'; readonly fnRef: FunctionRef };

export interface ReactiveContext<T = unknown> {
  readonly record: Partial<T>;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly actionId?: ActionId;
  readonly capabilities?: CapabilitySnapshot;
  readonly locale: string;
}

export type InlineRuleFn<R, T = unknown> = (ctx: ReactiveContext<T>) => R;
export type ReactiveRule<R, T = unknown> = R | InlineRuleFn<R, T> | RuleExpression;

export interface AttributeDescriptor<T = unknown, V = unknown> {
  readonly label?: MessageRef;
  readonly description?: MessageRef;
  readonly placeholder?: MessageRef;
  readonly format?: SemanticFormat;
  readonly component?: ComponentRef<'field'>;
  readonly cellComponent?: ComponentRef<'cell'>;
  readonly hidden?: ReactiveRule<boolean, T>;
  readonly readOnly?: ReactiveRule<boolean, T>;
  readonly required?: ReactiveRule<boolean, T>;
  readonly defaultValue?: SerializableValue | InlineRuleFn<V, T>;
  /** Pure derived computation; computed fields are excluded from mutation payloads unless explicitly included in an action schema. */
  readonly compute?: InlineRuleFn<V, T>;
  readonly searchable?: boolean;
  readonly filterable?: boolean;
  readonly sortable?: boolean;
  readonly validate?: (value: V, ctx: ReactiveContext<T>) => MessageRef | null | undefined;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export type AttributeOverrideMap<T> = {
  readonly [P in FieldPath<T>]?: AttributeDescriptor<T, unknown>;
};

export interface CompiledAttribute<T = unknown> {
  readonly key: FieldPath<T>;
  readonly label: MessageRef;
  readonly description?: MessageRef;
  readonly placeholder?: MessageRef;
  readonly storageType: ScalarType;
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly enumValues?: readonly SerializableValue[];
  readonly format?: SemanticFormat;
  readonly component?: ComponentRef<'field'>;
  readonly cellComponent?: ComponentRef<'cell'>;
  readonly hidden: CompiledRule<boolean>;
  readonly readOnly: CompiledRule<boolean>;
  readonly required: CompiledRule<boolean>;
  readonly defaultValue?: SerializableValue | FunctionRef;
  readonly compute?: FunctionRef;
  readonly validate?: FunctionRef;
  readonly isComputed: boolean;
  readonly searchable: boolean;
  readonly filterable: boolean;
  readonly sortable: boolean;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}
```

### 6.3. Computed and Reactive Rules

1. Developers write `compute`, `hidden`, `readOnly`, `required`, `defaultValue`, and synchronous `validate` directly inline as TypeScript functions.
2. Phase A replaces inline functions in `CompiledAttribute` with deterministic `FunctionRef` tokens and stores the functions in the resource's `LocalFunctionTable` (Section 22).
3. Reactive rules MUST NOT depend on a `mode` property (`ReactiveContext` has NO `mode` field). Rules may inspect `record`, `input`, `actionId` (when behavior genuinely differs by canonical action), and `capabilities`.
4. Computed attributes (`compute !== undefined`) are automatically marked `isComputed: true` and read-only by convention, and are omitted from auto-generated `create`/`update` input schemas.

---

## 7. Relational Metamodel and `REFERENCES` / `OWNS` Semantics

### 7.1. Four Cardinalities and Separation from Foreign Keys

The metamodel supports all four relational cardinalities:
- `one-to-one`
- `many-to-one`
- `one-to-many`
- `many-to-many`

Scalar foreign-key fields (e.g., `customerId: string`) MUST remain ordinary properties in `ResourceDescriptor.schema`. Navigation relations (e.g., `customer`) are declared separately in `ResourceDescriptor.relations`. Selecting a record in a lookup populates the scalar FK field(s) (`customerId`); it MUST NOT mass-assign the expanded target object into flat mutation payloads unless an action schema explicitly models nested input.

### 7.2. `REFERENCES` vs. `OWNS` Domain Semantics

Every relation carries domain composition semantics (`'references' | 'owns'`):

| Semantic | Meaning | Lifecycle & UI Consequences |
|---|---|---|
| **`references`** | Source points to an independently managed resource (e.g., `SalesOrder REFERENCES Customer`, `InvoiceItem REFERENCES Product`). | Target has independent lifecycle and usually its own `browse`/`record` workspaces. Rendered via lookup field, summary link, or read-only related list. Never implicitly created or deleted with the source unless an explicit backend action accepts it. |
| **`owns`** | Source owns the composition/lifecycle of related child data (e.g., `SalesOrder OWNS SalesOrderItems`, `Customer OWNS Addresses`). | Child items belong to the parent aggregate composition. Rendered via `relatedCollection` in `record` workspaces and/or `editableCollection` inline inside parent action forms when the action input schema includes nested child arrays. |

**No Frontend Delete Cascade:** ORM/DDL cascade properties (`onDelete: 'cascade' | 'restrict' | 'set-null'`) MUST NOT exist in `RelationDescriptor`. Backend APIs enforce referential integrity and cascade/restrict semantics; the frontend presents confirmation prompts and normalizes backend `CONFLICT` errors.

### 7.3. Conservative Inference Strategy (Phase B)

Authors MAY omit `semantics` on `RelationDescriptor`. During Phase B (`buildCatalog()`), the compiler resolves `'references'` vs. `'owns'` deterministically, defaulting conservatively to `'references'` whenever ownership would imply unsafe lifecycle assumptions:

1. If `semantics` is explicitly provided (`'references'` or `'owns'`), use it directly.
2. If cardinality is `many-to-one` or `many-to-many`: infer **`'references'`**.
3. If cardinality is `one-to-many`:
   - Infer **`'owns'`** ONLY if at least one strong ownership signal holds:
     a. Target resource has **no independent `browse` workspace** (`workspaces.browse === false` or keyless/subordinate) AND the FK `targetKey` on the target schema is non-nullable; OR
     b. Target resource's `primaryKey` is a composite key whose leading component(s) match `targetKey` (identifying relationship, e.g., `[orderId, lineNo]`); OR
     c. Source resource's `create` or `update` action input schema explicitly declares a nested array property matching the relation ID (e.g., `items: z.array(...)`).
   - Otherwise (e.g., `Customer.invoices`, where `Invoice` has an independent `browse` workspace and primary key `id`): conservatively infer **`'references'`**.
4. If cardinality is `one-to-one`:
   - Infer **`'owns'`** ONLY if the target shares its primary key with `targetKey` AND has no independent `browse` workspace.
   - Otherwise: conservatively infer **`'references'`**.

Phase B records the inference reason in `CompilationReport` provenance so developers can inspect and override it explicitly if needed.

### 7.4. `RelationDescriptor` and `CompiledRelation`

```typescript
export type RelationCardinality = 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many';
export type RelationSemantics = 'references' | 'owns';
export type RelationHydration = 'deferred' | 'embedded' | 'batch';

export interface RelationDescriptor<T = unknown> {
  readonly target: ResourceRef | KnownResourceKey;
  readonly cardinality: RelationCardinality;
  readonly semantics?: RelationSemantics;
  readonly sourceKey: readonly FieldPath<T>[];
  readonly targetKey: readonly string[];
  readonly inverse?: RelationRef | string;
  readonly nullable?: boolean;
  readonly through?: {
    readonly resource: ResourceRef | KnownResourceKey;
    readonly sourceKey: readonly string[];
    readonly targetKey: readonly string[];
  };
  /** API display hydration expectation: 'deferred' (on-demand), 'embedded' (in parent DTO), 'batch' (batched lookup). */
  readonly hydration?: RelationHydration;
  readonly display?: {
    readonly label?: MessageRef;
    /** Defaults in Phase B from target resource's displayField or conventional title attributes. */
    readonly fields?: readonly string[];
    readonly component?: ComponentRef<'field' | 'cell'>;
  };
  readonly lookup?: {
    readonly workspace?: WorkspaceRef | string;
    readonly filters?: Readonly<Record<string, SerializableValue>>;
    readonly quickCreate?: ActionRef | string;
  };
}

export interface CompiledRelation<T = unknown> {
  readonly id: RelationId;
  readonly target: ResourceKey;
  readonly cardinality: RelationCardinality;
  readonly semantics: RelationSemantics;
  readonly semanticsSource: 'explicit' | 'inferred';
  readonly sourceKey: readonly FieldPath<T>[];
  readonly targetKey: readonly string[];
  readonly inverse?: RelationRef;
  readonly nullable: boolean;
  readonly through?: {
    readonly resource: ResourceKey;
    readonly sourceKey: readonly string[];
    readonly targetKey: readonly string[];
  };
  readonly hydration: RelationHydration;
  readonly display: {
    readonly label: MessageRef;
    readonly fields: readonly string[];
    readonly component?: ComponentRef<'field' | 'cell'>;
  };
  readonly lookup?: {
    readonly workspace: WorkspaceRef;
    readonly filters?: Readonly<Record<string, SerializableValue>>;
    readonly quickCreate?: ActionRef;
  };
}
```

### 7.5. Cross-Resource Relation Invariants (Validated in Phase B)

`buildCatalog()` MUST validate and fail startup deterministically if any invariant fails:
- Target `ResourceKey` exists in the catalog.
- `sourceKey` and `targetKey` tuples have equal length and compatible scalar storage types.
- `targetKey` paths exist on the target `ResourceModel`.
- `many-to-many` relations declare a valid `through.resource` with valid key mappings.
- Declared `inverse` relations exist on the target resource, point back to the source resource, and have compatible cardinalities (`one-to-many` <-> `many-to-one`, `one-to-one` <-> `one-to-one`, `many-to-many` <-> `many-to-many`).
- `lookup.workspace` exists on the target resource and is a `lookup`-compatible workspace.
- `lookup.quickCreate` exists on the target resource and is compatible with creating a target record.
- `display.fields`, when omitted, is resolved automatically in Phase B from the target resource's `displayField`, or else conventional title fields (`name`, `title`, `label`, `code`, `number`), or else the target's `primaryKey`.

---

## 8. Canonical Action Model

### 8.1. One Canonical Capability Abstraction

Every executable capability in a resource—standard CRUD operations, custom backend domain commands, browser-only actions, and workspace navigation—is compiled into one canonical `CompiledAction`.

The framework MUST NOT introduce:
- `DataOperation` (`query | get | insert | patch | remove`) as a parallel vocabulary;
- `ResourcePermissions.create/read/update/delete` or `can('create' | ...)` CRUD-only permission maps;
- `createWorkspace` / `editWorkspace` / `detailWorkspace` CRUD slots;
- `ServerActionHandlerRegistry` or `ResourceRepository` facades.

### 8.2. Action Contracts (`ActionDescriptor` and `CompiledAction`)

```typescript
export type StandardApiActionId = 'list' | 'get' | 'create' | 'update' | 'delete';
export type StandardNavigationActionId = 'new' | 'edit' | 'open';
export type StandardActionId = StandardApiActionId | StandardNavigationActionId;

export type ActionTarget = 'none' | 'collection' | 'record' | 'selection';
export type ActionIntent = 'query' | 'command';

export type ActionPlacement =
  | 'toolbar'
  | 'row'
  | 'selection'
  | 'recordHeader'
  | 'formFooter'
  | 'item';

export interface ActionPresentation {
  readonly icon?: string;
  readonly variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  readonly emphasis?: 'normal' | 'prominent';
  readonly placementDefaults?: readonly ActionPlacement[];
}

export interface ConfirmationDescriptor {
  readonly severity?: 'info' | 'warning' | 'danger';
  readonly title?: MessageRef;
  readonly description?: MessageRef;
  readonly confirmLabel?: MessageRef;
  readonly cancelLabel?: MessageRef;
  /** UI prompt option: collects an operator reason string and passes it in action input/metadata. */
  readonly requireReason?: boolean;
  readonly reasonLabel?: MessageRef;
}

export type ActionEffect =
  | { readonly type: 'toast'; readonly message: MessageRef; readonly tone?: 'success' | 'info' | 'warning' | 'error' }
  | { readonly type: 'invalidate'; readonly resources?: readonly (ResourceKey | KnownResourceKey)[]; readonly records?: readonly { readonly resource: ResourceKey | KnownResourceKey; readonly key: SerializedKey }[]; readonly tags?: readonly string[] }
  | { readonly type: 'refresh'; readonly target?: 'current' | 'workspace' | 'resource' }
  | { readonly type: 'closeHost'; readonly result?: SerializableValue }
  | { readonly type: 'navigate'; readonly workspace: WorkspaceRef; readonly host?: HostKind };

export type RecordMapping =
  | 'current-record'
  | 'empty-record'
  | { readonly kind: 'map'; readonly fields: Readonly<Record<string, string>> };

export interface ClientActionExecutionContext {
  readonly resource: ResourceKey;
  readonly actionId: ActionId;
  readonly locale: string;
  readonly executeAction: <I, O>(ref: ActionRef<string, string, I, O>, input?: I) => Promise<ActionResult<O>>;
  readonly openWorkspace: <R>(invocation: HostInvocation<R>) => Promise<HostResult<R>>;
  readonly notify: (notification: { readonly message: MessageRef; readonly tone: 'success' | 'info' | 'warning' | 'error' }) => void;
}

export type ClientActionFn<I = unknown, O = unknown> = (
  input: I,
  context: ClientActionExecutionContext,
) => Promise<ActionResult<O>> | ActionResult<O>;

export type ActionBehaviorDescriptor<I = unknown, O = unknown> =
  | {
      readonly type: 'api';
      /** Logical operation name sent in ApiRequest (defaults to the action ID). */
      readonly operation?: string;
      /** Distinguishes safe read queries from state-mutating commands without leaking HTTP verbs. */
      readonly intent?: ActionIntent;
      readonly idempotent?: boolean;
      readonly contentType?: 'json' | 'multipart';
      readonly responseType?: 'json' | 'blob';
    }
  | {
      readonly type: 'client';
      /** Inline client execution function (auto-extracted in Phase A) OR explicit registered HandlerId. */
      readonly execute?: ClientActionFn<I, O>;
      readonly handler?: HandlerId;
    }
  | {
      readonly type: 'navigate';
      readonly workspace: WorkspaceRef | string;
      readonly host?: HostKind;
      readonly mapping?: RecordMapping;
      readonly bindAction?: ActionId | string;
    };

export type CompiledActionBehavior =
  | {
      readonly type: 'api';
      readonly operation: string;
      readonly intent: ActionIntent;
      readonly idempotent: boolean;
      readonly contentType: 'json' | 'multipart';
      readonly responseType: 'json' | 'blob';
    }
  | {
      readonly type: 'client';
      readonly fnRef?: FunctionRef;
      readonly handler?: HandlerId;
    }
  | {
      readonly type: 'navigate';
      readonly workspace: WorkspaceRef;
      readonly host?: HostKind;
      readonly mapping?: RecordMapping;
      readonly bindAction?: ActionId;
    };

export interface ActionDescriptor<I = unknown, O = unknown, TRecord = unknown> {
  readonly label?: MessageRef;
  readonly description?: MessageRef;
  readonly input?: RuntimeSchema<I>;
  readonly output?: RuntimeSchema<O>;
  readonly target?: ActionTarget;
  readonly behavior?: ActionBehaviorDescriptor<I, O>;
  readonly presentation?: ActionPresentation;
  readonly confirm?: ConfirmationDescriptor;
  readonly effects?: readonly ActionEffect[];
  readonly concurrency?: { readonly versionField?: string };
  readonly form?: ActionFormOverrides<I>;
  /** Presentation availability hint (backend remains authoritative). */
  readonly enabled?: ReactiveRule<boolean, TRecord>;
  readonly hidden?: ReactiveRule<boolean, TRecord>;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export type ActionOverrideEntry<TRecord = unknown> =
  | false
  | ActionDescriptor<any, any, TRecord>;

export type ActionOverrideMap<TRecord = unknown, _Rel extends string = string> = {
  readonly list?: ActionOverrideEntry<TRecord>;
  readonly get?: ActionOverrideEntry<TRecord>;
  readonly create?: ActionOverrideEntry<TRecord>;
  readonly update?: ActionOverrideEntry<TRecord>;
  readonly delete?: ActionOverrideEntry<TRecord>;
  readonly new?: ActionOverrideEntry<TRecord>;
  readonly edit?: ActionOverrideEntry<TRecord>;
  readonly open?: ActionOverrideEntry<TRecord>;
  readonly [customId: string]: ActionOverrideEntry<TRecord> | undefined;
};

export interface CompiledAction<I = unknown, O = unknown> {
  readonly id: ActionId;
  readonly label: MessageRef;
  readonly description?: MessageRef;
  readonly inputSchemaRef: SchemaRef;
  readonly inputSchemaNode: SchemaNode;
  readonly outputSchemaRef?: SchemaRef;
  readonly outputSchemaNode?: SchemaNode;
  readonly target: ActionTarget;
  readonly behavior: CompiledActionBehavior;
  readonly presentation: ActionPresentation;
  readonly confirm?: ConfirmationDescriptor;
  readonly effects: readonly ActionEffect[];
  readonly concurrency?: { readonly versionField?: string };
  readonly enabled: CompiledRule<boolean>;
  readonly hidden: CompiledRule<boolean>;
  readonly form?: CompiledFormModel<I>;
  readonly source: 'generated' | 'overridden' | 'custom';
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}
```

### 8.3. Standard Actions Generated by Convention

For any resource declaring `key` and `schema`, Phase A synthesizes standard canonical actions unless disabled (`false`):

| Action ID | Target | Behavior (`type: 'api'`) | Synthesized Input Schema | Output Schema | Preconditions |
|---|---|---|---|---|---|
| `list` | `collection` | `operation: 'list'`, `intent: 'query'`, `idempotent: true` | `QuerySpecSchema` | `PagedResultSchema<T>` | None (works for keyless resources) |
| `get` | `record` | `operation: 'get'`, `intent: 'query'`, `idempotent: true` | `KeySchema<T>` | `ResourceSchema<T>` | `primaryKey` present |
| `create` | `none` | `operation: 'create'`, `intent: 'command'`, `idempotent: false` | `ResourceSchema` minus `generatedFields` & computed fields | `ResourceSchema<T>` | None |
| `update` | `record` | `operation: 'update'`, `intent: 'command'`, `idempotent: false` | `KeySchema<T>` + partial editable fields + optional concurrency token | `ResourceSchema<T>` | `primaryKey` present |
| `delete` | `record` | `operation: 'delete'`, `intent: 'command'`, `idempotent: false` | `KeySchema<T>` + optional concurrency token + optional reason | `VoidOrAckSchema` | `primaryKey` present |

When compatible workspaces and API actions exist after overrides, Phase A synthesizes canonical navigation actions unless disabled (`false`):

| Action ID | Target | Behavior (`type: 'navigate'`) | Target Workspace | `bindAction` | Preconditions |
|---|---|---|---|---|---|
| `new` | `none` | `mapping: 'empty-record'` | `defaults.input` (default `'input'`) | `'create'` | `create` enabled AND `input` workspace enabled |
| `edit` | `record` | `mapping: 'current-record'` | `defaults.input` (default `'input'`) | `'update'` | `update` enabled AND `primaryKey` AND `input` workspace enabled |
| `open` | `record` | `mapping: 'current-record'` | `defaults.record` (default `'record'`) | `'get'` | `get` enabled AND `primaryKey` AND `record` workspace enabled |

### 8.4. Explicit Disabling and Deterministic Dependency Rules

Setting any entry in `actions` or `workspaces` to `false` suppresses its generation cleanly. The compiler MUST enforce exact dependency rules distinguishing generated dependents from explicit author declarations:

1. **Graceful Suppression of Conventionally Generated Dependents:**
   - `actions: { list: false }` → suppresses conventional `browse` and `lookup` workspaces (recorded as `info` provenance).
   - `actions: { get: false }` → suppresses conventional `record` workspace and `open` navigation action.
   - `actions: { create: false, update: false }` → suppresses conventional `input` workspace, `new`, and `edit`.
   - `actions: { create: false }` (with `update` enabled) → suppresses `new`; `input` and `edit` remain generated.
   - `actions: { update: false }` (with `create` enabled) → suppresses `edit`; `input` and `new` remain generated.
   - `actions: { delete: false }` → omits `delete` from conventional `browse` row placements and `record` header placements.
   - `workspaces: { record: false }` → suppresses conventional `open` navigation action (while keeping `get` intact for API callers, lookups, or custom workspaces).
   - `workspaces: { input: false }` → suppresses conventional `new` and `edit` navigation actions (while keeping `create`/`update` intact for programmatic or custom API calls).
   - `workspaces: { browse: false }` → suppresses the `browse` workspace without disabling `list` (so `lookup`, `relatedCollection`, and API queries still work).

2. **Fatal Errors on Contradictory Explicit Author Configuration:**
   - If an author explicitly places a disabled or nonexistent action inside a workspace or section (`workspaces: { browse: { kind: 'grid', actions: { row: ['delete'] } } }` while `actions: { delete: false }`), compilation MUST fail with **`ERR_ACTION_DISABLED_OR_MISSING`**.
   - If an author explicitly defines a `browse` (`grid`) or `lookup` workspace while setting `actions: { list: false }` (without providing an explicit `queryAction`), compilation MUST fail with **`ERR_WORKSPACE_REQUIRES_ACTION`**.
   - If an author explicitly defines a `record` workspace while setting `actions: { get: false }` (without providing an explicit `loadAction`), compilation MUST fail with **`ERR_WORKSPACE_REQUIRES_ACTION`**.
   - If an author explicitly defines a `form` workspace bound to a disabled `action`, compilation MUST fail with **`ERR_ACTION_DISABLED_OR_MISSING`**.
   - In Phase B, if Resource A's `lookup` or `quickCreate` references a workspace or action disabled (`false`) on Resource B, `buildCatalog()` MUST fail with **`ERR_CROSS_RESOURCE_TARGET_DISABLED`**.

### 8.5. Action Execution Overview (Independent of Visual Components)

Any component, headless hook, or custom workspace executes actions exclusively via `ActionExecutor.execute(actionRef, invocationInput)`:
1. Resolves `CompiledAction` from the route manifest / `ResourceCatalog`.
2. Evaluates optional `confirm` prompt via `HostController` (collecting `reason` if `confirm.requireReason` is true).
3. Validates `input` locally against the action's `RuntimeSchema<I>` (returning `ActionResult` `VALIDATION_FAILED` immediately if structurally invalid).
4. Branches on `CompiledAction.behavior.type`:
   - `'navigate'`: transforms `mapping` (`current-record`, `empty-record`, or field map) into a `WorkspaceInvocation` (passing `bindAction`) and calls `HostController.openWorkspace()`.
   - `'client'`: resolves the inline function from `ClientResourceChunk.functions` (or `ClientHandlerRegistry`) and executes it locally.
   - `'api'`: constructs `ApiRequest` and dispatches via `ApiClient` (browser `BffTransport` -> Next.js BFF -> server `RestTransport` -> backend API).
5. On `{ ok: true }`, `ActionExecutor` applies declared `ActionEffect[]` (`toast`, `invalidate`, `refresh`, `closeHost`, `navigate`) through client runtime services.
6. Exposes typed `isPending`, `error`, and `data` state without coupling to a specific button or grid implementation.

---

## 9. Workspace Descriptors

### 9.1. Concept and Responsibilities

A **Workspace** is an independently hostable, addressable interaction boundary owning:
- URL/route or overlay host identity (`PageHost`, `DialogHost`, `DrawerHost`);
- workspace-level loading/error lifecycle;
- interaction state (query/pagination/selection, draft form values, active record, or wizard step);
- action placement slots and dirty-state tracking.

### 9.2. Workspace Kinds and Contracts

Six built-in kinds (`grid`, `record`, `form`, `lookup`, `wizard`, `custom`) plus application-registered custom workspace kinds are supported:

```typescript
export type BuiltInWorkspaceKind = 'grid' | 'record' | 'form' | 'lookup' | 'wizard' | 'custom';
export type WorkspaceKind = BuiltInWorkspaceKind | (string & {});

export interface GridColumnDescriptor<T = unknown, R extends string = string> {
  readonly field: ValuePath<T, R>;
  readonly label?: MessageRef;
  readonly width?: number | string;
  readonly align?: 'left' | 'center' | 'right';
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly pinned?: 'left' | 'right';
  readonly component?: ComponentRef<'cell'>;
}

export interface FieldPresentationDescriptor<T = unknown, R extends string = string> {
  readonly field: ValuePath<T, R>;
  readonly label?: MessageRef;
  readonly span?: 1 | 2 | 3 | 4 | 6 | 12;
  readonly component?: ComponentRef<'field'>;
  readonly hidden?: ReactiveRule<boolean, T>;
  readonly readOnly?: ReactiveRule<boolean, T>;
}

export interface SummaryItemDescriptor<T = unknown, R extends string = string> {
  readonly field: ValuePath<T, R>;
  readonly label?: MessageRef;
  readonly component?: ComponentRef<'field' | 'cell'>;
}

export interface WizardStepDescriptor<T = unknown, S extends string = string> {
  readonly id: string;
  readonly title: MessageRef;
  readonly description?: MessageRef;
  readonly section?: S;
  readonly workspace?: WorkspaceRef;
  readonly validateOnNext?: boolean;
  readonly canSkip?: boolean;
  readonly visible?: ReactiveRule<boolean, T>;
}

export interface BaseWorkspaceDescriptor<T = unknown> {
  readonly kind: WorkspaceKind;
  readonly title?: MessageRef;
  readonly subtitle?: MessageRef;
  readonly defaultHost?: HostKind;
  readonly component?: ComponentRef<'workspace'>;
  readonly parameters?: RuntimeSchema<unknown>;
  readonly hidden?: ReactiveRule<boolean, T>;
}

export interface GridWorkspaceDescriptor<T = unknown, R extends string = string, A extends string = string>
  extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'grid';
  readonly queryAction?: A | StandardApiActionId;
  readonly columns?: readonly (ValuePath<T, R> | GridColumnDescriptor<T, R>)[];
  readonly searchable?: readonly ValuePath<T, R>[];
  readonly filterable?: readonly ValuePath<T, R>[];
  readonly sortable?: readonly ValuePath<T, R>[];
  readonly defaultQuery?: QuerySpec<T>;
  readonly pageSize?: number;
  readonly selection?: 'none' | 'single' | 'multiple';
  readonly actions?: Partial<Record<'toolbar' | 'row' | 'selection', readonly (A | StandardActionId)[]>>;
  readonly primaryAction?: A | StandardActionId;
}

export interface RecordWorkspaceDescriptor<T = unknown, A extends string = string, S extends string = string>
  extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'record';
  readonly loadAction?: A | StandardApiActionId;
  readonly sections: readonly S[];
  readonly headerSection?: S;
  readonly actions?: Partial<Record<'recordHeader' | 'item', readonly (A | StandardActionId)[]>>;
}

export interface FormWorkspaceDescriptor<T = unknown, R extends string = string, A extends string = string, S extends string = string>
  extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'form';
  /** Default action when workspace is opened without an explicit invocation action. */
  readonly action?: A | StandardApiActionId;
  readonly allowActionOverride?: boolean;
  readonly sections?: readonly S[];
  /** Shorthand normalized into an implicit 'fields' section during Phase A compilation. */
  readonly fields?: readonly (ValuePath<T, R> | FieldPresentationDescriptor<T, R>)[];
  readonly columns?: 1 | 2 | 3 | 4;
  readonly actions?: Partial<Record<'formFooter', readonly (A | StandardActionId)[]>>;
  readonly warnOnUnsavedChanges?: boolean;
}

export interface LookupWorkspaceDescriptor<T = unknown, R extends string = string, A extends string = string>
  extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'lookup';
  readonly queryAction?: A | StandardApiActionId;
  readonly searchFields?: readonly ValuePath<T, R>[];
  readonly columns?: readonly (ValuePath<T, R> | GridColumnDescriptor<T, R>)[];
  readonly labelField: ValuePath<T, R>;
  readonly secondaryField?: ValuePath<T, R>;
  readonly selection?: 'single' | 'multiple';
  readonly defaultQuery?: QuerySpec<T>;
  readonly quickCreateAction?: ActionRef | A | StandardActionId;
}

export interface WizardWorkspaceDescriptor<T = unknown, A extends string = string, S extends string = string>
  extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'wizard';
  readonly steps: readonly WizardStepDescriptor<T, S>[];
  readonly linear?: boolean;
  readonly finish: A | StandardActionId;
  readonly cancel?: A | StandardActionId;
}

export interface CustomWorkspaceDescriptor<T = unknown> extends BaseWorkspaceDescriptor<T> {
  readonly kind: 'custom';
  readonly customType?: string;
  readonly component: ComponentRef<'workspace'>;
  readonly props?: SerializableValue;
}

export type WorkspaceDescriptor<T = unknown, R extends string = string, A extends string = string, S extends string = string> =
  | GridWorkspaceDescriptor<T, R, A>
  | RecordWorkspaceDescriptor<T, A, S>
  | FormWorkspaceDescriptor<T, R, A, S>
  | LookupWorkspaceDescriptor<T, R, A>
  | WizardWorkspaceDescriptor<T, A, S>
  | CustomWorkspaceDescriptor<T>;

export type WorkspaceOverrideMap<T = unknown, R extends string = string, A extends string = string, S extends string = string> = {
  readonly browse?: false | GridWorkspaceDescriptor<T, R, A>;
  readonly record?: false | RecordWorkspaceDescriptor<T, A, S>;
  readonly input?: false | FormWorkspaceDescriptor<T, R, A, S>;
  readonly lookup?: false | LookupWorkspaceDescriptor<T, R, A>;
  readonly [customId: string]: false | WorkspaceDescriptor<T, R, A, S> | undefined;
};
```

### 9.3. Automatic Entry Point Inference

Authors do NOT need to repeat `defaults: { browse: 'browse', record: 'record', input: 'input', lookup: 'lookup' }`. Whenever workspaces with standard IDs (`browse`, `record`, `input`, `lookup`) exist after compilation, `defaults` points to them automatically unless explicitly overridden.

---

## 10. Section Descriptors

### 10.1. Non-Hostable Composable Units

A **Section** is a composable content, layout, or embedded data-view unit rendered inside a workspace or another section. Sections MUST NOT be opened via `HostController.openWorkspace()` and MUST NOT register on the host overlay stack.

A section MAY maintain scoped internal UI/query state where its contract requires it—specifically `relatedCollection` owns scoped pagination, sorting, and row selection bound to the parent `relationContext`, and `editableCollection` edits nested child items inside a parent form's state—without becoming independently hostable.

### 10.2. Section Kinds and Contracts

```typescript
export type SectionKind =
  | 'fields'
  | 'summary'
  | 'relatedCollection'
  | 'editableCollection'
  | 'tabs'
  | 'accordion'
  | 'custom';

export interface BaseSectionDescriptor<T = unknown> {
  readonly kind: SectionKind;
  readonly title?: MessageRef;
  readonly description?: MessageRef;
  readonly component?: ComponentRef<'section'>;
  readonly visible?: ReactiveRule<boolean, T>;
}

export interface FieldsSectionDescriptor<T = unknown, R extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'fields';
  readonly fields: readonly (ValuePath<T, R> | FieldPresentationDescriptor<T, R>)[];
  readonly columns?: 1 | 2 | 3 | 4;
}

export interface SummarySectionDescriptor<T = unknown, R extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'summary';
  readonly items: readonly (ValuePath<T, R> | SummaryItemDescriptor<T, R>)[];
}

export interface RelatedCollectionSectionDescriptor<T = unknown, R extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'relatedCollection';
  readonly relation: R;
  readonly columns?: readonly (string | GridColumnDescriptor<unknown>)[];
  readonly defaultFilters?: Readonly<Record<string, SerializableValue>>;
  readonly actions?: Partial<Record<'toolbar' | 'row' | 'selection', readonly (ActionRef | string)[]>>;
  readonly pageSize?: number;
}

export interface EditableCollectionSectionDescriptor<T = unknown, R extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'editableCollection';
  /** Must reference an OWNS relation or an array field in the bound action input schema. */
  readonly relation?: R;
  readonly field?: FieldPath<T>;
  readonly columns: readonly (string | FieldPresentationDescriptor<unknown>)[];
  readonly allowAdd?: boolean;
  readonly allowRemove?: boolean;
  readonly allowReorder?: boolean;
}

export interface TabsSectionDescriptor<T = unknown, S extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'tabs';
  readonly tabs: readonly {
    readonly id: string;
    readonly label: MessageRef;
    readonly section: S;
    readonly visible?: ReactiveRule<boolean, T>;
    readonly badge?: ReactiveRule<string | number | undefined, T>;
  }[];
  readonly orientation?: 'horizontal' | 'vertical';
}

export interface AccordionSectionDescriptor<T = unknown, S extends string = string>
  extends BaseSectionDescriptor<T> {
  readonly kind: 'accordion';
  readonly allowMultiple?: boolean;
  readonly panels: readonly {
    readonly id: string;
    readonly title: MessageRef;
    readonly section: S;
    readonly defaultExpanded?: boolean;
    readonly visible?: ReactiveRule<boolean, T>;
  }[];
}

export interface CustomSectionDescriptor<T = unknown> extends BaseSectionDescriptor<T> {
  readonly kind: 'custom';
  readonly customType?: string;
  readonly component: ComponentRef<'section'>;
  readonly props?: SerializableValue;
}

export type SectionDescriptor<T = unknown, R extends string = string, S extends string = string> =
  | FieldsSectionDescriptor<T, R>
  | SummarySectionDescriptor<T, R>
  | RelatedCollectionSectionDescriptor<T, R>
  | EditableCollectionSectionDescriptor<T, R>
  | TabsSectionDescriptor<T, S>
  | AccordionSectionDescriptor<T, S>
  | CustomSectionDescriptor<T>;

export type SectionDescriptorMap<T = unknown, R extends string = string, _A extends string = string> = {
  readonly [sectionId: string]: SectionDescriptor<T, R, string>;
};
```

### 10.3. Section Invariants

1. Section composition cycles (`tabs` -> `tabs` -> self) MUST fail Phase A compilation with **`ERR_SECTION_CYCLE`**.
2. `relatedCollection` MUST reference a collection-valued relation (`one-to-many` or `many-to-many`). Referencing a single-valued relation fails compilation (`ERR_INVALID_RELATION_CARDINALITY`).
3. `editableCollection` MUST bind either to a nested array field in the active form's action schema or to an `owns` collection relation backed by a nested array in the action schema.
4. `FormWorkspaceDescriptor.fields` shorthand is compiled in Phase A into an implicit `FieldsSectionDescriptor` (`__form_fields_<workspaceId>`), so runtime renderers consume a uniform `sections: readonly SectionId[]` array.

---

## 11. Form Schema and Composition Model

### 11.1. Forms Are Action-Bound, Never Mode-Bound

A form collects and validates input for a **canonical action**, not a CRUD mode. Because an action's input contract frequently differs from the persisted record shape—for example:
- `create` omits generated IDs and server timestamps;
- `update` allows a subset of editable fields plus primary key and concurrency version;
- a domain command such as `issue` or `transferStock` requires transient operational fields (`reason`, `issueDate`, `destinationWarehouseId`) not present on the base resource record—

every form operates over a **`CompiledFormModel<I>`** derived from the bound `ActionDefinition` and enriched by `ResourceModel` metadata.

### 11.2. `FormDescriptor` / `ActionFormOverrides`

Actions MAY declare an explicit `form` block (or rely on conventional synthesis from `ActionDescriptor.input` + `ResourceModel`):

```typescript
export interface ActionFormOverrides<I = unknown> {
  /** Override input schema for UI collection if narrower than raw action input (must remain assignable to action input). */
  readonly schema?: RuntimeSchema<I>;
  /** Presentation, label, component, or reactive overrides keyed by paths in action input `I`. */
  readonly attributes?: AttributeOverrideMap<I>;
  /** Action-local relation descriptors for transient foreign-key inputs (e.g., destinationWarehouseId). */
  readonly relations?: Record<string, RelationDescriptor<I>>;
  /** Explicit sections for this action's form; overrides workspace default sections when bound. */
  readonly sections?: Record<string, SectionDescriptor<I, string, string>>;
  readonly layout?: readonly string[];
  readonly columns?: 1 | 2 | 3 | 4;
}

export interface CompiledFormModel<I = unknown> {
  readonly actionId: ActionId;
  readonly schemaRef: SchemaRef;
  readonly schemaNode: SchemaNode;
  readonly attributes: ReadonlyLookup<string, CompiledAttribute<I>>;
  readonly relations: ReadonlyLookup<RelationId, CompiledRelation<I>>;
  readonly sections: ReadonlyLookup<SectionId, CompiledSection<I>>;
  readonly sectionOrder: readonly SectionId[];
}
```

### 11.3. Form Field Resolution Precedence

When Phase A/B compiles a `CompiledFormModel<I>` for an action `A` (and optional `FormWorkspaceDescriptor` `W`):

1. **Authoritative Input Shape (`Action.input`):** Field existence, storage types, base optionality/nullability, defaults, and structural validation rules come strictly from the action's input `RuntimeSchema<I>`. Fields in `ResourceModel.attributes` that do NOT exist in `I` (such as generated IDs in `create`, or non-editable fields in `update`) are excluded automatically unless explicitly rendered as read-only context.
2. **Domain Attribute & Relation Inheritance (`ResourceModel`):** For every field path in `I` that matches a field in `ResourceModel.attributes` (or a foreign key of a `ResourceModel.relations` entry), the form inherits labels, semantic formats, component refs, reactive rules (`hidden`, `readOnly`, `required`, `compute`), and relation lookup metadata.
3. **Action-Specific Form Refinements (`Action.form`):** `action.form.attributes`, `action.form.relations`, and `action.form.sections` refine inherited metadata and supply descriptors for action-specific fields not present on the base resource.
4. **Workspace Layout (`FormWorkspaceDescriptor`):** If `action.form.sections` is omitted, the form renders the target `FormWorkspaceDescriptor`'s sections filtered to fields present in `I` (or auto-synthesizes a `fields` section + `editableCollection` sections for nested `owns` arrays if the workspace uses conventions).
5. **Runtime Capability Hints (`CapabilitySnapshot`):** Server-supplied `readOnlyFields` hints make matching fields read-only in the UI without altering the schema contract.

---

## 12. Compilation Architecture and Pipeline

### 12.1. Three Distinct Layers

1. **Developer Intent:** Concise `ResourceDescriptor` declarations authored in `@application/resources`.
2. **Conventions:** Centralized, layered rules (framework base -> design-system defaults -> application overrides -> resource overrides) that materialize standard actions, attributes, lookups, workspaces, and layouts.
3. **Compiled Implementation Model (`ResourceModel` & Environment Artifacts):** Normalized, use-case-optimized metadata consumed directly by server BFF, SSR, and browser runtimes without re-running convention logic at render time.

### 12.2. Phase A — Strictly Local Resource Compilation (`defineResource`)

`defineResource(descriptor)` runs pure Phase A compilation on **one resource and its local dependencies** (its `RuntimeSchema`, action schemas, and inline functions). It performs zero I/O, mutates zero global registries, and never accesses other resources or application-wide config.

Phase A steps:
1. **Normalize Identity:** Validate `ResourceKey` format, synthesize default `labels` from key if omitted, and resolve `primaryKey` (`'id'` convention unless explicitly configured or `false`).
2. **Inspect Schema & Derive Attributes:** Run `descriptor.schema.inspect()` to build `SchemaNode`, derive base `CompiledAttribute` entries for all scalar and nested properties, and detect `displayField` candidate if omitted.
3. **Merge Attribute Overrides & Extract Inline Functions:** Merge `descriptor.attributes` property-by-property; extract inline `compute`, `hidden`, `readOnly`, `required`, `defaultValue`, and `validate` functions into `LocalFunctionTable` keyed by deterministic `FunctionId` (`<key>::attr.<path>.<slot>`), replacing function values with `FunctionRef` metadata.
4. **Normalize Local Relations:** Validate `sourceKey` paths against local schema; record `cardinality`, explicit `semantics` (or `'pending-inference'`), `hydration` (default `'deferred'`), and target reference tokens (`target`, `targetKey`, `inverse`, `lookup`) for Phase B resolution.
5. **Synthesize & Merge API Actions:** Generate `list`, `get`, `create`, `update`, `delete` input/output `RuntimeSchema`s and `ActionDescriptor`s (respecting `primaryKey === false` and explicit `false` suppressions); apply overrides and custom actions; extract inline `client` action functions and `enabled`/`hidden` rules into `LocalFunctionTable`.
6. **Normalize & Synthesize Workspaces and Sections:** Inject map keys as `id`; normalize `FormWorkspaceDescriptor.fields` shorthands into implicit `fields` sections; synthesize candidate conventional workspaces (`browse`, `record`, `input`, `lookup`) and default `fields`/`summary` sections tagged with provenance `'local-convention'` where not suppressed (`false`) or explicitly overridden.
7. **Synthesize Navigation Actions (`new`, `edit`, `open`):** Evaluate effective workspace + API action availability and synthesize navigation actions (merging partial overrides like `{ label: ... }`).
8. **Build Local Form Models:** For every `create`, `update`, and custom `api` action, compile its `CompiledFormModel` from `Action.input` + `CompiledAttribute`s + `Action.form`.
9. **Local Dependency Graph & Cycle Detection:** Topologically sort `compute` attributes and local `section` compositions; fail immediately on cycles (`ERR_DEPENDENCY_CYCLE`, `ERR_SECTION_CYCLE`).
10. **Local Reference Validation:** Verify all local action placements, section IDs, workspace action bindings, and form field paths exist and are enabled (`ERR_ACTION_DISABLED_OR_MISSING`, `ERR_WORKSPACE_REQUIRES_ACTION`).
11. **Emit `LocalResourceModel`:** Return an immutable `LocalResourceModel` handle carrying typed accessors (`.key`, `.ref`, `.actions`, `.workspaces`, `.sections`, `.relations`) alongside `LocalFunctionTable`, `LocalSchemaTable`, and `LocalCompilationReport`.

### 12.3. Phase B — Cross-Model & Application Compilation (`buildCatalog`)

`buildCatalog({ resources, conventions, designSystem, components })` executes once at build/bootstrap time using all `LocalResourceModel`s and application configuration:

1. **Duplicate Key Rejection:** Reject duplicate `ResourceKey` entries immediately with source diagnostic (`ERR_DUPLICATE_RESOURCE`).
2. **Apply 6-Tier Convention Precedence:** Re-evaluate `'local-convention'` properties against:
   1. Framework base conventions
   2. Design-system defaults (`designSystem`: default host kinds, page sizes, semantic-format -> `ComponentKey` mappings)
   3. Application-level `conventions` (`defaultPageSize`, `excludeFromDefaultLayout`, etc.)
   4. Resource-level `conventions`
   5. Explicit descriptor overrides (already marked `'explicit'` in Phase A—never overwritten by tiers 1–4)
   6. Runtime invocation overrides (validated at execution time)
3. **Resolve Cross-Resource Relations:**
   - Validate all relation `target` and `through.resource` keys exist in the catalog.
   - Validate `targetKey` paths and scalar type compatibility against target `ResourceModel.attributes`.
   - Validate bidirectional `inverse` symmetry and cardinality compatibility.
   - Apply the conservative `REFERENCES` vs. `OWNS` inference rule (Section 7.3) for relations without explicit `semantics`.
   - Infer `display.fields` from target `ResourceModel.displayField` or conventional title attributes when omitted.
   - Validate `lookup.workspace` and `lookup.quickCreate` exist and are enabled on the target resource.
4. **Resolve Cross-Resource Section, Action & Form References:**
   - Validate `relatedCollection` target columns and actions against the target `ResourceModel`.
   - Validate cross-resource `navigate` action `WorkspaceRef` targets.
   - Enrich `CompiledFormModel` relations and lookup metadata from resolved target resources.
5. **Validate Component References & Mappings:**
   - Resolve convention-selected `ComponentKey`s from `designSystem` mappings.
   - If a build/startup `ComponentManifest` is provided, verify every explicit `ComponentRef` exists, matches its expected `ComponentRole`, and satisfies attribute/relation capabilities.
6. **Materialize Final `ResourceModel`s & Split Artifacts:**
   - Produce the single authoritative immutable `ResourceModel` per resource.
   - Generate `ServerResourceArtifacts` (server `ResourceModel` index, `RuntimeSchema`s, `ServerFunctionTable`).
   - Generate `ClientManifestBundle` (`AppClientManifest` + per-resource JSON-serializable `ClientResourceManifest`s).
   - Emit `CompilationReport` (provenance + structured errors/warnings). Fail startup if any `'error'` diagnostic exists.

### 12.4. Deterministic Merge Semantics

Vague JavaScript object spread is prohibited. Merge rules are explicit:
- Keyed maps (`attributes`, `relations`, `actions`, `sections`, `workspaces`) merge by key.
- `AttributeDescriptor` merges property-by-property onto inferred schema metadata.
- `ActionDescriptor` overrides merge label/description/presentation/confirm/effects/form property-by-property; when `behavior` is supplied with a different discriminant `type`, `behavior` replaces the default behavior object wholesale.
- Explicitly supplied `SectionDescriptor` or `WorkspaceDescriptor` replaces the generated convention descriptor for that key.
- Arrays (`columns`, `fields`, `effects`, `actions.row`) **replace** defaults rather than concatenating implicitly.
- `undefined` means "inherit default"; `false` on suppressible entries means "disable convention".

---

## 13. Final `ResourceModel` Contract

### 13.1. Public Interface

The developer and framework runtime interact with one authoritative conceptual `ResourceModel<T>`:

```typescript
export interface CompiledResourceApiHints<T = unknown> {
  readonly resourcePath: string;
  readonly versionField?: FieldPath<T>;
  readonly generatedFields: readonly FieldPath<T>[];
}

export type CompiledSection<T = unknown> = SectionDescriptor<T, string, string> & {
  readonly id: SectionId;
  readonly source: 'generated' | 'overridden' | 'custom';
};

export type CompiledWorkspace<T = unknown> = WorkspaceDescriptor<T, string, string, string> & {
  readonly id: WorkspaceId;
  readonly source: 'generated' | 'overridden' | 'custom';
};

export interface LocalResourceModel<T = unknown> {
  readonly key: ResourceKey;
  readonly schema: RuntimeSchema<T>;
  readonly localFunctions: ReadonlyMap<FunctionId, Function>;
  readonly localSchemas: ReadonlyMap<string, RuntimeSchema<unknown>>;
  readonly localDiagnostics: readonly ModelDiagnostic[];
  readonly ref: TypedResourceHandle<KnownResourceKey>;
}

export function defineResource<
  K extends string,
  S extends RuntimeSchema<any>,
  R extends Record<string, RelationDescriptor<InferSchema<S>>> = Record<string, RelationDescriptor<InferSchema<S>>>,
  A extends ActionOverrideMap<InferSchema<S>, Extract<keyof R, string>> = ActionOverrideMap<InferSchema<S>, Extract<keyof R, string>>,
  Sec extends SectionDescriptorMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>> = SectionDescriptorMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>>,
  W extends WorkspaceOverrideMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>, Extract<keyof Sec, string>> = WorkspaceOverrideMap<InferSchema<S>, Extract<keyof R, string>, Extract<keyof A, string>, Extract<keyof Sec, string>>,
>(descriptor: ResourceDescriptor<K, S, R, A, Sec, W>): LocalResourceModel<InferSchema<S>>;

export function buildCatalog(options: {
  readonly resources: readonly LocalResourceModel<any>[];
  readonly conventions?: ResourceConventionOverrides<unknown>;
  readonly designSystem?: DesignSystemComponentMappings;
}): ResourceCatalog;

export interface ResourceModel<T = unknown> {
  readonly key: ResourceKey;
  readonly labels: Readonly<ResourceLabels>;
  readonly schemaNode: SchemaNode;
  readonly primaryKey?: KeyDescriptor<T>;
  readonly displayField?: FieldPath<T>;
  readonly api: Readonly<CompiledResourceApiHints<T>>;
  readonly attributes: ReadonlyLookup<AttributeKey, CompiledAttribute<T>>;
  readonly relations: ReadonlyLookup<RelationId, CompiledRelation<T>>;
  readonly actions: ReadonlyLookup<ActionId, CompiledAction>;
  readonly sections: ReadonlyLookup<SectionId, CompiledSection<T>>;
  readonly workspaces: ReadonlyLookup<WorkspaceId, CompiledWorkspace<T>>;
  readonly defaults: Readonly<ResourceEntryPoints>;

  extractKey(record: Partial<T>): KeyObject<T>;
  serializeKey(key: KeyObject<T>): SerializedKey;
  parseKey(serialized: SerializedKey): KeyObject<T>;
}
```

### 13.2. Immutability & Separation of Environments

- **Public Immutability:** All lookup tables (`ReadonlyLookup`), arrays, and metadata objects exposed on `ResourceModel` are immutable from the caller's perspective (frozen in `development`/`test` builds via plain-object freezing; never calling `Object.freeze` on Zod `RuntimeSchema` internals!).
- **Internal Lazy State:** Framework internals (such as `ClientResourceLoader` caching dynamically imported `ClientResourceChunk`s or memoized formatters) may maintain private internal state without mutating public `ResourceModel` contracts.
- **No CRUD Convenience Methods:** `ResourceModel` MUST NOT expose `.create()`, `.update()`, `.delete()`, or `.canCreate()`. All execution routes through `ActionExecutor` / `ApiClient`.
- **No Compilation Provenance Bloat in Client Manifests:** `CompilationReport` provenance lives on `ResourceCatalog.report` / `inspectResource()`, NOT inside browser `ClientResourceManifest` payloads.

---

## 14. Typed Resource References and Circular Dependencies

### 14.1. Requirements

Enterprise resources routinely have mutual bidirectional relationships (e.g., `crm.customer` <-> `sales.invoice`, `wms.warehouse` <-> `wms.location`). The reference system MUST guarantee:
1. **No raw unvalidated strings** as the standard developer authoring experience—typos in resource keys, target fields, target workspaces, target actions, or inverse relations fail TypeScript compilation (`tsc`) whenever statically known.
2. **Zero runtime cross-imports between `*.resource.ts` files:** `customer.resource.ts` MUST NOT import `InvoiceResource` at runtime, preventing ESM Temporal Dead Zone (`ReferenceError`) crashes and preventing route client bundles from pulling the entire application resource graph.
3. **Zero `TS7022` circular type-inference errors:** Mutual references between `CustomerResource` and `InvoiceResource` must typecheck cleanly without requiring developers to hand-write giant type annotations.

### 14.2. Authoring Mechanism: `RegisteredResourceMap` + Typed `resourceRef()`

The framework defines an augmentable interface `RegisteredResourceMap` in `@framework/metamodel`:

```typescript
// Framework base declaration in @framework/metamodel
export interface RegisteredResourceMap {
  // Augmented per application in `.magesti/resources.d.ts` (auto-generated by CLI/plugin)
  // or manually in library tests.
}

export type KnownResourceKey = keyof RegisteredResourceMap extends never
  ? string
  : keyof RegisteredResourceMap & string;
```

An automated lightweight typegen step (`magesti typegen`, run in dev watch / pre-typecheck) scans `*.resource.ts` descriptors and emits `.magesti/resources.d.ts` containing **flattened literal unions and schema record types** (NOT `typeof XResource`, completely eliminating circular `TS7022` inference!):

```typescript
// Auto-generated .magesti/resources.d.ts (never edited manually)
declare module '@framework/metamodel' {
  interface RegisteredResourceMap {
    'crm.customer': {
      readonly record: import('../src/resources/crm/customer.schema').Customer;
      readonly actions: 'list' | 'get' | 'create' | 'update' | 'delete' | 'new' | 'edit' | 'open';
      readonly workspaces: 'browse' | 'record' | 'input' | 'lookup';
      readonly sections: 'summary' | 'invoices';
      readonly relations: 'invoices';
    };
    'sales.invoice': {
      readonly record: import('../src/resources/sales/invoice.schema').Invoice;
      readonly actions: 'list' | 'get' | 'create' | 'update' | 'delete' | 'new' | 'edit' | 'open' | 'issue';
      readonly workspaces: 'browse' | 'record' | 'input' | 'lookup';
      readonly sections: 'summary' | 'items' | 'details';
      readonly relations: 'customer' | 'items';
    };
  }
}
```

### 14.3. Typed Reference Helpers

`resourceRef(key)` creates a tiny (~40-byte) runtime token `{ kind: 'ResourceRef', key }` with full TypeScript autocomplete across all members of the target resource:

```typescript
export interface TypedResourceHandle<K extends KnownResourceKey> {
  readonly kind: 'ResourceRef';
  readonly key: K;
  field<P extends FieldPath<RecordOf<K>>>(path: P): P;
  action<A extends ActionsOf<K>>(id: A): ActionRef<K, A>;
  workspace<W extends WorkspacesOf<K>>(id: W): WorkspaceRef<K, W>;
  section<S extends SectionsOf<K>>(id: S): SectionRef<K, S>;
  relation<Rel extends RelationsOf<K>>(id: Rel): RelationRef<K, Rel>;
}

export function resourceRef<K extends KnownResourceKey>(key: K): TypedResourceHandle<K>;
```

Additionally, for acyclic module references or packages without typegen, `resourceRefFrom<typeof CustomerResource>('crm.customer')` using `import type { CustomerResource }` provides identical compile-time safety with zero runtime import.

### 14.4. Deterministic Startup Guarantee

When resources are assembled dynamically or before `typegen` runs, Phase B `buildCatalog()` deterministically validates EVERY `ResourceRef`, `ActionRef`, `WorkspaceRef`, `SectionRef`, `RelationRef`, and `FieldPath` at application startup, failing fast with structured diagnostics if any reference is unresolved.

---

## 15. Resource Catalog and Registry Specifications

### 15.1. Minimal Registry Architecture (No Generic `.layer()` / `.extend()`)

The framework avoids registry proliferation and does **NOT** expose a generic `.layer()`, `.extend()`, or plugin-layer composition API. All registries share a simple, explicit immutable lookup pattern:

```typescript
export interface ReadonlyLookup<K extends string, V> {
  has(key: K): boolean;
  get(key: K): V | undefined;
  require(key: K): V;
  keys(): readonly K[];
  values(): readonly V[];
  entries(): readonly (readonly [K, V])[];
}

export interface RegistryOptions {
  readonly duplicatePolicy?: 'error' | 'replace';
}
```

### 15.2. Framework Registries and Owners

| Artifact / Registry | Environment | Owner | Populated From |
|---|---|---|---|
| `ResourceCatalog` | Server / Build (`@application/web/server`) | `buildCatalog()` | All `defineResource()` descriptors (automatic from imports; no double manual registration) |
| `ComponentRegistry` | Client-only (`'use client'`) | `createComponentRegistry()` | Design-system components, app custom components, custom workspace/section renderers |
| `CustomWorkspaceRegistry` | Client-only (`'use client'`) | `createCustomWorkspaceRegistry()` | Optional headless state controllers + renderers for custom workspace kinds |
| `ClientHandlerRegistry` | Client-only (`'use client'`) | `createClientHandlerRegistry()` | Optional shared/reusable named client handlers (inline `execute` needs no registration) |
| `ServerBffHandlerRegistry` | Server-only (`'server-only'`) | `createServerBffHandlerRegistry()` | Optional custom BFF orchestration handlers when REST config alone is insufficient |

### 15.3. `ResourceCatalog` Contract

```typescript
export interface ResourceCatalog {
  readonly resources: ReadonlyLookup<ResourceKey, ResourceModel<unknown>>;
  readonly report: CompilationReport;

  has(key: ResourceKey | string): boolean;
  get(key: ResourceKey | string): ResourceModel<unknown> | undefined;
  require(key: ResourceKey | string): ResourceModel<unknown>;

  resolveAction(ref: ActionRef): { readonly resource: ResourceModel<unknown>; readonly action: CompiledAction };
  resolveWorkspace(ref: WorkspaceRef): { readonly resource: ResourceModel<unknown>; readonly workspace: CompiledWorkspace };
  resolveSection(ref: SectionRef): { readonly resource: ResourceModel<unknown>; readonly section: CompiledSection };
  resolveRelation(ref: RelationRef): {
    readonly source: ResourceModel<unknown>;
    readonly relation: CompiledRelation;
    readonly target: ResourceModel<unknown>;
  };

  buildAppManifest(): AppClientManifest;
  buildRouteManifest(resourceKeys: readonly ResourceKey[]): RouteClientManifest;
}
```

### 15.4. Formatters and Codecs (Static Pure Functions)

Standard formatters (`currency`, `percentage`, `date`, `instant`, `time`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`, `phone`, `email`, `url`, `duration`) live in a static isomorphic `Formatters` module in `@framework/runtime-client` / `@framework/metamodel`. Applications supply extra formatters via a plain map passed to `FrameworkProvider({ formatters })`—no separate `CodecRegistry` or `FormatterRegistry` class is required.

### 15.5. Startup Validation Lifecycle

1. **Server/Build Startup:** `buildCatalog()` compiles Phase B, validates all cross-resource references, and throws `CatalogValidationError` if any `'error'` diagnostic exists.
2. **Client Startup:** `validateClientRuntime({ manifest, components, customWorkspaces, clientHandlers })` verifies all `ComponentRef`s, custom workspace controllers, and explicit `HandlerId`s referenced by active manifests exist with compatible roles—logging structured warnings for convention fallbacks and failing fast on explicit mismatches.

---

## 16. Component Resolution

### 16.1. Component Roles and Definitions

Every UI renderer registered in `ComponentRegistry` MUST declare an explicit `ComponentRole` and typed capabilities:

```typescript
export type ComponentRole =
  | 'workspace'
  | 'section'
  | 'field'
  | 'cell'
  | 'filter'
  | 'action'
  | 'empty-state';

export interface ComponentCapability {
  readonly storageTypes?: readonly ScalarType[];
  readonly formats?: readonly SemanticFormat[];
  readonly relationCardinalities?: readonly RelationCardinality[];
  readonly selectionModes?: readonly ('none' | 'single' | 'multiple')[];
}

export interface ComponentDefinition<P = unknown> {
  readonly key: ComponentKey;
  readonly role: ComponentRole;
  readonly component: React.ComponentType<P>;
  readonly propsSchema?: RuntimeSchema<P>;
  readonly capabilities?: ComponentCapability;
  readonly defaults?: Partial<P>;
}
```

`ComponentRegistry` MUST remain strictly client-only (`'use client'`). `ClientResourceManifest`s store only `ComponentKey` + serializable props, never React component instances.

### 16.2. `ComponentResolver` Precedence Policy

Precedence is owned by `ComponentResolver` (not by generic registry `.layer()` methods):

```typescript
export interface ComponentRegistry extends ReadonlyLookup<string, ComponentDefinition<any>> {
  has(key: ComponentKey | string, role?: ComponentRole): boolean;
  get(key: ComponentKey | string, role?: ComponentRole): ComponentDefinition<any> | undefined;
  require(key: ComponentKey | string, role?: ComponentRole): ComponentDefinition<any>;
  keys(role?: ComponentRole): readonly ComponentKey[];
}

export interface DesignSystemComponentMappings {
  readonly byRoleDefault: Readonly<Record<ComponentRole, ComponentKey>>;
  readonly bySemanticFormat?: Readonly<Partial<Record<SemanticFormat, ComponentKey>>>;
  readonly byScalarType?: Readonly<Partial<Record<ScalarType, ComponentKey>>>;
  readonly byRelationCardinality?: Readonly<Partial<Record<RelationCardinality, ComponentKey>>>;
}

export interface ApplicationComponentOverrides {
  readonly byResourcePath?: Readonly<Record<string, ComponentKey>>;
  readonly bySemanticFormat?: Readonly<Partial<Record<SemanticFormat, ComponentKey>>>;
}

export interface ComponentResolutionConfig {
  readonly registry: ComponentRegistry;
  readonly designSystemMappings: DesignSystemComponentMappings;
  readonly applicationOverrides?: ApplicationComponentOverrides;
}
```

For any UI slot `(role, resourceKey, fieldOrWorkspace, storageType, semanticFormat, explicitRef)`:
1. **Explicit Descriptor `ComponentRef`:** If `explicitRef` is set on the attribute/workspace/section/action, look up `(explicitRef.key, role)`.
   - Missing key → **Fatal configuration error (`ERR_COMPONENT_NOT_FOUND`)**.
   - Role mismatch → **Fatal configuration error (`ERR_COMPONENT_ROLE_MISMATCH`)**.
   - Capability mismatch → **Fatal configuration error (`ERR_COMPONENT_CAPABILITY_MISMATCH`)**.
2. **Application Overrides:** Look up matching key in `applicationOverrides` (by `resourceKey + path` or `semanticFormat + role`).
3. **Design-System Semantic Mappings:** Look up `(role, semanticFormat)` -> `(role, relationCardinality)` -> `(role, storageType)` in `designSystemMappings`.
4. **Generic Role Fallback:** Select the design system's default generic renderer for `role` (e.g. plain text input / generic cell) and emit a structured development warning (`WARN_COMPONENT_FALLBACK_USED`).

---

## 17. API Client Architecture

### 17.1. Unified Client Interface Across Environments

Application developers and framework runtimes interact with the same conceptual `ApiClient` interface in:
- Next.js Server Components (SSR);
- Next.js BFF Route Handlers;
- Browser Client Components, `ActionExecutor`, headless hooks, and custom workspaces.

The physical transport differs strictly by environment:
- **Browser Runtime:** `ApiClient` configured with `BffTransport` (calls `/api/bff/...` on same origin ONLY).
- **Server Runtime (RSC & BFF):** `ApiClient` configured with `RestTransport` (calls authoritative Sigma backend APIs using server-only credentials).

### 17.2. `ApiTransport` Abstraction (REST Today, Request/Response Portable)

`ApiTransport` abstracts request/response execution without exposing HTTP verbs, URLs, or backend headers to `ResourceDescriptor` or `ActionExecutor`:

```typescript
export interface ApiRequest<I = unknown> {
  readonly resource: ResourceKey;
  readonly action: ActionId;
  /** Logical operation identifier (e.g., 'list', 'get', 'create', 'update', 'delete', 'issue'). */
  readonly operation: string;
  readonly intent: ActionIntent;
  readonly target: ActionTarget;
  readonly key?: KeyObject<unknown>;
  readonly query?: QuerySpec<unknown>;
  readonly input: I;
  readonly contentType: 'json' | 'multipart';
  readonly responseType: 'json' | 'blob';
}

export interface ApiExecutionOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly concurrencyToken?: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
  readonly auditReason?: string;
  /** Server-only Next.js fetch cache hints; ignored by browser BffTransport. */
  readonly nextCache?: { readonly tags?: readonly string[]; readonly revalidate?: number | false };
}

export interface ServerRequestContext {
  readonly correlationId: string;
  readonly locale: string;
  readonly actor: { readonly id: string; readonly roles?: readonly string[] };
  readonly tenantId?: string;
  readonly authToken: string;
  readonly forwardedHeaders?: Readonly<Record<string, string>>;
}

export interface ApiTransport {
  readonly kind: 'rest' | 'bff' | 'rpc' | 'websocket' | (string & {});
  execute<I, O>(
    request: ApiRequest<I>,
    options?: ApiExecutionOptions,
  ): Promise<ActionResult<O>>;
}

export interface ApiClient {
  execute<I, O>(
    request: ApiRequest<I>,
    options?: ApiExecutionOptions,
  ): Promise<ActionResult<O>>;
}
```

### 17.3. `operation` vs. `httpMethod`

- **`operation` (`string`)** belongs to `CompiledAction`, `ApiRequest`, and `ApiClient`. Examples: `'list'`, `'get'`, `'create'`, `'update'`, `'delete'`, `'issue'`, `'exportPdf'`.
- **`httpMethod` (`'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`)** belongs **exclusively** to `RestTransport` and its server-side `RestTransportConfig`. It MUST NEVER appear in `ResourceDescriptor`, `CompiledAction`, `ApiRequest`, or headless hooks.

### 17.4. Operational Guarantees (No Query Cache Engine Initially)

Revision 1 explicitly excludes TanStack Query, SWR, or a framework-owned client cache subsystem. `ApiClient` provides:
- **Concurrent Independent Execution:** Multiple `execute()` calls run concurrently without transition queuing.
- **Cancellation:** First-class `AbortSignal` propagation to underlying `fetch()`; superseded grid/lookup queries abort cleanly and resolve with `{ ok: false, error: { code: 'CANCELLED', ... } }`.
- **Configurable Timeouts:** Default per-client timeout merged with per-request `timeoutMs`.
- **Safe Retries:** Bounded exponential backoff ONLY when `(request.intent === 'query' || action.idempotent === true)` AND error code is `'UNAVAILABLE'` or `'RATE_LIMITED'` (honoring `Retry-After` when present). Non-idempotent commands are NEVER retried automatically.
- **Correlation:** Attaches/propagates `X-Correlation-Id` on every request and surfaces it in `ActionResult.meta.correlationId`.

---

## 18. Query Model (`QuerySpec`)

### 18.1. Minimal Normalized `QuerySpec`

The framework uses a minimal, strongly typed `QuerySpec<T>`:

```typescript
export interface SortSpec<T = unknown> {
  readonly key: FieldPath<T>;
  readonly dir: 'asc' | 'desc';
}

export interface PaginationSpec {
  readonly page: number;
  readonly size: number;
}

export interface QuerySpec<T = unknown> {
  readonly filters?: Partial<Record<FieldPath<T> | 'q', SerializableValue>>;
  readonly sort?: readonly SortSpec<T>[];
  readonly pagination?: PaginationSpec;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}
```

### 18.2. Intentional Boundaries

- **No SQL-like filter AST:** No `and`/`or`/`not` expression trees, nested boolean combinators, or aggregation pipelines.
- **No projection compiler:** No `ProjectionSpec` or `ProjectionPlan` engine in Revision 1.
- **Search as an ordinary filter key:** Free-text search is represented as an ordinary filter key (e.g., `filters: { q: 'acme' }` or `filters: { number: '1042' }`).

### 18.3. Unsupported Filter or Sort Reporting

Silent omission of requested filters or sort keys is prohibited:
1. **Local / BFF Validation:** Before sending a request, `WorkspaceRuntime` and the BFF check requested `filters` keys and `sort` keys against the resource's `CompiledAttribute.filterable` / `sortable` metadata (plus allowed search filter `'q'`). Unsupported keys return a local/BFF `ActionError` (`code: 'VALIDATION_FAILED'`, `issues: [{ path: ['filters', key], code: 'UNSUPPORTED_FILTER', ... }]`).
2. **Backend Rejection:** If a backend endpoint rejects a filter or sort parameter with HTTP `400`/`422`, `RestTransport` preserves and normalizes the backend error issues into `ActionError` (`code: 'VALIDATION_FAILED'`) so the UI surfaces an actionable message rather than silently returning unfiltered rows.

---

## 19. REST Transport

### 19.1. Server-Only Configuration (`@framework/api/server`)

`RestTransport` executes **only on the server** (inside Next.js Server Components and Next.js BFF Route Handlers). Its configuration defines physical backend URLs, endpoint overrides, query serialization, and response mapping:

```typescript
export interface RestActionEndpointConfig<I = unknown, O = unknown> {
  readonly httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Relative path template supporting `{key}` or `{keyField}` params (e.g., 'v2/invoices/{id}/finalize'). */
  readonly path?: string;
  readonly contentType?: 'json' | 'multipart';
  readonly responseType?: 'json' | 'blob';
  readonly mapQuery?: (request: ApiRequest<I>) => Record<string, string | string[] | undefined>;
  readonly mapBody?: (request: ApiRequest<I>) => unknown;
  readonly mapResponse?: (raw: unknown, response: Response) => O;
}

export interface RestResourceEndpointConfig {
  readonly path?: string;
  readonly keyEncoding?: 'path-segments' | 'query-params';
  readonly querySerializer?: RestQuerySerializer;
  readonly responseMapper?: RestResponseMapper;
  readonly actions?: Readonly<Record<string, RestActionEndpointConfig<any, any>>>;
}

export interface RestTransportConfig {
  readonly baseUrl: string;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
  readonly keyEncoding?: 'path-segments' | 'query-params';
  readonly querySerializer?: RestQuerySerializer;
  readonly responseMapper?: RestResponseMapper;
  readonly errorMapper?: RestErrorMapper;
  readonly getContext: () => Promise<ServerRequestContext> | ServerRequestContext;
  readonly endpoints?: Readonly<Record<string, RestResourceEndpointConfig>>;
}
```

### 19.2. Default REST Conventions and Override Precedence

When `endpoints[resource]` is omitted, `RestTransport` derives routes deterministically from `ResourceModel.api.resourcePath` (defaulting to the pluralized last segment of `ResourceKey`, e.g., `'crm.customer'` → `'customers'`):

| Logical `operation` | `intent` | Default `httpMethod` | Default Path | Request Payload Mapping |
|---|---|---|---|---|
| `list` | `query` | `GET` | `/{path}` | `QuerySpec` -> query parameters via `querySerializer` |
| `get` | `query` | `GET` | `/{path}/{encodedKey}` | Key in path (or query if `keyEncoding: 'query-params'`) |
| `create` | `command` | `POST` | `/{path}` | JSON (or `FormData` if `contentType: 'multipart'`) |
| `update` | `command` | `PATCH` | `/{path}/{encodedKey}` | JSON body + `If-Match: {concurrencyToken}` |
| `delete` | `command` | `DELETE` | `/{path}/{encodedKey}` | Optional reason payload + `If-Match: {concurrencyToken}` |
| Custom (`target: 'record'`) | `command` | `POST` | `/{path}/{encodedKey}/{operation}` | JSON body + `Idempotency-Key` if `idempotent` |
| Custom (`target: 'record'`) | `query` | `GET` | `/{path}/{encodedKey}/{operation}` | Input fields serialized as query params |
| Custom (`target: 'none' \| 'collection'`) | `command` | `POST` | `/{path}/{operation}` | JSON / multipart body |
| Custom (`target: 'none' \| 'collection'`) | `query` | `GET` | `/{path}/{operation}` | Input fields serialized as query params |

Resolution precedence (highest wins):
1. Action-level config (`endpoints[resource].actions[action]`)
2. Resource-level config (`endpoints[resource]`)
3. Application-level `RestTransportConfig` (`querySerializer`, `responseMapper`, `keyEncoding`)
4. Framework default REST conventions

### 19.3. Serialization, Uploads, Downloads, Concurrency, and Error Mapping

- **Composite Keys:** Default `'path-segments'` encodes ordered `KeyObject.values` (`/{path}/{k1}/{k2}`); `'query-params'` encodes `/{path}/by-key?k1=...&k2=...` using `KeyDescriptor.components` names.
- **Query Serialization:** Default serializer emits `?page=1&size=20&sort=issueDate:desc&filter[status]=issued`. Custom `querySerializer` adapts cleanly to Sigma WMS/PIM/ERP query formats (e.g., Spring Data, OData).
- **Multipart Uploads:** Actions with `contentType: 'multipart'` (or `File`/`Blob` fields detected in `SchemaNode`) serialize into `FormData` without manually setting `Content-Type` header (preserving boundary).
- **File Downloads:** Actions with `responseType: 'blob'` stream the response body and return `{ filename, mimeType, blob | stream }` without calling `response.json()`.
- **Concurrency & Idempotency:** Sends `If-Match` when `options.concurrencyToken` is provided (extracted from `ETag` header or `ResourceModel.api.versionField`), and `Idempotency-Key` when `options.idempotencyKey` is supplied.
- **Error Normalization:** Maps HTTP status & backend error bodies deterministically:
  - `400` / `422` → `VALIDATION_FAILED` (extracting field `issues: ValidationIssue[]`)
  - `401` → `UNAUTHENTICATED`
  - `403` → `FORBIDDEN`
  - `404` → `NOT_FOUND`
  - `409` / `412` → `CONFLICT`
  - `429` → `RATE_LIMITED` (`retryable: true`)
  - `502` / `503` / `504` / timeout → `UNAVAILABLE` (`retryable: true`)
  - `500` / unexpected → `INTERNAL` (sanitized; never leaks backend stack traces to browser).

---

## 20. `ApiRequest` Generation and Request Lifecycle

Every API-backed action execution follows this exact 18-stage deterministic pipeline:

| Stage | Component | Input -> Output & Responsibility |
|---|---|---|
| **1. Authoring** | `@application/resources` | Developer authors `ResourceDescriptor` (`key`, `schema`, overrides, inline functions). |
| **2. Local Compilation (Phase A)** | `defineResource()` | Inspects `RuntimeSchema`, generates standard actions/workspaces, extracts inline functions, validates local paths -> `LocalResourceModel`. |
| **3. Cross-Resource Compilation (Phase B)** | `buildCatalog()` | Applies app/DS conventions, resolves relations (`REFERENCES`/`OWNS`), validates cross-refs -> final `ResourceModel`, `ServerArtifacts`, `ClientManifestBundle`. |
| **4. Canonical `CompiledAction`** | `ResourceModel` | Holds `id`, `target`, `behavior: { type: 'api', operation, intent, idempotent, contentType, responseType }`, `inputSchemaRef`, `effects`. |
| **5. Action Invocation** | UI / Hook / Caller | Caller invokes `execute(actionRef, { key?, query?, input, concurrencyToken?, auditReason? })`. |
| **6. `ActionExecutor` Pre-Flight** | `@framework/runtime-client` | Runs optional `confirm` dialog (collecting `auditReason` if required) and validates `input` against `RuntimeSchema<I>` locally. |
| **7. `ApiRequest` Construction** | `ActionExecutor` | Builds transport-agnostic `ApiRequest`: `{ resource, action, operation, intent, target, key, query, input, contentType, responseType }` + `ApiExecutionOptions` (`signal`, `concurrencyToken`, `idempotencyKey`, `auditReason`). |
| **8. `ApiClient` Dispatch** | `@framework/api` | Attaches `correlationId`, applies client-side retry/timeout rules, delegates to active `ApiTransport`. |
| **9. Transport Routing (Env Split)** | `BffTransport` OR `RestTransport` | **Browser:** `BffTransport` calls `/api/bff/resources/{resource}/actions/{action}`. **Server RSC:** `RestTransport` proceeds directly to Stage 11 (skipping BFF hop). |
| **10. BFF Validation & Resolution** | `@framework/bff-next` | BFF looks up `(resource, action)` in server `ResourceCatalog`, verifies `behavior.type === 'api'`, re-validates payload against server `RuntimeSchema<I>`, checks optional `ServerBffHandlerRegistry` override. |
| **11. Server Request Context** | `AuthContextProvider` | Resolves trusted `ServerRequestContext` (session actor, `tenantId`, backend `authToken`, `locale`, `correlationId`) exclusively on server. |
| **12. REST Config Resolution** | `RestTransport` | Resolves `httpMethod`, `path` template, `keyEncoding`, `querySerializer`, `responseMapper` using 4-tier endpoint precedence. |
| **13. REST Request Construction** | `RestTransport` | Encodes composite keys, serializes `QuerySpec`, builds JSON/multipart body, attaches `Authorization: Bearer ...`, `X-Tenant-Id`, `X-Correlation-Id`, `Accept-Language`, `If-Match`, `Idempotency-Key`. |
| **14. HTTP Request to Backend** | `fetch()` | Executes HTTP request against Sigma backend domain service (with `AbortSignal` & timeout). |
| **15. HTTP Response Processing** | `RestTransport` | Checks HTTP status, extracts `ETag` / `Retry-After` / response headers, parses JSON or `Blob`. |
| **16. Validation & Normalization** | `RestTransport` / `ApiClient` | Applies `responseMapper` / `errorMapper`, optionally validates output against `CompiledAction.outputSchemaRef`, strips sensitive server details. |
| **17. Typed `ActionResult<O>`** | `ApiClient` / BFF | Returns `{ ok: true, data, effects, meta }` or `{ ok: false, error: ActionError, meta }` to `ActionExecutor`. |
| **18. Client Effects & Workspace Update** | `ActionExecutor` / `WorkspaceRuntime` | Applies `ActionEffect[]` (`toast`, `invalidate`, `refresh`, `closeHost`, `navigate`), updates reactive workspace state, settles host promises. |

---

## 21. Next.js BFF and Authentication Architecture

### 21.1. Strict Browser Access Policy

**The browser MUST NEVER call Sigma backend domain APIs directly.**
- The browser receives ONLY same-origin Next.js BFF endpoints (`/api/bff/resources/[resource]/actions/[action]`).
- `ClientResourceManifest`, `NEXT_PUBLIC_*` environment variables, and browser state MUST NEVER contain backend base URLs, service API keys, or backend bearer tokens.
- Server-side `ServerRequestContext` (user identity, tenant ID, OAuth/JWT backend access token) is resolved exclusively inside Next.js server boundaries (`cookies()`, server session store, or token vault) and MUST NOT be overridable by client request fields.

### 21.2. HTTP BFF Route Handler Contract

The framework provides a single catch-all Next.js Route Handler factory in `@framework/bff-next`:

```text
GET  /api/bff/resources/[resource]/actions/[action]?key=...&query=...&input=...   (ONLY when intent === 'query')
POST /api/bff/resources/[resource]/actions/[action]                                (for intent === 'command' or large queries)
```

Why HTTP Route Handlers instead of `dispatchResourceAction` Server Actions?
1. **True Concurrency:** Parallel `GET` queries in grids, lookups, and related collections do not serialize behind React Server Action transition queues.
2. **Native Cancellation & Streaming:** Supports `AbortController` cancellation cleanly and streams `multipart/form-data` uploads and binary `Blob` downloads natively.
3. **HTTP Semantics:** Enables `GET` caching/ETags where appropriate and clean HTTP status codes.
4. **Security Hardening:** The BFF route looks up `(resource, action)` in the compiled server `ResourceCatalog`. Requests targeting nonexistent actions, disabled actions (`false`), `'client'` actions, `'navigate'` actions, or `POST` vs `GET` mismatches are rejected with `400`/`404`/`405`. A client can NEVER supply a backend URL or arbitrary function ID.

Next.js Server Actions MAY still be used optionally by applications for specific progressive-enhancement Next.js form workflows, but MUST NOT serve as the canonical API transport.

### 21.3. Server Components (SSR) vs. Browser Execution

- **Server Components (`page.tsx`):** Call the server-side `ApiClient` directly (configured with `RestTransport` + `cookies()`/`headers()` context) in parallel `Promise.all(...)`—avoiding an unnecessary loopback HTTP call to `/api/bff`. Pass only `{ manifest: RouteClientManifest, initialData }` as JSON-serializable props to `<PageHost />`.
- **Browser Client Components:** Execute all subsequent user interactions (pagination, filter changes, lookups, mutations, custom actions) via `BffApiClient` -> `/api/bff/resources/[resource]/actions/[action]`.
- **Custom BFF Orchestration:** When an action requires BFF-side multi-API aggregation or custom token exchange, developers register a handler in `ServerBffHandlerRegistry` keyed by `(resourceKey, actionId)` on the server; `createBffRouteHandler` invokes it automatically instead of default `RestTransport` dispatch while keeping the exact same `ActionResult` contract.

---

## 22. Inline Functions and Server/Client Execution Boundaries

### 22.1. Six-Category Execution Taxonomy

Inline functions eliminate manual registration boilerplate while preserving strict RSC serialization and security boundaries. Every function slot belongs to one of six explicit categories:

| Category | Examples | Authoring Location | Runtime Location | Crossing RSC Boundary |
|---|---|---|---|---|
| **1. Compile-Time Pure** | Convention overrides in `buildCatalog()` | App config | Build / startup only | Evaluated once; result materialized as JSON |
| **2. Pure Reactive / Computed** | `compute`, `hidden`, `readOnly`, `required`, `visible`, `defaultValue`, sync `validate` | `ResourceDescriptor` | Client (keystroke latency) & Server (optional re-eval) | Replaced by `FunctionRef` in JSON manifest; JS loaded via lazy `ClientResourceChunk` |
| **3. Client-Only Action** | `behavior: { type: 'client', execute }` (clipboard, local export, print) | `ResourceDescriptor` | Browser only | Replaced by `FunctionRef` in JSON manifest; JS loaded via lazy `ClientResourceChunk` |
| **4. Isomorphic Pure Formatters** | Custom display formatters / parsers | `Formatters` config | Server SSR & Browser | Loaded from shared pure formatter module |
| **5. Server-Only API / BFF Hooks** | `RestTransportConfig.mapQuery`, `mapResponse`, `getContext`, `ServerBffHandler` | `'server-only'` modules | Server only (BFF / RSC) | **NEVER** leaves server; **NEVER** in `ClientResourceManifest` or resource client chunk |
| **6. Server-Only Canonical Action** | Backend workflow / BFF orchestration for an `'api'` action | `ServerBffHandlerRegistry` | Server only (BFF) | Invoked **ONLY** via canonical `POST /api/bff/resources/{resource}/actions/{action}` |

### 22.2. Automatic Extraction & Local Responsiveness (Zero Manual Registration)

When a developer writes:

```typescript
attributes: {
  fullName: {
    compute: ({ record }) => `${record.firstName ?? ''} ${record.lastName ?? ''}`.trim(),
  },
  discount: {
    required: ({ record }) => record.customerType === 'wholesale',
  },
}
```

1. **Zero Server Roundtrips on Keystroke:** Reactive rules (`compute`, `hidden`, `readOnly`, `required`, `visible`) MUST run synchronously in memory in the browser on every field change.
2. **Deterministic Phase A Extraction:** `defineResource()` traverses the descriptor deterministically and registers each inline function in a module-local `LocalFunctionTable` under a stable path-derived `FunctionId` (e.g., `crm.customer::attr.fullName.compute`, `crm.customer::attr.discount.required`), replacing the closure in serializable metadata with `{ kind: 'FunctionRef', id: 'crm.customer::attr.discount.required' }`.
3. **No Dynamic Next.js Server Actions:** The framework NEVER attempts to transform runtime closures into `'use server'` Next.js Server Actions. Any server-only logic MUST live in `'server-only'` BFF handlers (`ServerBffHandlerRegistry`) or backend domain APIs and is invoked exclusively via canonical `ActionId` through `/api/bff/resources/[resource]/actions/[action]`.
4. **Security Against Arbitrary Function Invocation:** A client MUST NEVER be able to pass a `FunctionId` to the server and ask the server to execute it. Server BFF routes only accept `(resourceKey, actionId)` matching compiled `behavior.type === 'api'` actions.

---

## 23. Client Manifest Generation and Bundle Optimization

### 23.1. Avoiding Monolithic Client Catalogs

In a 150-resource ERP/WMS/Retail suite, importing the entire `ResourceCatalog` and every Zod schema into the root client bundle is prohibitive. The framework splits client artifacts into two tiers:

1. **`AppClientManifest` (Small Global JSON):** Resource keys, labels, entry-point workspace IDs (`browse`, `record`, `input`, `lookup`), and navigation menu metadata (~15–30 KB even for 150 resources). Passed once in root app layout.
2. **`RouteClientManifest` + `ClientResourceManifest` (Route-Scoped JSON):** Generated on the server by `catalog.buildRouteManifest(activeResourceKeys)` for the active Next.js route. Contains ONLY the compiled serializable metadata (`SchemaNode`, `CompiledAttribute`, `CompiledRelation`, `CompiledAction`, `CompiledWorkspace`, `CompiledSection`, `CompiledFormModel`, `FunctionRef` IDs, `ComponentRef` keys) for the active resource(s) and their immediate lookup references—**zero functions, zero Zod closures, zero `CompilationReport` provenance, zero backend endpoints.**

```typescript
export interface AppClientManifest {
  readonly resources: readonly {
    readonly key: ResourceKey;
    readonly labels: ResourceLabels;
    readonly defaults: ResourceEntryPoints;
  }[];
}

export interface ClientResourceManifest {
  readonly key: ResourceKey;
  readonly labels: ResourceLabels;
  readonly schemaNode: SchemaNode;
  readonly primaryKey?: KeyDescriptor<unknown>;
  readonly displayField?: string;
  readonly versionField?: string;
  readonly attributes: Readonly<Record<string, CompiledAttribute<unknown>>>;
  readonly relations: Readonly<Record<string, CompiledRelation<unknown>>>;
  readonly actions: Readonly<Record<string, CompiledAction>>;
  readonly sections: Readonly<Record<string, CompiledSection<unknown>>>;
  readonly workspaces: Readonly<Record<string, CompiledWorkspace<unknown>>>;
  readonly defaults: ResourceEntryPoints;
}

export interface RouteClientManifest {
  readonly primaryResource: ResourceKey;
  readonly resources: Readonly<Record<string, ClientResourceManifest>>;
}

export interface ClientResourceChunk {
  readonly key: ResourceKey;
  readonly schema: RuntimeSchema<unknown>;
  readonly localFunctions: ReadonlyMap<FunctionId, Function>;
  readonly localSchemas: ReadonlyMap<string, RuntimeSchema<unknown>>;
}
```

### 23.2. Lazy Route-Level Client Resource Chunks (`ClientResourceLoader`)

When a Client Component (`<PageHost manifest={routeManifest} />` or `DialogHost` opening a lookup/quick-create) activates a resource:
- It already has the complete serializable UI layout and metadata immediately from `routeManifest` (instant first render, zero waterfall for metadata!).
- For Zod input validation (`RuntimeSchema`) and inline reactive/client functions (`LocalFunctionTable`), `ClientResourceLoader` dynamically imports ONLY that resource's module chunk via a code-split loader map:

```typescript
// Auto-generated or declared in @application/resources/loaders.ts (webpack/turbopack splits 1 chunk per resource!)
export const resourceChunkLoaders: Record<string, () => Promise<ClientResourceChunk>> = {
  'crm.customer': () => import('./crm/customer.resource'),
  'sales.invoice': () => import('./sales/invoice.resource'),
  // ...each resource becomes its own separate async JS chunk
};
```

Because `*.resource.ts` modules NEVER import other `*.resource.ts` modules at runtime (Section 14), opening `/invoices` downloads **only** the `sales.invoice` chunk (and downloads `crm.customer` lazily ONLY if the user opens the Customer lookup or quick-create dialog!).

---

## 24. Host Management

### 24.1. Hosts and `HostController`

Workspaces render inside one of three standard presentation hosts:

| Host | Surface | Lifecycle & Routing |
|---|---|---|
| `PageHost` | Main route canvas | Bound to Next.js App Router route lifecycle; supports deep links, SSR initial data, and full refresh reconstruction. |
| `DialogHost` | Centered modal overlay | Client-managed overlay stack inside `HostController`; returns `Promise<HostResult<R>>` to its opener. |
| `DrawerHost` | Slide-over side panel | Client-managed overlay stack inside `HostController`; supports nested contextual lookups and quick-create flows. |

`HostController` is the single canonical controller name (replacing `HostManager` throughout the architecture):

```typescript
export interface WorkspaceInvocation<I = unknown> {
  readonly resource: ResourceKey;
  readonly workspace: WorkspaceId;
  /** Canonical action bound to this workspace (e.g., 'create', 'update', 'issue', 'get'). */
  readonly action?: ActionId;
  readonly recordKey?: SerializedKey;
  readonly initialValues?: Partial<I>;
  readonly relationContext?: { readonly relation: RelationId; readonly parentKey: SerializedKey };
  readonly params?: SerializableValue;
}

export interface HostInvocation<R = unknown> {
  readonly __resultBrand?: R;
  readonly resource: ResourceKey;
  readonly workspace: WorkspaceId;
  readonly host: HostKind;
  readonly invocation?: WorkspaceInvocation;
  readonly urlSync?: 'none' | 'query-param' | 'route-segment';
}

export interface HostFrameMetadata {
  readonly frameId: string;
  readonly host: HostKind;
  readonly resource: ResourceKey;
  readonly workspace: WorkspaceId;
  readonly invocation?: WorkspaceInvocation;
  readonly isDirty: boolean;
}

export type HostResult<T = unknown> =
  | { readonly status: 'submitted' | 'selected'; readonly payload: T }
  | { readonly status: 'cancelled' | 'dismissed' | 'navigation-aborted' }
  | { readonly status: 'failed'; readonly error: ActionError };

export interface HostController {
  readonly stack: readonly HostFrameMetadata[];
  openWorkspace<R = unknown>(invocation: HostInvocation<R>): Promise<HostResult<R>>;
  closeCurrent(result?: HostResult<unknown>): Promise<boolean>;
  markDirty(frameId: string, dirty: boolean): void;
  canNavigate(destination: string): Promise<boolean>;
}
```

### 24.2. Serializable Frame Metadata & Promise Settlement

- `HostFrameMetadata` MUST stay strictly serializable; pending `Promise` resolvers MUST NEVER be stored on frame metadata objects. `HostController` maintains a private in-memory `Map<string, PendingResolver>` keyed by `frameId`.
- If a parent frame is destroyed or navigated away from, `HostController` deterministically settles all child pending promises with `{ status: 'navigation-aborted' }` or `{ status: 'dismissed' }`—zero orphan promises may remain.

### 24.3. Dirty-State Guards, URL Synchronization, and Accessibility

- **Dirty-State Guards:** Centralized inside `HostController` and the Next.js router bridge. When `isDirty === true`, `HostController` intercepts overlay backdrop clicks, `Escape` key, close buttons, `beforeunload` (tab close/refresh), browser back/forward navigation, and programmatic `PageHost` route transitions, prompting confirmation once rather than duplicating dirty-guard logic in form hooks.
- **URL Synchronization:** Overlay frames default to `urlSync: 'none'`. Frames configured with `'query-param'` or `'route-segment'` reconstruct deterministically from Next.js `useSearchParams()` / intercepting routes on refresh and close cleanly on browser back.
- **Accessibility:** `DialogHost` and `DrawerHost` MUST enforce focus entry, focus trapping, focus restoration to the triggering element upon close, ARIA role/label/description wiring, body scroll locking, deterministic nested overlay z-ordering, and `prefers-reduced-motion` support.

---

## 25. Headless React Runtime and Hooks

### 25.1. Shared `WorkspaceRuntime` and `ActionExecutor`

All React workspace hooks build atop `WorkspaceRuntime`, which coordinates:
- `ClientResourceManifest` + lazy `ClientResourceChunk` resolution (`RuntimeSchema` + `LocalFunctionTable`);
- invocation validation and initial record / `CapabilitySnapshot` loading;
- `ActionExecutor` invocation (`api`, `client`, `navigate`) with `AbortController` cleanup on unmount;
- granular selector-friendly subscriptions (so typing into one form field does NOT re-render unrelated grid toolbars or sibling sections).

**Mode-Free Invariant:** Neither `WorkspaceRuntime` nor any hook MAY expose a `mode` property (`create`/`edit`/`view`). Forms expose `actionId`, `schema`, `values`, `lifecycle`, and `capabilities`.

### 25.2. Headless Hook Contracts

```typescript
export type FormLifecycle = 'pristine' | 'dirty' | 'validating' | 'submitting' | 'submitted' | 'failed';

export interface WorkspaceState<T = unknown> {
  readonly resource: ResourceKey;
  readonly manifest: ClientResourceManifest;
  readonly workspace: CompiledWorkspace<T>;
  readonly invocation: WorkspaceInvocation;
  readonly capabilities: CapabilitySnapshot;
  readonly isLoading: boolean;
  readonly error: ActionError | null;
  refresh(): Promise<void>;
}

export interface GridWorkspaceState<T = unknown> extends WorkspaceState<T> {
  readonly rows: readonly T[];
  readonly totalCount: number;
  readonly query: QuerySpec<T>;
  readonly selectedKeys: ReadonlySet<SerializedKey>;
  setPage(page: PaginationSpec): void;
  setSort(sort: readonly SortSpec<T>[]): void;
  setFilter(key: FieldPath<T> | 'q', value: SerializableValue | undefined): void;
  setFilters(filters: QuerySpec<T>['filters']): void;
  toggleSelectRow(record: T): void;
  toggleSelectAll(): void;
  clearSelection(): void;
  readonly toolbarActions: readonly CompiledAction[];
  getRowActions(record: T): readonly CompiledAction[];
  readonly selectionActions: readonly CompiledAction[];
  executeAction<I, O>(actionId: ActionId, input?: I): Promise<ActionResult<O>>;
}

export interface RecordWorkspaceState<T = unknown> extends WorkspaceState<T> {
  readonly record: T | null;
  readonly concurrencyToken?: string;
  readonly headerActions: readonly CompiledAction[];
  executeAction<I, O>(actionId: ActionId, input?: I): Promise<ActionResult<O>>;
}

export interface FormWorkspaceState<I = unknown, O = unknown> extends WorkspaceState<I> {
  readonly action: CompiledAction<I, O>;
  readonly formModel: CompiledFormModel<I>;
  readonly values: Partial<I>;
  readonly computedValues: Readonly<Record<string, unknown>>;
  readonly issues: readonly ValidationIssue[];
  readonly touched: ReadonlySet<string>;
  readonly lifecycle: FormLifecycle;
  readonly isDirty: boolean;
  readonly isSubmitting: boolean;
  setValue<P extends FieldPath<I>>(path: P, value: unknown): void;
  isFieldHidden(path: FieldPath<I>): boolean;
  isFieldReadOnly(path: FieldPath<I>): boolean;
  isFieldRequired(path: FieldPath<I>): boolean;
  validate(): Promise<readonly ValidationIssue[]>;
  submit(): Promise<ActionResult<O>>;
  reset(): void;
  cancel(): Promise<void>;
}

export interface LookupWorkspaceState<T = unknown> extends WorkspaceState<T> {
  readonly searchText: string;
  readonly results: readonly T[];
  readonly isSearching: boolean;
  readonly selectedKeys: ReadonlySet<SerializedKey>;
  setSearchText(value: string): void;
  toggleItem(item: T): void;
  confirmSelection(): void;
  quickCreate?: () => Promise<HostResult<T>>;
}

export interface RelatedCollectionState<T = unknown> {
  readonly relation: CompiledRelation;
  readonly targetManifest: ClientResourceManifest;
  readonly rows: readonly T[];
  readonly totalCount: number;
  readonly query: QuerySpec<T>;
  readonly isLoading: boolean;
  readonly error: ActionError | null;
  readonly selectedKeys: ReadonlySet<SerializedKey>;
  setPage(page: PaginationSpec): void;
  setSort(sort: readonly SortSpec<T>[]): void;
  toggleSelectRow(record: T): void;
  refresh(): Promise<void>;
  executeAction(actionId: ActionId, input?: unknown): Promise<ActionResult<unknown>>;
}
```

Hook functions exposed by `@framework/runtime-client`:
- `useWorkspace(invocation)`
- `useGridWorkspace<T>(invocation)`
- `useRecordWorkspace<T>(invocation)`
- `useFormWorkspace<I, O>(invocation)`
- `useLookupWorkspace<T>(invocation)`
- `useWizardWorkspace<T>(invocation)`
- `useRelatedCollection<T>(parentRecord, relationId)`
- `useAction<I, O>(actionRef)`

---

## 26. Component Integration, Layered Extensibility, and Custom Workspaces

### 26.1. Eight Layered Extension Points

Applications extend the framework cleanly at the exact layer required without forking core code:

| Layer | Extension Mechanism | Use Case |
|---|---|---|
| **1. `ApiClient`** | Custom `ApiTransport` or `getContext` hook | Custom correlation/telemetry, future RPC/WS transports |
| **2. `RestTransport`** | `RestTransportConfig.endpoints`, `querySerializer`, `responseMapper`, `errorMapper` | Non-standard Sigma ERP/WMS REST routes, custom pagination envelopes |
| **3. `ServerBffHandlerRegistry`** | `register(resource, action, fn)` (`'server-only'`) | BFF-level multi-endpoint aggregation or server-side file streaming |
| **4. `ActionExecutor`** | Middleware hooks (`beforeExecute`, `afterExecute`) + `ClientHandlerRegistry` | Client analytics, custom browser actions |
| **5. Headless Workspaces** | `CustomWorkspaceRegistry` controller factories | Specialized client state machines (e.g., WMS wave picking, POS cart) |
| **6. Headless Sections** | `useRelatedCollection` / custom section hooks | Specialized sub-views embedded inside standard workspaces |
| **7. Visual Components** | `ComponentRegistry` (`field`, `cell`, `filter`, `action`, `section`, `workspace`) | Design-system swaps and domain-specific widgets |
| **8. Custom Workspaces & Sections** | `kind: 'custom'` (or registered `customType`) | Full custom workspace UX participating in framework infra |

### 26.2. Custom Workspace Integration Contract

Applications can build completely custom workspace screens (e.g., a WMS Wave Picking Console or Retail Price Matrix) without forcing every screen into a conventional grid or form, while still reusing framework infrastructure:

1. **Declare or Invoke:** Either declare a workspace with `kind: 'custom'` (`customType: 'wms.picking-console'`, `component: componentRef('wms.picking-console', 'workspace')`) on a resource, OR render a standalone custom workspace inside `<FrameworkProvider>` / `HostController`.
2. **Participate in Framework Infrastructure:** `CustomWorkspaceContext` supplies the custom workspace component with:
   - `apiClient`: authenticated BFF `ApiClient` (zero direct backend calls or auth plumbing needed);
   - `actionExecutor`: execute any canonical resource action with standard confirmation, validation, error normalization, and `ActionEffect`s;
   - `hostController`: open nested standard dialogs/drawers (e.g., opening `Product` lookup or `Order` record drawer) and register dirty-state guards via `markDirty()`;
   - `t` / `format`: shared localization & formatting helpers;
   - `notify`: standard toast/error notification surface.

```typescript
export interface CustomWorkspaceContext {
  readonly apiClient: ApiClient;
  readonly actionExecutor: {
    execute<I, O>(ref: ActionRef<string, string, I, O>, input?: I): Promise<ActionResult<O>>;
  };
  readonly hostController: HostController;
  readonly locale: string;
  t(ref: MessageRef): string;
  format(value: unknown, format: SemanticFormat): string;
  notify(notification: { readonly message: MessageRef; readonly tone: 'success' | 'info' | 'warning' | 'error' }): void;
}
```
3. **Zero Core Branching:** `PageHost`, `DialogHost`, and `DrawerHost` resolve custom workspaces uniformly through `ComponentRegistry` (`role: 'workspace'`) without adding `switch` branches inside framework core packages.

---

## 27. Localization and Formatting

### 27.1. Localization Contracts

- **Plain String vs. Message Catalog:** Plain strings in `MessageRef` are treated as literal display copy; `message('key', values, fallback)` produces a `MessageDescriptor` resolved against the application's ICU MessageFormat catalog using the active `locale`.
- **No Hard-Coded Grammar Rules:** `ResourceLabels.gender` and `ResourceLabels.forms` MAY be passed as ICU message parameters to application message templates (supporting Portuguese/Spanish agreement), but the framework MUST NOT embed locale-specific grammatical inflection logic in core code.

### 27.2. Formatting & Value Representation Rules

- **Static Pure `Formatters`:** Built-in formats (`currency`, `percentage`, `date`, `instant`, `time`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`, `phone`, `email`, `url`, `duration`) use `Intl.NumberFormat` / `Intl.DateTimeFormat` and pure locale-aware codecs. Custom formats are registered via a plain extension map on `FrameworkProvider`.
- **Date vs. Instant:** Calendar dates (`storageType: 'date'`, e.g., `'2026-11-13'`) MUST NOT undergo local-timezone shifting; timestamps (`'instant'`) format in the active user timezone.
- **Money Precision:** Monetary inputs/outputs SHOULD carry explicit scale/currency metadata (or integer minor units / decimal strings) rather than relying on arbitrary binary floating-point arithmetic.
- **Enum Isolation:** Enum values stored/sent over APIs remain invariant machine tokens; localized enum labels reside strictly in message catalogs / `AttributeDescriptor` metadata.

---

## 28. Validation, Errors, and Diagnostics

### 28.1. Validation Layers

1. **Structural Schema Validation (Client & BFF):** `RuntimeSchema.safeParse()` validates types, required fields, lengths, bounds, and enums before network dispatch (client) and before backend forwarding (BFF).
2. **Inline Attribute Validation (Client):** Synchronous `AttributeDescriptor.validate` functions run locally during field editing.
3. **Authoritative Domain & Stateful Validation (Backend API):** Uniqueness, inventory availability, credit limits, and state-machine invariants are validated by Sigma backend APIs and mapped from HTTP `400`/`422` responses into `ActionError.issues: ValidationIssue[]`.

### 28.2. Stable `ActionError` Contract

```typescript
export type ActionErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'CANCELLED'
  | 'INTERNAL';

export interface ActionError {
  readonly code: ActionErrorCode;
  readonly message: MessageRef;
  readonly issues?: readonly ValidationIssue[];
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, SerializableValue>>;
}

export type ActionResult<O = unknown> =
  | {
      readonly ok: true;
      readonly data: O;
      readonly effects?: readonly ActionEffect[];
      readonly meta?: {
        readonly correlationId?: string;
        readonly concurrencyToken?: string;
      };
    }
  | {
      readonly ok: false;
      readonly error: ActionError;
      readonly meta?: { readonly correlationId?: string };
    };
```

### 28.3. Compilation & Startup Diagnostics

Phase A, Phase B, and client bootstrap produce structured diagnostics exposed to console during startup and inspectable via `inspectResource(resource)` and `inspectCatalog(catalog)`:

```typescript
export type DiagnosticCode =
  | 'ERR_DUPLICATE_RESOURCE'
  | 'ERR_UNKNOWN_RESOURCE'
  | 'ERR_ACTION_DISABLED_OR_MISSING'
  | 'ERR_WORKSPACE_REQUIRES_ACTION'
  | 'ERR_CROSS_RESOURCE_TARGET_DISABLED'
  | 'ERR_INVALID_KEY_MAPPING'
  | 'ERR_INVALID_INVERSE_RELATION'
  | 'ERR_INVALID_RELATION_CARDINALITY'
  | 'ERR_DEPENDENCY_CYCLE'
  | 'ERR_SECTION_CYCLE'
  | 'ERR_COMPONENT_NOT_FOUND'
  | 'ERR_COMPONENT_ROLE_MISMATCH'
  | 'ERR_COMPONENT_CAPABILITY_MISMATCH'
  | 'ERR_SERVER_MODULE_IN_CLIENT'
  | 'WARN_COMPONENT_FALLBACK_USED'
  | 'INFO_CONVENTION_CASCADE_SUPPRESSED';

export interface CompilationProvenance {
  readonly path: string;
  readonly source: 'schema' | 'framework-convention' | 'design-system' | 'app-convention' | 'resource-override' | 'inferred-references' | 'inferred-owns';
  readonly description: string;
}

export interface CompilationReport {
  readonly diagnostics: readonly ModelDiagnostic[];
  readonly provenance: readonly CompilationProvenance[];
}

export function inspectResource(resource: LocalResourceModel<any>): CompilationReport;
export function inspectCatalog(catalog: ResourceCatalog): CompilationReport;

export interface ModelDiagnostic {
  readonly code: DiagnosticCode;
  readonly severity: 'error' | 'warning' | 'info';
  readonly phase: 'phase-a' | 'phase-b' | 'client-startup';
  readonly resourceKey?: ResourceKey;
  readonly path: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly provenance?: 'schema' | 'framework-convention' | 'design-system' | 'app-convention' | 'resource-override';
}
```

**Canonical Diagnostic Codes (Fatal `'error'` halts catalog assembly / startup):**

| Code | Severity | Phase | Condition |
|---|---|---|---|
| `ERR_DUPLICATE_RESOURCE` | `error` | Phase B | Duplicate `ResourceKey` registered in `buildCatalog()` |
| `ERR_UNKNOWN_RESOURCE` | `error` | Phase B | Relation, `through`, or `navigate` targets an unregistered `ResourceKey` |
| `ERR_ACTION_DISABLED_OR_MISSING` | `error` | Phase A/B | Explicit workspace/placement/form binds a disabled (`false`) or nonexistent action |
| `ERR_WORKSPACE_REQUIRES_ACTION` | `error` | Phase A | Explicit `grid`/`record`/`lookup` workspace declared while required query/load action is `false` |
| `ERR_CROSS_RESOURCE_TARGET_DISABLED` | `error` | Phase B | `lookup.workspace` or `quickCreate` points to a workspace/action disabled on target resource |
| `ERR_INVALID_KEY_MAPPING` | `error` | Phase A/B | Missing `sourceKey`/`targetKey` path, tuple length mismatch, or incompatible scalar types |
| `ERR_INVALID_INVERSE_RELATION` | `error` | Phase B | Declared `inverse` does not exist on target or has incompatible cardinality |
| `ERR_DEPENDENCY_CYCLE` | `error` | Phase A | Cycle detected among `compute` attribute dependencies |
| `ERR_SECTION_CYCLE` | `error` | Phase A | Cycle detected in `tabs`/`accordion` section composition |
| `ERR_COMPONENT_NOT_FOUND` | `error` | Client | Explicit `ComponentRef` key is missing from `ComponentRegistry` |
| `ERR_COMPONENT_ROLE_MISMATCH` | `error` | Client/B | `ComponentRef` points to a component registered under a different `ComponentRole` |
| `ERR_SERVER_MODULE_IN_CLIENT` | `error` | Build | Client manifest/chunk references a server-only artifact |
| `WARN_COMPONENT_FALLBACK_USED` | `warning` | Client | Convention-selected component missing; generic role fallback used |
| `INFO_CONVENTION_CASCADE_SUPPRESSED` | `info` | Phase A | Generated dependent workspace/nav-action suppressed because base action is `false` |

---

## 29. Security Boundaries

**The backend domain API is the sole authoritative security boundary.**

| Responsibility | Frontend Framework | Next.js BFF | Backend Domain API |
|---|---|---|---|
| Authentication & token issuance | No (sends session cookie to BFF) | Resolves session & backend token | Validates token/claims |
| Tenant isolation & RBAC/ABAC | No (UI hints only) | Propagates trusted actor/tenant | **Authoritative enforcement** |
| Row-level & field-level security | Presentation only (`CapabilitySnapshot`) | No domain DB policy engine | **Authoritative enforcement** |
| Input structural validation | Pre-flight UX validation | **Re-validates** against server `RuntimeSchema` | Authoritative domain validation |
| Business invariants & concurrency | Sends `concurrencyToken` | Forwards `If-Match` / `Idempotency-Key` | **Authoritative enforcement** |

Additional security invariants:
1. Any `CapabilitySnapshot` (`allowedActions`, `deniedReasons`, `readOnlyFields`) returned to the browser is strictly a **UX presentation hint**, never an authorization grant.
2. The BFF MUST NEVER accept a backend URL, backend endpoint override, tenant ID override, or arbitrary `FunctionId` from the browser. Every request is routed strictly by `(resourceKey, actionId)` verified against the compiled server `ResourceCatalog`.
3. Server-only functions (`RestTransport` hooks, `ServerBffHandlerRegistry`, `AuthContextProvider`) reside exclusively in `'server-only'` modules and are excluded from all manifests and resource client chunks.

---

## 30. Performance and Scalability

1. **Zero Monolithic Client Catalogs:** Root bundles carry only `AppClientManifest` (keys, labels, entry points). Full schemas and inline reactive functions load dynamically per route via code-split `ClientResourceChunk`s (`import()`).
2. **Parallel SSR & Non-Blocking Client Reads:** Server Components execute parallel `ApiClient` reads via `RestTransport`; browser reads execute parallel HTTP `GET` requests through `/api/bff/...` with `AbortSignal` cancellation on rapid typing/filtering.
3. **Granular Reactive Subscriptions:** Headless workspace hooks (`useFormWorkspace`, `useGridWorkspace`) separate field-level value subscriptions from toolbar/chrome subscriptions to avoid full-workspace re-renders per keystroke.
4. **No Recursive `Object.freeze` on Zod Instances:** Immutability freezing applies to plain metadata objects (and can be skipped in production builds after Phase B verification), never mutating or freezing Zod internal closures.
5. **Hydration Discipline:** Grid workspaces default relations to `'deferred'` or `'batch'` hydration; `'embedded'` is used intentionally for lightweight summary labels (e.g., `customer.name` on an invoice row) to prevent N+1 browser fetches.

---

## 31. Reference Implementation Examples

All examples below conform strictly to the contracts in Sections 3–30.

### Example A — Minimal Resource

```typescript
// src/resources/crm/customer.schema.ts
import { z } from 'zod';
import { zodSchema, schemaMeta } from '@framework/metamodel';

export const CustomerSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(120),
    taxId: z.string().describe(schemaMeta({ format: 'cnpj', label: 'CNPJ' })),
    email: z.string().email().optional(),
    active: z.boolean().default(true),
  }),
);

// src/resources/crm/customer.resource.ts
import { defineResource } from '@framework/metamodel';
import { CustomerSchema } from './customer.schema';

// Phase A automatically synthesizes:
// - Attributes from CustomerSchema
// - Standard actions: list, get, create, update, delete, new, edit, open
// - Workspaces: browse (grid), record (record), input (form), lookup (lookup)
// - Default REST resource path: 'customers'
export const CustomerResource = defineResource({
  key: 'crm.customer',
  schema: CustomerSchema,
});
```

### Example B — Read-Oriented Resource (Explicit Suppression Shorthand)

```typescript
// src/resources/audit/ledger-entry.resource.ts
import { defineResource } from '@framework/metamodel';
import { LedgerEntrySchema } from './ledger-entry.schema';

export const LedgerEntryResource = defineResource({
  key: 'finance.ledger-entry',
  schema: LedgerEntrySchema,

  // Concise shorthand: suppresses mutation actions AND gracefully suppresses
  // dependent input workspace + 'new'/'edit' navigation actions.
  actions: {
    create: false,
    update: false,
    delete: false,
  },

  // Optionally suppress lookup if never referenced by foreign-key lookups
  workspaces: {
    lookup: false,
  },
});
```

### Example C — Customized Resource

```typescript
// src/resources/sales/invoice.resource.ts
import { z } from 'zod';
import { defineResource, zodSchema, resourceRef, componentRef, message } from '@framework/metamodel';
import { InvoiceSchema } from './invoice.schema';

const IssueInvoiceInputSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    issueDate: z.string(),
    notes: z.string().max(500).optional(),
  }),
);

const customer = resourceRef('crm.customer');

export const InvoiceResource = defineResource({
  key: 'sales.invoice',
  schema: InvoiceSchema,
  displayField: 'number',
  labels: {
    singular: message('invoice.singular', undefined, 'Fatura'),
    plural: message('invoice.plural', undefined, 'Faturas'),
    gender: 'feminine',
  },
  api: {
    resourcePath: 'sales/invoices',
    versionField: 'version',
    generatedFields: ['id', 'createdAt', 'updatedAt'],
  },
  attributes: {
    number: {
      label: message('invoice.number'),
      readOnly: ({ record }) => record.status !== 'draft',
    },
    totalAmount: {
      format: 'currency',
      component: componentRef('ds.currency-input', 'field'),
    },
  },
  relations: {
    customer: {
      target: customer,
      cardinality: 'many-to-one',
      semantics: 'references',
      sourceKey: ['customerId'],
      targetKey: [customer.field('id')],
      hydration: 'embedded',
      lookup: { workspace: customer.workspace('lookup') },
    },
  },
  actions: {
    issue: {
      label: message('invoice.issue'),
      input: IssueInvoiceInputSchema,
      output: InvoiceSchema,
      target: 'record',
      behavior: { type: 'api', operation: 'issue', intent: 'command', idempotent: true },
      confirm: { severity: 'warning', requireReason: true },
      effects: [
        { type: 'invalidate', resources: ['sales.invoice'] },
        { type: 'toast', message: message('invoice.issue.success'), tone: 'success' },
      ],
    },
    open: { label: message('invoice.open') },
  },
  sections: {
    summary: {
      kind: 'fields',
      fields: ['number', 'customer', 'issueDate', 'totalAmount', 'status'],
      columns: 2,
    },
    details: {
      kind: 'tabs',
      tabs: [{ id: 'overview', label: message('common.overview'), section: 'summary' }],
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
});
```

### Example D — Bidirectional Resource Relationships (Zero Circular Runtime Imports)

```typescript
// src/resources/crm/customer.resource.ts
// Notice: ZERO runtime import of invoice.resource.ts!
import { defineResource, resourceRef } from '@framework/metamodel';
import { CustomerSchema } from './customer.schema';

const invoice = resourceRef('sales.invoice');

export const CustomerResource = defineResource({
  key: 'crm.customer',
  schema: CustomerSchema,
  relations: {
    invoices: {
      target: invoice,
      cardinality: 'one-to-many',
      semantics: 'references', // Customer does NOT own Invoice lifecycle
      sourceKey: ['id'],
      targetKey: [invoice.field('customerId')],
      inverse: invoice.relation('customer'),
      hydration: 'deferred',
    },
  },
  sections: {
    invoices: {
      kind: 'relatedCollection',
      relation: 'invoices',
      columns: ['number', 'issueDate', 'totalAmount', 'status'],
      pageSize: 10,
    },
  },
});

// src/resources/sales/invoice.resource.ts
// Notice: ZERO runtime import of customer.resource.ts!
const customer = resourceRef('crm.customer');
// relations.customer declares `inverse: customer.relation('invoices')`
// RegisteredResourceMap resolves types statically without TS7022 or runtime TDZ!
```

### Example E — Conventionally Generated Form (Mode-Free)

When a user triggers `new` or `edit` on `CustomerResource`, `HostController` opens the `input` workspace bound to `'create'` or `'update'`:

```tsx
// Rendered inside FormWorkspaceRenderer (client component)
export function CustomerInputForm({ invocation }: { invocation: WorkspaceInvocation }) {
  // No `mode` property! Bound strictly to canonical action (`create` or `update`).
  const form = useFormWorkspace(invocation);

  return (
    <form onSubmit={(e) => { e.preventDefault(); void form.submit(); }}>
      {form.formModel.sectionOrder.map((sectionId) => (
        <SectionRenderer key={sectionId} sectionId={sectionId} form={form} />
      ))}
      <button type="submit" disabled={form.isSubmitting}>
        {form.action.label}
      </button>
    </form>
  );
}
```

### Example F — Custom Action Form with Action-Specific Relational Input

```typescript
// src/resources/wms/stock-balance.resource.ts
import { z } from 'zod';
import { defineResource, zodSchema, resourceRef, message } from '@framework/metamodel';

const warehouse = resourceRef('wms.warehouse');

const TransferStockInputSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    destinationWarehouseId: z.string().uuid(),
    quantity: z.number().positive(),
    reason: z.string().min(5),
  }),
);

export const StockBalanceResource = defineResource({
  key: 'wms.stock-balance',
  schema: StockBalanceSchema,
  actions: {
    transfer: {
      label: message('stock.transfer'),
      input: TransferStockInputSchema,
      output: StockBalanceSchema,
      target: 'record',
      behavior: { type: 'api', operation: 'transfer', intent: 'command' },
      form: {
        // Action-specific attribute overrides (fields not on StockBalanceSchema)
        attributes: {
          quantity: { label: message('stock.transferQty') },
          reason: { label: message('stock.transferReason') },
        },
        // Action-specific relation descriptor for transient FK input
        relations: {
          destinationWarehouse: {
            target: warehouse,
            cardinality: 'many-to-one',
            sourceKey: ['destinationWarehouseId'],
            targetKey: [warehouse.field('id')],
            lookup: { workspace: warehouse.workspace('lookup') },
          },
        },
        sections: {
          transferFields: {
            kind: 'fields',
            fields: ['destinationWarehouse', 'quantity', 'reason'],
            columns: 1,
          },
        },
      },
      effects: [{ type: 'closeHost' }, { type: 'refresh', target: 'workspace' }],
    },
  },
});
```

### Example G — `REFERENCES` Relationship (Lookup Field)

In Example C (`InvoiceResource`), `customer` is a `many-to-one` `references` relation:
- In `summary` / `input` forms, declaring `'customer'` in `fields` renders a lookup field bound to `crm.customer`'s `lookup` workspace (configured with `quickCreateAction` if enabled).
- Selecting a customer populates `values.customerId` with the selected customer's `id` and displays `customer.name` (derived in Phase B from `CustomerResource.displayField`), while keeping `create`/`update` payloads normalized as `{ customerId, ... }`.

### Example H — `OWNS` Relationship (Parent Workspace + Inline Child Editing)

```typescript
// src/resources/sales/sales-order.resource.ts
import { z } from 'zod';
import { defineResource, zodSchema, resourceRef, message } from '@framework/metamodel';

const OrderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const CreateOrderSchema = zodSchema(
  z.object({
    customerId: z.string().uuid(),
    items: z.array(OrderItemInputSchema).min(1),
  }),
);

const orderItem = resourceRef('sales.order-item');

export const SalesOrderResource = defineResource({
  key: 'sales.order',
  schema: SalesOrderSchema,
  relations: {
    items: {
      target: orderItem,
      cardinality: 'one-to-many',
      semantics: 'owns',
      sourceKey: ['id'],
      targetKey: [orderItem.field('orderId')],
      hydration: 'embedded',
    },
  },
  actions: {
    create: {
      input: CreateOrderSchema,
      form: {
        sections: {
          header: { kind: 'fields', fields: ['customerId'], columns: 2 },
          lineItems: {
            kind: 'editableCollection',
            relation: 'items',
            field: 'items',
            columns: ['productId', 'quantity', 'unitPrice'],
            allowAdd: true,
            allowRemove: true,
          },
        },
      },
    },
  },
  sections: {
    orderItemsView: {
      kind: 'relatedCollection',
      relation: 'items',
      columns: ['product', 'quantity', 'unitPrice', 'lineTotal'],
    },
  },
  workspaces: {
    record: {
      kind: 'record',
      sections: ['orderItemsView'],
    },
  },
});
```

### Example I — Inline Functions (Computed Properties & Reactive Rules)

```typescript
export const OrderItemResource = defineResource({
  key: 'sales.order-item',
  schema: OrderItemSchema,
  attributes: {
    // Extracted in Phase A into LocalFunctionTable as 'sales.order-item::attr.lineTotal.compute'
    // Executes locally in browser on every keystroke; omitted from default create/update input schemas.
    lineTotal: {
      format: 'currency',
      compute: ({ record }) => (record.quantity ?? 0) * (record.unitPrice ?? 0),
    },
    discountReason: {
      hidden: ({ record }) => (record.discountPercent ?? 0) === 0,
      required: ({ record }) => (record.discountPercent ?? 0) > 10,
    },
  },
});
```

### Example J — Typed References Across Resource Boundaries

```typescript
import { resourceRef } from '@framework/metamodel';
import { useAction } from '@framework/runtime-client';

const invoice = resourceRef('sales.invoice');

// All arguments below are checked against `.magesti/resources.d.ts` at compile time:
const issueAction = invoice.action('issue');       // Valid: ActionRef<'sales.invoice', 'issue'>
const browseWs = invoice.workspace('browse');    // Valid: WorkspaceRef<'sales.invoice', 'browse'>
const badAction = invoice.action('isue');        // TS ERROR: '"isue"' is not assignable!
const badField = invoice.field('nonExistent');   // TS ERROR: '"nonExistent"' is not a FieldPath<Invoice>!

function InvoiceToolbarButton({ recordId }: { recordId: string }) {
  const issue = useAction(issueAction);
  return <button onClick={() => issue.execute({ id: recordId, issueDate: '2026-11-13' })}>Emitir</button>;
}
```

### Example K — Next.js BFF and API Client

```typescript
// src/server/catalog.ts ('server-only')
import 'server-only';
import { buildCatalog } from '@framework/metamodel';
import { CustomerResource } from '@application/resources/crm/customer.resource';
import { InvoiceResource } from '@application/resources/sales/invoice.resource';

export const appCatalog = buildCatalog({
  resources: [CustomerResource, InvoiceResource],
});

// src/server/api-client.ts ('server-only')
import 'server-only';
import { createApiClient, createRestTransport } from '@framework/api/server';
import { getServerSession } from './auth';

export const serverApiClient = createApiClient({
  transport: createRestTransport({
    baseUrl: process.env.SIGMA_ERP_API_URL!, // NEVER NEXT_PUBLIC_*
    getContext: async () => {
      const session = await getServerSession();
      return {
        correlationId: crypto.randomUUID(),
        locale: session.locale,
        actor: { id: session.userId, roles: session.roles },
        tenantId: session.tenantId,
        authToken: session.backendAccessToken,
      };
    },
  }),
});

// src/app/api/bff/resources/[resource]/actions/[action]/route.ts
import { createBffRouteHandler } from '@framework/bff-next';
import { appCatalog } from '@/server/catalog';
import { serverApiClient } from '@/server/api-client';
import { requireAuthenticatedSession } from '@/server/auth';

const handler = createBffRouteHandler({
  catalog: appCatalog,
  apiClient: serverApiClient,
  authorizeSession: requireAuthenticatedSession,
});

export { handler as GET, handler as POST };

// src/client/api-client.ts ('use client')
'use client';
import { createApiClient, createBffTransport } from '@framework/api/client';

// Browser ONLY talks to same-origin Next.js BFF; zero backend URLs or tokens!
export const browserApiClient = createApiClient({
  transport: createBffTransport({ basePath: '/api/bff' }),
});
```

### Example L — REST Transport Customization

```typescript
// src/server/rest-transport.ts ('server-only')
import 'server-only';
import { createRestTransport } from '@framework/api/server';

export const sigmaRestTransport = createRestTransport({
  baseUrl: process.env.SIGMA_ERP_API_URL!,
  getContext: resolveServerRequestContext,
  querySerializer: sigmaStandardQuerySerializer,
  responseMapper: sigmaStandardResponseMapper,
  endpoints: {
    'sales.invoice': {
      path: 'v2/billing/invoices',
      keyEncoding: 'path-segments',
      actions: {
        list: { httpMethod: 'POST', path: 'v2/billing/invoices/search' },
        issue: { httpMethod: 'PUT', path: 'v2/billing/invoices/{id}/finalize' },
        exportPdf: {
          httpMethod: 'GET',
          path: 'v2/billing/invoices/{id}/pdf',
          responseType: 'blob',
        },
      },
    },
  },
});
```

### Example M — Full Action Request Lifecycle (End-to-End Trace)

Executing `issue` on `sales.invoice` (`id: 'inv-42'`, `version: 'etag-9'`):
1. `ActionExecutor.execute(invoice.action('issue'), { key: { values: ['inv-42'] }, input: { id: 'inv-42', issueDate: '2026-11-13' }, concurrencyToken: 'etag-9' })`.
2. `HostController` shows confirmation dialog (`severity: 'warning'`, `requireReason: true`); operator enters `"Fiscal month close"`.
3. Client validates input against `IssueInvoiceInputSchema` from lazy `sales.invoice` chunk.
4. `ActionExecutor` builds `ApiRequest`: `{ resource: 'sales.invoice', action: 'issue', operation: 'issue', intent: 'command', target: 'record', key: { values: ['inv-42'] }, input: { id: 'inv-42', issueDate: '2026-11-13' }, contentType: 'json', responseType: 'json' }`.
5. Browser `BffTransport` sends `POST /api/bff/resources/sales.invoice/actions/issue` with `{ key, input, concurrencyToken: 'etag-9', auditReason: 'Fiscal month close' }`.
6. BFF verifies session cookie, resolves `sales.invoice::issue` from `appCatalog`, re-validates `input` against server `IssueInvoiceInputSchema`, and attaches `ServerRequestContext` (`actor`, `tenantId`, `authToken`, `correlationId`).
7. Server `RestTransport` resolves `endpoints['sales.invoice'].actions.issue` -> `PUT https://erp.internal/v2/billing/invoices/inv-42/finalize`, attaches `Authorization: Bearer <token>`, `If-Match: etag-9`, `Idempotency-Key: <uuid>`, `X-Correlation-Id`.
8. Backend returns `200 OK` JSON + `ETag: etag-10` -> `RestTransport` normalizes into `ActionResult<Invoice>` `{ ok: true, data, effects: [...], meta: { concurrencyToken: 'etag-10' } }`.
9. Browser `ActionExecutor` receives `ActionResult`, triggers `toast` ("Fatura emitida") and refreshes active `sales.invoice` workspaces.

### Example N — Custom Workspace Reusing Framework Infrastructure

```tsx
// src/client/workspaces/wave-picking-console.tsx ('use client')
'use client';
import { useEffect, useState } from 'react';
import { resourceRef } from '@framework/metamodel';
import { useCustomWorkspaceContext } from '@framework/runtime-client';

const waveResource = resourceRef('wms.picking-wave');
const productResource = resourceRef('pim.product');

export function WavePickingConsole({ waveId }: { waveId: string }) {
  const { actionExecutor, hostController, notify, t } = useCustomWorkspaceContext();
  const [wave, setWave] = useState<unknown>(null);

  useEffect(() => {
    void actionExecutor
      .execute(waveResource.action('get'), { key: { values: [waveId] } })
      .then((res) => {
        if (res.ok) setWave(res.data);
      });
  }, [waveId, actionExecutor]);

  async function inspectProduct(productId: string) {
    // Reuses standard DrawerHost + RecordWorkspace for pim.product!
    await hostController.openWorkspace({
      resource: productResource.key,
      workspace: productResource.workspace('record').workspace,
      host: 'drawer',
      invocation: {
        resource: productResource.key,
        workspace: productResource.workspace('record').workspace,
        action: productResource.action('get').action,
        recordKey: serializeSingleKey(productId),
      },
    });
  }

  return (
    <section aria-label={t('wms.wavePicking.title')}>
      {/* Custom high-density scanner/picking UI using shared framework services */}
      <button onClick={() => notify({ tone: 'info', message: t('wms.wavePicking.ready') })}>
        {t('wms.wavePicking.confirmWave')}
      </button>
    </section>
  );
}
```

---

## 32. Testing and Conformance Requirements

### 32.1. Minimum Verification Matrix

| Area | Mandatory Test Coverage |
|---|---|
| **Schema Facade** | Optional/nullable fields, defaults, enums, nested objects/arrays, `pick`/`omit`/`partial`/`extend`, `SchemaNode` JSON serializability |
| **Phase A Compiler** | Minimal `key + schema` synthesis, `false` suppression cascades, explicit broken reference rejection, cycle detection, `LocalFunctionTable` extraction |
| **Phase B Catalog** | Cross-resource relation validation, circular `Customer <-> Invoice` resolution, conservative `REFERENCES`/`OWNS` inference, `displayField` derivation, 6-tier precedence |
| **Type Contracts** | Type-level `tsd`/`expectType` tests verifying `FieldPath<T>` rejects invalid keys, `RegisteredResourceMap` autocomplete, and `useFormWorkspace` `I`/`O` inference |
| **API & BFF** | Browser `BffTransport` never receives backend URLs/tokens; BFF rejects unknown actions/client actions; `RestTransport` maps `QuerySpec`, composite keys, `If-Match`, `Idempotency-Key`, errors, multipart, blob |
| **Package Boundaries** | Bundler / ESLint import tests verifying client bundles never import `'server-only'` or `@framework/api/server`, and `@framework/metamodel` never imports React/Next.js |
| **Forms & Workspaces** | Action-bound forms with schemas different from record schema; zero `mode` properties anywhere; `relatedCollection` scoped state; `editableCollection` `OWNS` editing |
| **Hosts & A11y** | Overlay stack, dirty guards across Escape/backdrop/route/back-button, parent destruction settling child promises, focus trap & restoration |

### 32.2. Conformance Rules for AI Coding Agents

1. Implement strictly in dependency order (Section 33); do not build React hosts before Phase A/B compilation and `ApiClient`/BFF contracts stabilize.
2. NEVER reintroduce `ResourceRepository`, `ResourceDataAdapter`, `DataSession`, `TransactionPolicy`, `DataOperation`, `dispatchResourceAction`, `PolicyRegistry`, or `create/edit/view` modes.
3. Keep `ResourceModel` free of React components, server secrets, and mutable state; keep `ClientResourceManifest` strictly JSON-serializable.
4. Every error condition in Section 28.3 MUST fail deterministically with its canonical `DiagnosticCode` or `ActionErrorCode`.

---

## 33. Implementation Roadmap

### 33.1. Mandatory Pre-Implementation Technical Spikes (Time-Boxed)

Before full subsystem implementation, execute these targeted spikes (1–2 days each) to empirically validate high-risk architectural boundaries:

1. **Spike 1 — TypeScript `RegisteredResourceMap` & `FieldPath<T>` Inference:** Validate circular `Customer <-> Invoice` bidirectional typing with zero `TS7022`, depth-4 `FieldPath<T>` autocomplete speed on 50-field schemas, and `I`/`O` inference in `useFormWorkspace`.
2. **Spike 2 — Two-Phase Compilation & Next.js Manifest/Chunk Splitting:** Verify `defineResource()` + `buildCatalog()` producing JSON `RouteClientManifest`s + webpack/turbopack per-resource dynamic `import()` chunks with zero cross-resource bundle bleed and zero `'server-only'` leakage.
3. **Spike 3 — Inline Function Extraction & Local Reactive Evaluation:** Validate deterministic Phase A `FunctionId` extraction and zero-registration browser execution inside `useFormWorkspace` across RSC -> Client boundaries.
4. **Spike 4 — `RestTransport` + Next.js BFF Route Handler Against Sigma Conventions:** Verify `GET`/`POST` `/api/bff/resources/[resource]/actions/[action]` handling `QuerySpec`, composite keys, `If-Match`, `422` `ValidationIssue[]` normalization, and `AbortSignal` cancellation against real Sigma backend envelopes.

### 33.2. Dependency-Ordered Implementation Sequence

1. **Phase 1 — Metamodel Core & Zod Facade (`@framework/metamodel`):** Branded IDs, `FieldPath<T>`, `RuntimeSchema<T>` Zod adapter, `SchemaNode`, `QuerySpec`, `KeyObject` codec, core descriptors.
2. **Phase 2 — Phase A Local Compiler (`defineResource`):** Attribute derivation, standard action generation, `false` suppression rules, local `FormModel` compilation, `LocalFunctionTable` extraction, cycle detection.
3. **Phase 3 — Phase B Catalog & Typed References (`buildCatalog`, `RegisteredResourceMap`):** Cross-resource relation/inverse resolution, conservative `REFERENCES`/`OWNS` inference, 6-tier convention precedence, `ServerArtifacts` & `ClientManifest` generation, `typegen` CLI.
4. **Phase 4 — API Client, `RestTransport`, and Next.js BFF (`@framework/api`, `@framework/bff-next`):** `ApiClient`, `RestTransport` (conventions, overrides, composite keys, error mapping, multipart/blob), `BffTransport`, `/api/bff/...` Route Handler, `AuthContextProvider`, RSC helpers.
5. **Phase 5 — Client Runtime & Component Resolution (`@framework/runtime-client`):** `ClientResourceLoader`, `ComponentRegistry`, `ComponentResolver`, `ActionExecutor`, `Formatters`, `ClientHandlerRegistry`, `CustomWorkspaceRegistry`.
6. **Phase 6 — Headless Workspace & Form Hooks:** `WorkspaceRuntime`, `useGridWorkspace`, `useRecordWorkspace`, `useFormWorkspace` (with inline reactive rules & `editableCollection`), `useLookupWorkspace`, `useRelatedCollection`, `useWizardWorkspace`.
7. **Phase 7 — Hosts & React Integration (`@framework/react`):** `HostController`, `PageHost`, `DialogHost`, `DrawerHost`, Next.js App Router URL sync & dirty guards, accessibility primitives, custom workspace context.
8. **Phase 8 — Diagnostics, Inspection Tooling & Conformance Suite:** `inspectResource()`, `inspectCatalog()`, startup diagnostics formatting, bundle-isolation CI checks, full conformance test suite.

---

**End of Canonical Specification (Revision 1).**
