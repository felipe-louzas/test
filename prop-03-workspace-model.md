# PROP-02 — Declarative Workspace, Operation Binding, and Workspace-Bound Section Model

**Target:** Foundational Frontend Framework  
**Target Areas:** Resource Descriptors, Operation Contracts, Workspace Contracts, Collection/Grid Interactions, Lookup, Presentation Architecture, Headless Components, Materialized Component Registry  
**Proposal Type:** Core architectural model  
**Status:** Proposed — for architectural review and incorporation into the next specification revision  
**Related Proposals:**
- PROP-01 — Design Principles, Anti-Patterns, and Conformance Rules
- Unified Composable Field Definitions

---

## 1. Purpose

This proposal establishes the declarative workspace architecture governing resource management, collection interactions, operation forms, aggregate editors, lookup experiences, and specialized operational interfaces.

The framework's resource manifest is intended to describe resource contracts and field semantics, as well as the complete interaction experience required to manage those resources.

Achieving this requires a workspace architecture capable of materializing standard enterprise UI interaction patterns without requiring application developers to manually assemble components, hooks, operation invocations, and interaction flows.

The proposal establishes six fundamental rules:

1. **Workspace-first composition:** A workspace is the authoritative unit of UI composition, interaction orchestration, and presentation. Workspace definitions belong to resource manifests or explicitly declared application-level workflows.

2. **Composable resource management:** Standard resource management MUST be achieved through composition of purpose-built workspaces, not through a separate monolithic resource-management workspace kind. A collection workspace provides the primary resource-browsing and action surface. It MAY reference other workspaces through declared `ClientOperation` contracts for record creation, inspection, editing, and specialized interactions.

3. **Operation model authority:** The existing `OperationDescriptor` discriminated union MUST remain the sole authoritative model for executable operations. Workspaces MUST reference declared operations; they MUST NOT define, recreate, wrap, or independently implement operation contracts.

4. **Workspace-bound action composition:** Collection workspaces MUST support resource-level actions, row-level actions, and selection-level batch actions. These are workspace bindings to existing operation descriptors, not independent action definitions. Their execution semantics, schemas, authorization requirements, confirmation policies, and invalidation behavior remain owned by the referenced operations.

5. **Workspace-bound sections:** Sections are structural composition elements owned by their parent workspace. They MUST NOT exist as independent top-level resource, application, or globally registered descriptors. Section support MUST be explicitly defined by the workspace kinds that require it.

6. **Framework-integrated customization:** Custom workspaces MUST integrate through framework-defined component contracts and use the same underlying headless primitives, operation invocation infrastructure, component registries, and runtime providers. Customization MUST NOT imply wholesale replacement or bypass of the framework architecture.

The objective is to enable the framework to materialize complete resource-management experiences directly from resource manifests while retaining sufficient expressive power for complex operational interfaces.

---

## 2. Architectural Model

### 2.1. Workspace as the Unit of Composition

A workspace is the primary declarative unit describing a complete application interaction experience.

A workspace definition MUST identify its interaction kind and provide the configuration required by that kind.

Depending on its kind, a workspace MAY describe:

- Collection browsing and selection.
- Query, search, filtering, and sorting interactions.
- Resource-level operation exposure.
- Record-level operation exposure.
- Selection-level batch operation exposure.
- Operation-bound input forms.
- Parent and child resource interactions.
- Multiple related child collections.
- Tabs, accordions, and other supported composition arrangements.
- Workspace invocation and presentation surfaces.
- Workspace navigation and contextual state.
- Custom component integrations.

A workspace MUST be materializable by the framework into a functional user experience using resource definitions, operation contracts, unified field definitions, relation metadata, presentation metadata, component registry entries, and standard interaction infrastructure.

Workspace definitions MUST describe both presentation and interaction intent. They MUST NOT be reduced to visual layout descriptions that leave application developers responsible for independently implementing standard data and interaction flows.

### 2.2. Workspace Ownership

Resource-owned workspaces MUST be declared as part of the authoritative resource manifest.

Conceptually:

```typescript
export const SalesOrderResource = defineResource({
  resourceKey: asResourceKey('sales.order'),

  fields: SalesOrderFields,

  operations: SalesOrderOperations,

  workspaces: {
    browse: {
      kind: 'collection',
      // Collection and operation binding configuration
    },

    create: {
      kind: 'operation-form',
      // Reference to an existing operation
    },

    editor: {
      kind: 'parent-child',
      // Parent and child editing configuration
    },

    fulfillment: {
      kind: 'parent-children',
      // Parent and child section configuration
    },
  },
});
```

The exact API is subject to the specification revision.

The architecture SHOULD support multiple named workspace definitions for a resource when different application routes or operational contexts require different interaction experiences.

A resource SHOULD expose a default workspace or an unambiguous default workspace resolution convention.

Application-level workflows that do not naturally belong to a single resource MAY declare standalone workspaces through an equivalent framework-defined mechanism. Such definitions MUST use the same workspace model and component infrastructure rather than introduce a separate composition architecture.

### 2.3. Workspace Discrimination

Workspace definitions MUST use a discriminated union based on an explicit workspace kind.

Each workspace kind MUST own its specific configuration properties and composition capabilities.

The common workspace contract MUST NOT expose a universal collection of optional properties that are meaningless for particular workspace kinds.

In particular:

- Workspace kinds that support sections MUST declare their section-related properties within their own workspace-kind contract.
- Workspace kinds that do not support sections MUST NOT expose a `sections` property.
- A section-related configuration MUST NOT be accepted by a workspace kind that does not support it.
- Workspace composition MUST be validated through both TypeScript contracts and runtime workspace graph validation.

This distinction MUST be enforced architecturally rather than left as a documentation convention.

### 2.4. Operation Model Authority and Workspace Binding

The framework MUST preserve the existing operation model defined in the specification.

The following operation types MUST remain distinct:

| Operation Contract | Authoritative Responsibility |
|---|---|
| `QueryOperation` | Read operations, collection and lookup data retrieval, reports, and supported downloads. |
| `CommandOperation` | Single-record or resource-scoped mutations, state transitions, and other single-command execution. |
| `BatchOperation` | Multi-record operations with explicit batch targeting and partial-result semantics. |
| `AsyncJobOperation` | Long-running operations with accepted-job, progress, completion, failure, and cancellation lifecycles. |
| `ClientOperation` | Browser-only operations, including local interactions, workspace invocation, dialogs, sidebars, and client-side navigation. |

These remain members of the existing `OperationDescriptor` model.

Workspaces MUST reference existing `OperationDescriptor` instances or their strongly typed resource-owned operation references.

A workspace MUST NOT:

- Define an inline `QueryOperation`, `CommandOperation`, `BatchOperation`, `AsyncJobOperation`, or `ClientOperation`.
- Duplicate an operation's input or output schema.
- Declare a second permission or authorization contract for an operation.
- Redefine confirmation, idempotency, concurrency, transfer, invalidation, or job lifecycle semantics.
- Introduce an alternative action execution callback as a substitute for `ClientOperation` or another existing operation kind.
- Convert one operation kind into another implicitly.

The operation descriptor owns execution semantics. The workspace owns composition and contextual exposure.

### 2.5. Operation References

The specification MUST define a strongly typed mechanism for referencing operations from workspace definitions.

References SHOULD resolve to resource-owned operation keys or stable operation identifiers, preserving compile-time validation and avoiding independently authored operation declarations.

Where operations are declared in shared `*.op.ts` modules, workspaces MUST be able to reference those operation descriptors through the established resource binding or operation registration mechanism.

A workspace operation reference MUST be resolvable to exactly one declared operation.

The framework MUST validate that the referenced operation exists, is registered where required, and is compatible with the workspace binding context.

The workspace binding MAY provide contextual presentation overrides or parameter/context mapping, but MUST NOT redefine the referenced operation.

---

## 3. Workspace Kinds

The initial workspace model SHOULD include the following purpose-built kinds.

