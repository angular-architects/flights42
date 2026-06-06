---
name: domain-boundaries-review
description: Reviews the domain / bounded-context boundaries of the codebase and gives feedback on the domain cut. Combines DDD criteria (above all semantic consistency of the ubiquitous language) with technical and forensic analysis (structural dependencies, change coupling, hotspots, team alignment) via the Detective MCP server. Use when reviewing domain boundaries, module/scope cuts, bounded contexts, or when the user asks whether the domains are well separated.
---

# Domain Boundaries Review

Give feedback on how well the codebase is split into domains / bounded contexts.
The review has two complementary perspectives:

1. **Semantic (DDD)** — does the language fit the cut? This is the primary lens.
2. **Technical & forensic** — do dependencies and the change history support the cut?

The Detective MCP server provides the folder/scope map and the technical and
forensic analyses. It is an HTTP MCP server at `http://localhost:3334/mcp` that
must be started manually (`npx @softarc/detective`) before a review. If its
tools are unavailable, ask the user to start it.

## Workflow

```
- [ ] Step 1: Determine the domain folders / scopes
- [ ] Step 2: Semantic DDD review (ubiquitous language)
- [ ] Step 3: Technical review (dependencies / coupling)
- [ ] Step 4: Forensic review (Tornhill)
- [ ] Step 5: Synthesize feedback
```

### Step 1: Determine the domain folders / scopes

Use Detective to learn the actual structure instead of guessing:

- `config_read` — the configured scopes (each scope is a folder prefix that
  represents one domain/feature), groups, teams, aliases, filters.
- `folders_get` — the folder hierarchy inferred from real code dependencies.
- `modules_get` — file count per scope, to judge size and balance.

Note very large or very small scopes — both hint at a suboptimal cut.

### Step 2: Semantic DDD review (primary)

This is the most important part. Evaluate the cut against general DDD criteria,
above all **semantic consistency of the ubiquitous language**:

- For each central term, check whether it has the **same meaning everywhere it
  is used**. Example: does `Product` mean the same thing in every scope that
  references it, or does it silently carry a different concept per context?
- A term that means different things in different scopes is a signal that those
  are distinct bounded contexts and the shared model should be split (separate
  models per context, translated at the boundary).
- The same concept modeled differently / duplicated across scopes, or one
  scope reaching into another's internals, signals a leaky or misplaced
  boundary.
- A scope name should match what the code inside actually talks about.

Read the relevant source in the scopes (models, public `api`/`index.ts`,
shared types) to judge this. Detective gives you the map; the semantic judgment
comes from the code and the domain language.

### Step 3: Technical review — dependencies

`coupling_get` is the primary tool here. It returns the structural coupling
matrix (imports between scopes) and the cohesion per scope.

- **High cohesion within** a scope + **low coupling between** scopes = good cut.
- Many off-diagonal entries (imports crossing scope boundaries) = the domains
  are too tightly coupled; question the boundary or the dependency direction.
- Cross-check against the Sheriff configuration / `docs/architecture-boundaries.md`
  if present.

### Step 4: Forensic review (Tornhill)

Use the change history to validate the cut behaviorally:

- `changeCoupling_get` — logical/temporal coupling: scopes frequently changed in
  the same commit. Strong co-change between two scopes that are _not_
  structurally coupled suggests a hidden boundary problem (they belong together,
  or the cut forces shotgun edits).
- `hotspots_find` / `hotspots_aggregate` — files/modules with high complexity
  AND high change frequency (Tornhill hotspots). Hotspots clustered on a
  boundary often mean the boundary is wrong or overloaded.
- `teamAlignment_get` — Conway's law: ideally one team works primarily within
  one scope. Many teams scattered across one scope hints at a misaligned cut.
- Optionally `trendAnalysis_run` to see whether boundary-related complexity is
  growing over time.

Use `limitCommits` / `limitMonths` to restrict the history window when the repo
is large.

### Step 5: Synthesize feedback

Combine the semantic and technical/forensic findings. A boundary is questionable
when **several** perspectives agree (e.g. ambiguous term + high cross-coupling +
strong co-change between two scopes).

## Output

Provide:

- **Summary** — is the current domain cut healthy overall?
- **Domains / scopes reviewed** — names and sizes.
- **Findings by severity** — each with:
  - the affected scope(s)/term
  - which perspective(s) flagged it (semantic / coupling / change coupling /
    hotspot / team alignment) with the concrete Detective numbers
  - a concrete, smallest-useful recommendation (split, merge, move, rename,
    introduce a translation/anti-corruption layer, etc.)
- **Evidence** — the Detective tool calls and key metrics behind each finding.

Report only concrete findings. If a perspective is inconclusive, say so rather
than inventing a problem.
