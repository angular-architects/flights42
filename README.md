# Flights42 with AG-UI

## Providing API Key and Selecting Model

For executing the example, you need an OpenAI API Key for GPT or a GOOGLE API Key for Gemini. Set it as an environment variable:

```bash
# Bash (MacOS, Linux, ...)
export OPENAI_API_KEY=...
```

```bash
# CMD (Windows)
set OPENAI_API_KEY=...
```

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
