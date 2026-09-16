---
status: draft
---

# Show the total weight of the selected luggage

## Story

As ground staff I want to see the summed weight of the luggage items I
selected in the luggage overview, so that I can compare it with the loading
limit without a calculator.

## Scope

- Luggage overview only.
- No backend change; `LuggageClient` keeps serving demo data.

## Acceptance criteria

- The overview shows a line "Selected: <n> items, <x> kg" above the list.
- The line updates on every selection change.
- The weight is shown with one decimal.
- With nothing selected the line reads "No luggage selected".
