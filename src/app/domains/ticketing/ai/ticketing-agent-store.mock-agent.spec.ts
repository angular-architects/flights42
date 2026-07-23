import { randomUUID } from '@ag-ui/client';
import { HttpAgent } from '@ag-ui/client';
import { type BaseEvent } from '@ag-ui/core';
import { type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type AgentStore,
  CopilotKit,
  injectAgentStore,
  provideCopilotKit,
} from '@copilotkit/angular';
import { Observable, of } from 'rxjs';

import { assistantTextRun } from '../../../testing/agui-mock';
import { sendMessage } from '../../shared/util-copilotkit/agent-store-helper';

const TICKETING_AGENT_ID = 'ticketingAgent';

class MockTicketingHttpAgent extends HttpAgent {
  constructor(private readonly cannedEvents: BaseEvent[]) {
    super({
      agentId: TICKETING_AGENT_ID,
      url: 'http://mock.invalid/never-called',
    });
  }

  override run(): Observable<BaseEvent> {
    return of(...this.cannedEvents);
  }
}

function provideTicketingStore(): Signal<AgentStore> {
  const copilotKit = TestBed.inject(CopilotKit);

  const events = assistantTextRun({
    threadId: randomUUID(),
    runId: randomUUID(),
    messageId: randomUUID(),
    text: 'I found three matching flights for you.',
  });

  const agent = new MockTicketingHttpAgent(events);

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [TICKETING_AGENT_ID]: agent,
    },
  });

  return TestBed.runInInjectionContext(() =>
    injectAgentStore(TICKETING_AGENT_ID),
  );
}

describe('ticketing-agent-store (mocked HttpAgent)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });
  });

  it('binds the store to the ticketing agent', () => {
    const store = provideTicketingStore();
    expect(store().agent.agentId).toBe(TICKETING_AGENT_ID);
  });

  it('adds the user message and the mocked assistant reply', async () => {
    const store = provideTicketingStore();
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Find flights from Paris to London');

    await vi.waitFor(() => {
      const messages = store().messages();
      const roles = messages.map((message) => message.role);
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
    });

    const assistant = store()
      .messages()
      .find((message) => message.role === 'assistant');
    expect(assistant?.content).toBe('I found three matching flights for you.');
  });

  it('toggles isRunning off once the run has finished', async () => {
    const store = provideTicketingStore();
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Find flights from Paris to London');

    await vi.waitFor(() => {
      expect(store().isRunning()).toBe(false);
    });
  });
});
