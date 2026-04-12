# Flights42 with AG-UI

## Providing API Key and Selecting Model

For executing the example, you need an OpenAI API Key for GPT or a GOOGLE API Key for Gemini. Set it as an environment variable:

```bash
# Bash (MacOS, Linux, ...)
export OPENAI_API_KEY=...
export GOOGLE_GENERATIVE_AI_API_KEY=...
```

```bash
# CMD (Windows)
set OPENAI_API_KEY=...
set GOOGLE_GENERATIVE_AI_API_KEY=...
```

Also, in `ticketing-agent.ts` (`ai-server/src/mastra/agents/ticketing-agent.ts`), uncomment the line configuring GPT or Gemini:

```ts
// Uncomment one of them:

// model: 'openai/gpt-5.4',
// model: 'google/gemini-flash-latest',
```

### Starting and Running the Example

After `npm install`, you can start the server:

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
- Show me flights from Graz to Madrid
