import { type AgUiChatResourceRef } from '@agentic-angular/core';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { ConfigService } from '../../shared/util-common/config-service';
import { activateTicketingChat } from './activate-ticketing-chat.guard';

const plannerChat = {} as AgUiChatResourceRef;

@Component({ template: '' })
class BookingStub {}

/** Mirrors TravelPlannerPage: registers its own chat while it is active. */
@Component({ template: '' })
class PlannerStub {
  constructor() {
    inject(ChatRegistry).setChat(plannerChat, 'Refine your plan?', false);
  }
}

describe('activateTicketingChat', () => {
  let registry: ChatRegistry;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'booking',
            component: BookingStub,
            canActivate: [activateTicketingChat],
          },
          { path: 'planner', component: PlannerStub },
        ]),
        {
          provide: ConfigService,
          useValue: { agUiUrl: 'http://localhost/agent', model: '' },
        },
      ],
    });

    registry = TestBed.inject(ChatRegistry);
    harness = await RouterTestingHarness.create();
  });

  it('registers the ticketing chat when the booking route activates', async () => {
    await harness.navigateByUrl('/booking');

    expect(registry.chat).not.toBeNull();
  });

  it('re-registers the ticketing chat when coming back from another page', async () => {
    await harness.navigateByUrl('/booking');
    const ticketingChat = registry.chat;

    await harness.navigateByUrl('/planner');
    expect(registry.chat).toBe(plannerChat);

    await harness.navigateByUrl('/booking');
    // Same instance, so the conversation survives the round trip.
    expect(registry.chat).toBe(ticketingChat);
  });
});
