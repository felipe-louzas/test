# Framework Architecture and Metamodel Specification

**Document type:** Normative implementation specification  
**Status:** Target architecture  
**Version:** 1.0  
**Date:** 12 November 2026  
**Intended audience:** AI coding agents, framework engineers, application engineers, and maintainers  
**Primary platform:** TypeScript, React, and Next.js App Router  

---

## 0. How to use this specification

This document defines the target architecture and the contracts that an implementation must preserve. It is intended to be used as the implementation source of truth by AI coding agents. It consolidates the original framework proposal with the architectural review and resolves the design issues identified there.

The specification distinguishes requirements from illustrative API sketches:

- **MUST** means required for conformance.
- **MUST NOT** means prohibited by the architecture.
- **SHOULD** means the recommended default. Deviations require a deliberate, documented reason.
- **MAY** means optional functionality or an extension point.
- Code examples illustrate the intended public API. Internal names may be refined during implementation, but the semantics and invariants must remain intact.

When a detail is not specified, implement the simplest behavior consistent with the principles below. Do not introduce a second concept that duplicates an existing contract. Prefer typed, explicit references over stringly typed runtime behavior. Prefer conventions over repetitive declarations, but make every convention inspectable and overridable.

### 0.1. Core architectural decisions

The implementation MUST preserve these decisions:

1. A `ResourceDescriptor` is declarative input. `buildModel()` compiles it into an immutable, normalized `ResourceModel`.
2. `buildModel()` is pure. It MUST NOT mutate a global registry, perform I/O, import React, access a database, or execute registered handlers.
3. Every executable capability in a compiled model is represented by one canonical `ActionDefinition`. Standard data operations, domain commands, navigation, and client-side commands use the same action identity and dispatch model.
4. CRUD is not a separate model-level API. There MUST NOT be separate `create`, `read`, `update`, or `delete` permission fields, action collections, workspace defaults, or execution pipelines outside canonical actions.
5. There MUST NOT be create/edit/view modes. A form is bound to an action input contract and invocation context. A record workspace presents a record. A workspace's identity or lifecycle MUST NOT imply a CRUD mode.
6. `WorkspaceDescriptor` and `SectionDescriptor` are different descriptor families, different registries within a model, and different runtime concepts. A section is not independently hostable.
7. A complete relation model MUST support `one-to-one`, `many-to-one`, `one-to-many`, and `many-to-many`, including key mapping, inverse references, ownership, and join models.
8. Cross-model metadata references use stable model keys and are resolved by an explicit immutable `ModelCatalog` after individual models have been compiled.
9. React components, server handlers, policies, validators, rules, and data adapters are resolved through role- and environment-specific registries. The compiled model stores stable IDs and serializable configuration, not implementation instances.
10. The data layer MUST be convention-driven and generic by default. Resource-specific repositories or client callbacks are escape hatches, not prerequisites for ordinary resources.
11. Server authorization, tenant scoping, field policy, validation, and concurrency checks are authoritative. Client-side visibility and capability calculations are presentation aids only.
12. The same model metadata may be imported independently by server and client bundles, but server-only implementations MUST NOT leak into client-importable modules.

---

## 1. Goals, non-goals, and vocabulary

### 1.1. Goals

The framework provides a metamodel-driven, headless-first application foundation for enterprise React and Next.js applications. A developer should be able to declare a resource with a runtime schema and receive, by convention:

- complete attribute metadata;
- canonical standard data actions;
- a conventional browse workspace;
- a conventional record presentation and input workspace when applicable;
- default sections and component mappings;
- query, projection, validation, and relation metadata;
- registry-backed runtime behavior;
- consistent loading, error, authorization, and host behavior.

Developers can then customize any part of the compiled model without forking framework internals. Custom behavior must have an explicit, typed extension point.

### 1.2. Non-goals

The framework is not intended to:

- replace the domain model or dictate the application's business architecture;
- make a TypeScript interface alone a runtime schema;
- make UI metadata an authorization boundary;
- force all persistence into one database or ORM;
- expose arbitrary SQL, arbitrary server functions, or React component instances through shared model metadata;
- turn every visual composition into a hostable workspace;
- automatically infer domain semantics that cannot be known from a schema;
- make all multi-resource business transactions declarative;
- eliminate custom logic where custom logic is genuinely required.

### 1.3. Core terms

| Term | Meaning |
|---|---|
| Resource | A named domain-facing data capability, described by a schema and compiled into a `ResourceModel`. |
| Resource descriptor | Authoring-time declaration of schema, labels, relations, actions, sections, workspaces, and overrides. |
| Resource model | Immutable compiled runtime metadata for one resource. |
| Attribute | A scalar or structured data property represented in the resource schema. |
| Relation | A navigation relationship between two resource models. It is separate from the scalar foreign-key attributes used to persist it. |
| Action | The canonical unit of executable capability. It may query/mutate data, invoke a registered handler, navigate, or orchestrate other actions. |
| Workspace | A hostable, addressable interaction boundary with its own lifecycle and state. |
| Section | A reusable content, layout, or data-view fragment composed inside a workspace or another section. It is not a host target. |
| Host | A presentation container that renders a workspace, such as a page, dialog, or drawer. |
| Model catalog | An immutable application-level graph that resolves cross-model references. |
| Component registry | A client-side registry mapping component IDs and roles to React renderers. |
| Handler registry | An environment-specific registry mapping handler IDs to executable implementations. |
| Data adapter | A persistence/API port implementing generic query and mutation primitives for a resource. |
| Convention | A predictable default synthesized by `buildModel()` or runtime bootstrap when the descriptor omits a detail. |
| Escape hatch | An explicit supported override for behavior that cannot reasonably be expressed by conventions. |

---

## 2. Architecture and package boundaries

### 2.1. Logical architecture

```text
AUTHORING MODULES
  Runtime schema + ResourceDescriptor
              |
              v
METAMODEL COMPILER
  buildModel() -> immutable ResourceModel
              |
              v
APPLICATION COMPOSITION
  buildCatalog(models) -> immutable ModelCatalog
              |
       +------+---------------------------+
       |                                  |
       v                                  v
SERVER RUNTIME                       CLIENT RUNTIME
  ActionDispatcher                    WorkspaceRuntime
  ServerHandlerRegistry               HostManager
  DataAdapterRegistry                 ClientHandlerRegistry
  PolicyRegistry                      ComponentRegistry
  ValidatorRegistry                   Headless hooks
  Audit / transaction services        Presentation bindings
       |                                  |
       v                                  v
Database / API                     Design-system components
```

The `ResourceModel` is metadata, not an execution container. The `ModelCatalog` is the application graph. The action dispatcher owns execution of canonical actions. The data adapter owns persistence translation. The client workspace runtime owns interaction state. The host manager owns presentation lifecycle. The component registry resolves visual implementations.

### 2.2. Package boundaries

The implementation SHOULD use package boundaries that enforce the architecture at import time.

| Package | Owns | MUST NOT depend on |
|---|---|---|
| `@framework/metamodel` | Types, runtime-schema abstraction, descriptor compiler, `ResourceModel`, `ModelCatalog`, diagnostics, reference types | React, Next.js, database drivers, browser APIs, secrets, server handler implementations |
| `@framework/runtime-server` | Action dispatcher, server handlers, data adapters, policy and validator execution, transactions, audit, trusted request context | React components, browser APIs, client host state |
| `@framework/runtime-client` | Workspace runtime, headless hooks, host manager, client action runtime, component resolution | Database drivers, server secrets, server handler implementations |
| `@framework/react` | Generic React hosts and generic component bindings, if maintained separately | Application-specific design-system implementations |
| `@application/design-system` | Concrete workspace, section, field, cell, filter, and action renderers | Server-only implementation packages |
| `@application/models` | Resource schemas and descriptors; compiled model exports | Server-only handler implementations and React component instances |
| `@application/server` | Server bootstrap, action handlers, policies, adapters, static server dispatch entry points | Client-only handlers and components |
| `@application/client` | Component registry, client action handlers, client bootstrap, application shell | Server-only implementations |

A shared model file MUST contain only serializable metadata, schema objects that are safe for both environments, and stable references. It MUST NOT embed server handlers, database instances, React component instances, or request-scoped state.

### 2.3. Import and serialization boundaries

Server and client code may import the same model module independently. The framework MUST NOT serialize a `ResourceModel` instance through the React Server Component boundary. Server Components should pass plain data plus stable identifiers such as `modelKey` and `workspaceId` to Client Components.

Functions in descriptors are discouraged because they become part of the shared module graph. Any rule, handler, validator, formatter, or client callback with meaningful implementation should normally be represented by a registry ID. Declarative expression ASTs may be used for simple, serializable rules.

---

## 3. Identifiers, references, and type safety

### 3.1. Branded identifiers

Use branded string types to prevent accidental interchange of identifiers:

```typescript
type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type ModelKey = Brand<string, 'ModelKey'>;
export type AttributeKey = Brand<string, 'AttributeKey'>;
export type RelationId = Brand<string, 'RelationId'>;
export type ActionId = Brand<string, 'ActionId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type SectionId = Brand<string, 'SectionId'>;
export type ComponentKey = Brand<string, 'ComponentKey'>;
export type HandlerId = Brand<string, 'HandlerId'>;
export type PolicyId = Brand<string, 'PolicyId'>;
export type ValidatorId = Brand<string, 'ValidatorId'>;
export type RuleId = Brand<string, 'RuleId'>;
export type AdapterKey = Brand<string, 'AdapterKey'>;
export type SerializedKey = Brand<string, 'SerializedKey'>;
```

Public helper functions SHOULD create branded values without requiring unsafe casts:

```typescript
modelKey('sales.invoice');
actionId('create');
workspaceId('browse');
sectionId('summary');
componentKey('design-system.currency-input');
handlerId('invoice.issue');
```

Namespaced model keys SHOULD be stable and globally unique within an application, for example `sales.invoice`, `crm.customer`, and `warehouse.location`.

### 3.2. Typed references

Within a descriptor, local references SHOULD use IDs inferred from the resource's literal keys. Cross-resource references use an explicit model key plus a local ID.

```typescript
interface ModelRef { readonly model: ModelKey }
interface ActionRef<I = unknown, O = unknown> {
  readonly model: ModelKey;
  readonly action: ActionId;
  /** Type-only association populated by typed actionRef helpers; not serialized. */
  readonly __contract?: { readonly input: I; readonly output: O };
}
interface WorkspaceRef<R = unknown> {
  readonly model: ModelKey;
  readonly workspace: WorkspaceId;
  /** Type-only association for host result typing; not serialized. */
  readonly __result?: R;
}
interface SectionRef { readonly model: ModelKey; readonly section: SectionId }
interface RelationRef { readonly model: ModelKey; readonly relation: RelationId }
interface ComponentRef<R extends ComponentRole = ComponentRole> {
  readonly key: ComponentKey;
  readonly role?: R;
}
```

A local reference may be authored as a short string for ergonomics and normalized into a full typed reference during compilation. Cross-model references MUST be resolvable by `ModelCatalog`.

### 3.3. Field and relation paths

Do not use unrestricted `string` or `keyof T | string` for field traversal.

- `FieldPath<T>` identifies a scalar or structured property path in the resource schema.
- `RelationPath<T>` identifies one or more named navigation relations.
- `ValuePath<T>` is the union of a valid field path and a valid relation path where a workspace can display either.

Nested object and array paths MUST support path-aware validation errors. Relation traversal MUST be bounded by projection/query depth limits.

### 3.4. Avoid caller-selected generic casts

Lookup methods SHOULD infer the return type from the reference or literal identifier. Do not define methods that allow callers to select an arbitrary generic type independent of the registered model, since that creates an unsafe cast disguised as type safety.

Where TypeScript cannot validate cross-resource references because the full model catalog is not statically known, `buildCatalog()` MUST validate those references at bootstrap or build time.

---

### 3.5. Shared type vocabulary

The following shared types are used throughout the public contracts. Implementations may refine their internal representation but must preserve their semantics.

