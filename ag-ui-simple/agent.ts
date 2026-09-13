import { AbstractAgent } from '@ag-ui/client';
import { BaseEvent, EventType, type RunAgentInput } from '@ag-ui/core';
import { Observable } from 'rxjs';

export class FlightWeatherAgent extends AbstractAgent {
  override run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((observer) => {
      const { threadId, runId } = input;

      observer.next({ type: EventType.RUN_STARTED, threadId, runId });
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
      observer.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: '1002',
        delta: 'to',
      });
      observer.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: '1002',
        delta: 'weather',
      });
      observer.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: '1002',
        delta: 'service...',
      });
      observer.next({ type: EventType.TEXT_MESSAGE_END, messageId: '1002' });

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
      observer.next({
        type: EventType.TOOL_CALL_START,
        toolCallId: '2002',
        toolCallName: 'showComponents',
      });
      observer.next({
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: '2002',
        delta: JSON.stringify({
          components: [{ name: 'weather', props: weatherResult }],
        }),
      });
      observer.next({ type: EventType.TOOL_CALL_END, toolCallId: '2002' });
      observer.next({ type: EventType.RUN_FINISHED, threadId, runId });
      observer.complete();
    });
  }
}