### 3.1. Collection Workspace

**Kind:** `collection`

**Purpose:** Provide the primary collection browsing, selection, and operation-exposure surface for a resource or related collection.

The collection workspace is the foundational workspace for standard resource management.

Its primary presentation SHOULD be a grid or data table. The architecture SHOULD preserve the possibility of alternative collection presentations, such as list views, without changing the underlying collection interaction contract.

The term `collection` is the recommended semantic workspace kind; `grid` SHOULD be treated as a presentation or rendering variant unless the specification revision establishes a compelling reason to make it the public workspace discriminator.

A collection workspace MUST resolve and materialize:

- A `QueryOperation` for collection data retrieval.
- Search and filtering controls.
- Sorting behavior.
- Pagination or infinite-loading behavior.
- Grid or list presentation.
- Row selection.
- Resource-level operation bindings.
- Row-level operation bindings.
- Selection-level operation bindings.
- Loading, empty, error, and refresh states.
- Applicable capabilities and contextual permissions.
- Workspace invocation behavior through referenced `ClientOperation` contracts.

The workspace MUST resolve its query, fields, operations, and relation bindings from authoritative resource contracts.

#### 3.1.1. Query and Filtering

A collection workspace MUST reference a declared `QueryOperation`.

The query operation MUST remain authoritative for its parameter schema, result schema, allowed filters, allowed sorting, default sorting, and applicable response behavior.

The collection workspace MUST NOT define a second query schema or independently redefine query execution semantics.

Search and filtering controls SHOULD be derived from unified field metadata, including `searchable`, `filterable`, and `filterOperators` declarations, subject to the referenced `QueryOperation`'s allowed policy.

Sortable columns SHOULD be derived from applicable field metadata and constrained by the query's allowed sorting policy.

The collection workspace MUST NOT expose a filter or sorting capability that the corresponding query contract does not permit.

The framework MUST define how the primary collection query is resolved when a resource has multiple query operations.

When a single unambiguous collection query exists, the workspace SHOULD derive it without redundant configuration. When multiple eligible queries exist, the workspace MUST provide an explicit binding or use another documented, unambiguous convention.

A `QueryOperation` used as the collection data source MUST NOT be redefined as an action merely because its results are presented in a grid.

A query MAY additionally be exposed as a user-triggered action where its existing contract represents an explicit read, report, or download interaction. Such exposure MUST retain query semantics and MUST NOT imply mutation behavior.

#### 3.1.2. Resource-Level Operation Bindings

The collection workspace MUST support resource-level operation bindings.

These bindings expose operations in the context of the resource or collection, rather than an individual record or selected record set.

Typical capabilities include:

- Opening a record creation workspace.
- Invoking a resource-scoped command.
- Starting an import or export operation.
- Starting a long-running resource-level job.
- Invoking browser-local resource interactions.

Resource-level bindings MAY reference:

- `CommandOperation` where the operation can be invoked with its declared input contract and resource-level context.
- `AsyncJobOperation` where its parameters and execution contract are compatible with resource-level invocation.
- `ClientOperation` for browser-local behavior, including opening another workspace.
- An explicitly user-triggered `QueryOperation` where its read semantics and presentation justify action exposure.

An operation form MUST reference the applicable `CommandOperation` or `AsyncJobOperation` directly. A collection action that opens that form MUST reference a `ClientOperation` responsible for the workspace invocation.

The collection workspace MUST NOT define the destination workspace invocation as an independent action execution mechanism.

#### 3.1.3. Row-Level Operation Bindings

The collection workspace MUST support row-level operation bindings associated with an individual record.

Typical capabilities include:

- Opening or inspecting a record.
- Opening a record editing workspace.
- Deleting a record.
- Invoking a record-bound command.
- Starting a record-scoped asynchronous job.
- Executing a browser-local interaction against the record.

Row-level bindings MAY reference:

- `CommandOperation` whose invocation contract supports the record context, including `requiresRecordKey` where applicable.
- `AsyncJobOperation` whose parameters and execution contract support the record context.
- `ClientOperation` for record navigation, opening another workspace, or other browser-local behavior.
- A `QueryOperation` only where the interaction is explicitly a user-triggered read and its query parameters can be bound safely to the selected record.

The workspace MUST supply the selected record context to the referenced operation through the framework's typed invocation mechanism.

A row-level operation MUST NOT redefine or duplicate the operation's input schema, record-key policy, concurrency behavior, authorization, confirmation, or invalidation contract.

Opening a detail or edit workspace MUST be modeled through a `ClientOperation`. The `ClientOperation` owns the browser-side workspace invocation behavior and MUST use the framework's workspace/host integration facilities.

The workspace binding MUST NOT contain an independent `opens` execution definition that duplicates the `ClientOperation`.

#### 3.1.4. Selection-Level Operation Bindings

The collection workspace MUST support selection-level operation bindings for operations that act on multiple records.

`BatchOperation` is the authoritative contract for multi-record batch behavior.

A selection-level action referencing a `BatchOperation` MUST bind the current selection to the operation's existing `BatchTarget` contract.

The operation MUST retain responsibility for:

- Its parameter schema.
- Key-based or query-based target semantics.
- `maxSyncKeys`.
- Query-selection eligibility through `allowQuerySelection`.
- Confirmation policy.
- Partial-success and failure reporting.
- Invalidation behavior.
- Promotion to an asynchronous job where applicable.

The collection workspace MUST NOT redefine these semantics.

A selection-level binding MAY also reference:

- `AsyncJobOperation` where its declared parameters explicitly support the relevant selection or query context.
- `ClientOperation` for browser-local actions such as printing or exporting selected rows.

The framework MUST NOT silently convert a `CommandOperation` into a batch operation by invoking it repeatedly for selected records.

If a batch action exceeds the operation's synchronous limits and is promoted to an asynchronous job, the existing Batch-to-Job promotion lifecycle MUST remain authoritative. The collection workspace MUST consume the operation result and job lifecycle through the established framework infrastructure.

#### 3.1.5. Action Declaration and Binding

Resource-level, row-level, and selection-level actions MUST be declared as references to existing operations.

Conceptually:

```typescript
operations: {
  search: defineQuery({
    // Existing QueryOperation contract
  }),

  create: defineCommand({
    // Existing CommandOperation contract
  }),

  delete: defineCommand({
    // Existing CommandOperation contract
  }),

  archive: defineBatchCommand({
    // Existing BatchOperation contract
  }),

  openCreate: defineClientAction({
    // Existing ClientOperation contract
    // Opens the declared create workspace
  }),

  openDetail: defineClientAction({
    // Existing ClientOperation contract
    // Opens the declared detail workspace
  }),
},

workspaces: {
  browse: {
    kind: 'collection',

    query: 'search',

    actions: {
      resource: [
        { operation: 'openCreate' },
      ],

      row: [
        { operation: 'delete' },
        { operation: 'openDetail' },
      ],

      selection: [
        { operation: 'archive' },
      ],
    },
  },
}
```

The exact reference syntax is subject to the specification revision.

The important architectural constraint is that the workspace references operations declared elsewhere in the resource manifest or shared operation modules. It does not define them.

An operation binding MAY configure workspace-specific presentation or contextual behavior where necessary, but MUST NOT duplicate operation semantics.

The collection workspace MUST support:

- Operation selection and exposure.
- Action scope.
- Ordering.
- Visibility conditions.
- Contextual availability conditions.
- Presentation overrides.
- Record, selection, or resource context binding.

The framework MUST establish how these binding attributes relate to the referenced operation's `OperationPresentation` and other operation-level configuration.

#### 3.1.6. Section Support

The collection workspace MUST NOT expose a generic `sections` property.

It represents one focused collection interaction model. Composing multiple contextual child collections MUST use a `parent-children` workspace rather than introducing arbitrary sections into the collection contract.

### 3.2. Operation Form Workspace

**Kind:** `operation-form`

**Purpose:** Materialize a focused input form for invoking one declared operation.

