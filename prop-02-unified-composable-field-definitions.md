# Architectural Proposal: Unified Composable Field Definitions

**Target:** Foundational Frontend Framework  
**Purpose:** Input for the next architecture specification revision cycle  
**Status:** Proposed architectural direction — requires evaluation and incorporation into the normative specification  
**Primary concern:** Eliminate separately maintained Zod schemas and field-keyed attribute metadata declarations.

---

## 1. Executive Summary

The current resource definition model requires developers to declare data schemas through Zod and independently declare framework-specific attribute metadata through an `AttributeMeta` map.

This creates two parallel representations of the same resource fields. Although TypeScript can validate that the metadata keys correspond to schema fields, developers must still maintain both declarations and keep their semantics synchronized.

This is unnecessary authoring complexity.

The framework SHOULD adopt **Unified Composable Field Definitions**, where each field is declared exactly once as a combination of:

- Its native Zod validation schema.
- Its framework-specific intrinsic field metadata.

A single `defineFields()` declaration MUST materialize both:

1. A native Zod object schema usable throughout the framework and by application code.
2. A strongly typed attribute metadata representation consumed by the framework's resource, form, component, presentation, and interaction infrastructure.

The resulting model establishes a single authoring source of truth without replacing Zod, introducing a schema compiler, or requiring runtime inspection of Zod's internal structures.

The recommendation is to adopt the essential architecture described in Alternative C of the v1.0 DX red-team review, refining it into a foundational framework principle.

**The central architectural rule is: field identity, validation, and intrinsic framework semantics MUST be authored together, once. All other representations MUST be derived from that declaration.**

---

## 2. Problem Statement

The current authoring model separates field validation from field presentation and interaction semantics.

A typical implementation looks conceptually like this:

```typescript
export const CustomerSchema = z.object({
  id: z.string(),
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  email: z.email(),
  creditLimit: moneySchema({
    min: '0.00',
    currency: 'USD',
  }),
  status: z.enum(['ACTIVE', 'BLOCKED']),
  version: z.number().int(),
});

export const customerAttributes = {
  id: {
    semanticType: 'code',
    label: 'ID',
    readOnly: true,
  },
  code: {
    semanticType: 'code',
    label: 'Customer Code',
    searchable: true,
    filterable: true,
    sortable: true,
  },
  name: {
    semanticType: 'text',
    label: 'Customer Name',
    searchable: true,
    filterable: true,
    sortable: true,
  },
  email: {
    semanticType: 'email',
    label: 'Email',
  },
  creditLimit: {
    semanticType: 'currency',
    label: 'Credit Limit',
    format: {
      currencyCode: 'USD',
      scale: 2,
    },
  },
  status: {
    semanticType: 'enum',
    label: 'Status',
    enumOptions: {
      ACTIVE: { label: 'Active' },
      BLOCKED: { label: 'Blocked' },
    },
  },
  version: {
    semanticType: 'integer',
    label: 'Version',
    hidden: true,
  },
} satisfies ResourceAttributesMap<Customer>;
```

This approach has several architectural drawbacks.

### 2.1. Duplicate field identity

The identifier `code`, for example, appears in both the Zod schema and the attribute metadata map.

The same applies to every other field.

This is not independent configuration. It is a second declaration of the same field.

### 2.2. Semantic duplication

Several metadata properties repeat information already available in the schema or schema helper configuration.

Examples include:

- Decimal scale.
- Currency code.
- Enum values.
- Optionality and requiredness.
- Relation target information.
- Specialized data semantics.

Some of these values can be derived directly. Others should be provided as intrinsic metadata to the field definition itself.

### 2.3. Synchronization and drift

Two declarations can contradict each other while remaining individually type-correct.

For example, adding an enum member to a Zod schema does not necessarily produce a TypeScript error when the corresponding `enumOptions` declaration is incomplete.

Similarly, changing a decimal schema's scale does not automatically update the field's presentation format.

### 2.4. Fragmented field ownership

`ResourceAttributesMap<TView>` also creates a structural limitation: command-only input fields may not belong to the resource's record/view schema.

Developers are then forced to introduce additional attribute maps, untyped metadata, or artificial fields to support command forms.

The framework needs one field-authoring model that works consistently across resource records, operation inputs, nested structures, and reusable field definitions.

---

## 3. Proposed Architectural Model

### 3.1. A field is a unified definition

