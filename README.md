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