```typescript
export type SerializableScalar = string | number | boolean | null;
export type SerializableValue =
  | SerializableScalar
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue };

export type ScalarType =
  | 'string' | 'number' | 'integer' | 'boolean'
  | 'date' | 'instant' | 'time' | 'uuid' | 'decimal'
  | 'object' | 'array' | 'unknown';

export type SemanticFormat =
  | 'text' | 'rich-text' | 'currency' | 'percentage'
  | 'cpf' | 'cnpj' | 'cpf-cnpj' | 'cep' | 'phone'
  | 'email' | 'url' | 'color' | 'duration'
  | (string & {});

export interface MessageDescriptor {
  readonly key: string;
  readonly values?: Readonly<Record<string, SerializableValue>>;
  /** Optional literal fallback when no catalog entry is found. */
  readonly fallback?: string;
}
/** A plain string is literal display text; use message('catalog.key') for catalog lookup. */
export type MessageRef = string | MessageDescriptor;

export function message(
  key: string,
  values?: Readonly<Record<string, SerializableValue>>,
  fallback?: string,
): MessageDescriptor;
export function modelKey(value: string): ModelKey;
export function actionId(value: string): ActionId;
export function workspaceId(value: string): WorkspaceId;
export function sectionId(value: string): SectionId;
export function componentKey(value: string): ComponentKey;
export function handlerId(value: string): HandlerId;
export function policy(value: string): PolicyRef;
export function rule<T = unknown>(value: string): RuleRef<T>;
export function componentRef<R extends ComponentRole>(key: string, role: R): ComponentRef<R>;

export interface RuleRef<T = unknown> {
  readonly rule: RuleId;
  readonly fallback?: T;
}

export interface PolicyRef { readonly policy: PolicyId }
export interface ValidatorRef { readonly validator: ValidatorId }
export interface FieldPolicyRef { readonly policy: PolicyId }
export interface RelationPolicyRef { readonly policy: PolicyId }

export type RuleExpression =
  | { readonly op: 'equals'; readonly path: FieldPath; readonly value: SerializableValue }
  | { readonly op: 'notEquals'; readonly path: FieldPath; readonly value: SerializableValue }
  | { readonly op: 'and' | 'or'; readonly terms: readonly RuleExpression[] }
  | { readonly op: 'not'; readonly term: RuleExpression }
  | { readonly op: 'isPresent'; readonly path: FieldPath }
  | { readonly op: 'compare'; readonly path: FieldPath; readonly comparator: 'gt' | 'gte' | 'lt' | 'lte'; readonly value: number | string };

export interface KeyComponent<T = unknown> {
  readonly field: FieldPath<T>;
  readonly type: ScalarType;
}
export interface KeyDescriptor<T> {
  readonly components: readonly KeyComponent<T>[];
}
export type KeyDescriptorInput<T> =
  | FieldPath<T>
  | readonly FieldPath<T>[]
  | KeyDescriptor<T>;

export type FieldPath<T = unknown> = string & { readonly __fieldPath?: T };
export type RelationPath<T = unknown> = string & { readonly __relationPath?: T };
export type ValuePath<T = unknown> = FieldPath<T> | RelationPath<T>;

export interface ReadonlyLookup<K extends string, V> {
  has(key: K): boolean;
  get(key: K): V | undefined;
  require(key: K): V;
  keys(): readonly K[];
  values(): readonly V[];
  entries(): readonly (readonly [K, V])[];
}

export interface ResourceLabels {
  singular?: MessageRef;
  plural?: MessageRef;
  gender?: 'masculine' | 'feminine' | 'neuter';
  grammaticalCase?: string;
  forms?: Readonly<Record<string, MessageRef>>;
}

export type DataOperation = 'query' | 'get' | 'insert' | 'patch' | 'remove';

export interface ResourceDataOptions {
  /** Defaults from application conventions; buildModel does not query adapter capabilities. */
  operations?: readonly DataOperation[];
  softDelete?: false | { field: FieldPath; deletedValue?: SerializableValue; activeValue?: SerializableValue };
  versionField?: FieldPath;
  query?: {
    maxPageSize?: number;
    maxRelationDepth?: number;
    maxAstDepth?: number;
    maxTerms?: number;
    defaultPageSize?: number;
  };
  adapterOptions?: SerializableValue;
}

export interface CompiledResourceDataOptions extends ResourceDataOptions {
  readonly operations: readonly DataOperation[];
  readonly adapter?: AdapterKey;
}

export interface ResourcePolicyDefaults {
  defaultAction?: PolicyRef;
  defaultReadableFields?: readonly FieldPath[];
  defaultWritableFields?: readonly FieldPath[];
}

export interface ConventionOverrides {
  defaultPageSize?: number;
  defaultHost?: HostKind;
  excludeFromDefaultLayout?: readonly FieldPath[];
  includeInDefaultSearch?: readonly FieldPath[];
  defaultOperations?: readonly DataOperation[];
  defaultComponentMappings?: Readonly<Record<string, ComponentKey>>;
}

export interface ResourceEntryPoints {
  browse?: WorkspaceId;
  record?: WorkspaceId;
  input?: WorkspaceId;
  lookup?: WorkspaceId;
}

export interface SchemaNode {
  readonly kind: ScalarType | 'enum' | 'literal' | 'union' | 'optional' | 'nullable' | 'object' | 'array';
  readonly optional?: boolean;
  readonly nullable?: boolean;
  readonly properties?: Readonly<Record<string, SchemaNode>>;
  readonly requiredProperties?: readonly string[];
  readonly items?: SchemaNode;
  readonly values?: readonly SerializableValue[];
  readonly constraints?: Readonly<Record<string, SerializableValue>>;
  readonly defaultValue?: SerializableValue;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export interface ModelCompileReport {
  readonly generated: readonly CompileProvenance[];
  readonly overridden: readonly CompileProvenance[];
  readonly diagnostics: readonly ModelDiagnostic[];
}

export interface CompileProvenance {
  readonly path: string;
  readonly source: 'schema' | 'convention' | 'application-default' | 'resource-override';
  readonly description: string;
}

export interface ModelDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly modelKey?: ModelKey;
  readonly path: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ValidationResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly issues: readonly ValidationIssue[];
}

export interface DataAdapterCapabilities {
  readonly operations: readonly DataOperation[];
  readonly transactions?: boolean;
  readonly relations?: boolean;
  readonly bulk?: boolean;
  readonly optimisticConcurrency?: boolean;
  readonly streaming?: boolean;
}

export type CreateInput<T> = Partial<T>;
export type UpdateInput<T> = Partial<T>;

export interface QueryResult<T> {
  readonly items: readonly T[];
  readonly page?: { readonly size: number; readonly nextCursor?: string; readonly index?: number };
  readonly total?: number;
  readonly totalKind?: 'exact' | 'estimated';
}

export interface SortTerm {
  readonly path: FieldPath;
  readonly direction: 'asc' | 'desc';
  readonly nulls?: 'first' | 'last';
}

export interface MutationOptions {
  readonly expectedVersion?: SerializableScalar;
  readonly idempotencyKey?: string;
  readonly auditReason?: string;
}

export interface DataContext {
  readonly actor: TrustedActor;
  readonly tenant?: TrustedTenant;
  readonly correlationId: string;
  readonly locale: string;
  readonly session?: DataSession;
}

export interface TrustedActor {
  readonly id: string;
  readonly permissions?: ReadonlySet<string>;
  readonly attributes?: Readonly<Record<string, SerializableValue>>;
}

export interface TrustedTenant {
  readonly id: string;
  readonly attributes?: Readonly<Record<string, SerializableValue>>;
}

export interface DataSession { readonly id: string; readonly adapterKey: AdapterKey }

export interface ServerActionContext extends DataContext {
  readonly model: ResourceModel<unknown>;
  readonly action: ActionDefinition<unknown, unknown>;
  readonly services: ServerServiceContainer;
}

export interface ClientActionContext {
  readonly modelKey: ModelKey;
  readonly actionId: ActionId;
  readonly invocation: WorkspaceInvocation;
  readonly locale: string;
  readonly hostFrameId?: string;
  readonly services: ClientServiceContainer;
}

export interface ServerServiceContainer {
  readonly adapters: DataAdapterRegistry;
  readonly policies: PolicyRegistry;
  readonly validators: ValidatorRegistry;
}
export interface ClientServiceContainer {
  readonly hosts: HostManager;
  readonly actionInvoker: ClientActionInvoker;
}

export interface PolicyContext {
  readonly model: ResourceModel<unknown>;
  readonly action: ActionDefinition<unknown, unknown>;
  readonly actor: TrustedActor;
  readonly tenant?: TrustedTenant;
  readonly recordKey?: KeyObject<unknown>;
  readonly input?: unknown;
  readonly correlationId: string;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly rowFilter?: QueryExpression;
  readonly readableFields?: readonly FieldPath[];
  readonly writableFields?: readonly FieldPath[];
}

export type PolicyImplementation = (context: PolicyContext) => PolicyDecision | Promise<PolicyDecision>;
export type DomainValidator = (
  input: unknown,
  context: ServerActionContext,
) => readonly ValidationIssue[] | Promise<readonly ValidationIssue[]>;

export interface TransactionPolicy { readonly required?: boolean; readonly isolation?: 'read-committed' | 'repeatable-read' | 'serializable' }
export interface IdempotencyPolicy { readonly required?: boolean; readonly ttlSeconds?: number }
export interface ConcurrencyPolicy { readonly strategy?: 'none' | 'optimistic'; readonly versionField?: FieldPath }
export interface AuditPolicy { readonly enabled: boolean; readonly includeInput?: boolean; readonly reasonRequired?: boolean }
export interface ConfirmationDescriptor { readonly severity?: 'info' | 'warning' | 'danger'; readonly title?: MessageRef; readonly description?: MessageRef; readonly confirmLabel?: MessageRef; readonly cancelLabel?: MessageRef }

export type ActionEffect =
  | { readonly type: 'toast'; readonly message: MessageRef; readonly tone?: 'success' | 'info' | 'warning' | 'error' }
  | { readonly type: 'invalidate'; readonly resources?: readonly ModelKey[]; readonly records?: readonly { model: ModelKey; key: SerializedKey }[]; readonly tags?: readonly string[] }
  | { readonly type: 'refresh'; readonly target?: 'current' | 'workspace' | 'resource' }
  | { readonly type: 'closeHost'; readonly result?: SerializableValue }
  | { readonly type: 'navigate'; readonly workspace: WorkspaceRef; readonly host?: HostKind };

export interface ActionResultMeta {
  readonly correlationId?: string;
  readonly version?: SerializableScalar;
  readonly total?: number;
  readonly nextCursor?: string;
}

export type RecordMapping =
  | 'current-record'
  | 'empty-record'
  | { readonly kind: 'map'; readonly fields: Readonly<Record<string, FieldPath>> };

export interface RelationContext {
  readonly relation: RelationRef | RelationId;
  readonly parentKey: SerializedKey;
}

export interface GridColumnDescriptor<T = unknown> {
  readonly field?: ValuePath<T>;
  readonly label?: MessageRef;
  readonly width?: number | string;
  readonly align?: 'left' | 'center' | 'right';
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly pinned?: 'left' | 'right';
  readonly component?: ComponentRef<'cell'>;
}

export interface FieldPresentationDescriptor<T = unknown> {
  readonly field: ValuePath<T>;
  readonly component?: ComponentRef<'field'>;
  readonly span?: 1 | 2 | 3 | 4 | 6 | 12;
  readonly label?: MessageRef;
  readonly hidden?: RuleRef<boolean>;
  readonly readOnly?: RuleRef<boolean>;
}

export interface SummaryItemDescriptor<T = unknown> {
  readonly field: ValuePath<T>;
  readonly label?: MessageRef;
  readonly component?: ComponentRef<'field' | 'cell'>;
}

export interface WizardStepDescriptor<T = unknown> {
  readonly id: string;
  readonly title: MessageRef;
  readonly description?: MessageRef;
  readonly section?: SectionId;
  readonly workspace?: WorkspaceId;
  readonly validateOnNext?: boolean;
  readonly canSkip?: boolean;
  readonly visible?: RuleRef<boolean>;
}

export interface ActivitySourceRef {
  readonly model: ModelKey;
  readonly source: string;
}

export interface ComponentCapability {
  readonly name: string;
  readonly values?: readonly string[];
}

export interface ComponentRequest {
  readonly role: ComponentRole;
  readonly explicit?: ComponentKey;
  readonly semanticType?: ScalarType | string;
  readonly format?: SemanticFormat;
  readonly relationCardinality?: string;
  readonly capabilities?: readonly ComponentCapability[];
}

export interface ResolvedComponent<P = unknown> {
  readonly definition: ComponentDefinition<P>;
  readonly props: Readonly<P>;
  readonly source: 'explicit' | 'application' | 'design-system' | 'fallback';
}

export interface CapabilitySnapshot {
  readonly allowedActions: ReadonlySet<ActionId>;
  readonly deniedActions: ReadonlyMap<ActionId, string>;
}

export interface PageState {
  readonly index?: number;
  readonly size: number;
  readonly cursor?: string;
}

export interface ClientActionInvoker {
  execute<I, O>(ref: ActionRef<I, O>, input: I): Promise<ActionResult<O>>;
}

export interface FrameworkError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, SerializableValue>>;
}

export type AttributeOverrides<T> = Partial<{ [K in keyof T]: Partial<AttributeDescriptor<T, FieldPath<T>>> }>;
export type RelationDescriptorMap<T> = Readonly<Record<string, RelationDescriptor<T>>>;
export type SectionDescriptorMap<T> = Readonly<Record<string, SectionDescriptor<T>>>;
export type WorkspaceDescriptorMap<T> = Readonly<Record<string, WorkspaceDescriptor<T>>>;
export type ActionOverrides<T> = Readonly<Record<string, ActionDefinition | Partial<ActionDefinition>>>;
```

The `FieldPath<T>` and map aliases above are intentionally schematic at the type level: implementation should use the strongest practical recursive TypeScript utility types supported by the chosen schema library. Runtime compilation is still mandatory because static types cannot validate references across independently imported models.

### 3.6. Compiled and resolved type contracts

The following names are used by the public API and should have concrete implementations rather than being left as application-specific placeholders.

```typescript
export interface CompiledAttribute<T, K extends FieldPath<T> = FieldPath<T>> {
  readonly key: K;
  readonly storageType: ScalarType;
  readonly optional: boolean;
  readonly nullable: boolean;
  readonly defaultValue?: SerializableValue;
  readonly format?: SemanticFormat;
  readonly descriptor: AttributeDescriptor<T, K>;
}

export interface CompiledRelation<T> extends RelationDescriptor<T> {
  readonly id: RelationId;
  readonly target: ModelKey;
}

export type ActionDefinitionMap<T> = ActionDefinition<unknown, unknown>;
export type SectionDescriptorMap<T> = SectionDescriptor<T>;
export type WorkspaceDescriptorMap<T> = WorkspaceDescriptor<T>;

export type FieldKey<T> = FieldPath<T>;
export type RelationKey<T> = RelationId;
export type ActionKey<T> = ActionId;
export type WorkspaceKey<T> = WorkspaceId;
export type SectionKey<T> = SectionId;

export type ActionDefinitionFor<T, K extends ActionKey<T>> = ActionDefinition<unknown, unknown> & { readonly id: K };
export type WorkspaceDescriptorFor<T, K extends WorkspaceKey<T>> = WorkspaceDescriptor<T> & { readonly id: K };
export type SectionDescriptorFor<T, K extends SectionKey<T>> = SectionDescriptor<T> & { readonly id: K };

export interface DefaultValueContext {
  readonly locale: string;
  readonly timeZone?: string;
  readonly now: string;
  readonly params?: SerializableValue;
}

export interface ResolvedAction {
  readonly model: ResourceModel<unknown>;
  readonly definition: ActionDefinition<unknown, unknown>;
}
export interface ResolvedWorkspace {
  readonly model: ResourceModel<unknown>;
  readonly descriptor: WorkspaceDescriptor<unknown>;
}
export interface ResolvedSection {
  readonly model: ResourceModel<unknown>;
  readonly descriptor: SectionDescriptor<unknown>;
}
export interface ResolvedRelation {
  readonly sourceModel: ResourceModel<unknown>;
  readonly descriptor: CompiledRelation<unknown>;
  readonly targetModel: ResourceModel<unknown>;
}
```

The generic aliases above are a minimum contract. Implementations SHOULD preserve stronger literal inference when the full descriptor type is available. `ResourceModel` lookups must still validate IDs at runtime.

## 4. Runtime schemas and resource typing

### 4.1. A runtime schema is mandatory

A TypeScript interface is erased at runtime and cannot supply requiredness, nullability, defaults, enum values, nested shape, or validation. A `ResourceDescriptor` MUST therefore include an inspectable runtime schema.

The framework SHOULD adopt a vendor-neutral schema facade compatible with a standard runtime validation contract. A Zod adapter or equivalent is acceptable, but the metamodel MUST NOT depend on one vendor-specific API.

### 4.2. Required schema capabilities

The runtime schema abstraction MUST expose:

1. Parsing and safe parsing of unknown input.
2. A normalized schema tree that can be inspected by the metamodel compiler.
3. Property names and nested object shape.
4. Scalar type, requiredness, optionality, nullability, enum/literal values, and defaults where known.
5. Structural constraints such as minimum/maximum, string length, patterns, and array item shape where known.
6. A way to preserve vendor-specific metadata without making it part of the core metamodel contract.

Illustrative contract:

```typescript
interface RuntimeSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; issues: readonly ValidationIssue[] };
  inspect(): SchemaNode;
}

type InferSchema<S> = S extends RuntimeSchema<infer T> ? T : never;
```

The implementation MAY adapt a third-party schema library into this facade. `inspect()` must return a normalized representation and must not expose mutable internal structures.

### 4.3. Persisted shape versus relation navigation

The resource schema describes persisted or command/query data. Relation navigation is modeled separately in `ResourceDescriptor.relations`.

For example:

```typescript
interface Invoice {
  id: string;
  customerId: string;
  number: string;
  issueDate: string;
  totalAmount: number;
}
```

`customerId` is a scalar foreign-key attribute. `customer` is not a second scalar property; it is a relation declared in `relations`. A projection may return an expanded view such as `Invoice & { customer?: CustomerSummary }`, but that hydrated shape does not change the persisted schema.

This separation prevents the framework from treating a foreign-key value as if it were a navigation object or from requiring the persistence schema to duplicate expanded relation structures.

---

## 5. Resource descriptor and convention-over-configuration

### 5.1. Minimal authoring form

The initial descriptor MUST be small. The common case should require only a stable key and runtime schema:

```typescript
export const CustomerModel = buildModel({
  key: 'crm.customer',
  schema: CustomerSchema,
});
```