Introduce a first-class `FieldDefinition` concept combining a Zod schema with framework-specific metadata.

Conceptually:

```typescript
type FieldDefinition<TSchema extends z.ZodType> = {
  schema: TSchema;
  meta: AttributeMeta<z.output<TSchema>>;
};
```

The actual generic contract MUST preserve the complete schema type, including its input and output types, optionality, transformations, defaults, and refinements.

A small `field()` helper provides the basic construction mechanism:

```typescript
field(schema, metadata)
```

Specialized helpers MAY encapsulate recurring schema and metadata combinations:

```typescript
f.money(...)
f.decimal(...)
f.enum(...)
f.relation(...)
f.date(...)
f.dateTime(...)
```

These helpers MUST produce the same unified `FieldDefinition` abstraction.

They MUST NOT create independent schema and attribute declarations or discard semantic information supplied through their arguments.

### 3.2. A field collection is the resource's field source of truth

Introduce `defineFields()` as the composition mechanism for field definitions.

Illustrative API:

```typescript
export const CustomerFields = defineFields({
  id: field(z.string(), {
    semanticType: 'code',
    label: 'ID',
    readOnly: true,
  }),

  code: field(z.string().min(2).max(20), {
    semanticType: 'code',
    label: 'Customer Code',
    searchable: true,
    filterable: true,
    sortable: true,
  }),

  name: field(z.string().min(2).max(120), {
    semanticType: 'text',
    label: 'Customer Name',
    searchable: true,
    filterable: true,
    sortable: true,
  }),

  email: field(z.email(), {
    label: 'Email',
  }),

  creditLimit: f.money({
    min: '0.00',
    currency: 'USD',
    label: 'Credit Limit',
    sortable: true,
  }),

  status: f.enum(['ACTIVE', 'BLOCKED'], {
    label: 'Status',
    options: {
      ACTIVE: {
        label: 'Active',
        badgeTone: 'success',
      },
      BLOCKED: {
        label: 'Blocked',
        badgeTone: 'danger',
      },
    },
  }),

  version: field(z.number().int(), {
    semanticType: 'integer',
    label: 'Version',
    hidden: true,
  }),
});
```

This declaration is the sole authoring source for these fields.

`defineFields()` MUST derive the representations required by the framework without requiring developers to repeat field identifiers.

### 3.3. Materialized outputs

The resulting field collection SHOULD expose at least the following conceptual outputs:

```typescript
CustomerFields.schema
CustomerFields.attributes
```

Where:

- `schema` is a native `z.ZodObject` constructed from the field definitions.
- `attributes` is a framework-compatible metadata map derived from those same definitions.
- The field collection retains the original typed field definitions as necessary for composition and metadata resolution.

The framework MAY materialize additional internal representations where required, but they MUST remain derived from the same source.

**The existence of separate runtime representations MUST NOT imply separate authoring responsibilities.**

### 3.4. Native Zod interoperability

The generated schema MUST remain a genuine native Zod object.

Application code MUST be able to use standard Zod functionality, including:

- `z.infer`.
- `.pick()`.
- `.omit()`.
- `.partial()`.
- `.extend()`.
- `.merge()` where supported by the selected Zod version.
- `.optional()`.
- `.nullable()`.
- `.refine()` and `.superRefine()`.
- `.transform()`.
- Standard parsing and validation methods.

The framework MUST NOT replace Zod's schema API with a proprietary schema language.

`defineFields()` is a field composition and materialization mechanism, not a replacement for Zod.

---

## 4. Resource Integration

The resource descriptor SHOULD consume the unified field collection directly.

Illustrative definition:

```typescript
export const CustomerResource = defineResource({
  resourceKey: asResourceKey('crm.customer'),
  label: 'Customer',
  pluralLabel: 'Customers',

  service: 'crm',
  basePath: '/customers',

  keyFields: ['id'],
  versionField: 'version',

  fields: CustomerFields,

  operations: {
    list: defineQuery({
      resultItemSchema: CustomerFields.schema,
    }),

    get: defineQuery({
      singleRecord: true,
    }),

    create: defineCommand({
      inputSchema: CustomerFields.schema.omit({
        id: true,
        version: true,
      }),
    }),

    update: defineCommand({
      requiresRecordKey: true,
      inputSchema: CustomerFields.schema
        .omit({ id: true, version: true })
        .partial(),
    }),
  },
});
```