This workspace kind is intended for simple action-oriented interactions, including resource creation, confirmations, adjustments, and other single-operation input flows.

It MUST reference an existing `CommandOperation` or `AsyncJobOperation` and derive its form validation, field semantics, submission behavior, and invocation context from that operation.

The workspace MUST NOT define a new operation or independently declare its input schema.

It SHOULD materialize:

- Operation input fields.
- Field controllers and renderers.
- Validation and error presentation.
- Initial and default values.
- Submission and cancellation controls.
- Invocation feedback.
- Loading and disabled states.
- Success and failure handling.
- Relevant capability restrictions.

The operation form MUST resolve field metadata from the operation's unified input field definitions or other authoritative field metadata association defined by the specification.

An operation form MUST NOT require a separate form schema or field metadata declaration when those are already available from the referenced operation.

A collection workspace or another workspace MUST be able to launch an operation-form workspace through a referenced `ClientOperation`.

#### Section support

This workspace kind MUST NOT expose a `sections` property.

Its interaction model is a single continuous operation-bound form. Field order and basic presentation MAY be configured directly through the operation form's workspace-specific presentation configuration.

More elaborate multi-region or multi-step interactions SHOULD use an appropriate workspace kind or custom workspace rather than introducing arbitrary sections into this simple form contract.

### 3.3. Parent-Child Workspace

**Kind:** `parent-child`

**Purpose:** Materialize an aggregate editing experience consisting of one parent resource and one associated child collection.

The canonical interaction pattern is an order with its line items.

The workspace MUST manage the parent and child collection as one coherent editing experience, including:

- Parent record fields and context.
- Child collection presentation.
- Child creation and removal.
- Child editing.
- Child ordering where applicable.
- Parent/child relationship binding.
- Aggregate-level validation and interaction feedback.
- Parent and child operation coordination.
- Dirty-state and navigation protection.

The workspace MUST reference the applicable parent and child operation contracts. It MUST NOT define independent operations or duplicate schemas.

The child collection MUST remain bound to its declared parent relationship or composition contract.

The workspace MUST NOT treat the child as an unrelated standalone resource merely because it has its own field definitions or row-level operations.

The framework SHOULD support native field-array and collection-editing behavior where appropriate, while preserving the distinction between resource-level operations and nested aggregate updates.

#### Section support

This workspace kind MUST NOT expose a generic `sections` property.

Its structure is purpose-built and deterministic: one parent editing region and one associated child collection region.

The workspace SHOULD expose explicit parent and child configuration attributes instead of requiring developers to create arbitrary sections for this fixed interaction pattern.

### 3.4. Parent-Children Workspace

**Kind:** `parent-children`

**Purpose:** Materialize a parent-centered operational workspace containing multiple independent or associated child resource collections.

The canonical interaction pattern is an operational aggregate such as a picking wave containing orders, vehicles, pallets, and invoices.

The workspace MUST provide:

- A primary parent context and presentation region.
- Multiple child-resource regions.
- Contextual child interactions bound to the parent.
- Independent loading, empty, error, and refresh behavior for each child region.
- Appropriate child-level operation bindings and capabilities.
- Coordination of child interactions with parent identity and state.
- A consistent navigation and presentation model for child regions.

Each child region MUST remain contextually bound to the parent workspace and MUST resolve its data and operations through declared resource and relation contracts.

The workspace MUST reference the child resources' existing operation descriptors. It MUST NOT declare new child queries, commands, or batches inline.

#### Section support

This workspace kind MUST expose a `sections` property as a first-class part of its own configuration.

The parent representation MUST occupy the workspace's primary region. Its child collections MUST be declared as workspace-bound sections.

The workspace MUST support at least the following section presentation arrangements:

- Tabs.
- Accordion.
- Stacked sections.

The selected arrangement MUST define how child sections are presented and navigated without changing their underlying resource, operation, or relation semantics.

Each child section MUST identify its purpose, target relation or resource binding, and workspace-specific presentation and operation references.

Section identifiers MUST be unique within their owning workspace.

Sections MUST NOT become independently declared or globally registered descriptors.

The workspace MAY support section-specific default activation, ordering, visibility, and presentation behavior where these are relevant to the selected arrangement.

The section collection MUST preserve deterministic declaration order unless an explicit presentation ordering is configured.

### 3.5. Lookup Workspace

**Kind:** `lookup`

**Purpose:** Materialize a focused resource-search and record-selection experience for resolving references to another resource.

A lookup workspace is intended for interactions such as selecting a customer on an order, choosing a product for a line item, or assigning a warehouse, vehicle, or operator.

Although lookup workspaces MAY use the same collection queries, field metadata, grid renderers, and filtering infrastructure as collection workspaces, their interaction model is fundamentally different.

A collection workspace manages and acts upon records. A lookup workspace searches for and selects records to return to an invoking context.

The lookup workspace MUST reference a declared `QueryOperation` for target data retrieval.

It MUST NOT define a query schema or independently implement query execution.

The lookup workspace MUST support:

- Resource-specific lookup query resolution.
- Search and filtering.
- Sorting where supported.
- Result collection presentation.
- Single-record and multiple-record selection.
- Selected-record feedback.
- Confirming and returning selected identities to the invoking context.
- Cancellation and dismissal.
- Loading, empty, and error states.
- Capability-aware result presentation.

The lookup workspace MUST resolve its target resource through the framework's resource identity and lookup resolution infrastructure.

Target resources SHOULD declare their default lookup behavior, including applicable lookup query reference, display fields, searchable fields, and default result presentation.

Referencing resources SHOULD NOT be required to repeat target lookup configuration for every foreign key. Contextual relation-specific overrides MAY be explicitly configured where necessary.

#### 3.5.1. Selection Semantics

The lookup workspace MUST support both single-selection and multiple-selection contracts.

Selection behavior SHOULD be derived from the invoking relation or field definition when its cardinality is unambiguous.

An explicit selection-mode override MUST be supported when a particular lookup context requires behavior different from the relation's default.

The selection result MUST be expressed through a framework-defined typed contract, preserving selected resource identities and any explicitly requested serializable display data.

The lookup workspace MUST return its result to the invoking field, form, or workspace context without independently mutating the invoking resource.

#### 3.5.2. Presentation Surfaces

The lookup workspace SHOULD be materializable in different presentation surfaces, including:

- Dialog.
- Sidebar or drawer.
- Embedded inline region.
- Dedicated route where appropriate.

Its selection and return semantics MUST remain consistent regardless of presentation surface.

The presentation surface MUST be selected through the invoking `ClientOperation` or another framework-defined client invocation mechanism, not by redefining the lookup query or selection operation.

#### Section support

The lookup workspace MUST NOT expose a `sections` property.

### 3.6. Custom Workspace

**Kind:** `custom`

**Purpose:** Allow application developers to implement specialized interaction experiences that cannot be adequately expressed by the standard workspace kinds.

Custom workspaces MUST remain integrated into the framework architecture.

They MUST NOT represent wholesale framework ejection, bypass, or replacement.

A custom workspace MUST implement a framework-defined component contract and accept the framework-defined workspace input props.

The component contract MUST provide the applicable contextual information required to integrate with the framework, including:

- The resolved workspace and resource context.
- Applicable operation descriptors or strongly typed operation references.
- Field and relation metadata.
- Workspace parameters and contextual state.
- Framework-managed data and interaction facilities.
- Capability information.
- Component registry and presentation facilities.
- Relevant navigation, notification, and lifecycle integrations.

The exact `CustomWorkspaceProps` interface MUST be specified and strongly typed.

Custom workspace components MUST be able to compose the lower-level framework primitives and hooks, including resource fields, grids, lookup controls, operation actions, form sessions, and operation invocation hooks.

They MUST preserve the framework's operation contracts, validation behavior, server-state management, authorization boundaries, and other shared runtime responsibilities.

A custom workspace MAY implement its own internal layout and interaction flow, but MUST use the framework's foundational component and interaction architecture wherever the corresponding capabilities are provided.

