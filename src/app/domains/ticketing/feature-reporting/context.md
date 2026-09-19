# Reporting

A power user describes a chart in natural language; the assistant ("Report42")
generates JavaScript that loads flights and hands name/value pairs to a bar
chart.

## Language

- **Report prompt**: the user's request; ready-made ones in `example-prompts`.
- **Charting runtime**: the sandbox for the generated code. Exposes exactly
  `loadFlights(from, to)` and `generateChart({ data })`.
- **Data item**: `{ name, value }` — the only shape the chart understands.
- **Chart resource**: structured completion returning
  `{ type, message, code }`; `code` is what the runtime executes.

## Invariants

- The model never fetches data itself; everything enters through
  `loadFlights` (→ `FlightClient`).
- Zero values become 0.1 so every bar stays visible.

## Gotchas

- Re-rendered in an `afterRenderEffect`; every data change creates a new
  `Chart` on the same canvas.
- Regenerate re-runs the completion with the same prompt; it does not reuse
  the previous code.
