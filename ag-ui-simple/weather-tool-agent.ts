import { AbstractAgent } from '@ag-ui/client';
import { BaseEvent, EventType, type RunAgentInput } from '@ag-ui/core';
import { Observable } from 'rxjs';

const TOOL_CALL_ID = '2001';

/**
 * Variant of the FlightWeatherAgent that works with a client-side tool.
 *
 * First run:  requests the client tool `showWeather`.
 * Second run: the client has executed the tool and sent back its result,
 *             so the agent can answer with a closing text message.
 */
export class WeatherToolAgent extends AbstractAgent {
  override run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((observer) => {
      const { threadId, runId } = input;

      // This is what the client announced about its tools.
      console.log('tools', input.tools);

      observer.next({ type: EventType.RUN_STARTED, threadId, runId });

      const toolResult = findToolResult(input, TOOL_CALL_ID);

      if (!toolResult) {
        observer.next({
          type: EventType.TOOL_CALL_START,
          toolCallId: TOOL_CALL_ID,
          toolCallName: 'showWeather',
        });
        observer.next({
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: TOOL_CALL_ID,
          delta: JSON.stringify({
            condition: 'Sunny',
            temperature: '18° C',
            wind: 'no wind',
          }),
        });
        observer.next({
          type: EventType.TOOL_CALL_END,
          toolCallId: TOOL_CALL_ID,
        });
      } else {
        observer.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId: '1001',
          role: 'assistant',
        });
        observer.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: '1001',
          delta: `The client rendered the weather: ${toolResult}`,
        });
        observer.next({ type: EventType.TEXT_MESSAGE_END, messageId: '1001' });
      }

      observer.next({ type: EventType.RUN_FINISHED, threadId, runId });
      observer.complete();
    });
  }
}

function findToolResult(
  input: RunAgentInput,
  toolCallId: string,
): string | undefined {
  for (const message of input.messages) {
    if (message.role === 'tool' && message.toolCallId === toolCallId) {
      return message.content;
    }
  }

  return undefined;
}