Custom workspaces MUST reference operations through the same `OperationDescriptor` model. They MUST NOT establish a parallel execution or action abstraction.

#### Section support

The custom workspace kind MUST NOT expose a declarative `sections` property at the workspace descriptor level.

Its internal composition is owned by its custom component implementation. The component MAY use framework-provided layout and section presentation primitives internally, but those are implementation details of that workspace component, not independent workspace section descriptors.

---

## 4. Operation-Bound Action Model

### 4.1. Operations Define Execution; Workspaces Define Exposure

The operation model and workspace model have separate responsibilities.

**Operation descriptors own:**

- Operation identity.
- Operation kind.
- Input and output contracts.
- Query parameters and result schemas.
- Execution semantics.
- Record-key requirements.
- Concurrency behavior.
- Idempotency behavior.
- Confirmation policies.
- Authorization and permissions.
- Invalidation behavior.
- Transfer behavior.
- Async job lifecycle.
- Client-side execution behavior.
- Operation-level presentation metadata.

**Workspace definitions own:**

- Which operations are exposed in the workspace.
- The context and scope in which an operation is exposed.
- Action ordering and workspace composition.
- Contextual visibility and availability.
- Workspace-specific presentation overrides.
- How operation context is supplied from the current resource, record, selection, or parent workspace.
- Which framework presentation surface hosts the result of a `ClientOperation`.

A workspace action binding MUST be a reference to an existing operation. It MUST NOT be an alternative operation definition.

### 4.2. Operation Kind and Action Scope Compatibility

The framework MUST validate whether a referenced operation kind is compatible with its workspace action scope.

The initial compatibility model SHOULD follow these rules:

| Operation Kind | Collection Data Source | Resource-Level Binding | Row-Level Binding | Selection-Level Binding |
|---|---|---|---|---|
| `QueryOperation` | Yes | Only for explicitly user-triggered read/download interactions | Only for explicitly record-contextual read interactions | Only for explicit query-based read interactions |
| `CommandOperation` | No | Yes, when its input contract and context permit | Yes, when its contract supports record context | No; batch behavior MUST NOT be synthesized |
| `BatchOperation` | No | Only where its declared batch target semantics explicitly support the context | No ordinary single-row binding; use a command when the operation targets one record | Yes |
| `AsyncJobOperation` | No | Yes, when its parameters support resource-level invocation | Yes, when its parameters support record context | Yes, only when its declared parameters and explicit invocation mapping support selection or query context |
| `ClientOperation` | No | Yes | Yes | Yes |

This compatibility table is normative guidance for the workspace architecture. The revision MUST refine it against the exact operation contracts and their invocation semantics.

A workspace MUST NOT change an operation's kind to make it fit a desired presentation scope.

### 4.3. QueryOperation Binding

A collection or lookup workspace MUST reference a `QueryOperation` as its data source.

The referenced operation remains authoritative for:

- `paramsSchema`.
- `resultSchema`.
- `allowedFilters`.
- `allowedSorts`.
- `defaultSort`.
- Response type.
- Transfer mode.
- Other query-specific semantics.

Workspace configuration MAY supply contextual query parameters, default filters, or presentation state where supported by the query contract.

Such values MUST be supplied through a documented typed query-binding mechanism and MUST NOT become a parallel query contract.

User-triggered read actions, such as report retrieval or exports, MAY reference a `QueryOperation` through an action binding. The operation MUST retain its read semantics, result schema, and transfer behavior.

The framework MUST NOT treat a `QueryOperation` as a mutation or infer side effects from it.

### 4.4. CommandOperation Binding

A `CommandOperation` MUST remain the authoritative contract for a single command invocation.

It owns its input and output schemas, record-key requirements, optimistic concurrency, idempotency, content type, transfer configuration, confirmation policy, and invalidation behavior.

A collection workspace MAY expose a `CommandOperation` as a resource-level or row-level action when its input contract can be satisfied by the available invocation context.

When user input is required, the workspace SHOULD reference a `ClientOperation` that opens an `operation-form` workspace. That operation-form workspace references the original `CommandOperation` as the form's submission contract.

The `CommandOperation` MUST NOT be redeclared by the form workspace.

The framework MUST ensure that the operation's validation, authorization, confirmation, concurrency, and invalidation behavior are preserved whether the operation is invoked directly or through a workspace form.

### 4.5. BatchOperation Binding

A `BatchOperation` MUST remain the authoritative contract for multi-record execution.

A collection workspace MAY expose it as a selection-level operation binding.

The workspace MUST provide the current selected keys or applicable query-selection target through the operation's existing `BatchTarget` contract.

The binding MUST respect:

- `allowQuerySelection`.
- `maxSyncKeys`.
- `paramsSchema`.
- `confirm`.
- `invalidates`.
- Partial result semantics.
- Batch-to-job promotion behavior.

The workspace MUST NOT invent a separate batch schema, reimplement partial-result handling, or transform a single-record `CommandOperation` into a batch execution.

### 4.6. AsyncJobOperation Binding

An `AsyncJobOperation` MUST remain the authoritative contract for long-running operation execution.

A workspace MAY reference an `AsyncJobOperation` at the resource, row, or selection level only when its declared parameter schema and invocation mapping support the relevant context.

The operation owns:

- Its parameter schema.
- Its result schema.
- Polling behavior.
- Cancellation eligibility.
- Confirmation policy.
- Invalidation behavior.

The workspace MUST use the established job manager and job tracking infrastructure for accepted jobs and their lifecycle.

An `AsyncJobOperation` MUST NOT be treated as a generic command with a different loading indicator.

When a `BatchOperation` is promoted to an asynchronous job, the existing Batch-to-Job promotion mechanism MUST remain authoritative. The workspace MUST NOT define a second job or duplicate the promoted job lifecycle.

### 4.7. ClientOperation Binding

A `ClientOperation` MUST represent browser-only executable behavior.

Workspace opening, dialog invocation, sidebar/drawer presentation, route navigation, and other browser-local navigation interactions MUST be modeled through `ClientOperation`.

A workspace action binding that launches another workspace MUST reference a `ClientOperation` whose execution behavior performs that invocation through the framework's host/workspace integration infrastructure.

The `ClientOperation` MUST own the executable client-side behavior. The workspace MUST NOT define an independent navigation callback or an alternative workspace-launch operation mechanism.

The `ClientOperation` MAY receive typed invocation context including:

- Resource identity.
- Record key or selected record context.
- Parent workspace context.
- Current selection.
- Relevant serializable parameters.

Its execution MUST use framework-defined client facilities for workspace resolution, host presentation, navigation, and lifecycle handling.

The framework MUST specify how the ClientOperation receives or resolves the host/workspace navigation facilities without creating circular package dependencies or violating React Server Component boundaries.

A `ClientOperation` MUST NOT be registered as an API operation in `ServerRuntime`. It remains browser-only, consistent with the existing `AnyOperation` and `AnyApiOperation` distinction.

### 4.8. Operation References, Not Operation Definitions

All workspace action bindings MUST reference an existing operation.

The action binding MUST NOT accept:

- Inline operation factories.
- Inline input or output schemas.
- Arbitrary execution callbacks.
- Independent permission declarations.
- Independent confirmation policies.
- Independent invalidation rules.
- Alternative async job configuration.
- A navigation callback that duplicates a `ClientOperation`.

Workspace-specific presentation overrides MAY be supported, but MUST NOT change execution semantics.

The exact binding API SHOULD use strongly typed operation keys or operation references, with compile-time verification that the referenced operation exists and is compatible with the binding scope.

---

## 5. Operation Presentation and Workspace Action Placement

The existing specification defines `OperationPresentation` on `BaseOperation`, including label, icon, variant, tooltip, and placements.

The workspace architecture MUST reconcile this contract with workspace-owned action composition.

### 5.1. Operation-Level Presentation

The referenced operation SHOULD remain the canonical owner of its general presentation metadata, including:

- Label.
- Icon.
- Variant.
- Tooltip.
- Default confirmation behavior where defined by its operation kind.

These properties describe how the operation is generally represented, independent of a particular workspace.

### 5.2. Workspace-Level Exposure and Placement

The workspace MUST own the decision to expose an operation within its interaction model and action scope.

For a collection workspace, that means the workspace decides whether an operation is exposed as a resource-level, row-level, or selection-level action.

A workspace action binding MAY override operation-level presentation for its specific context, including label, icon, ordering, or visibility, without redefining the operation.

### 5.3. `OperationPresentation.placements` Reconciliation

The current `OperationPresentation.placements` property MUST NOT remain a competing authority for actual workspace action placement.

The revision MUST resolve this explicitly.

The preferred direction is to treat operation-level placement metadata, if retained, as default eligibility or allowed-placement information, while the workspace binding remains authoritative for actual exposure and placement.

Alternatively, the revision MAY remove operation-level placements and make workspace bindings the sole placement authority.

Whichever direction is selected, the specification MUST provide one unambiguous ownership and precedence model.

It MUST NOT allow an operation descriptor and a workspace presentation to independently declare conflicting actual placements without defined resolution semantics.

---

## 6. Collection Workspace Defaults and Derivation

The collection workspace MUST adopt Convention Over Configuration wherever behavior can be derived deterministically from declared resource and operation contracts.

The specification revision MUST establish a complete default action and interaction policy.

The following derivation rules are proposed as the baseline.

| Capability | Proposed Derivation | Explicit Configuration Required When |
|---|---|---|
| Primary collection query | Derived when exactly one eligible `QueryOperation` exists or an authoritative default is designated | Multiple eligible queries exist without an unambiguous default |
| Search controls | Derived from fields marked `searchable` and query search support | Specialized search behavior or contextual restrictions are needed |
| Filter controls | Derived from fields marked `filterable` and the query's `allowedFilters` policy | Query-specific filters, nested paths, or custom filter behavior are required |
| Sort controls | Derived from fields marked `sortable` and the query's `allowedSorts` policy | A specialized query or presentation requires a different sort policy |
| Default columns | Derived from applicable declared fields, preserving declaration order and excluding `id` | Column selection, ordering, widths, alignment, or custom rendering must differ |
| Pagination | Derived from query result and pagination contracts plus documented framework defaults | An endpoint requires specialized pagination behavior |
| Refresh | Provided by the collection workspace when its query supports refetching | Refresh behavior must be customized or disabled |
| Row selection | Derived from workspace capabilities and the presence of eligible selection-level bindings | Selection behavior or constraints differ from the standard model |
| Resource-level Add | Derived only when an eligible declared `ClientOperation` exposes an unambiguous creation workspace or when another explicitly supported create interaction exists | Multiple creation flows exist or a specific target workspace must be selected |
| Resource-level commands | Derived only from explicitly designated operation presentation or workspace bindings | Placement, visibility, or invocation context requires a different choice |
| Row-level Delete | Derived only when a compatible record-bound `CommandOperation` and the applicable presentation policy are unambiguous | Confirmation, soft-delete behavior, or special selection rules are required |
| Row-level Edit/Open | Derived only when an eligible `ClientOperation` references an unambiguous record workspace | Different update workflows or destination surfaces are available |
| Selection-level actions | Derived from declared compatible `BatchOperation` or explicitly selection-capable operations | Selection constraints, confirmation, or custom execution behavior is required |
| Workspace navigation | Executed through a referenced `ClientOperation` | Multiple destinations or non-standard navigation behavior exist |
| Lookup selection mode | Derived from invoking relation cardinality where unambiguous | Context requires a different selection mode |

These are proposed conventions, not permission to infer business behavior from arbitrary operation names or schema shapes.

In particular:

- The presence of a `CommandOperation` named `create` MUST NOT by itself synthesize a navigation operation or creation workspace.
- Workspace opening and navigation MUST be represented by declared or framework-provided `ClientOperation` contracts.
- A `BatchOperation` MUST NOT be created by wrapping a single-record command.
- A destructive action MUST NOT be inferred solely from its operation identifier.
- An operation MUST NOT be exposed merely because it exists; applicability, capabilities, and workspace binding rules MUST be satisfied.

The revision MUST define the exact role of operation presentation metadata and convention-based workspace binding in determining default actions.

### 6.1. Action Availability and Authorization

Derived and explicitly bound actions MUST remain subject to operation and resource capability checks.

The framework MUST distinguish between:

1. Determining that an operation exists.
2. Determining that it is compatible with the workspace and action scope.
3. Determining that it is exposed in that workspace.
4. Determining that the current user may invoke it.
5. Determining how it is presented.
6. Determining whether confirmation or additional workflow interaction is required.

The server MUST remain the authoritative authorization boundary.

UI capability checks MUST NOT be described as replacing server authorization.

### 6.2. Action Precedence

The specification MUST establish deterministic precedence among:

1. Explicit workspace operation bindings.
2. Workspace-specific presentation overrides.
3. Operation-level presentation defaults and eligibility information.
4. Documented framework-provided interaction defaults.
5. Component registry defaults.

Explicit workspace bindings MUST be able to include, exclude, reposition, or override a safely derived operation exposure without creating a second operation definition.

The final precedence and merge behavior MUST be documented and validated.

---

## 7. Workspace-Bound Section Model

### 7.1. Sections Are Not First-Class Descriptors

A section MUST be understood as a structural composition element belonging to a specific workspace.

Sections MUST NOT be declared as:

- Top-level resource properties.
- Independent resource descriptors.
- Global application descriptors.
- Independently registered workspace definitions.
- Globally reusable section configurations with their own lifecycle.
- Universal layout abstractions detached from their owning workspace.

The framework MAY expose shared TypeScript interfaces or lower-level presentation primitives for implementing section behavior. However, a section definition MUST always be nested within and interpreted by its owning workspace contract.

The owning workspace determines:

- Whether sections are supported.
- Which section types are valid.
- Which section properties are applicable.
- How sections are rendered and navigated.
- Which contextual data, resources, and operations are available.
- How section identity and lifecycle are managed.

### 7.2. Kind-Specific Section Contracts

Section configuration MUST be defined by the workspace kinds that support it.

The framework MUST NOT introduce a generic `sections?: SectionDescriptor[]` property into a common workspace base interface merely to make all workspace kinds structurally similar.

Among the proposed initial workspace kinds, `parent-children` is the only kind that exposes declarative `sections`.

Its section contract represents contextual child-resource regions, not a universal mechanism for composing arbitrary interface fragments.

Other workspace kinds MUST NOT expose a declarative `sections` property.

Where multiple workspace kinds share implementation primitives, they MAY reuse internal types or components, provided that their public contracts remain specific to the owning workspace kind.

### 7.3. Section Identity and Lifecycle

Section identifiers MUST be unique within the owning workspace.

A section MUST inherit its resource context, parent identity, runtime services, and lifecycle from the owning workspace unless an explicit nested resource binding defines an additional context.

The framework MUST NOT require independent resource registration or routing for sections.

A child section MAY have its own loading state, query lifecycle, operation availability, and local interaction state. These behaviors MUST remain coordinated with the owning workspace lifecycle.

### 7.4. Section Composition and Presentation

Where sections are supported, their presentation behavior MUST be defined by the owning workspace kind.

The framework SHOULD provide reusable headless primitives for:

- Section containers.
- Section navigation.
- Tab selection.
- Accordion expansion.
- Section visibility.
- Section-level loading and error feedback.
- Section-level operation presentation.

The workspace MUST determine the valid composition and navigation model.

Presentation customization MUST NOT alter the underlying resource bindings, operation semantics, relation ownership, or authorization behavior.

### 7.5. Field and Operation Binding

A section MUST reference existing authoritative resource, relation, workspace, and operation contracts.

Field-bearing sections MUST reference fields originating from unified field definitions.

