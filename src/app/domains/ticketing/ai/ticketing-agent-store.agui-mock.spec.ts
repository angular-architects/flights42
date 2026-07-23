import { randomUUID } from '@ag-ui/client';
import { type RunAgentInput } from '@ag-ui/core';
import { type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type AgentStore,
  CopilotKit,
  injectAgentStore,
  provideCopilotKit,
} from '@copilotkit/angular';

import { aguiSseResponse, assistantTextRun } from '../../../testing/agui-mock';
import { sendMessage } from '../../shared/util-copilotkit/agent-store-helper';
import { AppHttpAgent } from '../../shared/util-copilotkit/app-http-agent';

const TICKETING_AGENT_ID = 'ticketingAgent';
const AG_UI_URL = 'http://localhost:3001/ag-ui/ticketingAgent';

interface AguiMock {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  lastInput: () => RunAgentInput | undefined;
  reply: string;
}

function createAguiMock(reply: string): AguiMock {
  let lastInput: RunAgentInput | undefined;

  const fetchFn = async (
    _url: string,
    init: RequestInit,
  ): Promise<Response> => {
    lastInput = JSON.parse(init.body as string) as RunAgentInput;

    const events = assistantTextRun({
      threadId: lastInput.threadId,
      runId: lastInput.runId,
      messageId: randomUUID(),
      text: reply,
    });

    return aguiSseResponse(events);
  };

  return { fetch: fetchFn, lastInput: () => lastInput, reply };
}

function provideTicketingStore(mock: AguiMock): Signal<AgentStore> {
  const copilotKit = TestBed.inject(CopilotKit);

  const agent = new AppHttpAgent({
    agentId: TICKETING_AGENT_ID,
    url: AG_UI_URL,
    threadId: randomUUID(),
    fetch: mock.fetch,
  });

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

describe('ticketing-agent-store (mocked AG-UI communication)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });
  });

  it('decodes the assistant reply streamed as AG-UI SSE events', async () => {
    const mock = createAguiMock('Here are the flights I found.');
    const store = provideTicketingStore(mock);
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Find flights from Paris to London');

    await vi.waitFor(() => {
      const assistant = store()
        .messages()
        .find((message) => message.role === 'assistant');
      expect(assistant?.content).toBe('Here are the flights I found.');
    });
  });

  it('posts a well-formed AG-UI RunAgentInput carrying the user message', async () => {
    const mock = createAguiMock('Here are the flights I found.');
    const store = provideTicketingStore(mock);
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Find flights from Paris to London');

    await vi.waitFor(() => {
      expect(mock.lastInput()).toBeDefined();
    });

    const input = mock.lastInput()!;
    expect(input.threadId).toBeTruthy();
    expect(input.runId).toBeTruthy();

    const userMessage = input.messages.find(
      (message) => message.role === 'user',
    );
    expect(userMessage?.content).toBe('Find flights from Paris to London');
  });
});
