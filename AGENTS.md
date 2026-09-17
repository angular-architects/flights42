You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Architecture

Before changing application or library code, read `docs/architecture-boundaries.md` and apply the architecture rules.

If the change touches state management, also read `docs/architecture-state-management.md` when it exists.

File-name suffixes carry architectural meaning (see `docs/architecture-state-management.md`). Renaming or moving a file across suffixes is a re-classification, not a cosmetic change — verify it against those rules first.

Do not bypass documented domain boundaries. Prefer small, focused changes.

## Context Files

Every domain (`src/app/domains/<domain>/`) and every feature (`feature-<name>/`) has a `context.md` with the language, boundaries, invariants and gotchas of that area. What goes in and what stays out is defined in `docs/context-files.md`.

- Before changing code in a domain or feature, read its `context.md` — the domain file first, then the feature file.
- When a change introduces or sharpens a domain term, update the affected `context.md` in the same change.
- When a domain or feature has no `context.md` yet, create one from the template in `docs/context-files.md`.

## Tickets

Work items live in `tickets/` as Markdown files (see `tickets/README.md`). A ticket's `## Decisions` section is binding: implement what it says and do not re-open decided questions. Open questions are resolved with the `refine-ticket` skill before implementation starts.

`## Decisions` belongs to the user: only write an entry there with the user's answer. Choices you make on your own go under `## Assumptions`; they are not binding until the user confirms them.

## Comments

- Write all code comments and inline documentation in English, regardless of the conversation language

## Code Quality

These rules apply to every change and are checked again in review (`code-quality-review` skill).

- **Single Level of Abstraction (SLAP)**: a function either orchestrates — it calls well-named steps — or implements one concrete mechanic. Never mix both in the same function.
- **Helper functions are nameable domain concepts**: name a helper after what it means in the domain (e.g. `isBookable(flight)`), not after its mechanics (`processData`, `handleItems`, `helper`). If no domain name fits, the split is wrong.
- **Hard nesting limit of 2**: blocks inside a function are nested at most two levels deep (enforced by ESLint `max-depth`). Reduce nesting with early returns or by extracting a named step.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Always use Signal Forms for building forms
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