There MUST NOT be a separately authored `attributes` property alongside `fields`.

The resource's materialized field metadata MUST be derived from its unified field collection.

Operation schemas MAY be distinct native Zod projections of the resource schema. The framework MUST resolve field metadata for the active operation from the originating field definitions, constrained to the fields present in that operation's schema.

This is important because record/view, create, update, and custom operation contracts do not necessarily contain the same fields.

A resource MUST NOT be required to declare multiple complete attribute maps simply because it exposes multiple operation schemas.

---

## 5. Operation-Owned and Command-Only Fields

Unified field definitions MUST NOT be restricted to fields appearing in a resource's record/view schema.

Operations frequently require independent inputs, including:

- Scan identifiers.
- Confirmation details.
- Adjustment reasons.
- Password confirmations.
- Cancellation notes.
- Workflow-specific parameters.

These fields MUST use exactly the same field-definition mechanism.

Illustrative definition:

```typescript
export const ReceiveScanFields = defineFields({
  palletBarcode: field(z.string().min(4), {
    semanticType: 'barcode',
    label: 'Pallet Barcode',
  }),

  binCode: field(z.string().min(2), {
    semanticType: 'code',
    label: 'Destination Bin',
  }),

  receivedQuantity: f.decimal({
    min: '0.001',
    scale: 3,
    label: 'Received Quantity',
  }),

  notes: field(z.string().optional(), {
    semanticType: 'long-text',
    label: 'Notes',
  }),
});
```

The command SHOULD consume the field collection as its input contract:

```typescript
export const ConfirmReceiveOp = defineCommand({
  operationId: asOperationId('wms.receiving.confirm'),
  resourceKey: asResourceKey('wms.receiving-task'),

  inputFields: ReceiveScanFields,

  requiresRecordKey: true,
  optimisticConcurrency: true,

  outputSchema: z.object({
    taskId: z.string(),
    status: z.literal('RECEIVED'),
    version: z.number().int(),
  }),

  invalidates: {
    resources: [
      'wms.receiving-task',
      'wms.stock-balance',
    ],
  },
});
```

When an operation consumes a unified input field collection, the operation's input validation schema and field metadata MUST be derived from that collection.

The operation MUST NOT require developers to declare `inputSchema` and a parallel operation-level `attributes` map for the same fields.

The architecture MUST also support operations that combine fields originating from a resource with additional operation-specific fields. The exact composition API SHOULD be resolved during the specification revision, preserving strong type inference and avoiding duplicate metadata declarations.

---

## 6. Intrinsic Metadata and Contextual Field Rules

The architecture MUST distinguish intrinsic field metadata from behavior that depends on a resource, operation, record, session, or runtime context.

### 6.1. Intrinsic field metadata

Intrinsic metadata belongs directly to the unified field definition.

It includes:

- Semantic type.
- Label and description.
- Placeholder.
- Formatting hints.
- Enum presentation options.
- Default search/filter/sort eligibility.
- Static visibility and read-only hints.
- Controller, renderer, and filter-control selection hints where appropriate.

This metadata MUST be available to resource workspaces, forms, grids, lookup controls, field controllers, and the materialized component registry.

### 6.2. Contextual and cross-field behavior

Behavior that depends on external context MAY remain in resource- or operation-level field rules.

Examples include:

- `hidden(ctx)`.
- `readOnly(ctx)`.
- `required(ctx)`.
- `compute(ctx)`.
- `defaultValue(ctx)`.
- Cross-field dependencies.
- Record-specific presentation restrictions.

Such rules MUST NOT require re-declaring the field's static metadata.

The framework MUST define precedence between field-definition metadata, contextual field rules, resource/operation overrides, and explicit component-level overrides.

### 6.3. Validation authority

Zod MUST remain the authoritative schema-validation mechanism for client and server contracts.

The framework MUST NOT introduce a parallel `AttributeMeta.validate` mechanism that silently creates client-only validation behavior.

Dynamic form interaction rules MAY supplement schema validation where appropriate, but they MUST NOT undermine client/server validation parity.

---

## 7. Specialized Field Helpers

Schema helpers SHOULD own and preserve all intrinsic contract hints supplied through their configuration.

For example, a money field should not require developers to specify its currency and scale once in the validation helper and again in the attribute metadata.

The specialized field helper MUST produce one unified field definition containing:

- The appropriate Zod validation schema.
- The corresponding semantic type.
- Applicable format metadata.
- Relevant validation constraints.
- Any supported schema contract hints.

### 7.1. Enum completeness

Enum field definitions MUST provide compile-time guarantees that presentation options correspond exhaustively to the declared enum values whenever presentation options are required.

Adding an enum member MUST NOT silently produce an incomplete metadata definition.

The enum values MUST NOT be independently repeated merely to establish the option labels and presentation styles.

### 7.2. Relation fields

Relation field helpers SHOULD preserve the target resource identity as part of the field definition's intrinsic metadata.

Relation graph semantics, ownership, and composition behavior MAY be materialized into resource-level relation descriptors, but MUST derive from the authoritative field definitions wherever those facts are already declared.

The framework MUST NOT discard semantic arguments passed to specialized schema helpers and then require developers to repeat them in another descriptor.

### 7.3. Reusable field definitions

The architecture MUST support reusable field definitions.

A reusable field MUST be safely composable into multiple resources or operations without mutation or accidental sharing of contextual overrides.

The framework SHOULD provide an explicit, immutable mechanism for applying contextual metadata overrides when a reusable field requires different labels, formatting, or presentation semantics in different contexts.

Base field definitions MUST remain unchanged when such overrides are applied.

---

## 8. Schema Composition and Metadata Consistency

The unified model MUST remain compatible with native Zod composition while preserving field metadata.

The specification MUST distinguish between:

1. Composition of existing fields into different schema projections.
2. Introduction of new fields into a schema.
3. Changes to field validation that do not change intrinsic metadata.
4. Contextual changes to field metadata.
5. Nested object and array composition.

The framework MUST NOT introduce a parallel schema algebra that attempts to reproduce the complete Zod API.

`defineFields()` SHOULD remain a thin composition abstraction. Native Zod methods MUST remain the authoritative mechanism for validation-schema transformations.

Where a transformed schema is associated with an existing field collection, framework metadata resolution MUST be based on the relationship to the original field definitions and the fields present in the active schema.

Where new fields are introduced, they MUST be introduced through unified field definitions so their validation and metadata remain aligned.

The framework MUST NOT inspect private Zod internals to reconstruct this association.

The implementation MUST explicitly address the behavior of:

- Optional and nullable fields.
- Default and prefault behavior.
- Refined and transformed schemas.
- Partial and projected object schemas.
- Extended object schemas.
- Nested objects.
- Arrays of objects.
- Shared field definitions.
- Input and output type differences.

If a particular native Zod composition cannot preserve or expose the required field relationship through supported public APIs, the framework MUST define a clear and type-safe composition strategy rather than silently losing metadata.

---

## 9. Relationship to Resource Workspaces and the Component Registry

Unified field definitions are foundational to the framework's declarative workspace architecture.

The resource manifest and its materialized workspace MUST consume the same authoritative field definitions.

The materialized component registry MUST be able to resolve, for each active field:

- Validation schema.
- Semantic type.
- Label and descriptive metadata.
- Formatting behavior.
- Default controller selection.
- Renderer and editor selection.
- Filtering and sorting eligibility.
- Relation and lookup behavior.
- Contextual presentation rules.

The workspace MUST NOT reconcile separately maintained schema definitions and attribute override maps at runtime.

The field-definition model MUST support consistent resolution across:

- Resource grids.
- Resource forms.
- Record views.
- Lookup components.
- Filter controls.
- Bulk operations.
- Custom commands.
- Nested collection editors.
- Specialized operational interfaces.

Standard resource workspaces and custom workflows MUST share the same field-definition and component-resolution architecture.

This ensures that a field's semantic meaning and default presentation behavior remain consistent regardless of the workspace or interaction flow in which it is rendered.

---

## 10. Type-Safety Requirements

The unified field-definition API MUST provide strong compile-time guarantees.

At minimum:

1. Field identifiers MUST be declared exactly once in the field collection.
2. Field value types MUST be inferred from their associated Zod schemas.
3. The generated object schema MUST preserve the individual field types and optionality.
4. Generated metadata MUST be typed against the corresponding field schema.
5. Enum presentation options MUST be exhaustively checked against enum values.
6. Invalid metadata properties MUST fail TypeScript compilation.
7. Reusable field definitions MUST preserve their types through composition and contextual overrides.
8. Operation input metadata MUST support command-only fields without weakening type safety.
9. Resource key and version field declarations MUST be checked against the applicable record schema.
10. The implementation MUST NOT rely on `any` escape hatches to bridge the field definitions and generated representations.