The compiler supplies conventional attributes, standard actions, workspaces, sections, projections, and semantic presentation requirements. Concrete React renderers are resolved later by the client `ComponentRegistry`; `buildModel()` does not import or query that registry. Developers add only information that cannot be inferred safely:

```typescript
export const CustomerModel = buildModel({
  key: 'crm.customer',
  schema: CustomerSchema,
  attributes: {
    legalName: { label: 'Razão social', format: 'text' },
    taxId: { label: 'CNPJ', format: 'cnpj' },
  },
  relations: {
    accountManager: {
      target: 'hr.employee',
      cardinality: 'many-to-one',
      sourceKey: ['accountManagerId'],
      targetKey: ['id'],
      nullable: true,
    },
  },
});
```

### 5.2. Descriptor contract

The following is the conceptual public shape. The implementation should keep it strongly typed and infer its record type from `schema`.

```typescript
interface ResourceDescriptor<S extends RuntimeSchema<any>> {
  key: ModelKey | string;
  schema: S;
  labels?: ResourceLabels;
  primaryKey?: KeyDescriptorInput<InferSchema<S>>;
  adapter?: AdapterKey | string;
  data?: ResourceDataOptions;
  attributes?: AttributeOverrides<InferSchema<S>>;
  relations?: RelationDescriptorMap<InferSchema<S>>;
  actions?: ActionOverrides<InferSchema<S>>;
  sections?: SectionDescriptorMap<InferSchema<S>>;
  workspaces?: WorkspaceDescriptorMap<InferSchema<S>>;
  policies?: ResourcePolicyDefaults;
  defaults?: ResourceEntryPoints;
  conventions?: ConventionOverrides;
  metadata?: Readonly<Record<string, SerializableValue>>;
}
```

`ResourceDataOptions` may declare supported data operations, default query policy, key mapping, soft-delete behavior, or adapter-specific serializable options. It must not contain database connections or executable adapter instances.

`metadata` is for application-defined serializable extension data. Framework behavior MUST NOT depend on untyped metadata keys. Any extension that becomes a framework-level contract must receive a typed field. For an action ID already generated by convention, an action override may be partial. This includes reserved navigation IDs (`new`, `edit`, `open`): if the compiler generates the corresponding navigation action, the descriptor entry is merged onto it; if no conventional navigation action can be generated, the descriptor entry is treated as a custom action and MUST provide the complete canonical contract (`input`, `target`, and `behavior` at minimum). This requirement is checked by the compiler even if the authoring type cannot distinguish the two cases perfectly.

### 5.3. Conventions generated by `buildModel()`

Given only `key` and an inspectable `schema`, `buildModel()` MUST synthesize the following unless explicitly disabled or overridden:

| Concern | Default convention | Explicit override |
|---|---|---|
| Identity | Model key is stable and namespaced. Human-readable names are derived from the key. | Explicit labels, route key, localization messages. |
| Primary key | Use schema metadata or configured conventional key detection (`id` by default). | Explicit `primaryKey`. Missing or ambiguous key is a compile error for identity-dependent actions. |
| Attributes | One attribute descriptor for every schema property; infer scalar type, nullability, requiredness, defaults, enum options, and nested structure. | Label, format, description, hidden, component, behavior, field policy, search/filter/sort options. |
| Labels | Humanize property names and resource key. | Localized message references and field labels. |
| Field component | Resolve from semantic type and format through the client component registry. | Explicit component key or workspace-specific rendering override. |
| Grid columns | Visible displayable scalar attributes and relation display attributes in schema order. Omit technical fields according to a documented convention. | Explicit column set, ordering, widths, sort/filter capability, pinned columns, custom cell. |
| Search | Safe text-like properties may be included only when search policy permits. | Explicit searchable fields and per-resource search strategy. |
| Filters and sorting | Enable only operators compatible with the field type and policy. | Explicit filter/sort settings. |
| Data actions | Generate canonical standard actions for declared data capabilities. | Disable operation, replace handler, schema, policy, labels, effects. |
| Browse workspace | Generate when collection query capability exists. | Full workspace override. |
| Input workspace | Generate when create or update action exists. It is action-bound, never mode-bound. | Explicit field layout and section composition. |
| Record workspace | Generate when record query capability exists. | Explicit sections and host preference. |
| Lookup workspace | Generate when collection query and selection capability exist. | Lookup filters, columns, selection behavior. |
| Sections | Generate a minimal field group and summary section when required by a workspace. | Explicit field groups, summary, relation, tabs, accordion, activity, or custom sections. |
| Projection | Derive from workspace and section content, including only required relation display projections. | Explicit additional fields, lazy relation strategy, server-side projection policy. |
| Validation | Reuse runtime schema constraints and shared refinements. | Named server validators and cross-resource rules. |

The exact set of generated workspaces may depend on action availability. A model without a primary key can still be queryable as a collection but MUST NOT receive record-specific actions that require an identity.

### 5.4. `buildModel()` compilation pipeline

`buildModel()` MUST apply conventions in the final compiled `ResourceModel`, not leave the runtime to repeatedly interpret a raw descriptor.

The compiler pipeline is:

1. **Normalize identity:** validate and normalize `ModelKey`, labels, primary-key declaration, and default options.
2. **Inspect schema:** build a complete normalized attribute tree from `RuntimeSchema.inspect()`.
3. **Compile attributes:** infer storage types, nullability, requiredness, constraints, enum values, defaults, and semantic metadata.
4. **Apply attribute overrides:** merge explicit labels, formats, behavior, component references, and policies with inferred metadata.
5. **Compile relations:** normalize relation cardinality and key mappings; validate local source keys and local relation IDs. Defer cross-model target and inverse checks to `buildCatalog()`.
6. **Generate standard data actions:** create canonical `ActionDefinition` entries for each declared data operation.
7. **Apply data-action overrides and custom commands:** resolve overrides for standard data actions and add custom non-navigation actions. Preserve explicit overrides for reserved navigation IDs until those generated actions are available.
8. **Generate default sections:** synthesize field-group/summary fragments required by generated workspaces.
9. **Generate default workspaces:** synthesize conventional browse, record, input, and lookup workspaces when corresponding effective data actions/capabilities exist.
10. **Apply section/workspace overrides:** merge keyed declarations using the deterministic rules below.
11. **Generate navigation actions:** generate `new`, `edit`, and `open` only after final workspace availability and effective data-action state are known. Merge any explicit override for a generated navigation ID; preserve a complete custom action if no conventional target is available.
12. **Compile dependency graphs:** validate rule/computed dependencies, topologically sort them, and reject cycles.
13. **Compile projections and query capabilities:** derive typed projection plans and type-aware operators; validate field and relation paths.
14. **Validate local references:** actions, placements, workspaces, sections, relations, fields, and component roles known locally.
15. **Freeze output:** create an immutable `ResourceModel` whose maps, arrays, descriptors, and nested metadata cannot be mutated through public references.
16. **Return diagnostics/report:** provide compile diagnostics and provenance through an inspectable report or `inspectModel()` API.

`buildModel()` MUST be deterministic for equivalent inputs. It MUST NOT mutate the input descriptor and MUST NOT register itself globally.

### 5.5. Override and merge semantics

The framework MUST define merge semantics; a vague deep merge is prohibited.

- Defaults are generated first.
- Explicit descriptor values are applied second.
- Keyed maps (`attributes`, `relations`, `actions`, `sections`, `workspaces`) merge by key.
- An attribute override merges property-by-property with inferred attribute metadata.
- A custom action with an existing generated ID overrides that action's declared properties; its `behavior` is replaced as a complete discriminated value when supplied.
- Sections and workspaces with an existing ID replace the generated descriptor for that ID, except for fields explicitly documented as mergeable.
- Arrays replace defaults by default. They MUST NOT be concatenated implicitly.
- `undefined` means “not supplied.” Explicit `null` means “clear this optional value” only where the field contract allows clearing.
- Removing a convention-generated capability should be done through a typed convention/data capability option, not by mutating the compiled model.
- The compiler report MUST show which convention supplied a value and which override replaced it.

A future implementation MAY provide explicit `extend` or `replace` helpers. It MUST NOT make merging dependent on accidental object-spread order.

### 5.6. Convention configuration and escape hatches

Conventions may be adjusted at application composition level and resource level. The precedence MUST be deterministic:

1. framework base conventions;
2. selected design-system defaults;
3. application-level convention overrides;
4. resource-level convention overrides;
5. explicit descriptor overrides;
6. invocation-level supported overrides.

Invocation-level overrides MUST NOT bypass authorization, schema validation, or registry role validation.

---

## 6. Compiled `ResourceModel`

### 6.1. Responsibilities

`ResourceModel<T>` is the immutable, normalized representation of one resource. It contains:

- model identity and localization metadata;
- normalized runtime schema and attribute metadata;
- relation descriptors;
- canonical actions;
- sections and workspaces;
- data capabilities and adapter reference;
- defaults/entry points;
- compiled dependency graphs and projection plans;
- a compile report/provenance snapshot.

It does not contain React components, server handlers, database connections, host state, request actor state, or mutable caches.

### 6.2. Public API

Illustrative interface:

```typescript
interface ResourceModel<T> {
  readonly key: ModelKey;
  readonly labels: Readonly<ResourceLabels>;
  readonly schema: RuntimeSchema<T>;
  readonly primaryKey?: KeyDescriptor<T>;
  readonly attributes: ReadonlyLookup<AttributeKey, CompiledAttribute<T>>;
  readonly relations: ReadonlyLookup<RelationId, CompiledRelation<T>>;
  readonly actions: ReadonlyLookup<ActionId, ActionDefinitionMap<T>>;
  readonly sections: ReadonlyLookup<SectionId, SectionDescriptor<T>>;
  readonly workspaces: ReadonlyLookup<WorkspaceId, WorkspaceDescriptor<T>>;
  readonly data: Readonly<CompiledResourceDataOptions>;
  readonly defaults: Readonly<ResourceEntryPoints>;
  readonly report: Readonly<ModelCompileReport>;

  getAttribute<K extends FieldKey<T>>(key: K): CompiledAttribute<T, K>;
  getRelation<K extends RelationKey<T>>(key: K): CompiledRelation<T, K>;
  getAction<K extends ActionKey<T>>(id: K): ActionDefinitionFor<T, K>;
  getWorkspace<K extends WorkspaceKey<T>>(id: K): WorkspaceDescriptorFor<T, K>;
  getSection<K extends SectionKey<T>>(id: K): SectionDescriptorFor<T, K>;
  extractKey(record: Partial<T>): KeyObject<T>;
  serializeKey(key: KeyObject<T>): SerializedKey;
  parseKey(serialized: SerializedKey): KeyObject<T>;
  createInputDefaults(ctx?: DefaultValueContext): Partial<CreateInput<T>>;
  getProjection(ref: WorkspaceRef): ProjectionPlan;
  validateInput(action: ActionId, input: unknown): ValidationResult;
}
```

The implementation may use private lookup maps, but public collections MUST be immutable. Do not expose a `Map` that callers can mutate. Readonly TypeScript annotations alone are insufficient where the underlying object remains mutable.

### 6.3. No model-level CRUD convenience API

Do not add `model.create()`, `model.update()`, `model.delete()`, `model.canCreate()`, or similar methods. Data operations are invoked by canonical action ID through the dispatcher. Introspection helpers are acceptable when they resolve metadata rather than execute business behavior.

---

## 7. Attributes, formats, behavior, and field policy

### 7.1. Keep independent axes separate

Attribute metadata MUST separate four concerns:

| Axis | Examples | Responsibility |
|---|---|---|
| Storage/value type | string, number, integer, boolean, date, instant, object, array | Structural schema and query compatibility. |
| Semantic format | currency, percentage, CPF, CNPJ, CEP, phone, email, URL, color, rich text | Parsing, formatting, domain presentation, semantic validation. |
| Component | text input, rich-text editor, currency input, date picker, relation lookup | Visual renderer selected through `ComponentRegistry`. |
| Behavior/policy | required, read-only, hidden, computed, searchable, filterable, sortable | Participation in input, display, query, and authorization. |

Do not grow `ScalarKind` with every business-specific format. A value remains a string or number with a semantic format.

### 7.2. Attribute descriptor

Illustrative contract:

```typescript
interface AttributeDescriptor<T, K extends FieldPath<T>> {
  label?: MessageRef;
  description?: MessageRef;
  placeholder?: MessageRef;
  format?: SemanticFormat;
  component?: ComponentRef<'field'>;
  hidden?: RuleRef<boolean>;
  readOnly?: RuleRef<boolean>;
  required?: RuleRef<boolean>;
  defaultValue?: SerializableValue | RuleRef<unknown>;
  computed?: {
    rule: RuleId;
    dependsOn: readonly FieldPath<T>[];
    persisted?: boolean;
  };
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  validators?: readonly ValidatorRef[];
  policy?: FieldPolicyRef;
  metadata?: Readonly<Record<string, SerializableValue>>;
}
```

The exact union of supported scalar formats is extensible through codecs/formatters. The descriptor MUST NOT use a single `kind` value to represent storage type, semantic format, and component choice at once.

### 7.3. Reactive and computed behavior

Shared descriptors SHOULD use serializable `RuleRef` IDs or declarative rule expressions instead of arbitrary closures. Every computed or reactive rule MUST declare dependencies. The compiler MUST reject missing dependency references and cycles.

Computed values are derived. They MUST NOT be accepted in create/update payloads unless an explicit write policy allows client input. The server MUST recompute authoritative derived values.

Synchronous deterministic rules may run on the client for immediate feedback and on the server for authoritative validation. Rules requiring database access, secrets, or trusted actor context MUST be server-only registry implementations.

### 7.4. Field access policy

At minimum, field policies need to distinguish:

- readable: whether a field may be included in query/projection output;
- writable: whether a field may be accepted in a command input;
- visible: whether the UI should display the field when it is otherwise readable;
- required: whether the input contract requires the value in the current action context.

Hidden is not equivalent to protected. A hidden field may still be readable by the client; a forbidden field MUST be excluded from the server response. Client visibility is never a data-security control.

---

## 8. Relational metamodel

### 8.1. Cardinalities

The metamodel MUST support all four standard relation cardinalities:

| Cardinality | Meaning | Typical mapping |
|---|---|---|
| `one-to-one` | Each source record relates to at most one target and vice versa. Storage must enforce uniqueness. | Unique FK or shared primary key. |
| `many-to-one` | Many source records may refer to one target. | Source FK to target primary/alternate key. |
| `one-to-many` | One source record has zero or more target records. | Target FK to source key; often inverse of many-to-one. |
| `many-to-many` | Many source records relate to many targets. | Explicit join/association model or adapter-declared join convention. |

UI selection cardinality is not relational cardinality. A many-to-one relation commonly renders as a single-value lookup.

### 8.2. Relation descriptor

Relations are declared separately from scalar attributes:

```typescript
interface RelationDescriptor<T> {
  target: ModelKey | string;
  cardinality: 'one-to-one' | 'many-to-one' | 'one-to-many' | 'many-to-many';
  sourceKey: readonly FieldPath<T>[];
  targetKey: readonly FieldPath[];
  inverse?: RelationRef | string;
  nullable?: boolean;
  ownership?: 'reference' | 'owned';
  onDelete?: 'restrict' | 'set-null' | 'cascade' | 'custom';
  through?: {
    model: ModelKey | string;
    sourceKey: readonly FieldPath[];
    targetKey: readonly FieldPath[];
  };
  loading?: 'deferred' | 'include' | 'select-in';
  display?: {
    label?: MessageRef;
    fields?: readonly FieldPath[];
    component?: ComponentRef<'field' | 'cell'>;
  };
  lookup?: {
    workspace?: WorkspaceRef | string;
    filter?: QueryExpression;
    quickCreate?: ActionRef | string;
  };
  policy?: RelationPolicyRef;
}
```

