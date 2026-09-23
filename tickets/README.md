# Tickets

Work items for this repository, one Markdown file per ticket: `NNN-<slug>.md`.
How a ticket is refined, implemented and reviewed: `docs/ai-setup.md`.

## Format

```markdown
---
status: draft
---

# <Title>

## Story

<Who wants what and why — one paragraph.>

## Scope

- <what is in / out>

## Acceptance criteria

- <checkable statement>

## Decisions

- **<topic>**: <chosen answer>. <one-line rationale>

## Assumptions

- **<topic>**: <chosen option>. <one-line reason>

## Open questions

- **<topic>**: <question> Options: <option A> / <option B>.
```

A new ticket has only `## Story`, `## Scope` and `## Acceptance criteria`. The
other three are added when needed:

- `## Decisions` — answers given by the user, recorded by the `refine-ticket`
  skill. Binding for whoever implements the ticket; an agent never writes here.
- `## Assumptions` — choices an AFK run made because it could not ask. Not
  binding; `refine-ticket` turns each one back into a question.
- `## Open questions` — what an AFK run refused to decide because the docs
  reserve it for the user: a new domain, a published API between domains, a
  move to `shared`, a change to the Sheriff configuration. The run stops
  without implementing.

## Status

- `draft` — written, open questions not yet resolved
- `ready` — refined, all decisions recorded; `npm run sandcastle` implements
  exactly the tickets with this status
- `done` — implemented
