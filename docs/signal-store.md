# Signal Store

- If possible, place new Signal Stores on the feature level
- If the store is needed in further feature pull it down to a lower level
- If the store is needed by different domains, ask the user before moving it to shared

- Use the following Features from the NgRx Toolkit
  - withResource
  - withMutations
  - withDevtools

- Use the FlightStore as a role model

- Only smart components are allowed to use stores
- Smart Components use the following suffixes: Page, Search, Detail, Edit (e.g. FlightSearch, FlightEdit)