`sourceKey` and `targetKey` are ordered arrays to support composite mappings. Their lengths and compatible scalar types MUST match. For many-to-many, `through` is required unless the selected adapter defines a documented join-table convention. The `through.model` identifies the association resource; its `sourceKey` maps the source model key into the association resource and its `targetKey` maps the target model key into the association resource.

### 8.3. Invoice/customer example

```typescript
interface Invoice {
  id: string;
  customerId: string;
  number: string;
  issueDate: string;
  totalAmount: number;
}

const InvoiceModel = buildModel({
  key: 'sales.invoice',
  schema: InvoiceSchema,
  relations: {
    customer: {
      target: 'crm.customer',
      cardinality: 'many-to-one',
      sourceKey: ['customerId'],
      targetKey: ['id'],
      nullable: false,
      display: { fields: ['name', 'taxId'] },
      lookup: { workspace: 'crm.customer:lookup' },
    },
  },
});
```

Here `customerId` remains a scalar persisted field. `customer` is a navigation relation resolved through the catalog and relation runtime.

When a form or lookup section presents the `customer` relation, the relation control selects a target record and maps its declared target key into the source record's `customerId` field(s). The action input remains the normalized persisted/command shape unless an action explicitly declares a relation payload. The selected expanded `Customer` object MUST NOT be mass-assigned into the invoice payload by default. For composite source keys, the relation control maps each selected target-key component to its corresponding source-key component.

### 8.4. Relation invariants

`buildCatalog()` MUST validate:

- target model exists;
- source and target key paths exist;
- source and target key tuple lengths match;
- key scalar types are compatible;
- inverse relation exists when declared and points back consistently;
- inverse cardinalities are compatible;
- many-to-many has a valid association mapping;
- a related-collection section references a collection-valued relation;
- a lookup relation targets the model specified by its lookup workspace;
- relation projection does not exceed configured depth/cycle limits.

Additional rules:

- Ownership distinguishes aggregate persistence/validation boundaries from independent references.
- `owned: true` MUST NOT automatically imply cascade deletion.
- Delete behavior is explicit (`restrict`, `set-null`, `cascade`, or registered custom behavior).
- If a relationship has its own attributes (quantity, role, order, effective dates), model the association as a first-class resource.
- Self-relations are allowed. Projections and recursive queries must be bounded and cycle-safe.
- Polymorphic relations are out of scope for the initial implementation unless explicitly introduced as a typed extension. Do not simulate them with an unvalidated target string.
- Relation display fields and projections are derived from target metadata and policy. Do not store arbitrary dot-notation projection strings as the canonical relation contract.

---

## 9. Canonical action model

### 9.1. Actions are the only executable capability abstraction

An action is the unit through which the application expresses a capability. Standard query/mutation operations, domain commands, client-side commands, and navigation use the same canonical action shape. Multi-step business execution is implemented by a registered handler; multi-step user interaction is modeled by a wizard workspace.

The compiled model MUST NOT have parallel fields such as:

- `ResourcePermissions.create/read/update/delete`;
- `createWorkspace`, `editWorkspace`, or `detailWorkspace` CRUD slots;
- `submitAction`, `quickCreateAction`, or `finishAction` with semantics different from an `ActionRef`;
- separate action arrays for CRUD versus domain commands;
- a `can('create' | 'read' | 'update' | 'delete')` permission vocabulary;
- a public per-resource CRUD service façade separate from action dispatch.

A standard action such as `create` or `update` is just an ordinary `ActionDefinition` generated by convention. An application-specific action such as `approve`, `issue`, `cancel`, `recalculate`, `export`, or `copyNumber` is declared and dispatched through the exact same framework path.

### 9.2. Canonical action contract

```typescript
type ActionTarget = 'none' | 'collection' | 'record' | 'selection';
type ActionRuntime = 'server' | 'client';

type ActionBehavior =
  | { type: 'data'; operation: DataOperation }
  | { type: 'handler'; handler: HandlerId; runtime: ActionRuntime }
  | { type: 'navigate'; workspace: WorkspaceRef; host?: HostKind; mapping?: RecordMapping; bindAction?: ActionId };

interface ActionDefinition<I = unknown, O = unknown> {
  id: ActionId;
  label?: MessageRef;
  description?: MessageRef;
  input: RuntimeSchema<I>;
  output?: RuntimeSchema<O>;
  target: ActionTarget;
  behavior: ActionBehavior;
  authorize?: PolicyRef;
  presentation?: ActionPresentation;
  confirm?: ConfirmationDescriptor;
  effects?: readonly ActionEffect[];
  transaction?: TransactionPolicy;
  idempotency?: IdempotencyPolicy;
  concurrency?: ConcurrencyPolicy;
  audit?: AuditPolicy;
  enabled?: boolean;
  metadata?: Readonly<Record<string, SerializableValue>>;
}
```

Every compiled action has the same top-level structure. The `behavior` discriminant identifies how it executes; it does not create a parallel CRUD or permission model.

The action input schema MUST be present after compilation. Standard action input schemas are synthesized from the resource schema and operation semantics. The output schema SHOULD be present when the output is known and meaningful.

### 9.3. Action targets and context

`target` describes the kind of invocation context expected by the UI and runtime:

- `none`: no selected resource record is required;
- `collection`: action applies to the resource collection;
- `record`: action applies to one record;
- `selection`: action applies to a set of selected records.

The action input contract is still authoritative. Record keys and selected keys MUST be part of validated action input or derived from a trusted, validated invocation object. Do not rely on hidden ambient mutable state to determine what record is being changed.

### 9.4. Standard actions generated by convention

The default data action IDs and behavior are:

| Action ID | Target | Data operation | Input semantics |
|---|---|---|---|
| `list` | collection | `query` | `QuerySpec` plus supported paging options. |
| `get` | record | `get` | Structured `KeyObject` plus optional projection selection. |
| `create` | none | `insert` | Create input inferred from schema, excluding generated/derived/read-only fields. |
| `update` | record | `patch` | Record key, patch payload, and optional version/concurrency token. |
| `delete` | record | `remove` | Record key and optional concurrency/idempotency metadata. |

When matching workspaces exist, the compiler MUST generate canonical navigation actions such as `new` (open the input workspace bound to `create`), `edit` (open the input workspace bound to `update`), and `open` (open the record workspace). These are navigation actions, not CRUD modes or data operations. Their default IDs are `new`, `edit`, and `open`; they bind respectively to `create`, `update`, and `get`. The compiler generates `new` only when an input workspace and `create` action exist, `edit` only when an input workspace, `update` action, and primary key exist, and `open` only when a record workspace, `get` action, and primary key exist. Their names may be customized through explicit aliases, but their behavior must remain ordinary `ActionDefinition` behavior. `new` receives the input workspace's parameter schema (or an empty object schema) and navigates with `bindAction: 'create'`; `edit` and `open` receive the normalized key input and use `mapping: 'current-record'`, with `bindAction: 'update'` and `bindAction: 'get'` respectively. The client runtime maps the navigation input into `WorkspaceInvocation` and does not execute the bound data action until the form/record workspace requires it. `ResourceDataOptions.operations` defaults to the application's configured default operation profile; absent an application override, it is `['query', 'get', 'insert', 'patch', 'remove']` for a keyed resource. `buildModel()` uses this declared profile only and MUST NOT query an adapter registry. `buildCatalog()`/runtime bootstrap verifies that the selected adapter supports every generated operation. A read-only resource can declare only `query` and `get` without generating mutation or input-navigation actions.

Bulk operations MUST NOT be generated automatically unless the selected adapter and authorization model define all-or-nothing or clearly typed partial-result semantics. A domain-specific bulk command can be explicitly declared.

### 9.5. Overriding standard actions

An application may override a generated action by reusing its ID. For example, `create` may be implemented by a custom server handler when persistence requires a workflow. The action remains the same canonical object and is still invoked via `ActionDispatcher`.

An override may refine:

- label and description;
- input/output schema;
- authorization policy;
- behavior/handler;
- confirmation and presentation;
- transaction, idempotency, concurrency, and audit policy;
- declared client effects.

If the action `behavior` changes from `data` to `handler`, that discriminated object is replaced as a whole. The compiler MUST verify that the final action remains consistent with its target and input/output schema.

### 9.6. Action presentation and placement

Action identity, behavior, authorization, presentation, and placement are separate concerns.

```typescript
interface ActionPresentation {
  icon?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  emphasis?: 'normal' | 'prominent';
  placementDefaults?: readonly ActionPlacement[];
}

type ActionPlacement =
  | 'toolbar'
  | 'row'
  | 'selection'
  | 'recordHeader'
  | 'formFooter'
  | 'item';
```

A workspace references action IDs in placement slots. Placement does not redefine the action. An action can be placed in more than one workspace as long as its target and input contract are compatible with the placement.

### 9.7. Confirmation and effects

Confirmation is presentation metadata associated with an action, not part of its business implementation.

Effects are declarative instructions interpreted by the client action runtime after a successful result. Supported initial effects SHOULD include:

- `toast`;
- `invalidate` (resource, record, or query cache tags);
- `refresh`;
- `closeHost`;
- `navigate` (workspace/route navigation when appropriate).

A server handler MUST NOT call `HostController`, mutate React state, or navigate directly. It returns an `ActionResult`; the client runtime applies declared effects in the active host context.

### 9.8. Action execution pipeline

The server dispatcher MUST execute the following phases in a documented, deterministic order:

1. Resolve model and canonical action from `ModelCatalog`.
2. Confirm the action is enabled and is server-executable.
3. Resolve trusted actor, tenant, request, locale, and correlation context from the server environment.
4. Parse and validate action input against the action input schema.
5. Resolve key and invocation context from validated input.
6. Evaluate action-level authorization and inherited resource policy.
7. Apply row-level and field-level policy; prevent unauthorized fields from being read or written.
8. Establish transaction, idempotency, and concurrency behavior as declared.
9. Execute the built-in data operation or registered server handler.
10. Validate and normalize output against the declared output schema when present.
11. Record audit information and publish domain events only after successful commit.
12. Return a typed `ActionResult` with data, errors, and permitted effects metadata.

The client runtime applies UI effects only after a successful result. A client-side `can()` or `visible()` result MUST never be treated as a server authorization decision.

The client-facing action invoker routes by `behavior` and execution environment: `navigate` is handled by the client action runtime/HostManager; `handler` with runtime `client` is resolved by `ClientActionHandlerRegistry`; `data` and `handler` with runtime `server` are sent to a statically exported server dispatcher. The server dispatcher MUST reject `navigate` and client-handler actions. Composite business execution should be implemented as a server handler with explicit transaction semantics; multi-step user interaction belongs in a `wizard` workspace. A generic sequence behavior is intentionally deferred from the initial action contract.

### 9.9. Action result and errors

```typescript
type ActionResult<T> =
  | { ok: true; data: T; effects?: readonly ActionEffect[]; meta?: ActionResultMeta }
  | { ok: false; error: ActionError; meta?: ActionResultMeta };

interface ActionError {
  code:
    | 'VALIDATION_FAILED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'DUPLICATE'
    | 'UNAVAILABLE'
    | 'CANCELLED'
    | 'RATE_LIMITED'
    | 'INTERNAL';
  message: MessageRef | string;
  issues?: readonly ValidationIssue[];
  retryable?: boolean;
  details?: Readonly<Record<string, SerializableValue>>;
}
```

Errors MUST be stable and machine-readable. Do not make callers inspect database exception strings. Unexpected internal details MUST NOT be leaked to clients.

---

## 10. Workspaces and sections

### 10.1. Different concepts, different descriptors

A **workspace** is a hostable, addressable interaction boundary. It may own query state, selection state, draft input state, wizard progress, loading/error lifecycle, and navigation context.

A **section** is a reusable content, layout, or data-view fragment. It is composed inside a workspace or another section. It does not have its own route, host lifecycle, independent workspace state, or host result promise.

The framework MUST maintain separate `workspaces` and `sections` maps on `ResourceModel`, separate descriptor unions, and separate lookup APIs.

| Concept | Workspace | Section |
|---|---|---|
| Hostable | Yes | No |
| Route/navigation target | Yes | No |
| Own interaction lifecycle | Yes | No independent host lifecycle |
| May own query/selection/draft state | Yes | May consume data/state from parent or use a declared data source |
| Can compose other sections | Usually through references | Yes |
| Typical examples | Grid, record, form, lookup, wizard | Fields, summary, related collection, tabs, accordion, activity, custom content |

Tabs and accordions are normally section composition. A wizard remains a workspace because it owns a multi-step lifecycle. A tab may refer to another workspace only when it intentionally opens a separately managed interaction with its own lifecycle; that must be an explicit embedded-workspace capability, not the default interpretation of tabs.

### 10.2. Workspace kinds

The initial required workspace kinds are:

- `grid`: collection query, sorting, filtering, paging, selection, and action placement;
- `record`: presents one record and composes sections;
- `form`: collects input for a canonical action;
- `lookup`: searches and selects one or more records, commonly used by relations;
- `wizard`: orchestrates a multi-step interaction with validation/transition state;
- `custom`: registered custom interaction lifecycle.

Do not model `tabs` and `accordion` as workspaces in the initial architecture.

### 10.3. Workspace descriptor family

```typescript
interface BaseWorkspaceDescriptor<T> {
  id: WorkspaceId;
  kind: WorkspaceKind;
  title?: MessageRef;
  subtitle?: MessageRef;
  permission?: PolicyRef;
  defaultHost?: HostKind;
  component?: ComponentRef<'workspace'>;
  parameters?: RuntimeSchema<unknown>;
}

interface GridWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'grid';
  columns?: readonly GridColumnDescriptor<T>[];
  searchable?: readonly ValuePath<T>[];
  filterable?: readonly ValuePath<T>[];
  defaultQuery?: QuerySpec;
  pageSize?: number;
  selection?: 'none' | 'single' | 'multiple';
  actions?: Partial<Record<'toolbar' | 'row' | 'selection', readonly ActionId[]>>;
  primaryAction?: ActionId;
}

interface RecordWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'record';
  sections: readonly SectionId[];
  headerSection?: SectionId;
  actions?: Partial<Record<'recordHeader' | 'item', readonly ActionId[]>>;
}

interface FormWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'form';
  /** Default action binding. Invocation may select another compatible action when enabled. */
  action?: ActionId;
  allowActionOverride?: boolean;
  sections?: readonly SectionId[];
  fields?: readonly ValuePath<T>[];
  columns?: 1 | 2 | 3 | 4;
  actions?: Partial<Record<'formFooter', readonly ActionId[]>>;
  warnOnUnsavedChanges?: boolean;
}

interface LookupWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'lookup';
  searchFields?: readonly ValuePath<T>[];
  columns?: readonly GridColumnDescriptor<T>[];
  labelField: ValuePath<T>;
  secondaryField?: ValuePath<T>;
  selection?: 'single' | 'multiple';
  defaultQuery?: QuerySpec;
}

interface WizardWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'wizard';
  steps: readonly WizardStepDescriptor<T>[];
  linear?: boolean;
  finish: ActionId;
  cancel?: ActionId;
}

interface CustomWorkspaceDescriptor<T> extends BaseWorkspaceDescriptor<T> {
  kind: 'custom';
  component: ComponentRef<'workspace'>;
  props?: SerializableValue;
}

type WorkspaceDescriptor<T> =
  | GridWorkspaceDescriptor<T>
  | RecordWorkspaceDescriptor<T>
  | FormWorkspaceDescriptor<T>
  | LookupWorkspaceDescriptor<T>
  | WizardWorkspaceDescriptor<T>
  | CustomWorkspaceDescriptor<T>;
```

