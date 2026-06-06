---
name: forensic-architecture-review
description: Gives general architecture and code-health feedback based on a forensic analysis of the code and its Git history (after Tornhill) via the Detective MCP server. Covers refactoring candidates, complexity trends, deep file analysis, hidden coupling, and knowledge concentration / bus factor. Use when the user asks for architecture feedback, technical-debt assessment, refactoring candidates, code-health, or a forensic analysis of the repository.
---

# Forensic Architecture Review

Give general architecture and code-health feedback based on a forensic analysis
of the source code and the Git history (in the spirit of Adam Tornhill).

The Detective MCP server provides the forensic analyses. It is an HTTP MCP
server at `http://localhost:3334/mcp` that must be started manually
(`npx @softarc/detective`) before a review. If its tools are unavailable, ask
the user to start it.

## Workflow

```
- [ ] Step 0: Ensure the Detective cache is fresh
- [ ] Step 1: Find hotspots (refactoring candidates)
- [ ] Step 2: Assess complexity trend over time
- [ ] Step 3: Deep-dive the worst hotspots (X-Ray)
- [ ] Step 4: Detect hidden coupling
- [ ] Step 5: Assess knowledge concentration (bus factor)
- [ ] Step 6: Synthesize feedback
```

### Step 0: Ensure the cache is fresh (mandatory, do this first)

The forensic analyses read the Git history from a cache. Before using any
Detective tool, make sure the cache is filled and not stale:

1. Call `cache.status`.
2. If it returns `isStale: true` (or you are unsure), call `cache.update`.

Only proceed once the cache is fresh.

### Step 1: Find hotspots (refactoring candidates)

Hotspots are files with high complexity AND high change frequency
(score = complexity × commits) — the prime refactoring candidates.

- `hotspots.find` — ranked list of hotspot files.
- `hotspots.aggregate` — which modules contain the most problematic files.

Use `limitCommits` / `limitMonths` to restrict the history window on large
repos.

### Step 2: Assess the complexity trend over time

`trendAnalysis.run` shows how complexity and size of files evolve over the most
recent commits. Use it to tell whether the code is decaying (files getting
steadily more complex) or stabilizing. Can be runtime-intensive on large repos —
limit `maxCommits` accordingly.

### Step 3: Deep-dive the worst hotspots (X-Ray)

For the top hotspots, run `xray.get` to get method-, class-, data-structure-,
organization- and TypeScript-level metrics for the file. Use `xray.schema` first
to understand the (dynamic) metric fields. This turns a "this file is a hotspot"
signal into concrete, actionable findings (e.g. oversized methods, weak typing,
too many reasons to change).

### Step 4: Detect hidden coupling

`changeCoupling.get` reveals logical/temporal coupling: parts that are
frequently changed together. Strong co-change that is not reflected in the
static structure points to hidden dependencies and shotgun-surgery risk.

### Step 5: Assess knowledge concentration (bus factor)

`teamAlignment.get` with `byUser: true` shows who changed how much in which
module. Modules dominated by a single author indicate a bus-factor / knowledge
risk worth flagging.

### Step 6: Synthesize feedback

Combine the signals. A finding is strongest when several converge (e.g. a top
hotspot that is also strongly change-coupled and maintained by a single author).

## Output

Provide:

- **Summary** — overall code-health assessment.
- **Findings by severity** — each with:
  - the affected file(s) / module(s)
  - which signal(s) flagged it (hotspot / trend / X-Ray / change coupling /
    bus factor) with the concrete Detective numbers
  - a concrete, smallest-useful recommendation
- **Evidence** — the Detective tool calls and key metrics behind each finding.

Report only concrete findings backed by the analysis. If a signal is
inconclusive, say so rather than inventing a problem.
