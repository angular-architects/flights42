import { type AgentSubscriber, EventType } from '@ag-ui/client';
import { Component, EnvironmentInjector, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  type AgUiActionData,
  type AgUiChatMessage,
  type AgUiInterrupt,
  type AgUiRegisteredComponent,
  defineActionCard,
} from '../ag-ui-types';
import { runUntilSettled, type RunUntilSettledOptions } from './agents';
import { readMessages } from './messages';

@Component({ template: '' })
class DummyActionCard {
  readonly actionData = input.required<AgUiActionData>();
}

const dummyActionCard = defineActionCard({
  toolName: 'bookFlight',
  component: DummyActionCard,
});

type FakeAgent = RunUntilSettledOptions['agent'];

function fakeAgent(runs: ((subscriber: AgentSubscriber) => void)[]): FakeAgent {
  let call = 0;
  const agent = {
    messages: [] as unknown[],
    setMessages(messages: unknown[]) {
      agent.messages = messages;
    },
    async runAgentCompat(
      _parameters: unknown,
      subscriber?: AgentSubscriber,
    ): Promise<{ result: unknown; newMessages: unknown[] }> {
      runs[call]?.(subscriber!);
      call += 1;
      return { result: undefined, newMessages: [] };
    },
  };

  return agent as unknown as FakeAgent;
}

function actionWidgets(messages: AgUiChatMessage[]) {
  return messages.flatMap((message) =>
    message.widgets.filter((widget) => widget.kind === 'action'),
  );
}

describe('runUntilSettled interrupt/resume', () => {
  function baseOptions(
    agent: FakeAgent,
    runId: string,
  ): RunUntilSettledOptions {
    return {
      agent,
      tools: [],
      toolMap: new Map(),
      componentMap: new Map<string, AgUiRegisteredComponent>([
        [dummyActionCard.name, dummyActionCard],
      ]),
      activityRenderers: new Map(),
      environmentInjector: TestBed.inject(EnvironmentInjector),
      runId,
      interrupt: signal<AgUiInterrupt | null>(null),
      abortSignal: new AbortController().signal,
      messageStream: signal({ value: [] as AgUiChatMessage[] }),
      isLoading: signal(false),
      maxLocalTurns: 10,
    };
  }

  const interruptRun = (subscriber: AgentSubscriber) => {
    subscriber.onToolCallStartEvent?.({
      event: { toolCallId: 'tc1', toolCallName: 'bookFlight' },
    } as never);
    subscriber.onToolCallEndEvent?.({
      event: { toolCallId: 'tc1' },
      toolCallName: 'bookFlight',
      toolCallArgs: { flightId: 6 },
    } as never);
    subscriber.onRunFinishedEvent?.({
      event: {
        type: EventType.RUN_FINISHED,
        outcome: 'interrupt',
        interrupt: {
          id: 'int1',
          reason: 'Approval required',
          payload: {
            kind: 'approval',
            toolCallId: 'tc1',
            toolName: 'bookFlight',
            args: { flightId: 6 },
          },
        },
      },
    } as never);
  };

  const resumeRun = (subscriber: AgentSubscriber) => {
    subscriber.onToolCallResultEvent?.({
      event: {
        toolCallId: 'tc1',
        content: JSON.stringify({ ok: true, result: 'Booked' }),
      },
    } as never);
    subscriber.onRunFinishedEvent?.({
      event: { type: EventType.RUN_FINISHED },
    } as never);
  };

  it('tags the interrupt with the client run id', async () => {
    const options = baseOptions(fakeAgent([interruptRun]), 'run1');

    await runUntilSettled(options);

    expect(options.interrupt()?.clientRunId).toBe('run1');
    const widgets = actionWidgets(readMessages(options.messageStream()));
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { data: AgUiActionData }).data.status).toBe(
      'interrupt',
    );
  });

  it('updates the existing card when resuming under the interrupted run id', async () => {
    const agent = fakeAgent([interruptRun, resumeRun]);
    const options = baseOptions(agent, 'run1');

    await runUntilSettled(options);
    const activeInterrupt = options.interrupt();
    expect(activeInterrupt).not.toBeNull();

    // Mirrors resumeInterrupt: the resume run reuses the interrupted run's id.
    await runUntilSettled({
      ...options,
      runId: activeInterrupt!.clientRunId!,
      resume: { interruptId: activeInterrupt!.id, payload: { approved: true } },
    });

    const widgets = actionWidgets(readMessages(options.messageStream()));
    expect(widgets).toHaveLength(1);
    expect(widgets[0].id).toBe('run1:tc1-action');
    expect((widgets[0] as { data: AgUiActionData }).data.status).toBe(
      'complete',
    );
  });
});
