# Architecture Rules

## Goal

This document defines the architecture rules for this repository. Both agents and
developers are required to adhere to these rules whenever they modify application code.

## Reference Implementations

- Model new features after `FlightSearch` and `FlightEdit` in terms of structure and style.

## Domain Boundaries

- Add a new domain only when the user explicitly requests it. The agent may always propose a
  new domain, but such a proposal must be accepted by the user before it is created.
- Respect the existing domain boundaries enforced by Sheriff.
- Never import implementation details from the private internals of another feature or domain.
- Cross-domain communication must occur exclusively through the public APIs configured in
  Sheriff or through dedicated parts of the shared area.
- A domain may access another domain when the latter exposes a dedicated API that publishes
  only selected details. See `sheriff.config.api.ts` for an illustrative configuration.
  Consult the user before choosing this approach.

## Layering

- Apply _relaxed_ layering.
- Permit only the following import direction: `feature → ui → data → util`.

## Changing the Sheriff Configuration

- Modify the Sheriff configuration only when explicitly instructed to do so.
- Never change the Sheriff configuration merely to relax existing boundaries.

## Locality

- Keep code that is used and changed together in close proximity (e.g., within the same folder).

## Single Responsibility

- Each file should have a single, well-defined responsibility.
- Adding helper constructs (functions, etc.) that are used only within the current file is acceptable.

## Signals

- Computed signals whose computation exceeds a single line should delegate to pure functions.
  - If such a function is used only once, place it at the end of the current file.

## Feature Slicing

- If code is used by a single feature only, place it in the corresponding feature folder.
- If code from one feature must be reused by another feature within the same domain,
  move it down to a lower layer.
- If technical code from one feature must be reused by a feature in a different domain,
  move it down to a lower layer of the shared area.
  - If the code might be domain-specific, the agent MUST ask for explicit user approval
    before moving it to `shared`.
  - Explicit approval means a clear confirmation in the current chat.
  - Without explicit approval, keep the code in the current domain and propose alternatives.

## Data Access Services

- Use the suffix `Client` (e.g., `FlightClient`).
- Follow `FlightClient` as the reference implementation.
- Data access services must be stateless.
- Components must never call a data access service directly. They obtain data through a
  store or through a coordinator that combines several stores (see
  `docs/architecture-state-management.md`).
- Only stores may access a data access service directly. Exception: files inside an `ai`
  layer (any `ai/` folder) may access data access services directly.

## Shared Code

- Promote code to a shared area only when at least two independent features require it.
- Avoid premature shared abstractions.

## Pre-Change Checklist (Shared Moves)

- Before moving code to `shared`, verify cross-domain reuse is truly required.
- Classify the code as technical or domain-specific, and state that classification explicitly.
- If there is any domain-specific ambiguity, obtain explicit user approval first.
- Record the chosen option and rationale in the response.

## State Management

- Follow `docs/architecture-state-management.md` where applicable.
