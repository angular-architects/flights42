# Tickets

Work items for this repository live here as Markdown files, one per ticket:
`NNN-<slug>.md`.

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
```

A new ticket has no `## Decisions` section. `refine-ticket` adds it with the
first recorded decision.

`status` is one of:

- `draft` — written, open questions not yet resolved
- `ready` — refined, all decisions recorded, may be implemented
- `done` — implemented

## Flow

1. Write a ticket with `status: draft`.
2. Run the `refine-ticket` skill. It checks the ticket against the code, asks
   the open questions and records the answers under `## Decisions`, then sets
   `status: ready`.
3. Implement the ticket — interactively, or AFK with Sandcastle:
   `npm run tickets` picks up every `ready` ticket, runs a Claude Code agent on
   a branch `ticket/<slug>` and leaves the result there for review (see
   `docs/ai-setup.md`).
4. Review the branch, merge, and set `status: done` if the agent has not done
   so already.

`## Decisions` is binding for whoever implements the ticket.
