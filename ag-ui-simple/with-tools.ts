import { type AgentSubscriber, randomUUID } from '@ag-ui/client';

import { showWeatherTool, type Weather } from './show-weather-tool.js';
import { title } from './utils.js';
import { WeatherToolAgent } from './weather-tool-agent.js';

const threadId = '4711';

// Deliberately without HTTP - see the comment in index.ts.
const agent = new WeatherToolAgent({ threadId });

let pendingCall: { id: string; args: Weather } | undefined;

const subscriber: AgentSubscriber = {
  onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
    console.log(`${title('▶ TOOL_CALL')} ${toolCallName}`);
    if (toolCallName === showWeatherTool.name) {
      pendingCall = { id: event.toolCallId, args: toolCallArgs as Weather };
    }
  },
  onTextMessageContentEvent: ({ event }) => {
    console.log(`${title('▶ TEXT')} ${event.delta}`);
  },
};

/** The client-side tool itself: an ordinary function. */
function showWeather(weather: Weather): { shown: boolean } {
  console.log(
    `${title('WEATHER')} ${weather.condition}, ` +
      `${weather.temperature}, wind: ${weather.wind}`,
  );

  return { shown: true };
}

async function main(): Promise<void> {
  agent.addMessage({
    id: randomUUID(),
    role: 'user',
    content: 'What is the flight weather in Frankfurt?',
  });

  // 1st run: announce the client tool, so the agent knows it can be called.
  await agent.runAgent(
    { runId: randomUUID(), tools: [showWeatherTool] },
    subscriber,
  );

  if (!pendingCall) {
    console.log('The agent did not request a client-side tool.');
    return;
  }

  // Execute the requested tool and add its result to the conversation.
  const result = showWeather(pendingCall.args);

  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    toolCallId: pendingCall.id,
    content: JSON.stringify(result),
  });

  // 2nd run: hand the result back, so the agent can continue its work.
  await agent.runAgent(
    { runId: randomUUID(), tools: [showWeatherTool] },
    subscriber,
  );
}

main().catch((err) => console.error('Agent error:', err));