Child-resource sections MUST bind to declared relations or explicit resource references.

Section definitions MUST NOT duplicate:

- Field validation schemas.
- Attribute metadata.
- Operation input/output schemas.
- Resource identity.
- Authorization rules.
- Query contracts.
- Operation execution semantics.

The framework MUST resolve those representations from their authoritative declarations.

### 7.6. Validation and Integrity

`validateResourceGraph()` or the corresponding workspace validation mechanism MUST validate workspace-bound sections.

At minimum, validation MUST detect:

- Duplicate section identifiers within a workspace.
- Sections declared on unsupported workspace kinds.
- Missing or invalid field references.
- Field references incompatible with the applicable operation schema.
- Unresolved child-resource or relation references.
- Invalid child workspace bindings.
- Invalid section presentation configuration.
- Conflicting or unsupported operation references.
- Invalid parent/child contextual bindings.

Invalid workspace and section definitions MUST produce actionable validation errors before runtime rendering.

---

## 8. Lookup Workspace and Resource Lookup Defaults

### 8.1. Lookup as a Distinct Interaction Contract

Lookup MUST be a distinct workspace kind rather than a mode of the collection workspace.

Both workspaces MAY share:

- Query execution infrastructure.
- Search and filtering controls.
- Collection result renderers.
- Field controllers.
- Loading and error presentation.
- Component registry entries.

However, their interaction semantics MUST remain distinct:

- A collection workspace manages and acts upon records.
- A lookup workspace searches for and selects records, returning their identities or explicitly requested values to an invoking context.

### 8.2. Target Resource Lookup Defaults

A target resource SHOULD own its default lookup definition.

It SHOULD identify:

- The default lookup `QueryOperation` reference or a convention for resolving it.
- The primary display field.
- Searchable lookup fields.
- Default result presentation.
- Applicable default selection behavior where appropriate.

Referencing resources SHOULD inherit these defaults rather than repeat lookup operation identifiers, display fields, and search fields for each relation.

A relation MAY explicitly override target lookup defaults for contextual reasons.

Lookup resolution MUST preserve the framework's resource identity and lazy registration behavior, without introducing circular ESM imports.

### 8.3. Lookup Invocation

A lookup workspace MUST be invocable from framework lookup fields and other workspace contexts.

The invocation MUST carry the target resource identity, applicable relation context, selection constraints, and presentation surface.

The lookup workspace MUST reference its target `QueryOperation` and MUST NOT define a new query contract.

The lookup workspace MUST return a typed selection result to its invoker and MUST NOT independently mutate the invoking resource.

Workspace invocation and dialog/sidebar presentation MUST be handled through a referenced `ClientOperation` or another framework-defined client invocation facility.

### 8.4. Lookup Selection Defaults

The framework SHOULD derive default selection behavior from relation cardinality:

- A singular relation SHOULD default to single selection.
- A plural relation SHOULD default to multiple selection.

Explicit selection configuration MUST override these defaults.

The result contract MUST preserve the target resource's declared key semantics, including composite keys where applicable.

### 8.5. Section Support

The lookup workspace MUST NOT expose a `sections` property.

---

## 9. Workspace Entry Point and Materialization

### 9.1. Single Route-Level Entrypoint

The framework MUST expose a standard workspace entrypoint component capable of materializing a declared resource workspace.

Conceptually:

```tsx
export default function CustomerPage() {
  return (
    <ResourceWorkspace
      resource={CustomerResource}
      workspace="browse"
    />
  );
}
```

The entrypoint MUST resolve the declared workspace kind and materialize its complete interaction model.

Application developers MUST NOT be required to manually compose standard collection, form, lookup, or aggregate workspace component trees or initialize their ordinary interaction hooks.

### 9.2. Workspace Invocation Through ClientOperations

A workspace MUST be capable of invoking another declared workspace when its interaction model requires it.

Such invocation MUST be represented through a `ClientOperation`.

The `ClientOperation` MUST execute the appropriate framework workspace/host integration behavior, including the applicable presentation surface:

- Route navigation.
- Dialog.
- Sidebar or drawer.
- Embedded composition.

Invocation MUST carry the required resource, record, relation, operation, selection, and parameter context.

The target workspace MUST preserve its own kind-specific contract and lifecycle while integrating with the invoking workspace's navigation, state, and interaction infrastructure.

The workspace action binding MUST reference the `ClientOperation`; it MUST NOT define an independent `opens`, `navigate`, or callback execution contract.

### 9.3. Workspace Materialization

The framework MUST resolve a workspace through the following conceptual stages:

1. Resolve the declared workspace kind and configuration.
2. Resolve the owning resource or application-level context.
3. Resolve referenced `OperationDescriptor` instances.
4. Validate operation-kind compatibility with the workspace bindings.
5. Resolve unified field definitions and relation metadata.
6. Resolve workspace-bound sections where supported.
7. Resolve action eligibility and applicable default action derivations.
8. Resolve presentation components and controllers through the materialized component registry.
9. Initialize the required query, form, command, batch, job, selection, and navigation interactions.
10. Materialize the headless component composition.
11. Render the resulting workspace through the framework's presentation infrastructure.

These stages describe logical responsibilities. The implementation MAY optimize their execution provided that public contracts, lifecycle semantics, and deterministic behavior remain intact.

### 9.4. Runtime and Build-Time Boundaries

Workspace materialization MUST use declared resource, operation, and workspace contracts.

It MUST NOT require a separate build-time metadata compiler, schema AST walker, generated workspace manifest, or browser-side function indirection system.

Deterministic descriptor initialization, runtime component resolution, and workspace materialization are required architectural capabilities and MUST remain compatible with PROP-01's explicit architectural exclusions.

---

## 10. Custom Workspace Integration Contract

### 10.1. Custom Does Not Mean Independent

A custom workspace exists to provide freedom in composition and interaction, not to abandon the framework.

Custom implementations MUST remain inside the framework's integration boundary.

They MUST NOT independently reproduce framework facilities that already provide authoritative behavior, including:

- API and BFF execution contracts.
- Operation invocation and validation.
- Authentication and capability context.
- Query caching and invalidation.
- Form-session lifecycle.
- Batch execution and partial-result handling.
- Async job tracking and lifecycle.
- Dirty-navigation safeguards.
- Notification and feedback mechanisms.
- Resource field and relation resolution.
- Component registry resolution.

Where specialized behavior requires lower-level control, custom workspaces SHOULD use the framework's headless primitives and hooks directly.

### 10.2. Framework-Defined Component Props

The framework MUST define a strongly typed custom workspace component contract.

The contract SHOULD distinguish between:

- Static workspace definition and component registration.
- Materialized runtime workspace context.
- Route and parent-resource parameters.
- Operation descriptors or strongly typed operation references.
- Field and relation access.
- Framework-provided interaction services.
- Serializable data supplied across execution boundaries.

Custom components MUST receive only the context applicable to their execution environment.

The component contract MUST remain compatible with the framework's Server/Client boundaries and MUST NOT require non-serializable live descriptors to cross React Server Component boundaries as props.

The revision MUST specify how custom workspace component references are resolved through the component registry and how they receive their typed runtime context.

### 10.3. Lower-Level Composition

A custom workspace MUST be able to compose framework primitives independently of the standard workspace materializer.

However, this freedom MUST NOT imply an alternative component or operation system.

The same primitive component contracts, controller registry, operation invocation hooks, data providers, and presentation infrastructure MUST serve both standard and custom workspaces.

The framework MUST preserve the ability to customize individual parts of a standard workspace without replacing the entire workspace. Such partial customization SHOULD be preferred over a custom workspace when only a component or interaction slot needs specialized behavior.

Custom workspaces MUST reference and invoke the existing operation descriptors. They MUST NOT define operations inline or implement execution behavior outside the established operation model.

---

## 11. Workspace Kind Summary

The following table summarizes the proposed initial workspace kinds and their section capabilities.