The public descriptor may provide shorthand fields or columns. `buildModel()` must normalize them to full compiled forms. For convention-selected renderers, the compiled model retains the semantic role/type/format request; the client `ComponentRegistry` resolves that request against design-system mappings at runtime. This keeps model compilation pure and design-system independent.

### 10.4. Section kinds

The initial section kinds are:

- `fields`: a field group with order, columns, and local presentation overrides;
- `summary`: read-only values, labels, badges, and display formatting;
- `relatedCollection`: a relation-backed collection with columns, filters, and action placement;
- `tabs`: compose child section references as tabs;
- `accordion`: compose child section references as accordion panels;
- `activity`: display audit/domain-event history through a defined activity data contract;
- `custom`: registered custom visual fragment.

Illustrative contracts:

```typescript
interface BaseSectionDescriptor<T> {
  id: SectionId;
  kind: SectionKind;
  title?: MessageRef;
  description?: MessageRef;
  component?: ComponentRef<'section'>;
  visible?: RuleRef<boolean>;
}

interface FieldsSectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'fields';
  fields: readonly FieldPresentationDescriptor<T>[];
  columns?: 1 | 2 | 3 | 4;
}

interface SummarySectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'summary';
  items: readonly SummaryItemDescriptor<T>[];
}

interface RelatedCollectionSectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'relatedCollection';
  relation: RelationId;
  columns?: readonly GridColumnDescriptor<unknown>[];
  filter?: QueryExpression;
  actions?: Partial<Record<'toolbar' | 'row' | 'selection', readonly (ActionRef | ActionId)[]>>;
  pageSize?: number;
}

interface TabsSectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'tabs';
  tabs: readonly { id: string; label: MessageRef; section: SectionId; visible?: RuleRef<boolean>; badge?: RuleRef<string | number> }[];
  orientation?: 'horizontal' | 'vertical';
}

interface AccordionSectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'accordion';
  allowMultiple?: boolean;
  panels: readonly { id: string; title: MessageRef; section: SectionId; defaultExpanded?: boolean; visible?: RuleRef<boolean> }[];
}

interface ActivitySectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'activity';
  source: ActivitySourceRef;
  pageSize?: number;
}

interface CustomSectionDescriptor<T> extends BaseSectionDescriptor<T> {
  kind: 'custom';
  component: ComponentRef<'section'>;
  props?: SerializableValue;
}
```

The implementation may factor shared types differently, but section descriptors MUST remain distinct from workspace descriptors.

### 10.5. Section invariants

- A section MUST NOT be opened through `PageHost`, `DialogHost`, or `DrawerHost` directly.
- A section may compose other sections by ID. Cycles in section composition MUST be rejected.
- `relatedCollection` must reference a valid collection-valued relation and compatible target columns/actions.
- A relation-backed section must derive the child model through the relation graph, not by guessing based on a string. Action IDs in a related-collection section are resolved against the relation target model unless an explicit cross-model `ActionRef` is supplied; `ModelCatalog` validates that the action targets the expected related resource.
- A section may request data but must use a declared query/action/data source contract; it must not contain arbitrary persistence logic.
- A custom section resolves a registered component under the `section` role and validates props.
- `headerWorkspaceId` is not a section composition mechanism. Use `headerSection` or a designated host/workspace slot.

### 10.6. No create/edit/view modes

This is a global invariant across descriptors, hooks, contexts, and documentation. The following MUST NOT exist:

- `mode: 'create' | 'edit' | 'view'` on form workspaces;
- mode in `ReactiveContext`, `ValidationContext`, or default-value context;
- mode in `useFormWorkspace()` results;
- field rules branching on CRUD mode;
- create/edit/detail workspace defaults.

A form needs an action ID, the action input schema, optional initial values, optional record identity/context, policy/capability information, and a form lifecycle state.

```typescript
type FormLifecycle = 'pristine' | 'dirty' | 'validating' | 'submitting' | 'submitted' | 'failed';

interface WorkspaceInvocation {
  model: ModelKey;
  workspace: WorkspaceId;
  action?: ActionId;
  recordKey?: SerializedKey;
  initialValues?: unknown;
  relationContext?: RelationContext;
  params?: SerializableValue;
}
```

The current action input schema defines the fields and writeability. Read-only behavior derives from the action schema, attribute behavior, and field authorization, not from a mode switch.

### 10.7. Workspace entry points

Do not expose CRUD-specific model defaults. Use neutral entry points:

```typescript
interface ResourceEntryPoints {
  browse?: WorkspaceId;
  record?: WorkspaceId;
  input?: WorkspaceId;
  lookup?: WorkspaceId;
}
```

A navigation action may open an input workspace with an action binding. The generated `new`, `edit`, and `open` actions use the `bindAction` property on their `navigate` behavior to bind the target workspace to the appropriate canonical data action. For example, a grid action labelled “Nova fatura” navigates to the input workspace and binds the `create` action. An “Editar” action may navigate to that same input workspace with the `update` action and record key. The workspace itself remains the same and has no mode.

---

## 11. Registries and reference resolution

Registry behavior is a public architectural contract because descriptors use stable IDs. Each registry MUST have a clear owner, environment, lifecycle, lookup API, duplicate policy, and error policy. Do not use one global registry for models, components, handlers, and adapters.

### 11.1. `ModelCatalog`

**Purpose:** Resolve model keys and validate the complete cross-resource metadata graph.

`buildCatalog(models)` accepts compiled `ResourceModel` instances, rejects duplicate keys, and returns an immutable catalog. It is called explicitly by application bootstrap or build tooling. `buildModel()` MUST NOT register a model as a side effect.

```typescript
interface ModelCatalog {
  has(key: ModelKey): boolean;
  get(key: ModelKey): ResourceModel<unknown> | undefined;
  require(key: ModelKey): ResourceModel<unknown>;
  keys(): readonly ModelKey[];
  resolveAction(ref: ActionRef): ResolvedAction;
  resolveWorkspace(ref: WorkspaceRef): ResolvedWorkspace;
  resolveSection(ref: SectionRef): ResolvedSection;
  resolveRelation(ref: RelationRef): ResolvedRelation;
  validate(): readonly ModelDiagnostic[];
}

const modelCatalog = buildCatalog([
  CustomerModel,
  InvoiceModel,
  InvoiceItemModel,
]);
```

Required behavior:

- one catalog per application/runtime composition;
- server and client may instantiate separate catalogs from the same compiled metadata;
- registration accepts only compiled models;
- duplicate `ModelKey` values fail fast with both source locations;
- provide `has`, `get`, `require`, key enumeration, and typed reference resolvers;
- resolve all target models, inverse relations, related collection references, action navigation targets, and cross-model workspace references after all models have been added;
- allow valid model graph cycles (e.g., `Order` ↔ `OrderItem`) because resolution occurs after registration;
- detect invalid relation or section dependency cycles separately;
- expose an immutable snapshot after construction;
- support aliases only through explicit migration metadata; do not silently normalize arbitrary alias strings;
- produce structured errors with source paths.

Suggested errors include `UnknownModelError`, `DuplicateModelError`, `MissingPrimaryKeyError`, `UnknownWorkspaceError`, `UnknownSectionError`, `UnknownActionError`, `UnknownRelationError`, and `InvalidRelationReferenceError`.

### 11.2. `ComponentRegistry`

**Purpose:** Resolve component keys and semantic roles to client-side React renderers. This registry MUST be client-only.

```typescript
type ComponentRole =
  | 'workspace'
  | 'section'
  | 'field'
  | 'cell'
  | 'filter'
  | 'action'
  | 'empty-state';

interface ComponentDefinition<P = unknown> {
  key: ComponentKey;
  role: ComponentRole;
  component: React.ComponentType<P>;
  propsSchema?: RuntimeSchema<P>;
  supports?: readonly ComponentCapability[];
  defaults?: Partial<P>;
}

interface ComponentRegistry {
  has(key: ComponentKey, role?: ComponentRole): boolean;
  get(key: ComponentKey, role: ComponentRole): ComponentDefinition<unknown> | undefined;
  require(key: ComponentKey, role: ComponentRole): ComponentDefinition<unknown>;
  resolve(request: ComponentRequest): ResolvedComponent;
  keys(role?: ComponentRole): readonly ComponentKey[];
}
```

A field renderer is not interchangeable with a workspace renderer. A registry entry MUST declare its role. Capabilities may declare supported storage types, semantic formats, relation cardinalities, selection behavior, accessibility behavior, and controlled/uncontrolled requirements.

#### Component resolution precedence

The default precedence is:

1. explicit local descriptor component;
2. resource/application override layer;
3. selected design-system semantic mapping;
4. generic role fallback.

An explicit component key with an unknown key or wrong role is a configuration error. A convention-selected component that cannot be resolved may use a generic role fallback with a structured warning. A resolved component whose `supports` do not include the requested field/relation/workspace capability MUST fail validation or select a compatible fallback according to an explicit rule.

The registry SHOULD use immutable layered composition rather than mutating a global registry. `propsSchema` is validated in development/build tests and at runtime where appropriate. The shared model stores only `ComponentKey` and serializable props; it never imports or stores a React component instance.

### 11.3. Server and client action handler registries

Action handler implementations MUST be stored separately from action metadata.

```typescript
interface ServerActionHandlerRegistry {
  has(id: HandlerId): boolean;
  get(id: HandlerId): ServerActionHandler<unknown, unknown> | undefined;
  require(id: HandlerId): ServerActionHandler<unknown, unknown>;
  keys(): readonly HandlerId[];
}
interface ServerActionHandlerRegistryBuilder {
  register<I, O>(id: HandlerId, handler: ServerActionHandler<I, O>): this;
  override<I, O>(id: HandlerId, handler: ServerActionHandler<I, O>, layer: string): this;
  build(): ServerActionHandlerRegistry;
}
interface ClientActionHandlerRegistry {
  has(id: HandlerId): boolean;
  get(id: HandlerId): ClientActionHandler<unknown, unknown> | undefined;
  require(id: HandlerId): ClientActionHandler<unknown, unknown>;
  keys(): readonly HandlerId[];
}
interface ClientActionHandlerRegistryBuilder {
  register<I, O>(id: HandlerId, handler: ClientActionHandler<I, O>): this;
  override<I, O>(id: HandlerId, handler: ClientActionHandler<I, O>, layer: string): this;
  build(): ClientActionHandlerRegistry;
}
```

**ServerActionHandlerRegistry** owns commands/queries requiring trusted actor context, persistence, secrets, server validation, or protected data. Handlers receive validated input and a trusted `ActionContext`; they have no React/HostController dependency.

**ClientActionHandlerRegistry** owns browser-only and local presentation behavior, such as clipboard access, download initiation, opening an external URL, staging a local preview, or changing transient client state. It is not authoritative for persistence or permissions.

```typescript
interface ServerActionHandler<I, O> {
  (input: I, context: ServerActionContext): Promise<O>;
}

interface ClientActionHandler<I, O> {
  (input: I, context: ClientActionContext): Promise<O> | O;
}
```

Registration MUST:

- use a stable `HandlerId`;
- reject duplicate IDs unless an explicit layered override is used;
- associate handler identity with runtime (`server` or `client`);
- validate handler existence and runtime compatibility during bootstrap/build tests;
- offer typed registration helpers to infer input/output from the action contract;
- prevent server handler imports from entering client bundles;
- prevent client handlers from being dispatched as server commands.

The descriptor references a handler ID. It MUST NOT embed the implementation function in a shared model.

### 11.4. `DataAdapterRegistry`

**Purpose:** Resolve a resource to the persistence adapter that implements generic storage operations.

```typescript
interface DataAdapterRegistry {
  has(key: AdapterKey): boolean;
  get(key: AdapterKey): ResourceDataAdapter<unknown> | undefined;
  require(key: AdapterKey): ResourceDataAdapter<unknown>;
  resolve<T>(model: ResourceModel<T>): ResourceDataAdapter<T>;
  keys(): readonly AdapterKey[];
}
interface DataAdapterRegistryBuilder {
  register<T>(key: AdapterKey, adapter: ResourceDataAdapter<T>): this;
  bindModel(model: ModelKey, adapter: AdapterKey): this;
  build(): DataAdapterRegistry;
}

interface PolicyRegistry {
  has(id: PolicyId): boolean;
  evaluate(id: PolicyId, context: PolicyContext): Promise<PolicyDecision>;
  keys(): readonly PolicyId[];
}
interface PolicyRegistryBuilder {
  register(id: PolicyId, policy: PolicyImplementation): this;
  build(): PolicyRegistry;
}

interface ValidatorRegistry {
  has(id: ValidatorId): boolean;
  require(id: ValidatorId): DomainValidator;
  keys(): readonly ValidatorId[];
}
interface ValidatorRegistryBuilder {
  register(id: ValidatorId, validator: DomainValidator): this;
  build(): ValidatorRegistry;
}
```

`PolicyContext`, `PolicyDecision`, `PolicyImplementation`, and `DomainValidator` are server-only contracts. A policy returns an allow/deny decision with an optional safe reason and optional row/query constraints; a validator returns zero or more `ValidationIssue` values. Both receive the trusted `ServerActionContext` or a narrower context projection.

The resource may specify an adapter key. Otherwise resolution precedence is: explicit resource adapter, explicit model-to-adapter binding in the registry builder, then application default adapter. Missing resolution is a bootstrap error. A default adapter should support common relational-table or API resource conventions so ordinary resources do not require a resource-specific repository class.

Required capabilities are declared and checked:

- query;
- get;
- insert;
- patch/update;
- remove/delete;
- transaction;
- relation projection/loading;
- bulk operations;
- optimistic concurrency;
- streaming or large-result support where relevant.

The registry MUST fail fast if a compiled standard action requires an adapter capability that the selected adapter does not support. It MUST provide per-resource overrides for legacy schemas, unusual joins, external APIs, and specialized persistence.

A data adapter is server-only and MUST NOT be available to client code.

### 11.5. Supporting registries

The following supporting registries are recommended; they should be implemented as needed but with stable contracts:

| Registry | Purpose |
|---|---|
| `PolicyRegistry` | Resolve server-owned action, resource, row, field, and relation policies. |
| `ValidatorRegistry` | Run named asynchronous/stateful validators that need trusted context. |
| `RuleRegistry` | Resolve reusable computed, visibility, requiredness, and reactive rules when declarative expressions are insufficient. |
| `CodecRegistry` | Encode/decode primary keys, money, date/time, and semantic scalar formats. |
| `FormatterRegistry` | Resolve locale-aware formatters and display-value providers. This may be combined with the client component layer if dependencies stay client-only. |

Every registry should follow the same baseline conventions: typed ID, explicit registration, `has/get/require`, duplicate handling, immutable composition, structured diagnostics, and environment constraints.

### 11.6. Bootstrap and registry lifecycle

The application lifecycle is:

