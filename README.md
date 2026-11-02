# Flights42 with Gemma 4

All agents run on Gemma 4 26B A4B (`@cf/google/gemma-4-26b-a4b-it`) on Cloudflare Workers AI.

## Setup

```bash
cp .env.example .env
npm install
```

In `.env`, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

## Run

Each in its own terminal:

```bash
npm run mcp-server
npm run ai-server
npm start
```

Open http://localhost:4200.
