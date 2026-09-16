# Reporting

Reporting lets a power user describe a chart in natural language. The
assistant ("Report42") writes JavaScript that loads flights and hands
aggregated name/value pairs to a bar chart.

## Language

- **Report prompt**: the user's natural-language request; `example-prompts`
  holds ready-made ones.
- **Charting runtime**: the sandboxed JavaScript runtime the generated code
  runs in. It exposes exactly two functions: `loadFlights(from, to)` and
  `generateChart({ data })`.
- **Data item**: `{ name, value }` — the only shape the chart understands.
- **Chart resource**: the structured completion that returns
  `{ type, message, code }`; `code` is what the runtime executes.

## Invariants

- The model never fetches data itself; all flight data enters through
  `loadFlights`, which delegates to `FlightClient`.
- Zero values are replaced by 0.1 so that every bar stays visible.

## Gotchas

- The chart is re-rendered in an `afterRenderEffect`; every data change
  creates a new `Chart` instance on the same canvas.
- Regenerate re-runs the completion with the same prompt; it does not reuse
  the previous code.
