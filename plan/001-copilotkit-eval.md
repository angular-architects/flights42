# Evaluate Copilotkit for Clientcode in flights project

Evaluate the use of the npm package `@copilotkit/angular` for the client code in the project flights. Write a simple mini article on this with code examples from the client dev's perspective and put it into `docs/copilot-eval.md`

- Can we replace `libs/ag-ui-client` by `@copilotkit/angular`?
- Whan can not be replaced?
- How would the code for a typical use case such as the ticketing chat look like?
- What can not be replaced and how can we a) provide these aspects and b) integrate them with `@copilotkit/angular`?
- What are the consequences of such a migration?

## References

- see `docs/client-tools-and-components.md`
- see the readme and the entire library implementation in the official [github repo](https://github.com/CopilotKit/CopilotKit/tree/main/packages/angular)

## Remarks

- `@copilotkit/angular` has an A2UI integration
- `@copilotkit/angular` DOES NOT HAVE an MCP Apps integration
  - But we could register something similar to our current `McpAppsWidgetComponent` using `registerFrontendTool`
- It seems like Action Cards can be implemented via `registerRenderToolCall`
- For displaying approval requests, options and further interruptions, it looks like we can leverage `registerHumanInTheLoop`
