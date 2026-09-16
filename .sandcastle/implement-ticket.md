Implement the ticket below in this repository. You are working on the branch
`{{SOURCE_BRANCH}}`; commit there and do not push.

Ticket file: `{{TICKET_PATH}}`

---

{{TICKET}}

---

## Rules

- Follow `AGENTS.md`. Read the `context.md` of every domain and feature you
  touch before changing code there.
- The ticket's `## Decisions` are binding. If something material is not
  decided, choose the most conservative option that satisfies the acceptance
  criteria and record it under `## Decisions` with the suffix
  "(decided by agent)".
- Keep the change small and inside the affected domain. Do not touch other
  tickets.
- Run `npm run verify` and fix every problem until it passes. Never weaken
  lint, Sheriff or the architecture rules to make it pass.
- Commit in small conventional commits (`feat:`, `fix:`, `refactor:`, ...).
- As the last commit, set `status: done` in the ticket's frontmatter.
- When everything is committed and `npm run verify` is green, print exactly:
  `<promise>COMPLETE</promise>`
