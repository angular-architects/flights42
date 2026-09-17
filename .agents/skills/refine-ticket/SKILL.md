---
name: refine-ticket
description: Reviews a ticket from tickets/ against the code base, surfaces open questions with answer options, asks the user and records the answers in the ticket under "## Decisions". Use when the user asks to refine, review, groom, clarify or check a ticket, before implementing a ticket that has no decisions yet, or to settle the "## Assumptions" and "## Open questions" an implementing agent left in the ticket.
disable-model-invocation: true
---

# Refine Ticket

Goal: after this skill, the ticket has no open questions and no assumptions
left. Every decision is written under `## Decisions` and is binding for the
implementation.

Do not change application code in this skill. Do not decide on the user's
behalf.

## Steps

1. **Locate the ticket.** Use the file given as argument; otherwise list
   `tickets/*.md` and ask which one. Read it completely, including existing
   `## Decisions`, `## Assumptions` and `## Open questions` sections. Decided
   questions are never asked again. Every entry under `## Assumptions` and
   `## Open questions` is a question for the user, even if the code already
   follows it: an assumption is asked with the assumed option as one of the
   answer options.

2. **Load the context.** Read `AGENTS.md`, `docs/architecture-boundaries.md`,
   and the `context.md` of every domain and feature the ticket touches (domain
   file first, then feature file). If state management is involved, also read
   `docs/architecture-state-management.md`. State which files you consulted.

3. **Check the ticket against the code.** Identify:
   - the affected domains, features and layers;
   - stores, clients, components and models that will change or be reused;
   - architecture rules that constrain the solution (domain boundaries, store
     granularity, moves to `shared` that need approval, new domains that need
     approval);
   - gaps: ambiguous wording, missing acceptance criteria, contradictions with
     the code or the context files, undefined or inconsistently used terms.

   Only what cannot be answered from the ticket, the code or the docs becomes
   a question.

4. **Ask the open questions.** At most five per round, most important first.
   Each question has two to four concrete answer options, the recommended one
   first and marked "(recommended)" with a one-line reason, plus room for a
   free answer. When a question tool (such as AskUserQuestion) is available,
   use it; otherwise number the questions in the chat and wait for the
   answers. Never fill in an answer yourself.

5. **Record the decisions.** Append to `## Decisions` (create the section
   right after `## Acceptance criteria` if it is missing) one entry per
   answered question:

   ```markdown
   - **<topic>**: <chosen answer>. <one-line rationale>
   ```

   Keep the wording of the question recognizable in the topic. If the
   question came from `## Assumptions` or `## Open questions`, remove the
   entry there and drop the section once it is empty. If a decision changes
   the ticket's scope or acceptance criteria, update those sections too and
   mention it in the entry. If a decision fixed the meaning of a domain term,
   add the term to the affected `context.md` (see `docs/context-files.md`).

6. **Repeat** steps 3 to 5 until no open questions and no assumptions remain.
   Then set `status: ready` in the ticket's frontmatter, unless it already
   says `done`. Never set `done`.

## Output

- the decisions recorded in this run
- rejected assumptions that are already implemented and still need a change
- the files consulted
- remaining risks that are not decisions (e.g. missing test data, unclear
  backend behaviour)
