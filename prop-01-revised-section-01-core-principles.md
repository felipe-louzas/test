# PROP-01 — Design Principles, Anti-Patterns, and Conformance Rules

**Target:** Foundational Frontend Framework  
**Target Sections:** §1 — Design Principles, Anti-Patterns, and Conformance Rules  
**Proposal Type:** Core architectural principles revision  
**Status:** Proposed — for architectural review and incorporation into the next specification revision  
**Source Baseline:** Current Design Principles, Anti-Patterns, and Conformance Rules section supplied for this proposal  
**Related Proposal:** Unified Composable Field Definitions

---

## 1. Purpose

This proposal establishes the foundational architectural principles, explicit exclusions, and conformance requirements governing the Foundational Frontend Framework.

Its purpose is to make the framework's intended architectural identity unambiguous and provide normative direction to specification authors, framework implementers, and application developers.

The proposed revision establishes the following architectural commitments:

1. The framework is an API-first frontend platform with a strict browser-to-BFF boundary.
2. Resource definitions are the single authoritative source for resource-owned contracts, field definitions, semantics, and workspace definitions.
3. Fields are declared once, combining native Zod validation and intrinsic framework metadata. Parallel field-keyed schemas and attribute metadata maps are not required.
4. The framework favors deterministic convention over redundant configuration.
5. Declarative resource workspaces are a first-class framework capability, materialized from resource manifests through a composable headless component stack and materialized component registry.
6. Forms and interaction contracts are operation-bound rather than controlled by generic CRUD modes.
7. Native TypeScript, Zod, React, React Hook Form, and TanStack Query remain the foundation of the programming model.
8. Server/client contract parity, decimal precision, server portability, and security boundaries remain mandatory architectural constraints.
9. Runtime descriptor initialization and workspace materialization are explicitly distinguished from prohibited build-time metadata compilation.
10. Conformance is defined through cumulative runtime, declarative workspace/UI, and enterprise security/data integrity tiers.

This proposal updates the foundational principles rather than prescribing the detailed implementation of individual contracts. Those contracts are to be specified in their respective normative sections.

---

## 2. Proposed Normative Replacement

The following text MUST replace the existing Section 1 in its entirety.

# 1. Design Principles, Anti-Patterns, and Conformance Rules

## 1.1. Core Architectural Principles

1. **API-First Frontend Platform:** The framework MUST own declarative resource definition, operation-bound interaction patterns, client/BFF API execution, resource workspace orchestration, and headless presentation infrastructure. It MUST NOT implement database persistence, ORMs, SQL query planners, database transaction coordination, backend domain event publication, or authoritative security enforcement. Domain backend services MUST remain authoritative for those responsibilities.

2. **Browser-to-BFF Exclusive Boundary:** The browser MUST NEVER call backend domain APIs directly. All browser-originated application API traffic MUST pass through the Backend-for-Frontend (BFF) layer. Backend base URLs, service credentials, and bearer tokens MUST remain strictly server-only. Large file uploads (10MB–100MB) MUST use presigned object-storage transfers: upload authorization, policy enforcement, and presigned URL issuance MUST pass through the BFF, while the actual file transfer MUST bypass the BFF and go directly to object storage.

3. **Single Authoritative Resource Definition:** All resource-owned domain semantics, schemas, field metadata, labels, validation contracts, relation metadata, API operation descriptors, and resource-level workspace definitions MUST have one authoritative, discoverable resource definition, conventionally organized as a `*.resource.ts` module. The framework MUST NOT require secondary build-time code generation or separately maintained manifests to materialize resource behavior. A resource field MUST be declared once, combining its data-validation schema and intrinsic framework metadata. The framework MUST derive all required schema and attribute representations from that declaration. Maintaining parallel field-keyed Zod schemas and attribute metadata maps MUST NOT be required. Cross-resource operations spanning multiple resources or aggregates SHOULD be declared in explicit shared `*.op.ts` modules and bound to their applicable resource identities or resource keys.

4. **Native Language and Library Idioms:** The framework MUST favor native TypeScript, JavaScript, and React composition over custom languages, expression parsers, or proprietary programming models. Data schemas MUST use native Zod contracts. Form state MUST use native React Hook Form. Server-state caching and invalidation MUST use native TanStack Query. UI composition and customization MUST use native React components, hooks, and props. Framework abstractions MUST preserve interoperability with these underlying libraries rather than replacing their fundamental programming models.