1. Compile each resource descriptor independently with `buildModel()`.
2. Build the immutable `ModelCatalog` from all compiled models; validate cross-model references.
3. Initialize server-only registries: data adapters, server handlers, policies, validators, transaction/audit services.
4. Validate that every server action has a compatible registered handler or built-in data operation and adapter.
5. Initialize client-only registries: components, client handlers, client formatters.
6. Validate all component references and handler runtime requirements.
7. Freeze each registry snapshot before request/runtime use, except for an explicitly designed plugin-extension mechanism.

Do not make implicit runtime registration or hidden singleton mutation part of normal application startup.

---

## 12. Generic data layer

### 12.1. Design objective

The default data layer must provide common resource behavior without a handwritten repository/service class for every resource. Resource-specific persistence logic is an escape hatch.

The public framework execution path is:

```text
Workspace / headless hook
          |
          v
ActionDispatcher.execute(modelKey, actionId, input)
          |
          +--> resolve canonical ActionDefinition
          +--> validate input and normalize query AST
          +--> resolve trusted actor / tenant / correlation context
          +--> authorize action + row + field access
          +--> select built-in data operation or registered server handler
          +--> resolve DataAdapter
          +--> execute with transaction / concurrency / idempotency policy
          +--> validate output and map errors
          +--> audit / publish events after commit
          +--> return ActionResult and declared effects
          |
          v
Client action runtime applies presentation effects
```

### 12.2. Data operations versus actions

The data adapter may expose low-level methods such as `query`, `get`, `insert`, `patch`, and `remove`. These are technical persistence primitives, not separate model-level action contracts. The canonical action dispatcher is the only public execution path for application actions.

A custom server command may call one or more adapters or services, coordinate a transaction, and publish domain events. It still enters through a canonical action.

### 12.3. Query AST

Replace flat filter arrays and arbitrary dot-notation paths with a serializable, validated AST.

```typescript
type ScalarOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'notIn'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'between' | 'isNull';

type QueryExpression =
  | { op: 'compare'; path: FieldPath; operator: ScalarOperator; value?: SerializableValue }
  | { op: 'and' | 'or'; terms: readonly QueryExpression[] }
  | { op: 'not'; term: QueryExpression }
  | { op: 'relation'; path: RelationPath; predicate: QueryExpression };

interface QuerySpec {
  where?: QueryExpression;
  orderBy?: readonly SortTerm[];
  select?: ProjectionPlan;
  page?:
    | { kind: 'offset'; index: number; size: number }
    | { kind: 'cursor'; after?: string; size: number };
  includeTotal?: boolean;
}
```

The compiler/dispatcher MUST validate:

- field and relation paths exist;
- operator is compatible with the scalar type and semantic format;
- the actor has permission to filter/sort/read the referenced fields;
- relation traversal is permitted and depth-bounded;
- page size is within configured maximums;
- sort is stable (include a primary-key tie-breaker where required);
- AST depth, term count, and query complexity remain within configured budgets.

Do not accept raw SQL, unrestricted query strings, client-provided table names, or untrusted field names that bypass the model. Totals may be exact, estimated, or omitted, but the result must identify the chosen semantics.

### 12.4. Projection plans

Projection is a compiled typed tree, not an arbitrary string list.

```typescript
interface ProjectionPlan {
  fields: readonly FieldPath[];
  relations?: readonly {
    relation: RelationId;
    projection: ProjectionPlan;
    strategy?: 'include' | 'select-in' | 'deferred';
  }[];
}
```

`getProjection(workspaceRef)` derives a plan from all fields, grid columns, summary items, and related relation display requirements used by the workspace and its sections. Server policy trims forbidden fields and relations before execution. Relation depth and cycle limits are enforced.

### 12.5. Data adapter contract

```typescript
interface ResourceDataAdapter<T> {
  capabilities: Readonly<DataAdapterCapabilities>;
  query(spec: QuerySpec, context: DataContext): Promise<QueryResult<T>>;
  get(key: KeyObject<T>, projection: ProjectionPlan, context: DataContext): Promise<T | null>;
  insert(data: CreateInput<T>, context: DataContext): Promise<T>;
  patch(
    key: KeyObject<T>,
    patch: UpdateInput<T>,
    options: MutationOptions,
    context: DataContext,
  ): Promise<T>;
  remove(
    key: KeyObject<T>,
    options: MutationOptions,
    context: DataContext,
  ): Promise<void>;
  transaction?<R>(
    work: (session: DataSession) => Promise<R>,
    context: DataContext,
  ): Promise<R>;
}
```

The exact adapter interface may differ if needed for cross-resource transactions, but it MUST support the listed semantics and MUST keep storage-specific behavior behind the adapter boundary.

`DataContext` is constructed by trusted server code and contains actor/tenant scope, correlation ID, locale, transaction/session reference, and safe request metadata. A client MUST NOT be allowed to choose trusted actor or tenant identity in action input.

### 12.6. Convention-driven adapter behavior

The default adapter SHOULD support conventions for:

- resource-to-table or resource-to-API mapping;
- primary-key mapping;
- schema-to-column mapping;
- relation foreign-key mapping;
- standard query operators;
- projections and relation loading;
- generated/updated timestamps and version fields;
- soft-delete where configured;
- common transaction and concurrency semantics.

Adapter-specific naming and SQL/API details must not leak into `ResourceDescriptor` unless a resource needs an explicit override.

### 12.7. Custom data logic

Use the narrowest escape hatch that fits:

1. **Adapter configuration** for table/column mapping, unusual key names, joins, soft delete, or API endpoints.
2. **Custom `ResourceDataAdapter`** for an unusual persistence model or external API.
3. **Server action handler** for domain workflows, cross-resource commands, transactional logic, or business rules.
4. **Named validators/policies/rules** for reusable validation and authorization behavior.

Do not add `beforeCreate` and `beforeUpdate` callback fields as the general extension mechanism. Use named middleware phases or a custom handler so behavior is discoverable, testable, and composable.

### 12.8. Client-side escape hatches

True client-only behavior belongs in `ClientActionHandlerRegistry` or an explicitly client-only workspace/component extension, not in the shared server/client descriptor.

Allowed examples include:

- copy a displayed value to the clipboard;
- initiate a download from a URL already authorized and prepared by the server;
- open a safe external URL;
- stage a local-only preview;
- change transient UI state;
- perform a presentation-only transformation.

Client-only handlers MUST NOT persist protected data, authorize an operation, or become the source of truth for business calculations. Any operation that reads or mutates protected data must use a server action.

A separate client data-source adapter MAY be used for data genuinely owned by the browser (for example, an unsaved local draft or imported file preview). It must be explicitly declared as client-only, must not be mistaken for server persistence, and must not be used to bypass server policy.

---

## 13. Security, policies, and validation

### 13.1. Authorization model

All authorization is expressed as policies attached to canonical actions, with optional inherited resource defaults. Do not maintain a parallel CRUD permission structure.

A policy may be:

- a stable `PolicyId` resolved by server `PolicyRegistry`;
- a declarative policy expression that can be evaluated in trusted server context;
- a composition of named policies.

The client may receive capability snapshots for UI rendering, but server execution re-evaluates policy for every request.

### 13.2. Required enforcement

Every server action MUST:

- resolve the actor from trusted authentication context;
- derive tenant/organization scope from trusted server context;
- authorize the action;
- apply row-level filters to list/get/update/delete;
- enforce field-level read/write policy;
- validate input before persistence;
- prevent mass assignment of fields outside the action input schema;
- enforce concurrency and idempotency where declared;
- audit outcomes where configured.

A record-specific `get`, `update`, or `delete` MUST NOT bypass row-level restrictions merely because the caller knows its key.

### 13.3. Validation layers

Validation is separated into:

1. **Structural validation:** runtime schema parsing and type/shape constraints.
2. **Field semantic validation:** format codecs and field-level rules.
3. **Cross-field/domain validation:** deterministic rule or named validator.
4. **Stateful server validation:** checks requiring current database state, external services, or trusted actor context.

All validation failures return structured issues:

```typescript
interface ValidationIssue {
  path: readonly (string | number)[];
  code: string;
  message: MessageRef | string;
  params?: Readonly<Record<string, SerializableValue>>;
}
```

A field may have multiple issues. Do not use `Record<keyof T, string>` as the validation result type.

Synchronous schema validation may run on both client and server when safe. Stateful validators MUST run on the server and be resolved through the `ValidatorRegistry`.

### 13.4. Concurrency and idempotency

Mutating commands SHOULD support:

- optimistic concurrency via version/ETag/updatedAt or adapter-native token;
- idempotency keys for retryable commands where network ambiguity could duplicate a mutation;
- transaction policy for atomic multi-step operations;
- explicit retryability classification.

A stale update returns a typed `CONFLICT`, not a generic internal error. A retry must not duplicate a successfully committed idempotent command.

### 13.5. Audit and domain events

Audit records SHOULD include model key, action ID, actor, tenant, record key, correlation ID, outcome, and timestamp. Domain events must be published after successful transaction commit. Failed transactions MUST NOT publish success events.

Soft delete behavior MUST be explicit in resource/adapter configuration. The meaning of the canonical `delete` action may be physical delete or soft delete according to the declared adapter policy, but must not vary silently.

---

## 14. Runtime state, workspaces, and hosts

### 14.1. Common workspace runtime

Specialized hooks should be implemented on top of a shared workspace runtime that owns:

- model/workspace resolution;
- invocation validation;
- permission/capability snapshot;
- loading/error lifecycle;
- action resolution;
- query/data state coordination;
- host and cancellation integration.

Specialized hooks add typed capabilities rather than reimplementing common behavior.

```typescript
useWorkspace({ modelKey, workspaceId, invocation });
useGridWorkspace(...);
useRecordWorkspace(...);
useFormWorkspace(...);
useLookupWorkspace(...);
useWizardWorkspace(...);
```

### 14.2. Hosts

Initial hosts:

| Host | Rendering target | Lifecycle |
|---|---|---|
| `PageHost` | Main application route | Integrates with Next.js router/history; supports deep links and refresh reconstruction. |
| `DialogHost` | Centered modal overlay | Client-managed stack; may return a result to its opener. |
| `DrawerHost` | Slide-over panel | Client-managed stack; supports nested contextual workspaces. |

A page route is not merely another modal frame. Page navigation is coordinated with the router. Dialogs and drawers are managed by a client-side host stack.

### 14.3. Host invocation and result

```typescript
interface HostManager {
  readonly stack: readonly HostFrameMetadata[];
  openWorkspace<R>(invocation: HostInvocation<R>): Promise<HostResult<R>>;
  closeCurrent(result?: HostResult): Promise<boolean>;
  markDirty(frameId: string, dirty: boolean): void;
  canNavigate(destination: string): Promise<boolean>;
}

interface HostFrameMetadata {
  readonly frameId: string;
  readonly host: HostKind;
  readonly modelKey: ModelKey;
  readonly workspaceId: WorkspaceId;
  readonly invocation?: WorkspaceInvocation;
  readonly isDirty: boolean;
}
```

```typescript
type HostKind = 'page' | 'dialog' | 'drawer';

interface HostInvocation<R = unknown> {
  /** Type-only association for the result; omitted from serialized invocation data. */
  readonly __result?: R;
  modelKey: ModelKey;
  workspaceId: WorkspaceId;
  host: HostKind;
  invocation?: WorkspaceInvocation;
  params?: SerializableValue;
}

type HostResult<T = unknown> =
  | { status: 'submitted' | 'selected'; payload: T }
  | { status: 'cancelled' | 'dismissed' | 'navigation-aborted' }
  | { status: 'failed'; error: ActionError };
```

The public host API may return `Promise<HostResult<T>>`, but the host frame itself MUST NOT store a Promise resolver. A private in-memory map inside `HostManager`, keyed by frame/request ID, stores pending resolvers. Frame metadata stays serializable.

### 14.4. Host manager responsibilities

The host manager owns:

- stack ordering for dialogs and drawers;
- open/close and result resolution;
- dirty-state guards;
- Escape/backdrop behavior;
- focus trap and focus restoration;
- body scroll locking;
- nested overlay z-order;
- cleanup when a parent frame is destroyed;
- cancellation and navigation-abort results;
- optional URL synchronization.

Dirty-state guards must cover nested overlays, route changes, browser back, refresh, tab close, and programmatic navigation. Guard behavior is centralized in HostManager/router integration, not duplicated in forms.

URL synchronization is a policy: `none`, `query-param`, or `route-segment`. URL-addressable overlays must be reconstructible after refresh/deep link; ephemeral overlays should use `none`.

### 14.5. Promise and parent-child semantics

For lookup quick-create:

1. The parent lookup workspace opens a child input workspace in a dialog/drawer.
2. The child is bound to the target model's canonical `create` action.
3. On success, the child returns `submitted` with the created record or key.
4. The parent lookup selects/reloads the returned item and resolves the original selection promise when the user confirms.
5. If the parent frame is destroyed, its pending resolver is rejected/settled with an explicit cancellation outcome; no orphan promise may remain.

The host runtime MUST define whether quick-create immediately selects the new record or returns control to the lookup for review. The default should be immediate selection when the created record matches the lookup's filter and authorization constraints; otherwise show the item only if policy allows it.

### 14.6. Accessibility

Dialog and drawer implementations MUST specify and test:

- focus entry and restoration;
- focus trap where appropriate;
- accessible labels and descriptions;
- Escape and backdrop rules;
- keyboard navigation;
- screen-reader announcements for open/close/errors;
- nested overlay order;
- reduced-motion support where animation exists.

---

## 15. Headless hooks

Hooks are client-only and consume the catalog, registries, and host runtime. They MUST remain headless: no dependency on a specific visual library.

### 15.1. Model and action hooks

```typescript
function useResourceModel<T>(modelKey: ModelKey): ResourceModel<T>;
function useActionCapabilities(modelKey: ModelKey, actionIds: readonly ActionId[]): CapabilitySnapshot;
function useActionDispatcher(): ClientActionInvoker;
```

Use `can(actionId, context)` only as a presentation capability helper. Server execution always re-checks authorization.

### 15.2. Common workspace hook

```typescript
interface WorkspaceState<T> {
  model: ResourceModel<T>;
  descriptor: WorkspaceDescriptor<T>;
  invocation: WorkspaceInvocation;
  isLoading: boolean;
  error: FrameworkError | null;
  refresh(): Promise<void>;
}
```

### 15.3. Grid hook

```typescript
interface GridWorkspaceState<T> extends WorkspaceState<T> {
  rows: readonly T[];
  totalCount?: number;
  page: PageState;
  sort: readonly SortTerm[];
  search: string;
  filters: readonly QueryExpression[];
  selectedKeys: ReadonlySet<SerializedKey>;
  setPage(page: PageState): void;
  setSort(sort: readonly SortTerm[]): void;
  setSearch(query: string): void;
  setFilters(filters: readonly QueryExpression[]): void;
  toggleSelectRow(record: T): void;
  toggleSelectAll(): void;
  toolbarActions: readonly ResolvedAction[];
  getRowActions(record: T): readonly ResolvedAction[];
  selectionActions: readonly ResolvedAction[];
  triggerAction(actionId: ActionId, input: unknown): Promise<ActionResult<unknown>>;
}
```

Grid query state is converted to a validated `QuerySpec`. Sorting, filtering, and selection state must not expose unrestricted field paths.

### 15.4. Form hook

