Implement the ticket below in this repository. You are working on the branch
`{{SOURCE_BRANCH}}`; commit there and do not push.

Ticket file: `{{TICKET_PATH}}`

---

{{TICKET}}

---

## Rules

- Follow `AGENTS.md`. Read the `context.md` of every domain and feature you
  touch before changing code there.
- The ticket's `## Decisions` are binding and belong to the user. Never add,
  change or remove entries there.
- If the docs reserve a question for the user (for example a new domain, a
  published API between domains, a move to `shared` or a change to the
  Sheriff configuration) and the ticket's `## Decisions` do not answer it, do
  not decide it and do not implement the ticket. Add the question with two to
  four answer options under `## Open questions`, set `status: draft`, commit
  only the ticket and stop without printing the completion signal.
- For every other material question the ticket leaves open, choose the most
  conservative option that satisfies the acceptance criteria and record it
  under `## Assumptions` (after `## Decisions`), one entry per choice:
  `- **<topic>**: <chosen option>. <one-line reason>`. Assumptions are not
  binding; the user confirms or rejects them in the review.
- Keep the change small and inside the affected domain. Do not touch other
  tickets.
- Follow the `## Code Quality` rules in `AGENTS.md`. Before the last code
  commit, review your change with the `code-quality-review` skill and fix
  every finding.
- Run `npm run verify` and fix every problem until it passes. Never weaken
  lint, Sheriff or the architecture rules to make it pass.
- Commit in small conventional commits (`feat:`, `fix:`, `refactor:`, ...).
- Once the ticket is implemented, set `status: done` in the ticket's
  frontmatter as the last commit.
- When everything is committed and `npm run verify` is green, print exactly:
  `<promise>COMPLETE</promise>`