| Workspace Kind | Primary Interaction Model | Section Support | Operation References |
|---|---|---|---|
| `collection` | Collection browsing, filtering, actions, and selection | No | Collection `QueryOperation`; resource/row `CommandOperation`, `AsyncJobOperation`, `ClientOperation`; selection `BatchOperation` and compatible operations |
| `operation-form` | Single operation input and invocation | No | `CommandOperation` or `AsyncJobOperation` |
| `parent-child` | Parent aggregate with one child collection | No | Existing parent and child queries/commands, plus applicable operations |
| `parent-children` | Parent context with multiple child collections | Yes | Existing parent/child `QueryOperation` and other compatible operation references |
| `lookup` | Resource search and record selection | No | Target resource `QueryOperation`; workspace invocation through `ClientOperation` |
| `custom` | Specialized application-defined experience | No declarative section property | Any applicable existing operation descriptors through framework-defined props and invocation facilities |

The specification MAY refine names, split variants, or add further workspace kinds where a genuinely distinct interaction model justifies doing so.

It MUST NOT introduce a generic workspace kind with a large number of optional properties merely to avoid defining purposeful contracts.

Every new workspace kind MUST have a clearly stated interaction purpose, ownership model, supported composition capabilities, operation compatibility rules, and rationale for not being represented by an existing kind.

---

## 12. Illustrative Authoring Models

The following examples are conceptual illustrations of the intended architecture, not a mandate for these exact public API signatures.

### 12.1. Resource Management Through a Collection Workspace

Operations are declared once:

```typescript
const CustomerOperations = {
  search: defineQuery({
    // Existing QueryOperation contract
  }),

  create: defineCommand({
    // Existing CommandOperation contract
  }),

  delete: defineCommand({
    // Existing record-bound CommandOperation contract
  }),

  archive: defineBatchCommand({
    // Existing BatchOperation contract
  }),

  openCreate: defineClientAction({
    // Existing ClientOperation contract
    // Executes workspace/host integration to open the create workspace
  }),

  openDetail: defineClientAction({
    // Existing ClientOperation contract
    // Executes workspace/host integration using the selected record context
  }),
};
```

The workspace references those operations:

```typescript
workspaces: {
  browse: {
    kind: 'collection',

    query: 'search',

    actions: {
      resource: [
        { operation: 'openCreate' },
      ],

      row: [
        { operation: 'delete' },
        { operation: 'openDetail' },
      ],

      selection: [
        { operation: 'archive' },
      ],
    },
  },

  create: {
    kind: 'operation-form',
    operation: 'create',
  },

  detail: {
    kind: 'custom',
    component: CustomerDetailWorkspace,
  },
}
```

The collection workspace does not define the create command, delete command, batch archive, or navigation behavior. It references the already declared operations.

### 12.2. Parent-Child: Sales Order and Items

```typescript
workspaces: {
  editor: {
    kind: 'parent-child',

    parent: {
      fields: [
        'customerId',
        'orderDate',
        'status',
      ],
    },

    child: {
      relation: 'items',
      presentation: 'editable-grid',
      // References existing resource/operation contracts
    },
  },
}
```

The workspace uses the existing parent and child field and operation contracts. It does not declare new commands or query operations.

### 12.3. Parent-Children: Picking Wave

```typescript
workspaces: {
  operations: {
    kind: 'parent-children',

    parent: {
      fields: [
        'waveNumber',
        'status',
        'warehouse',
        'scheduledAt',
      ],
    },

    sections: {
      presentation: 'tabs',

      items: [
        {
          id: 'orders',
          label: 'Orders',
          relation: 'orders',
          query: 'ordersForWave',
        },
        {
          id: 'vehicles',
          label: 'Vehicles',
          relation: 'vehicles',
          query: 'vehiclesForWave',
        },
        {
          id: 'pallets',
          label: 'Pallets',
          relation: 'pallets',
          query: 'palletsForWave',
        },
        {
          id: 'invoices',
          label: 'Invoices',
          relation: 'invoices',
          query: 'invoicesForWave',
        },
      ],
    },
  },
}
```

The query identifiers reference existing `QueryOperation` contracts. They do not define new queries.

The section declarations are owned by the `parent-children` workspace.

### 12.4. Lookup Workspace

```typescript
workspaces: {
  customerLookup: {
    kind: 'lookup',
    query: 'lookupCustomers',
    selection: 'single',
  },
}
```

The lookup workspace references an existing `QueryOperation`. The invoking lookup field or `ClientOperation` determines its presentation surface and receives the typed selection result.

### 12.5. Custom Operational Workspace

```typescript
workspaces: {
  execution: {
    kind: 'custom',
    component: PickingWaveExecutionWorkspace,
  },
}
```

The component receives the framework-defined workspace props and references existing operation descriptors through the supplied resource context or operation accessors.

It uses lower-level framework primitives to compose the specialized operational experience.

It remains integrated with the wave resource, its operations, capabilities, component registry, query infrastructure, and interaction lifecycle.

It does not replace the framework architecture or establish a parallel operation model.

---

## 13. Required Specification Revision Scope

Adoption of this proposal requires coordinated updates across the specification.

At minimum, the next revision MUST address:

| Specification Area | Required Change |
|---|---|
| `OperationDescriptor` | Preserve the existing discriminated union as the sole operation execution model. |
| `QueryOperation` | Define its binding as collection/lookup data source and supported user-triggered read interactions. |
| `CommandOperation` | Define resource-level and record-level invocation compatibility, including operation-form binding. |
| `BatchOperation` | Define selection-level binding using the existing `BatchTarget` and batch lifecycle. |
| `AsyncJobOperation` | Define resource-, record-, and explicitly supported selection-context binding and job lifecycle integration. |
| `ClientOperation` | Establish workspace opening, host presentation, and navigation as browser-only operation behavior. |
| Operation references | Define type-safe references from workspace contracts to resource-owned and shared operations. |
| Operation presentation | Reconcile `OperationPresentation.placements` with workspace-owned action placement. |
| ResourceDescriptor | Define resource-owned named workspace definitions and default workspace resolution. |
| Workspace contracts | Establish discriminated workspace kinds and kind-specific configuration contracts. |
| Collection workspace | Define collection query, filtering, sorting, columns, selection, and operation binding. |
| Collection action model | Define resource-level, row-level, and selection-level operation references, defaults, compatibility, and precedence. |
| Operation-form workspace | Define operation-bound input behavior without sections or duplicate operation contracts. |
| Parent-child workspace | Define integrated aggregate editing with one child collection and no generic sections. |
| Parent-children workspace | Define parent context, child sections, and tab/accordion/stacked composition. |
| Lookup workspace | Define target resource resolution, query binding, selection, typed return contracts, and invocation surfaces. |
| Custom workspace | Define framework component props, operation access, component resolution, and lower-level primitive integration. |
| Section contracts | Remove independent top-level section modeling; introduce workspace-bound section definitions. |
| Component registry | Define resolution of workspace kinds, section renderers, action renderers, lookup renderers, and controllers. |
| Headless component stack | Define composition primitives and interaction responsibilities used by standard and custom workspaces. |
| Lookup defaults | Establish target-resource-owned lookup configuration and relation override behavior. |
| Workspace materialization | Define deterministic resolution, action derivation, operation compatibility, and lifecycle behavior. |
| Resource graph validation | Validate workspace kinds, sections, fields, relations, operation references, operation-kind compatibility, and component references. |
| Server registration | Preserve registration parity for all non-client operation descriptors and exclude browser-only `ClientOperation` from `ServerRuntime`. |
| RSC and execution boundaries | Define how workspace runtime context and custom components are resolved without violating serialization constraints. |
| Examples | Demonstrate all workspace kinds, action scopes, operation references, lookup behavior, master-detail, and multi-child compositions. |

The revision MUST ensure that the workspace model aligns with PROP-01, the Unified Composable Field Definitions proposal, and the existing operation contracts.

---

## 14. Acceptance Scenarios

The revised specification MUST demonstrate the following scenarios:

| Scenario | Required Outcome |
|---|---|
| Customer resource management | A collection workspace provides the primary management surface and references existing operations for create, detail, edit, delete, and selection interactions. |
| Add customer | A resource-level binding references a `ClientOperation` that opens an operation-form workspace; that workspace references the existing create `CommandOperation`. |
| Delete customer | A row-level binding references the existing record-bound `CommandOperation` and preserves its confirmation, authorization, concurrency, and invalidation behavior. |
| Open customer | A row-level binding references a `ClientOperation` that launches a declared record workspace using the selected record context. |
| Batch archive | A selection-level binding references an existing `BatchOperation` and supplies its declared batch target. |
| Batch promotion | A promoted job follows the existing Batch-to-Job lifecycle without duplicate workspace or operation definitions. |
| Collection filtering | Search and filters derive from field semantics and remain constrained by the referenced `QueryOperation`. |
| Different collection queries | The workspace resolves an explicit or unambiguous primary `QueryOperation`. |
| Sales order with line items | A parent-child workspace uses existing parent and child contracts and provides one integrated child collection. |
| Picking wave with orders, vehicles, pallets, and invoices | A parent-children workspace references existing queries and operations through workspace-bound child sections. |
| Customer lookup | A lookup workspace references a target `QueryOperation`, searches, and returns a customer selection to the invoking order form. |
| Multi-valued product selection | Lookup selection supports multiple records with a typed return contract derived from the invoking context or explicit configuration. |
| Focused inventory selection | A collection workspace supports query, filtering, selection, and operations without sections. |
| Specialized WMS scanning | A custom workspace integrates through typed props and lower-level framework primitives and references existing operations. |
| Resource-specific customization | Override selected components, action bindings, or presentation behavior without redefining operations or replacing the entire workspace. |
| Operation compatibility | An incompatible operation kind or action scope fails compile-time or graph validation where statically detectable, and runtime validation otherwise. |
| Different child permissions | Child sections independently reflect applicable operation capabilities without bypassing parent context. |
| Independent child loading | One child section can load or fail without requiring all other child sections to fail. |
| Invalid action references | Missing, unregistered, ambiguous, or incompatible operation references fail validation. |
| RSC execution | Custom workspace components and materialized descriptors respect Server/Client serialization boundaries. |

---

## 15. Open Design Decisions for the Revision Team

The following decisions MUST be resolved before the workspace contracts are finalized.

### 15.1. Workspace Kinds and Naming

1. Should `collection` be the public workspace kind, with `grid` and `list` as presentation variants, or should `grid` itself be a workspace kind?
2. Should resources expose a `workspaces` map with a mandatory or conventionally derived default workspace?
3. How should standalone application-level workspaces be registered and resolved?

### 15.2. Operation References and Registration

4. Should workspace operation references use strongly typed local operation keys, direct descriptor references, or both?
5. How should shared `*.op.ts` module operations be referenced without introducing circular ESM imports?
6. How should the type system constrain operation references to compatible kinds and action scopes?
7. How should operation references be validated across resource-owned and shared operation registries?

### 15.3. Operation Presentation and Action Placement

8. Should `OperationPresentation.placements` be removed, renamed to `allowedPlacements`, or retained as a default eligibility hint?
9. Which presentation properties are intrinsic to an operation and which may be overridden by a workspace binding?
10. What is the precedence between explicit workspace bindings, operation presentation defaults, and framework-provided interactions?
11. Should operations be automatically exposed based on declared presentation eligibility, or must every exposed action be referenced explicitly by the workspace?
12. How should the framework derive Add, Edit, Delete, Open, and other common action bindings without relying on naming heuristics?
13. What is the default presentation surface for a `ClientOperation` that opens another workspace?

### 15.4. Collection Query and Presentation Defaults

14. How is the primary collection query designated when multiple query operations exist?
15. Which field metadata properties are sufficient to derive search, filtering, sorting, and column visibility?
16. Should the default collection columns always exclude `id`, and how should composite keys or other technical fields be treated?
17. What are the default pagination and collection loading policies?
18. How should selection state behave when data is paginated or refreshed?

### 15.5. Operation Invocation Context

19. How are resource, record, selection, parent, and query-selection contexts mapped into each operation's existing parameter contract?
20. How should a command with additional input fields be invoked directly versus through an operation-form workspace?
21. How should an `AsyncJobOperation` receive selection context without introducing an implicit batch contract?
22. How should `ClientOperation` obtain workspace, host, and navigation facilities while preserving the package dependency boundaries?

### 15.6. Parent-Child and Parent-Children Composition

23. Should parent-children section presentation (`tabs`, `accordion`, `stacked`) be a workspace-level arrangement or allow individual groups to have different arrangements?
24. How much may each child section customize its collection workspace behavior while remaining subordinate to the parent workspace?
25. Should nested parent-child compositions be supported, and what recursion limits or validation constraints are necessary?
26. How should parent and child dirty-state and save orchestration behave for different aggregate persistence models?

### 15.7. Lookup

27. Should target resources declare a default lookup workspace, lookup profile, or both?
28. How should a resource identify its default lookup query?
29. Which fields are returned by default, beyond the resource key and display value?
30. How should singular and plural relationship cardinality influence selection defaults?
31. How should lookup contextual filters and relation-specific overrides be merged with target-resource defaults?
32. Should a lookup workspace support additional operations such as opening a selected record's detail workspace?

### 15.8. Custom Workspace Integration

33. Should custom workspace components be referenced directly by module-local component references or resolved through stable component registry identifiers?
34. What exact `CustomWorkspaceProps` contract is required?
35. How should a custom workspace expose internal loading, error, and dirty-state behavior to the owning framework workspace?
36. What is the formal mechanism for replacing one component or action without replacing the entire workspace?

These decisions MUST be evaluated against developer experience, type safety, component composability, runtime complexity, and the requirement that standard resource-management experiences be materialized from declarative manifests.

---

## 16. Final Recommendation

Adopt the workspace-kind-driven composition model as the canonical declarative UI architecture of the Foundational Frontend Framework.

The framework MUST preserve `OperationDescriptor` and its five operation kinds as the sole authoritative execution model.

Workspaces MUST reference existing operations and MUST NOT define or reproduce operation contracts.

Standard resource management MUST be composed primarily through a collection workspace that references a `QueryOperation` for its data source and exposes resource-level, row-level, and selection-level operation bindings. The collection workspace MUST be able to invoke other declared workspaces through referenced `ClientOperation` contracts.

The initial workspace model SHOULD provide purpose-built definitions for:

- Collection browsing and operation composition.
- Simple operation forms.
- Parent-child aggregate editing.
- Parent-children operational compositions.
- Resource lookup and record selection.
- Custom framework-integrated experiences.

The parent-child and parent-children models MUST remain distinct because they describe materially different interaction structures. A single child collection is an integrated aggregate editor; multiple child collections require a parent-centered composition with workspace-bound sections and navigable child regions.

Lookup MUST remain a distinct interaction model focused on selecting and returning records, even when it reuses collection query and presentation infrastructure.

Sections MUST exist only within workspace definitions whose kinds explicitly support them. They MUST NOT become independent top-level descriptors.

Collection actions MUST be references to operation descriptors. Their execution semantics remain owned by the operation model, while the collection workspace owns their exposure, contextual binding, and composition. Workspace invocation and navigation MUST be modeled through `ClientOperation`, not as a separate action execution mechanism.

The framework SHOULD derive safe default interactions wherever the required operation and workspace information is unambiguous, without inferring business behavior or synthesizing undeclared operations.

Custom workspaces MUST provide freedom to implement specialized experiences while remaining consumers of the same framework component, operation, data, and presentation infrastructure.

**The desired architecture is a resource-driven workspace system in which operation descriptors define executable behavior, workspace manifests compose and expose those operations, deterministic conventions derive safe defaults, and the framework materializes complete, customizable experiences through one coherent component and interaction architecture.**