```typescript
interface FormWorkspaceState<I, O> extends WorkspaceState<unknown> {
  actionId: ActionId;
  schema: RuntimeSchema<I>;
  values: I;
  errors: readonly ValidationIssue[];
  touched: ReadonlySet<string>;
  lifecycle: FormLifecycle;
  isDirty: boolean;
  isSubmitting: boolean;
  setValue(path: FieldPath<I>, value: unknown): void;
  validate(): Promise<readonly ValidationIssue[]>;
  submit(): Promise<ActionResult<O>>;
  reset(): void;
  cancel(): Promise<void>;
}
```

The concrete TypeScript design should infer `I` and `O` from the selected `ActionDefinition`. The hook MUST NOT expose a `mode` property. It derives input schema and submit behavior from the canonical action binding.

### 15.5. Lookup hook

Lookup behavior is based on the target relation or selection contract and a `QuerySpec`, not a special hard-coded action pipeline.

```typescript
interface LookupWorkspaceState<T> extends WorkspaceState<T> {
  query: string;
  results: readonly T[];
  isSearching: boolean;
  selectedKeys: ReadonlySet<SerializedKey>;
  setQuery(value: string): void;
  toggleItem(item: T): void;
  confirmSelection(): void;
  quickCreate?(): Promise<HostResult<T>>;
}
```

A lookup may open a target workspace through a canonical navigation action and bind its input workspace to the target model's `create` action. The returned result is resolved through HostManager.

### 15.6. Record and wizard hooks

`useRecordWorkspace()` resolves the record action/context and supplies record data to its sections. `useWizardWorkspace()` owns step index, step visibility, draft data, validation, navigation, and finish-action dispatch. Wizard steps may reference sections or child workspaces when an independent query/lifecycle is required.

---

## 16. Identity and primary-key serialization

### 16.1. Structured keys internally

A primary key is a typed ordered tuple. Internally it MUST remain a structured `KeyObject`, not a delimiter-concatenated string.

```typescript
interface KeyObject<T> {
  /** Values are ordered exactly as `KeyDescriptor.components`. */
  readonly values: readonly SerializableScalar[];
}
```

The compiler validates that every key component exists, is required for persisted records, and has a supported codec. Resources without a primary key are permitted for collection-only use; identity-dependent actions and navigation actions are omitted. `extractKey()` and serialization methods fail with a typed `MissingPrimaryKeyError` when called for such a resource.

### 16.2. Versioned serialization

`serializeKey()` and `parseKey()` use a versioned codec that encodes an ordered tuple of typed values. It must preserve string/number distinctions, Unicode, UUIDs and other supported scalar types, and exact round-tripping. Delimiter concatenation such as `encodeURIComponent(part) + '::'` is not a sufficient formal codec.

A partial key MUST NOT be serialized. Serialization is used only at routing/cache/selection boundaries; adapters receive structured key objects.

### 16.3. Composite keys

Composite primary keys are supported. All key components must be present and ordered exactly as declared. Grid row keys, repository/adapter lookups, URLs, cache tags, and host invocation use the same canonical key codec.

---

## 17. Localization, labels, and formatting

### 17.1. Localization metadata

The framework may preserve grammatical gender and inflection information for languages such as Portuguese and Spanish, but it MUST NOT hard-code one locale's article rules into the model runtime.

`ResourceLabels` is defined in the shared type vocabulary. A plain string `MessageRef` is literal copy; a `MessageDescriptor` (created with `message('catalog.key')`) is resolved through an application message catalog, preferably ICU MessageFormat or an equivalent locale-aware system. Runtime context contains locale. Standard labels for generated actions and empty states come from message templates and can be overridden per resource/action.

### 17.2. Formatting rules

- Use `Intl` APIs or registered formatters for number, date, time, and currency formatting.
- Distinguish date-only values from instants/timestamps with timezone semantics.
- Represent money with an explicit amount/currency/scale/rounding contract; do not assume a currency amount is merely a floating-point number with a `currencyCode` hint.
- Store enum values independently from localized labels. Enum labels may vary by locale; persisted values do not.
- Semantic formats such as CPF/CNPJ, CEP, phone, and URL are codecs/formatters/validators, not separate storage kinds.

---

## 18. Component resolution and rendering

### 18.1. Renderer roles

The visual system binds each descriptor kind to a component role. At minimum:

- workspace renderer;
- section renderer;
- field renderer;
- cell renderer;
- filter renderer;
- action renderer;
- empty-state renderer.

Role mismatch is a configuration error. Components must not infer domain behavior from string IDs or query the registry themselves in inconsistent ways; the workspace/section rendering runtime resolves them centrally.

### 18.2. Component request

A component resolution request includes the expected role, semantic kind/format, storage type, relation cardinality where relevant, explicit component reference if any, and supported capabilities. The registry returns a `ResolvedComponent` containing the component definition and merged serializable props.

### 18.3. Fallback policy

- Explicit component not found: fail with a structured diagnostic.
- Explicit component role mismatch: fail.
- Convention-selected renderer missing: select a generic role fallback and emit a warning.
- Capability mismatch: fail or select a compatible fallback according to a documented rule; never silently render an incompatible component.

---

## 19. Next.js App Router integration

### 19.1. Static server dispatchers

Do not assume that a runtime factory can generate arbitrary per-resource exported Next.js Server Actions. Server Action exports are subject to Next.js build/module constraints.

The recommended pattern is one or a small number of statically declared exported dispatchers:

```typescript
'use server';

export async function dispatchResourceAction(
  modelKey: string,
  actionId: string,
  input: unknown,
): Promise<ActionResult<unknown>> {
  return serverRuntime.dispatch(modelKey, actionId, input);
}
```

The dispatcher resolves the model, action, server handler, data adapter, and policy from server-only runtime registries. It validates all inputs and reauthorizes every request.

If an application requires named per-resource Server Action exports, generate explicit source wrappers at build time or write thin static wrappers manually. Do not treat dynamic factory-generated exports as a foundational guarantee.

### 19.2. Server page to client host

```tsx
// Server Component
export default async function InvoicePage() {
  const initialData = await serverRuntime.dispatch(
    'sales.invoice',
    'list',
    { query: { page: { kind: 'offset', index: 0, size: 20 } } },
  );

  return (
    <PageHost
      modelKey="sales.invoice"
      workspaceId="browse"
      initialData={initialData}
    />
  );
}
```

Only plain serializable data and stable IDs cross the boundary. The client imports its own metadata catalog and resolves the workspace/component from its client-safe model modules.

### 19.3. Cache revalidation

Server actions should derive revalidation tags from action metadata and structured model/record/query identity. Arbitrary tag strings may be supported as explicit overrides, but resource and record tags should have a canonical convention. The `invalidate` effect should prefer structured `resources`/`records` targets; `tags` is an explicit escape hatch. Cache invalidation happens after successful commit.

---

## 20. Diagnostics, observability, and developer experience

### 20.1. Structured diagnostics

Compiler and registry errors MUST include:

- code and severity;
- model key;
- descriptor path;
- unresolved or invalid reference;
- expected type/role/capability;
- actual value where safe;
- suggested correction;
- source module/location when available.

Examples:

```text
sales.invoice.sections.items.relation:
  Relation "items" does not exist on model "sales.invoice".
  Available relations: customer, issuer, items.

sales.invoice.workspaces.browse.actions.row[1]:
  Action "issue" targets "none" but row placement requires a record-compatible action.

sales.invoice.relations.customer.target:
  Model "crm.customer" is not registered in this ModelCatalog.

sales.invoice.attributes.totalAmount.component:
  Component "currency-input" has role "cell"; expected role "field".

sales.invoice.actions.issue.authorize:
  Policy "invoice.issue" is not registered in the server PolicyRegistry.
```

### 20.2. Inspectability

Provide `inspectModel(model)` or equivalent tooling that displays:

- inferred schema/attribute metadata;
- generated standard actions;
- generated workspaces and sections;
- relation graph and projection plans;
- final override values;
- convention and override provenance;
- unresolved references and warnings.

This is required to make convention-over-configuration predictable rather than magical.

### 20.3. Observability

Action execution, query compilation, data adapter calls, validation, host transitions, and cache invalidation should carry a common correlation ID. Structured logs and metrics SHOULD include model key, action ID, adapter key, duration, outcome, and error code. Never log credentials or sensitive field values.

### 20.4. Developer ergonomics

The framework SHOULD provide:

- helper constructors for branded IDs and typed references;
- schema-to-type inference;
- generated action/workspace/section type maps for literal IDs;
- compiler diagnostics with path-aware suggestions;
- `inspectModel()` and `inspectCatalog()`;
- a development warning for implicit generic component fallbacks;
- registry contract test helpers;
- fixtures for common resource shapes;
- examples demonstrating minimal authoring first, customization second, custom handler/adaptor third;
- optional code generation for route declarations, static Server Action wrappers, and type-safe reference maps.

---

## 21. Reference authoring example

This example is illustrative but should compile after implementation using the framework's chosen schema adapter.

### 21.1. Minimal model

```typescript
export const CustomerModel = buildModel({
  key: 'crm.customer',
  schema: CustomerSchema,
});
```

The model compiler produces attributes, conventional data actions based on capabilities, and usable default workspaces/sections.

### 21.2. Customized invoice model

```typescript
export const InvoiceModel = buildModel({
  key: 'sales.invoice',
  schema: InvoiceSchema,
  labels: {
    singular: message('invoice.singular'),
    plural: message('invoice.plural'),
    gender: 'feminine',
  },
  relations: {
    customer: {
      target: 'crm.customer',
      cardinality: 'many-to-one',
      sourceKey: ['customerId'],
      targetKey: ['id'],
      nullable: false,
      display: { fields: ['name', 'taxId'] },
      lookup: { workspace: 'crm.customer:lookup' },
    },
    items: {
      target: 'sales.invoice-item',
      cardinality: 'one-to-many',
      sourceKey: ['id'],
      targetKey: ['invoiceId'],
      ownership: 'owned',
      onDelete: 'cascade',
      loading: 'deferred',
    },
  },
  attributes: {
    number: {
      label: message('invoice.number'),
      readOnly: rule('invoice.number.immutable-after-issue'),
    },
    totalAmount: {
      format: 'currency',
      component: componentRef('design-system.currency-input', 'field'),
    },
  },
  actions: {
    issue: {
      label: message('invoice.issue'),
      description: message('invoice.issue.description'),
      input: IssueInvoiceInputSchema,
      output: InvoiceSchema,
      target: 'record',
      behavior: {
        type: 'handler',
        handler: handlerId('invoice.issue'),
        runtime: 'server',
      },
      authorize: policy('invoice.issue'),
      confirm: { severity: 'warning' },
      effects: [
        { type: 'invalidate', tags: ['sales.invoice'] },
        { type: 'toast', message: message('invoice.issue.success') },
      ],
      transaction: { required: true },
      audit: { enabled: true },
    },
    open: {
      label: message('invoice.open'),
    },
  },
  sections: {
    summary: {
      id: 'summary',
      kind: 'fields',
      fields: ['number', 'customer', 'issueDate', 'totalAmount', 'status'],
      columns: 2,
    },
    items: {
      id: 'items',
      kind: 'relatedCollection',
      relation: 'items',
      columns: ['product', 'quantity', 'unitPrice', 'total'],
      pageSize: 20,
    },
    inputFields: {
      id: 'inputFields',
      kind: 'fields',
      fields: ['number', 'customer', 'issueDate', 'totalAmount'],
      columns: 2,
    },
    details: {
      id: 'details',
      kind: 'tabs',
      tabs: [
        { id: 'overview', label: message('common.overview'), section: 'summary' },
        { id: 'items', label: message('invoice.items'), section: 'items' },
      ],
    },
  },
  workspaces: {
    browse: {
      id: 'browse',
      kind: 'grid',
      columns: ['number', 'customer', 'issueDate', 'totalAmount', 'status'],
      searchable: ['number'],
      filterable: ['status', 'issueDate'],
      actions: {
        toolbar: ['new'],
        row: ['open', 'edit', 'issue', 'delete'],
      },
      primaryAction: 'open',
    },
    record: {
      id: 'record',
      kind: 'record',
      sections: ['details'],
      actions: { recordHeader: ['edit', 'issue', 'delete'] },
    },
    input: {
      id: 'input',
      kind: 'form',
      sections: ['inputFields'],
      warnOnUnsavedChanges: true,
    },
  },
  defaults: {
    browse: 'browse',
    record: 'record',
    input: 'input',
  },
});
```

Notes:

- `customerId` is the scalar foreign key; `customer` is a relation declared separately.
- `issue` is a regular canonical action, like generated `create`, `update`, and `delete`.
- `new`, `edit`, and `open` are canonical navigation actions generated by convention when their target workspaces/actions exist; the partial `open` entry only customizes the generated action label.
- The form workspace contains no mode. The generated `new`/`edit` navigation action invokes it with `action: create` or `action: update` and supplies the optional record key/initial values as appropriate.
- The record workspace is not a form in view mode.
- Tabs are a section composition and do not create separate host instances.
- The related collection derives its target model from the `items` relation.

### 21.3. Application bootstrap

```typescript
// Shared metadata composition
export const modelCatalog = buildCatalog([
  CustomerModel,
  InvoiceModel,
  InvoiceItemModel,
]);

// Server bootstrap
const serverActionHandlerRegistry = serverActionHandlerRegistryBuilder
  .register('invoice.issue', issueInvoiceHandler)
  .build();
const dataAdapterRegistry = dataAdapterRegistryBuilder
  .register('default', defaultDataAdapter)
  .build();
const policyRegistry = policyRegistryBuilder
  .register('invoice.issue', canIssueInvoice)
  .build();

// Client bootstrap
const componentRegistry = componentRegistryBuilder
  .register({
    key: 'design-system.currency-input',
    role: 'field',
    component: CurrencyInput,
    propsSchema: CurrencyInputPropsSchema,
  })
  .build();
const clientActionHandlerRegistry = clientActionHandlerRegistryBuilder
  .register('invoice.copy-number', copyInvoiceNumber)
  .build();
```

The actual component registry and client action registry are created only in the client bundle. Server registries are created only in the server runtime.

---

## 22. Migration from the original proposal

The following mappings define how existing constructs should be translated:

| Existing construct | Target construct |
|---|---|
| `ResourcePermissions.create/read/update/delete` | `authorize` policy on canonical standard actions; optional inherited resource policy. |
| `actions.openCreate` / `openEdit` | Canonical navigation actions referencing a form/record workspace and action binding. |
| `serverAction` / `api` / `client` / `openWorkspace` descriptor unions | One canonical `ActionDefinition` with a discriminated `behavior`. |
| `submitAction`, `quickCreateAction`, `finishAction` | `ActionId`/`ActionRef` to an existing canonical action. |
| `toolbarActions`, `rowActions`, `bulkActions` | Action placement slots referencing canonical actions. |
| `FormWorkspaceDescriptor.mode` | Delete. Bind the workspace invocation to an action input schema and optional record context. |
| `ReactiveContext.mode` | Delete. Use action/invocation context and field policy. |
| `FormSection` | `FieldGroupSectionDescriptor` stored in `ResourceModel.sections`. |
| Tabs/accordion workspaces used only for layout | `TabsSectionDescriptor` / `AccordionSectionDescriptor`. |
| `relationAttribute` | Typed `RelationId`/`RelationRef` validated by `ModelCatalog`. |
| `targetModel` string on a relation property | Relation descriptor `target` plus explicit cardinality and key mapping. |
| Relation kind missing `many-to-one` | Four-cardinality relation model. |
| `componentHint` | Role-aware `ComponentRef` resolved by `ComponentRegistry`. |
| `CustomWorkspaceDescriptor` used for fragments | Keep for custom interaction lifecycle; add `CustomSectionDescriptor` for content fragments. |
| `createResourceActions(model, repo)` CRUD methods | Static generic dispatcher + server handler registry + built-in data operation handlers. |
| `ResourceRepository<T>` | `ResourceDataAdapter<T>` persistence port. |
| Flat filter arrays and dot-notation projection | Typed `QueryExpression` AST and `ProjectionPlan`. |
| `getProjectionForWorkspace(): string[]` | Compiled projection derived from workspace/section metadata. |
| Global singleton `ModelRegistry` | Explicit immutable `ModelCatalog`. |
| Promise resolver stored on `HostFrame` | Private pending-resolver map in client `HostManager`; serializable frame metadata. |
| Arbitrary functions in shared descriptors | Named registry references or declarative expressions; direct callbacks only in client-only composition. |

