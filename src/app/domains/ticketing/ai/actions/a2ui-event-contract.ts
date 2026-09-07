import { type Context } from '@ag-ui/core';

export const a2uiEventContract: Context = {
  description: 'A2UI client event contract',
  value: `
Interactive components work ONLY through a Button "action.event", and the
client reacts to exactly TWO event names. Never invent other event names.
- "checkIn": a Button that checks the passenger into ONE booked flight. Its
  context MUST contain the numeric "flightId":
  { "action": { "event": { "name": "checkIn", "context": { "flightId": 42 } } } }
- "submitAnswer": the submit Button of a form. Bind every input's "value" to a
  path (e.g. { "path": "/form/from" }), seed those paths in "data" (e.g.
  { "form": { "from": "", "to": "" } }) and reference the SAME paths in the
  button context so the typed values are sent:
  { "action": { "event": { "name": "submitAnswer",
      "context": { "from": { "path": "/form/from" }, "to": { "path": "/form/to" } } } } }
Never put literal values into a submitAnswer context.
`.trim(),
};
