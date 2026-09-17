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

## Assumptions

- **<topic>**: <chosen option>. <one-line reason>

## Open questions

- **<topic>**: <question> Options: <option A> / <option B>.
```

A new ticket has none of the last three sections. They are added when needed:

- `## Decisions` — answers given by the user. `refine-ticket` adds them; an
  agent never writes this section on its own. Binding for whoever implements
  the ticket.
- `## Assumptions` — choices an implementing agent made because the ticket
  left them open. Not binding until the user confirms them.
- `## Open questions` — questions the docs reserve for the user (for example
  a new domain or a change to the Sheriff configuration). An implementing
  agent that hits one records it here and stops without implementing.

`status` is one of:

- `draft` — written, open questions not yet resolved
- `ready` — refined, all decisions recorded, may be implemented
- `done` — implemented

## Flow

1. Write a ticket with `status: draft`.
2. Run the `refine-ticket` skill. It checks the ticket against the code, asks
   the open questions and records the answers under `## Decisions`, then sets
   `status: ready`.
3. Commit the ticket, then implement it — interactively, or AFK with
   Sandcastle: `npm run tickets` picks up every `ready` ticket, runs a Claude
   Code agent on a branch `ticket/<slug>` and leaves the result there for
   review (see `docs/ai-setup.md`).
4. Review the branch:
   - Agent stopped with `## Open questions` (`status: draft` again): run
     `refine-ticket` on the ticket and start the run again.
   - Otherwise go through `## Assumptions` with `refine-ticket`: confirmed
     entries move to `## Decisions`, rejected ones need a change on the
     branch.
5. Merge, and set `status: done` if the agent has not done so already.