A temporary migration adapter MAY translate legacy descriptors, but the target runtime MUST use canonical action and workspace/section contracts. Compatibility code must be isolated and have a removal plan.

---

## 23. Implementation sequence

Do not build all visual workspaces before stabilizing the compiler, action model, relation graph, and registries. Those contracts are dependencies for the rest of the framework.

### Phase 0 — Architecture decisions and API freeze

Deliverables:

- confirm branded identifiers and reference semantics;
- confirm runtime schema facade and type inference;
- confirm `ActionDefinition` shape and standard action IDs;
- confirm no-mode invariant;
- confirm relation cardinalities and relation/persistence separation;
- confirm workspace/section families;
- confirm explicit catalog and registry lifecycle;
- confirm generic dispatcher and static Next.js Server Action boundary.

Exit criteria: core public contracts are documented and type-tested before implementation spreads into hooks/components.

### Phase 1 — Metamodel compiler

Implement:

- runtime schema inspection adapter;
- `ResourceDescriptor` and inferred model types;
- attribute/relation compilation;
- standard action generation;
- default sections/workspaces;
- override merge semantics;
- local reference validation;
- computed/rule dependency graph;
- immutable `ResourceModel`;
- compiler diagnostics and `inspectModel()`.

Exit criteria: a resource with only key/schema compiles to a complete inspectable model with predictable actions/workspaces.

### Phase 2 — Model catalog and registries

Implement:

- `buildCatalog()`;
- model lookup and typed reference resolution;
- cross-model relation/inverse validation;
- `ComponentRegistry` and component role/capability validation;
- server/client action handler registries;
- `DataAdapterRegistry`;
- `PolicyRegistry` and `ValidatorRegistry` contracts;
- explicit bootstrap and duplicate detection.

Exit criteria: all cross-model and runtime IDs resolve or fail with precise diagnostics.

### Phase 3 — Canonical action and data runtime

Implement:

- generic `ActionDispatcher`;
- standard action built-in handlers;
- `ActionResult` and stable error mapping;
- typed query AST and validation;
- projection plan compiler;
- data adapter default implementation;
- authorization, tenant/row/field policy middleware;
- transaction/concurrency/idempotency hooks;
- audit and cache invalidation hooks.

Exit criteria: standard and custom actions use the same dispatch path; policy is enforced server-side.

### Phase 4 — Relation and projection runtime

Implement:

- all four cardinalities;
- composite and alternate key mapping as supported;
- inverse validation;
- many-to-many association mapping;
- relation lookup and child collection query;
- projection planning and policy trimming;
- self-relation/cycle/depth protections.

Exit criteria: all relation invariants and relation-backed sections pass integration tests.

### Phase 5 — Workspace and section runtime

Implement:

- common workspace runtime;
- grid, record, form, lookup, wizard workspaces;
- fields, summary, related collection, tabs, accordion, activity, custom sections;
- action-derived form schemas;
- no-mode APIs;
- workspace and section rendering resolution.

Exit criteria: workspaces own lifecycle; sections compose without host lifecycle; action input drives forms.

### Phase 6 — Host manager and UI bindings

Implement:

- `PageHost`, `DialogHost`, `DrawerHost`;
- overlay stack and result promises;
- dirty-state guards;
- router/history integration and URL policy;
- accessibility and focus management;
- component registry design-system bindings.

Exit criteria: nested overlays, lookup quick-create, browser back, close guards, and focus restoration are covered by integration tests.

### Phase 7 — Migration and developer tooling

Implement:

- legacy descriptor translator if required;
- model/catalog inspection tooling;
- route and server dispatcher wrapper generation if required;
- code examples, fixtures, and registry contract test helpers;
- strict TypeScript usage guide.

Exit criteria: application resources can migrate without retaining old mode/CRUD mechanisms in the target runtime.

### Phase 8 — Hardening

Implement and verify:

- security threat-model review;
- query complexity/page-size controls;
- concurrency/idempotency tests;
- observability and audit;
- package boundary tests;
- accessibility;
- performance budgets;
- failure recovery and cleanup.

---

## 24. Acceptance criteria and test strategy

### 24.1. Metamodel and compiler

- Given only a key and runtime schema, `buildModel()` generates a complete model with attributes, standard actions, and conventional workspaces/sections appropriate to capabilities.
- Runtime type inference is linked to the schema; callers do not separately declare an unrelated generic record type.
- Equivalent inputs produce equivalent compiled outputs.
- `buildModel()` has no global side effects and performs no I/O.
- Overrides deterministically replace/extend conventions according to the published merge rules.
- `inspectModel()` identifies which values were inferred, generated, or overridden.
- Missing local references, duplicate IDs, invalid paths, invalid operator/type combinations, and dependency cycles fail with path-aware diagnostics.
- Exposed compiled collections cannot be mutated.
- Mutating a source descriptor after compilation cannot change the compiled model.

### 24.2. Actions and security

- Every standard data operation is an ordinary `ActionDefinition`.
- Custom server commands and client actions use the same canonical action identity/metadata model.
- Action input is validated before execution.
- Server handlers receive trusted actor/tenant context.
- Action, row, and field policies are enforced server-side.
- Client visibility or `can()` cannot bypass server authorization.
- Client handlers cannot be registered as server handlers and server handlers cannot leak into client bundles.
- Optimistic conflicts, idempotent retries, forbidden, validation, not-found, unavailable, and internal errors have stable typed representations.

### 24.3. Relations

- All four relation cardinalities are represented and validated.
- Composite keys and inverse mappings are tested.
- Missing target models and invalid inverses fail during catalog construction.
- Self-relations do not cause infinite projection or query traversal.
- Many-to-many joins are explicitly mapped or provided by a documented adapter convention.
- Relation projections are policy-trimmed server-side.
- Relation lookup and related collection sections resolve the target model from the relation.

### 24.4. Workspaces and sections

- Workspace and section descriptor maps/types/lookup APIs are separate.
- Sections cannot be opened directly in a host.
- Section composition cycles fail validation.
- Tabs and accordions compose sections by default.
- Form workspaces bind to canonical action input/output contracts.
- No create/edit/view mode exists in descriptors, hooks, contexts, or runtime state.
- `relatedCollection` resolves its model and query scope through a relation.
- Wizard lifecycle is separate from simple section composition.

### 24.5. Registries

- Duplicate model/component/handler/adapter/policy IDs fail clearly.
- Missing explicit component references fail; missing convention-selected components may use a documented generic fallback.
- Component role mismatch fails validation.
- Component capability mismatch fails or selects an explicitly allowed fallback.
- Layered component overrides resolve deterministically.
- Server and client registries are environment-isolated.
- Catalog and registry snapshots are immutable after bootstrap.

### 24.6. Data layer

- Standard list/get/create/update/delete actions work through the generic dispatcher without resource-specific repositories.
- Query AST supports AND/OR/NOT, typed comparisons, relation predicates, sorting, projection, and paging.
- Invalid operators, unknown paths, forbidden fields, excessive page sizes, and excessive relation depth are rejected.
- Adapter capability mismatches fail during bootstrap.
- Custom adapter and custom server handler paths are covered by integration tests.
- Tenant and row scope are applied equally to list, get, update, and delete.
- Audit/events are committed/published only under the declared transaction semantics.

### 24.7. Runtime and host

- Page routing and overlay stacks have distinct behavior.
- Dialog/drawer promise resolution and cancellation are deterministic.
- No resolver is stored in serializable host frame metadata.
- Nested dialog/drawer flows work.
- Dirty guards cover backdrop, Escape, route transition, browser back, refresh, tab close, and programmatic close.
- Parent destruction settles child/pending host promises.
- Focus and accessibility behavior passes keyboard and screen-reader tests.

### 24.8. Package and performance tests

- Metamodel imports do not pull React, Next.js, database drivers, secrets, or browser-only APIs.
- Client package imports do not include server handlers/adapters/policies.
- Server package imports do not require React component implementations.
- Query and projection plans respect configured complexity limits.
- Workspace loading and component rendering meet documented performance budgets.
- Strict TypeScript examples compile without unsafe `any` leakage in public APIs.

### 24.9. Minimum test matrix

| Area | Required cases |
|---|---|
| Schema inference | Optional/nullable fields, defaults, enums, nested objects/arrays, refinements, branded primitives, unsupported schema node. |
| Compiler | Minimal descriptor, default generation, override precedence, descriptor immutability, duplicate IDs, missing paths, cycle detection. |
| Actions | Generated actions, custom server command, client command, overridden standard action, invalid input, missing handler, forbidden action, invalid output. |
| Relations | Four cardinalities, composite keys, inverse consistency, self-reference, missing target, join model, null FK, delete policy. |
| Query compiler | AND/OR/NOT, relation predicates, invalid operators, forbidden fields, stable sort, cursor paging, max page size/depth. |
| Registries | Duplicate model/component/handler keys, missing component, role mismatch, capability mismatch, layered override, runtime mismatch. |
| Workspace/section | Nested section composition, cycles, tabs/accordion, related collection, action-bound form, custom renderer. |
| Host runtime | Nested dialog/drawer, promise resolution, cancel/dismiss, dirty guard, browser back, parent destroyed, focus restoration. |
| Data runtime | Default adapter CRUD, custom adapter, transaction, concurrency conflict, idempotency, soft delete, audit/event behavior. |
| Security | Tenant isolation, row-level filtering, field-level read/write, mass assignment, forged client capability, record-key probing. |

---

## 25. Implementation rules for AI coding agents

AI coding agents implementing this specification MUST follow these working rules:

1. Read this specification before changing framework code. Treat its core architectural decisions as constraints, not suggestions.
2. Inspect the existing repository structure, package manager, TypeScript settings, lint/test conventions, and current public exports before proposing code changes.
3. Implement the architecture in dependency order. Do not start by building UI components that depend on unstable metamodel/action/registry contracts.
4. Do not introduce CRUD-specific parallel abstractions. Any standard data action must be an `ActionDefinition` and execute through the generic dispatcher.
5. Do not introduce create/edit/view modes, even as an internal convenience. Use action binding and lifecycle state.
6. Keep workspaces and sections as distinct types and runtime components. Do not make sections hostable.
7. Keep `buildModel()` pure and deterministic. Do not register models globally during compilation.
8. Keep shared model metadata free of React components, server implementation functions, database handles, secrets, and request state.
9. Resolve all string IDs through typed references and the appropriate registry/catalog. Do not add scattered ad hoc lookup maps.
10. Validate all local references during compilation and all cross-model references during catalog construction.
11. Make conventions visible through `inspectModel()` or compiler reports. Do not hide important defaults in runtime component code.
12. Make override and merge semantics explicit. Do not rely on JavaScript object spread as the specification for merging.
13. Treat client policies and visibility as non-authoritative. Re-check all security decisions on the server.
14. Keep low-level CRUD methods only inside the data adapter boundary. Do not expose them as a separate model execution API.
15. Use a typed query AST and projection plan. Do not pass untrusted SQL or arbitrary string paths through the public data API.
16. Include tests with every architectural change. Prefer conformance tests that cover invariants and cross-layer behavior, not only isolated helper tests.
17. Provide structured errors and useful diagnostics. Do not swallow unresolved references or silently select incompatible components.
18. Avoid unnecessary abstractions. A registry or extension point should have a concrete owner, lifecycle, and use case.
19. If an implementation detail appears ambiguous, preserve the invariants in this specification and document the chosen resolution in the code/API docs.
20. Before considering a phase complete, run type-checking, unit tests, integration tests relevant to the phase, and package-boundary tests where applicable.

### 25.1. Definition of done for a coding task

A task is not complete merely because the happy path compiles. It is complete when:

- the implementation matches the relevant normative contracts;
- types expose the intended safe authoring API;
- invalid configurations fail with actionable diagnostics;
- relevant tests cover valid, invalid, and boundary behavior;
- server/client package boundaries remain intact;
- generated defaults and overrides are inspectable;
- no prohibited legacy concept has been reintroduced;
- documentation/examples are updated with the implementation.

---

## Appendix A. Canonical standard action map

| Action ID | Behavior | Input | Output | Default target |
|---|---|---|---|---|
| `list` | data/query | `QuerySpec` | `QueryResult<T>` | collection |
| `get` | data/get | key + projection | `T` or null/not-found result | record |
| `create` | data/insert | create payload | created `T` | none |
| `update` | data/patch | key + patch + concurrency token | updated `T` | record |
| `delete` | data/remove | key + concurrency/idempotency data | void/operation result | record |

These are defaults, not a second API. The model contains them as regular canonical action entries. A domain command or navigation action follows the same `ActionDefinition` contract.

When the corresponding workspaces and data actions exist, the compiler MUST generate these navigation actions unless the descriptor explicitly overrides the same IDs:

| Action ID | Behavior | Binding | Target |
|---|---|---|---|
| `new` | Navigate to input workspace | `create` | none |
| `edit` | Navigate to input workspace | `update` | record |
| `open` | Navigate to record workspace | `get`/current record | record |

These navigation actions are canonical actions whose behavior is `navigate`. They do not introduce a form mode.

## Appendix B. Suggested source layout

```text
packages/
  metamodel/
    src/
      ids/
      schema/
      descriptors/
      compiler/
      model/
      catalog/
      relations/
      diagnostics/
      index.ts
  runtime-server/
    src/
      actions/
      handlers/
      adapters/
      policies/
      validators/
      transactions/
      audit/
      next/
      index.ts
  runtime-client/
    src/
      workspaces/
      sections/
      hosts/
      actions/
      registries/
      hooks/
      index.ts
  react/
    src/
      hosts/
      workspace-renderers/
      section-renderers/
  design-system/
    src/
      components/
      registry/
      mappings/
apps/
  application/
    src/
      models/
      server/
      client/
      app/
```

This layout is a recommendation, not a required directory structure. Import boundaries and ownership are mandatory; exact folder names are not.

## Appendix C. Questions deliberately deferred

The following items are not required for the initial implementation unless the application explicitly needs them:

- polymorphic relations;
- plugin-driven runtime registry mutation after bootstrap;
- distributed transactions across unrelated data stores;
- streaming subscriptions/live query updates;
- offline-first synchronization;
- generalized workflow/BPMN engine;
- visual designer for editing resource descriptors;
- automatic code generation of all UI screens;
- arbitrary server-side expression language.

Do not preemptively add these features. Keep extension points compatible with future needs without making the initial core harder to understand.

---

**End of specification.**
