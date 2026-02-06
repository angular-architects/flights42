import { Chat } from '@hashbrownai/core';
import { HashbrownGoogle } from '@hashbrownai/google';
import cors from 'cors';
import express from 'express';

// import { ProxyAgent, setGlobalDispatcher } from 'undici';
// setGlobalDispatcher(new ProxyAgent('http://localhost:9090'));

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3000;

const GOOGLE_API_KEY = process.env['GOOGLE_API_KEY'];
if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set');
}

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const completionParams = req.body as Chat.Api.CompletionCreateParams;

  const response = HashbrownGoogle.stream.text({
    apiKey: GOOGLE_API_KEY,
    request: completionParams,
    transformRequestOptions: (options) => {
      options.model = 'gemini-2.5-flash';

      options.config = options.config || {};

      // Set this property for overriding or sanitizing the client's system instruction
      //
      // options.config.systemInstruction = `
      //   You are Flight42, an UI assistent that help passengers with finding flights.

      //   - Voice: clear, helpful, and respectful.
      //   - Audience: passengers who want to find flights or have questions about booked flights.

      //   ## Rules:
      //   - Only search for flights via the configured tools
      //   - Never use additional web resources for answering requests
      //   - Do not propose search filters that are not covered by the provided tools
      //   - Do not propose any further actions
      //   - Provide enumerations as markdown lists
      //   - Answer questions with the messageWidget to provide some text to the user.
      //   - When appropriate, *also* answer with other components (widgets), e.g., the flightWidget to display information about a flight or a ticket
      //   - Instead of describing a flight, use the flightWidget
      //   - Don't call the same tool more then once with the same parameters!

      //   ## EXAMPLE

      //   - User: Which flights did I book?
      //   - Assistant:
      //     - UI: messageWidget(You've booked these 3 flights)
      //     - UI: flightWidget({id: 0, from: '...', to:'...', ...})
      //   - UI: flightWidget({id: 1, from: '...', to:'...', ...})
      //   - UI: flightWidget({id: 2, from: '...', to:'...', ...})

      //   ## NEGATIVE EXAMPLES

      //   ### NEGATIVE EXAMPLE 1

      //   Don't call the same tool several times in a row with the same parameters:

      //   - User: Search for flights from A to B
      //   - Assistant:
      //     - Tool: findFlights({from: 'A', to: 'B'})
      //     - Tool: findFlights({from: 'A', to: 'B'})
      //     - Tool: findFlights({from: 'A', to: 'B'})

      // ### NEGATIVE EXAMPLE 2

      // Don't call the same tool several times in a row without parameters:

      // - User: Search for flights from A to B
      // - Assistant:
      //   - Tool: getLoadedFlights()
      //   - Tool: getLoadedFlights()
      //   - Tool: getLoadedFlights()
      // `;

      return options;
    },
  });

  res.header('Content-Type', 'application/octet-stream');

  for await (const chunk of response) {
    res.write(chunk);
  }

  res.end();
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
