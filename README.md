# Flights42 with AG-UI

## Providing API Key and Selecting Model

The example uses Gemma 4 (`@cf/google/gemma-4-26b-a4b-it`) on Cloudflare Workers AI. Copy `.env.example` to `.env` and set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. `MODEL_THINKING=true` turns Gemma's thinking on, `CLOUDFLARE_TEMPERATURE` sets the temperature.

### Starting and Running the Example

After `npm install`, you can start the MCP Server

```bash
npm run mcp-server
```

Start the Backend:

```bash
npm run ai-server
```

In a further terminal, start the client:

```bash
ng serve -o
```

### Trying out

1. In the app, switch to the `Booking`
2. Activate the Assistant (see button in bottom right corner)
3. Ask some questions

Ideas for questions:

- Did I already book for Paris?
- Show me hotel there
- Show me hotels in London

### Evaluation

With the ai-server running, `npm run eval` sends the typical prompts of all agents through the real agent stores and checks tool calls, plans and charts. `EVAL_RUNS` sets the runs per case (default 3), `EVAL_CASE` filters the cases by name and `EVAL_OUT` writes all traces to a JSON file.

## Mini-Applications

Besides the flight application, the repository contains small stand-alone
demos. Each one isolates a single concept and can be started on its own.

### AG-UI SDK Demo

Plain AG-UI SDK without an agent framework and without a language model: the
agent hardcodes its AG-UI events, the client logs every received event.
Deliberately without HTTP -- the client talks to the agent in-process, so the
focus stays on the messages:

```bash
npm run ag-ui-simple:client
```

A second agent demonstrates client-side tools: it requests the client tool
`showWeather` in its first run and answers with text once the client has sent
back the tool result:

```bash
npm run ag-ui-simple:client-tools
```

No API key and no server needed -- the agents emit prepared events. HTTP and
server-sent events come into play with the Mastra demo below.

### Mastra + AG-UI Demo

A real Mastra agent with a weather tool behind an AG-UI endpoint, plus a
command-line client. Needs an API key:

```bash
npm run ai-demo-server
npm run ai-demo-client          # or ai-demo-client:details to log every AG-UI event
```

The matching minimal Angular client with CopilotKit:

```bash
npm run simple-client
```