5. **Mode-Free, Operation-Bound Interaction Contracts:** Form validation, submission, and authorization MUST be bound to explicit `OperationDescriptor` contracts and their invocation context, not controlled by generic `create`, `edit`, `view`, or `delete` mode flags. Such mode flags MUST NOT appear as substitutes for operation contracts in descriptors, reactive contexts, hooks, components, or runtime state. Resource descriptors, contracts, and permission contexts MUST NOT hardcode CRUD-specific operation properties as mandatory framework concepts. Operation identifiers and references MAY use conventional CRUD names, but operations MUST remain explicitly declared and retain their distinct semantic contracts.

6. **Convention Over Configuration (Deterministic, Inspectable Derivation):** The framework MUST favor convention over configuration. Any value or behavior that can be derived deterministically and unambiguously from explicitly declared information or documented framework defaults MUST be derived by the framework rather than requiring redundant developer configuration. All derivation rules MUST be deterministic, documented, and inspectable through public runtime contracts. Derived values MUST be materialized at a defined framework lifecycle stage and MUST remain explicitly overridable at the appropriate resource, sub-resource, operation, or presentation scope. Override precedence, merging behavior, and fallback semantics MUST be clearly specified. The framework MUST NOT require developers to repeat information already available from an authoritative declaration or documented as a framework default convention.

7. **Declarative Resource Workspaces (Manifest-Driven UI Composition):** Resource-level workspace definitions MUST be first-class, expressive capabilities of the resource manifest. The framework MUST support defining resource-management screens, workflows, presentation structures, and interaction behavior declaratively through these definitions. It MUST be capable of materializing complete, functional resource workspaces, including their component composition, state management, data interactions, and standard interaction flows, directly from the resource manifest. Standard resource workspaces MUST be renderable through a single framework entrypoint component declared at the application page or route level, without requiring application developers to manually assemble individual components, hooks, or interaction flows. The architectural target MUST be to support approximately 90% of resource-management screens through this manifest-driven model.

   The framework MUST provide a composable headless component stack and a materialized component registry through which resource descriptors, workspace definitions, field semantics, operations, and presentation metadata are resolved into functional UI structures and interaction behavior. The component stack and registry MUST remain independently composable, extensible, and customizable. Application developers MUST be able to override presentation components, extend workspace behavior, and implement specialized workflows without bypassing resource contracts or introducing a separate interaction architecture. Standard resource workspaces and specialized operational interfaces MUST share the same underlying component, state-management, data-interaction, and presentation infrastructure.

8. **Strict Server/Client Contract Parity:** The same authoritative TypeScript definitions and schemas MUST govern client-side interaction and server-side BFF execution. API operations exposed through the BFF MUST be registered with `@framework/server`, ensuring that request validation, response contracts, REST mapping, and client invocation remain aligned. The framework MUST NOT maintain independently authored client and server representations of the same operation contract.

9. **Exact Precision for Financial and Quantity Data:** Financial amounts, totals, prices, tax rates, weights, inventory quantities, and other precision-sensitive decimal values MUST be represented as decimal strings at application and API boundaries, validated through Zod, and computed using `DecimalMath` based on BigInt scaled fixed-point arithmetic. Native IEEE-754 `number` arithmetic MUST NOT be used for these values or their derived calculations. Conversion to native numeric representations MAY occur only at explicitly defined presentation or interoperability boundaries where precision loss is acceptable and controlled.

10. **Framework-Agnostic Server Core:** Request validation, BFF routing, authentication identity resolution, REST mapping, authorization delegation, and file-transfer brokering MUST execute on Web Standard `Request`, `Response`, and `Headers` APIs within `@framework/server`. The server core MUST NOT depend on Next.js-specific runtime contracts. Next.js App Router integration through `@framework/nextjs` and standalone BFF adapters, including Hono, Fastify, and Express, MUST remain interchangeable implementations of the server integration boundary.

## 1.2. Explicit Architectural Exclusions (Hard Anti-Patterns)

Implementers MUST NOT reintroduce the following rejected mechanisms under different names or through equivalent implementations:

- **No Build-Time Resource Metadata Compiler:** The framework MUST NOT introduce a build-time resource metadata compiler, AST stripping pass, generated metadata catalog, indirection table, or split browser JSON manifest architecture. Resource modules MUST remain ordinary ESM modules loaded and split naturally through standard bundler mechanisms, including route-level and `React.lazy()` code splitting. This exclusion MUST NOT prohibit deterministic descriptor initialization, runtime workspace materialization, or the materialized component registry required by the core architecture. These mechanisms MUST operate on declared runtime contracts and MUST NOT recreate a hidden build-time compilation pipeline.

- **No Zod AST or Arbitrary SchemaNode Walker:** Framework code MUST NOT inspect private Zod `_def`/`def` internals to synthesize resource metadata, nested CRUD interfaces, or form models. Field semantics, relation definitions, workspace composition, and presentation metadata MUST be obtained from explicit framework contracts and documented public Zod v4 APIs where required by framework contracts.

- **No Universal Action Abstraction:** Queries (`query`), single/state commands (`command`), bulk partial operations (`batch`), asynchronous long-running jobs (`async-job`), and client-only UI triggers (`client`) MUST remain distinct discriminated contracts. Their input/output schemas, execution semantics, lifecycle, and interaction behavior MUST NOT be collapsed into an indistinguishable universal action abstraction.

- **No Mode-Flag Forms:** Forms MUST NOT derive validation, submission, or authorization semantics from generic `create`, `edit`, or `view` mode strings. Form sessions MUST bind to explicit operation contracts and invocation context. Presentation state and workspace navigation MAY express user-interface states, but MUST NOT replace or redefine operation semantics.

- **No Unserializable RSC Props:** Live `ResourceDescriptor`, `SubResourceDescriptor`, and `OperationDescriptor` instances, including Zod validators, executable callbacks, and other non-serializable runtime references, MUST NEVER be passed as serialized props across React Server Component to Client Component boundaries. Server-to-client communication MUST use serializable data and identifiers. Runtime descriptors and executable contracts MUST be resolved within the appropriate server or client execution boundary.

## 1.3. Conformance Levels

A compliant application or framework module MUST satisfy the applicable requirements of the following conformance levels. Higher tiers include the requirements of all lower tiers.

- **Tier 1 — Core Runtime Conformance:** MUST use the framework's authoritative resource and operation contracts through `@framework/contracts` and `@framework/api`, and MUST execute BFF responsibilities through `@framework/server` or a conforming server adapter. All registered resource definitions MUST pass `validateResourceGraph()` with zero errors. All API operations exposed through the BFF MUST be registered with `ServerRuntime`. Server-only credentials and backend routing information MUST remain outside browser execution contexts.

- **Tier 2 — Declarative Workspace and UI Conformance:** MUST use the framework's resource workspace definitions, headless component stack, and materialized component registry for standard resource-management interfaces. Standard resource workspaces MUST be exposed through the framework's route-level entrypoint component. Custom and specialized workflows MUST use the same underlying framework component, form, operation, and interaction contracts rather than introducing independent implementations of shared framework behavior. UI implementations MUST use `@framework/forms`, `@framework/hosts`, and `@framework/ui` as applicable, MUST configure `FrameworkProvider` and `FormSessionProvider` where required, and MUST respect the documented `PresentationRegistry` precedence rules and dirty-navigation safeguards.

- **Tier 3 — Enterprise Security and Data Integrity Conformance:** MUST enforce the BFF-only credential boundary, CSRF protection, secure session-cookie verification, and tenant isolation. Authentication failures and tenant changes MUST trigger the specified atomic session and server-state cache invalidation procedures. Precision-sensitive values MUST comply with the `DecimalMath` requirements. Large-file transfers MUST use the prescribed presigned object-storage transfer architecture, with authorization and upload policy enforcement mediated by the BFF.

---

## 3. Architectural Consequences and Required Alignment

Adoption of this proposal establishes the following requirements for the remainder of the specification.

### 3.1. Resource definition and field ownership

The resource manifest MUST become the authoritative composition root for resource-owned field definitions, operation declarations, relations, and workspace definitions.

The field-authoring model MUST follow the Unified Composable Field Definitions proposal. A field MUST combine its Zod validation schema and intrinsic framework metadata in one declaration. The framework MUST derive the native Zod schema and attribute metadata consumed by other framework contracts.

