# Flights42

## Starting the Client

```bash
ng serve -o
```

## Trying out the AI Assistant

1. Set the env variable `GOOGLE_API_KEY` or `OPENAI_API_KEY` to the API key you've got from your AI provider.
2. Start `server-google.ts` or `server-openai.ts`:

   ```bash
   npx tsx server-google.ts

   # or
   npx tsx server-openai.ts
   ```

3. Define model to use in your `config.ts`
4. Start Angular solution: `ng serve -o`
