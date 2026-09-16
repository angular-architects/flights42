# Context Files

A `context.md` gives an agent (or a new team member) the shared language of one
area of the code before they touch it. The idea follows Matt Pocock's
`CONTEXT.md`: a glossary of the ubiquitous language, kept free of
implementation detail, updated the moment a term crystallizes. Agents that know
the vocabulary write shorter prompts, navigate the code faster and name things
consistently.

## Where

- one per domain: `src/app/domains/<domain>/context.md`
- one per feature: `src/app/domains/<domain>/feature-<name>/context.md`
- a feature file only adds what the domain file does not say

## What goes in

- **Purpose**: one or two sentences on what this area is for.
- **Language**: the terms used here with their exact meaning, one line per
  term. Prefer the term the code uses; if code and business disagree, say so.
- **Boundaries**: what this area owns, what it may use from elsewhere, what it
  must not reach into.
- **Invariants**: rules that are always true (derived values, allowed states,
  ordering).
- **Gotchas**: things that look wrong but are intentional, and facts that are
  expensive to rediscover (e.g. "this store is the event-driven teaching
  example").

## What stays out

- how-tos, code samples, step lists, framework documentation
- anything the code or configuration already states plainly (file lists,
  imports, route tables)
- implementation decisions — they belong into a ticket's `## Decisions`

## Style

- short: aim for under 40 lines, one line per term
- one meaning per term; a term that means two things is a finding — split it
- write for someone who has never seen the code
- update inline: when a conversation resolves a term, write it down in the same
  change instead of batching it for later

## Template

```markdown
# <Area>

<One or two sentences: what this area is for.>

## Language

- **<Term>**: <exact meaning>.

## Boundaries

- <what this area owns / may use / must not touch>

## Invariants

- <rule that is always true>

## Gotchas

- <intentional oddity or expensive-to-rediscover fact>
```
