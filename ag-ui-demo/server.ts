import { AbstractAgent } from '@ag-ui/client';
import { type BaseEvent, EventType, type RunAgentInput } from '@ag-ui/core';
import { Observable } from 'rxjs';

// ─── Dummy Agent ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class FlightWeatherAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((observer) => {
      (async () => {
        const { threadId, runId } = input;

        observer.next({ type: EventType.RUN_STARTED, threadId, runId });
        await sleep(200);

        // Message 1
        observer.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId: '1001',
          role: 'assistant',
        });
        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1001',
          delta: 'Checking flight weather for Frankfurt...',
        });
        observer.next({ type: EventType.TEXT_MESSAGE_END, messageId: '1001' });
        await sleep(300);

        // Message 2
        observer.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId: '1002',
          role: 'assistant',
        });

        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1002',
          delta: 'Connecting',
        });

        await sleep(300);

        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1002',
          delta: 'to',
        });

        await sleep(300);

        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1002',
          delta: 'weather',
        });

        await sleep(300);

        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1002',
          delta: 'service...',
        });

        await sleep(300);

        observer.next({ type: EventType.TEXT_MESSAGE_END, messageId: '1002' });
        await sleep(300);

        // Server-side tool call: loadFlightWeather
        observer.next({
          type: EventType.TOOL_CALL_START,
          toolCallId: '2001',
          toolCallName: 'loadFlightWeather',
        });
        observer.next({
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: '2001',
          delta: '{"city":"Frankfurt"}',
        });
        observer.next({ type: EventType.TOOL_CALL_END, toolCallId: '2001' });
        await sleep(500);

        const weatherResult = {
          condition: 'Sunny',
          temperature: '18° C',
          wind: 'no wind',
        };

        observer.next({
          type: EventType.TOOL_CALL_RESULT,
          toolCallId: '2001',
          messageId: '3001',
          role: 'tool',
          content: JSON.stringify(weatherResult),
        });
        await sleep(300);

        // Client-side tool call: showComponents
        const showComponentsArgs = {
          components: [{ name: 'weather', props: weatherResult }],
        };

        observer.next({
          type: EventType.TOOL_CALL_START,
          toolCallId: '2002',
          toolCallName: 'showComponents',
        });
        observer.next({
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: '2002',
          delta: JSON.stringify(showComponentsArgs),
        });
        observer.next({ type: EventType.TOOL_CALL_END, toolCallId: '2002' });
        await sleep(200);

        observer.next({ type: EventType.RUN_FINISHED, threadId, runId });
        observer.complete();
      })().catch((err) => observer.error(err));
    });
  }
}

export { FlightWeatherAgent };
