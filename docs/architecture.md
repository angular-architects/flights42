# Architecture Rules

## Goal

This document defines the architecture rules for this repository. Both agents and
developers are required to adhere to these rules whenever they modify application code.

## Domain Boundaries

- Respect the existing domain boundaries enforced by Sheriff.
- Never import implementation details from the private internals of another feature or domain.
- Cross-domain communication must occur exclusively through the public APIs configured in
  Sheriff or through dedicated parts of the shared area.

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
  - For domain-specific code, consult the user first.

## Data Access Services

- Use the suffix `Client` (e.g., `FlightClient`).
- Follow `FlightClient` as the reference implementation.
- Data access services must be stateless.

## Shared Code

- Promote code to a shared area only when at least two independent features require it.
- Avoid premature shared abstractions.

## State Management

- Follow `docs/signal-store.md` where applicable.