All related contracts, including `ResourceDescriptor`, `SubResourceDescriptor`, operation inputs, and field metadata resolution, MUST align with this ownership model.

### 3.2. Resource workspace architecture

The specification MUST define resource-level workspace descriptors as first-class contracts.

The workspace architecture MUST establish:

- Declarative workspace composition and configuration.
- Standard resource-management flows materialized from resource manifests.
- A single route-level workspace entrypoint.
- The headless component stack.
- The materialized component registry.
- Component resolution and customization rules.
- State, data interaction, and operation orchestration.
- Extensibility for specialized workflows.
- Consistency between standard workspaces and custom operational interfaces.

The workspace architecture MUST NOT be reduced to a thin, replaceable CRUD preset or require developers to manually compose standard resource screens from low-level components and hooks.

### 3.3. Convention and materialization architecture

All framework derivations MUST conform to Principle 6.

The specification MUST distinguish deterministic descriptor initialization and runtime workspace materialization from prohibited build-time metadata compilation.

Derived values and materialized workspace structures MUST have defined lifecycle stages, public inspection contracts where applicable, explicit overrides, and deterministic precedence.

### 3.4. Cross-section consistency

All affected specification sections MUST be reviewed for consistency with the revised principles.

This includes, at minimum:

- Resource and sub-resource contracts.
- Unified field definitions and schema helpers.
- Operation descriptors and registration.
- Resource-level workspace descriptors.
- Headless component stack and materialized component registry.
- Form sessions and operation-bound interactions.
- Presentation metadata and resolution precedence.
- Client/server execution boundaries.
- Server runtime and adapters.
- Resource graph validation.
- Reference examples and conformance requirements.

No downstream section MAY introduce a mechanism that contradicts the principles or exclusions established in Section 1.

---

## 4. Acceptance Criteria

The proposal is accepted for incorporation only when the revised specification satisfies the following criteria:

1. Section 1 is replaced in full, preserving the proposed architectural intent and normative requirements.
2. Resource definitions remain the single authoritative source for resource-owned contracts and workspace definitions.
3. Unified field declarations are established as a framework-wide requirement, consistent with the related Unified Composable Field Definitions proposal.
4. Standard resource workspaces are defined as expressive manifest-driven capabilities, not optional CRUD presets.
5. The headless component stack and materialized component registry have a consistent architectural role throughout the specification.
6. A single route-level entrypoint is supported for materializing standard resource workspaces.
7. Specialized operational workflows use the same underlying framework interaction and component architecture.
8. Deterministic convention-based derivation is explicitly supported and distinguished from hidden heuristics and build-time compilation.
9. All hard anti-patterns remain explicit and consistent with the desired runtime materialization architecture.
10. Conformance tiers accurately reflect the mandatory architecture and its security, data integrity, and UI requirements.
11. All downstream normative contracts, implementation guidance, and examples are consistent with the revised Section 1.
12. No existing architectural capability or requirement is silently removed as a side effect of incorporating this proposal.

---

## 5. Revision Guidance

This proposal establishes architectural principles and conformance requirements. It does not prescribe every implementation detail or authorize the revision team to invent APIs solely to satisfy the wording.

The next specification revision MUST:

- Treat this proposal as the authoritative input for the revision of Section 1.
- Evaluate its consistency with the Unified Composable Field Definitions proposal.
- Resolve any conflicts between the proposals explicitly rather than silently choosing one interpretation.
- Update downstream contracts and implementation guidance where required.
- Preserve the original specification's breadth and depth.
- Make all material architectural decisions explicit.
- Validate technical claims against the supported TypeScript, Zod, React, and related library versions.

The revision team MUST NOT interpret the anti-patterns as prohibiting deterministic runtime materialization, reusable field definitions, generated schema representations, or declarative component composition. These are required capabilities when implemented through explicit, inspectable framework contracts without a hidden build-time compiler.

**Final architectural direction:** The framework is a declarative resource-driven frontend platform. Resource manifests define the authoritative resource contracts, fields, operations, and workspaces. Deterministic framework conventions derive redundant information, while the headless component stack and materialized component registry turn those definitions into complete, customizable application experiences. Standard and specialized interfaces share one coherent component and interaction architecture.