The framework MUST preserve both Zod input and output types where transformations or coercions are involved. It MUST NOT assume that a field's form input representation and validated output representation are always identical.

---

## 11. API Design Constraints

The exact public API remains subject to the next specification revision, but the following constraints are proposed as architectural requirements.

### 11.1. Keep the abstraction small

The public model SHOULD be limited to:

- A unified field-definition primitive.
- A small set of specialized field helpers.
- A field collection/composition factory.
- An explicit immutable metadata override mechanism where necessary.

The framework MUST NOT introduce a proprietary field-definition language or a complete replacement for Zod object composition.

### 11.2. Materialized outputs

The field collection MUST expose the native Zod schema and derived attribute metadata needed by framework consumers.

Consumers MUST NOT need to know how those representations were generated.

### 11.3. No mandatory Zod registry

The recommended architecture SHOULD NOT depend on Zod's global metadata registry or on schema metadata extraction to recover framework field definitions.

Zod registry integration MAY be evaluated as an optional interoperability mechanism, but it MUST NOT be required for the canonical field-authoring model.

### 11.4. External schema interoperability

The framework SHOULD retain a controlled interoperability path for pre-existing native Zod schemas that cannot immediately be migrated into unified field definitions.

Such an escape hatch MUST be clearly distinguished from the canonical resource-authoring approach and MUST NOT make parallel metadata declarations the normal development pattern.

---

## 12. Rejected Approaches and Boundaries

The following outcomes would NOT satisfy this proposal:

- Retaining a complete Zod object schema alongside a separately authored `AttributeMeta` map as the standard authoring model.
- Requiring developers to repeat field identifiers to connect schema properties with metadata.
- Generating attributes from schema heuristics that infer domain meaning from arbitrary Zod validation structure.
- Storing framework metadata only in Zod's global registry and requiring runtime wrapper traversal to recover it.
- Introducing private Zod `_def` or `def` inspection.
- Recreating Zod's schema composition API inside `defineFields()`.
- Allowing operation-only fields to bypass the unified field-definition model.
- Maintaining multiple competing metadata representations with undocumented precedence.
- Mutating reusable field definitions when contextual overrides are applied.

The objective is not merely to reduce the number of lines in a resource declaration. It is to eliminate parallel ownership of the same field information.

---

## 13. Migration Impact

Adopting unified field definitions requires coordinated changes across the specification.

The next revision SHOULD evaluate and update the following areas:

| Specification Area | Expected Change |
|---|---|
| Schema helpers | Introduce unified field-definition helpers and metadata-preserving specialized helpers. |
| Resource contracts | Replace independently authored `schemas`/`attributes` combinations with a unified `fields` definition. |
| Attribute metadata | Retain the materialized metadata contract but establish field definitions as its authoring source. |
| Operation contracts | Support operation-owned unified input field collections, including command-only fields. |
| Forms and sessions | Resolve metadata from the active operation schema and its authoritative field definitions. |
| Resource fields | Consume generated field metadata without requiring a separate attribute identifier. |
| Embedded structures | Reuse unified field collections without artificial HTTP resource descriptors. |
| Relations and lookups | Preserve relation semantics through unified field definitions and resource-level materialization. |
| Query policy | Derive default search/filter/sort behavior from unified field metadata. |
| Workspace materialization | Resolve field semantics from the same unified definitions used by validation and operations. |
| Examples | Rewrite affected resource, command, master-detail, and custom workflow examples. |
| Type reference examples | Add compile-time tests for inference, enum exhaustiveness, optionality, transformations, and composition. |

The migration MUST preserve existing capabilities and MUST NOT silently remove features merely because their previous representation changes.

The revision SHOULD define an incremental migration strategy for existing Zod schemas and attribute maps.

---

## 14. Required Technical Validation

The architecture MUST be validated against the supported TypeScript and Zod versions before the resulting contracts become normative.

At minimum, the implementation spike SHOULD verify:

### 14.1. Type inference

- Native schema inference from `defineFields()`.
- Correct metadata-to-schema type association.
- Required and optional fields.
- Enum exhaustiveness.
- Reusable field composition.
- Operation input typing.
- Input/output type preservation.

