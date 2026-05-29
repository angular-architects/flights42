# Architecture Rules

## Goal

This document describes the architecture rules for this repository.
Agents and developers must follow these rules when changing application code.

## Domain Boundaries

- Respect existing domain boundaries defined by sheriff
- Do not import implementation details from another feature's or domain's private parts
- Cross-domain communication must happen through APIs configured by sheriff or by acessing parts of the shared area

## Layering

- Use relaxed layering
- Only allow the following imports: feature --> ui --> data --> util

## Changing Sheriff Config

- Change the Sheriff config only when you are explicitly asked for it
- Do not change the Sheriff config just to relax boundaries

## Locality

- Code that is used and changed together should be closely located (e.g. in the same folder)

## Single Responsibility

- Each file should have a single responsibility
- Its fine to add additional helper constructs (functions, etc.) only used by the current file

## Signals

- Computed Signals with computations longer than a line should delegate to pure functions.
  - If only needed once, put these functions at the end of the current file

## Feature Slicing

- If code is only used by a feature, put it into the corresponding feature folder
- If it's necessary to reuse code from a feature within another feature of the same domain, pull it into a lower layer
- If it's necessary to reuse technical code from a feature within another feature of a differnt domain, pull it into a lower layer of the shared area
  - In the case of domain-specific code, ask the user first

## Shared Code

- Put code into shared areas only if at least two independent features need it.
- Do not create premature shared abstractions.

## State Management

- Follow `docs/signal-store.md` if present.
