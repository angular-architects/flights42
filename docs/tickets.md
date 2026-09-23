# Tickets

A ticket is one unit of work, written before anyone touches the code. It says
what to build, what has already been decided and what is still open. This
document defines the format and the rules an agent follows while implementing
one. How tickets are written, run and reviewed is described in
`docs/ai-setup.md`.

## Where

One Markdown file per ticket in `tickets/`, named `NNN-<slug>.md`.

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

A new ticket has none of the last three sections; they are added when needed.

## Who owns which section

- `## Decisions` — answers given by the user, recorded by the `refine-ticket`
  skill. Binding for whoever implements the ticket: implement what it says and
  do not re-open it. An agent never adds, changes or removes an entry here.
- `## Assumptions` — choices an implementing agent made because the ticket left
  them open. Not binding until the user confirms them in the review.
- `## Open questions` — questions the docs reserve for the user: a new domain,
  a published API between domains, a move to `shared`, a change to the Sheriff
  configuration (see `docs/architecture-boundaries.md`). An implementing agent
  that hits one records it here and stops without implementing.

## Status

- `draft` — written, open questions not yet resolved
- `ready` — refined, all decisions recorded, may be implemented
- `done` — implemented

## Implementing a ticket

1. Read the whole ticket, `## Decisions` first. A decided question is not
   asked again.
2. Read the context: `docs/architecture-boundaries.md` and the `context.md` of
   every domain and feature the ticket touches — domain file first, then
   feature file.
3. Decide every other question the ticket leaves open with the most
   conservative option that satisfies the acceptance criteria, and record it
   under `## Assumptions`, one entry per choice.
4. A question reserved for the user, or a conflict between the ticket and the
   architecture rules: add it under `## Open questions` with two to four answer
   options, set `status: draft` and stop. Leave the code unchanged — the rules
   are never adapted to make a ticket fit.
5. Set `status: done` once the ticket is implemented.