### 14.2. Schema composition

- `.omit()`, `.pick()`, `.partial()`, and `.extend()`.
- Optional, nullable, default, and prefault wrappers.
- Refinements and transformations.
- Nested objects and arrays.
- Composition of shared field definitions.
- Operation schemas derived from resource field collections.

### 14.3. Runtime behavior

- Correct metadata resolution for active operation schemas.
- No metadata mutation across shared field definitions.
- No metadata loss during supported composition.
- No private Zod internal inspection.
- No hidden schema compiler.
- Predictable runtime materialization.

### 14.4. Scale

The implementation SHOULD benchmark TypeScript compiler performance and IDE responsiveness against the expected framework scale, including approximately 150 interconnected resources with representative field counts.

The spike MUST record actual results. A successful isolated example MUST NOT be treated as proof of acceptable large-project type performance.

---

## 15. Acceptance Scenarios

The next specification revision MUST demonstrate that the unified field-definition model satisfies the following cases.

| Scenario | Acceptance Requirement |
|---|---|
| Simple CRUD resource | One field declaration per field; native Zod schema and metadata are derived automatically. |
| Different read and write schemas | Operation projections reuse resource field definitions without separate attribute maps. |
| Command-only input | Command fields define validation and metadata together, independently of record/view fields. |
| Shared money or quantity field | Reuse across resources and operations with immutable contextual metadata overrides. |
| Enum fields | Enum values and presentation options remain exhaustively type-safe. |
| Relation fields | Target resource semantics remain available without repeating the same facts in separate metadata maps. |
| Embedded array items | Nested fields use unified definitions without artificial HTTP resources. |
| Custom workflow | A custom form resolves the same field semantics as a standard resource workspace. |
| Dynamic field behavior | Contextual rules work without duplicating intrinsic field metadata. |
| Schema transformation | Supported native Zod projections retain a resolvable relationship to their field definitions. |
| Component registry | Controllers and renderers resolve field behavior from the materialized unified metadata. |
| External Zod schema | Existing schemas remain interoperable through an explicitly documented non-canonical path. |

---

## 16. Decisions Required in the Next Revision Cycle

The specification revision team MUST resolve and document the following decisions.

1. **FieldDefinition contract:** What is the minimal public type and helper API for a unified schema-plus-metadata field?

2. **Field collection contract:** What does `defineFields()` return, and which representations are publicly exposed versus internally materialized?

3. **Schema projections:** How does an operation derive a schema projection from resource fields while retaining metadata associations without requiring a parallel declaration?

4. **Operation-owned fields:** How does `defineCommand()` consume command-specific field collections, and how are resource fields composed with operation-only fields?

5. **Metadata overrides:** What is the immutable, type-safe mechanism for reusing the same field definition with different contextual labels, formatting, or presentation hints?

6. **Specialized field helpers:** Which helpers are necessary, and how do they preserve all schema and semantic information?

7. **Dynamic field rules:** Which rules belong to the field definition and which require resource, operation, or session context?

8. **Nested composition:** How are nested objects, arrays, and embedded structures represented without introducing a second schema language?

9. **External schema interoperability:** How can existing native Zod schemas be consumed without making parallel attribute maps mandatory?

10. **TypeScript scalability:** Does the chosen generic model perform acceptably at the expected project scale?

These decisions MUST be resolved before the relevant normative contracts and implementation requirements are finalized.

---

## 17. Final Recommendation

Adopt Unified Composable Field Definitions as the canonical field-authoring model for the Foundational Frontend Framework.

The resource definition MUST NOT require a separately maintained Zod schema and field-keyed attribute metadata map.

A field MUST be authored once, combining its native Zod validation schema and intrinsic framework metadata. The framework MUST derive the native object schema, attribute metadata, and all other required representations from that unified declaration.

The model MUST apply consistently to resource-owned fields, operation-owned fields, reusable fields, embedded structures, and custom workflow inputs.

The public abstraction MUST remain thin, type-safe, immutable, composable, and fully compatible with native Zod operations.

This proposal is not intended to add another abstraction layer to the resource architecture. It is intended to remove an unnecessary one: the parallel authoring of two representations of the same field.

**The desired outcome is a single authoritative field definition from which validation, semantics, presentation, and interaction behavior can be derived consistently throughout the framework.**