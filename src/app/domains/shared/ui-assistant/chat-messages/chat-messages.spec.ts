import {
  type AgUiInterrupt,
  type AgUiResumePayload,
} from '@agentic-angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMarkdown } from 'ngx-markdown';

import { ChatMessages } from './chat-messages';

function interrupt(suspendPayload?: unknown): AgUiInterrupt {
  return {
    id: 'i1',
    reason: 'approval',
    payload: {
      kind: 'approval',
      toolCallId: 'tc1',
      toolName: 'bookFlight',
      args: {},
      suspendPayload,
    },
  };
}

describe('ChatMessages', () => {
  let fixture: ComponentFixture<ChatMessages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMessages],
      providers: [provideMarkdown()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatMessages);
    fixture.componentRef.setInput('messages', []);
  });

  function approvalButtons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.approval-actions button',
      ),
    );
  }

  it('falls back to generic Reject/Approve options', () => {
    fixture.componentRef.setInput('interrupt', interrupt());
    fixture.detectChanges();

    const buttons = approvalButtons();
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Reject',
      'Approve',
    ]);

    const emitted: AgUiResumePayload[] = [];
    fixture.componentInstance.resumeInterrupt.subscribe((payload) =>
      emitted.push(payload),
    );
    buttons[1].click();
    expect(emitted).toEqual([{ approved: true }]);
  });

  it('renders the options supplied by the suspended tool', () => {
    fixture.componentRef.setInput(
      'interrupt',
      interrupt({
        message: 'Pick a payment method',
        options: [
          {
            id: 'cc',
            label: 'Credit card',
            payload: { selection: 'creditCard' },
            variant: 'primary',
          },
          {
            id: 'cancel',
            label: 'Cancel',
            payload: { selection: 'cancel' },
            variant: 'danger',
          },
        ],
      }),
    );
    fixture.detectChanges();

    const buttons = approvalButtons();
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Credit card',
      'Cancel',
    ]);
    expect(buttons[0].className).toContain('btn-primary');
    expect(buttons[1].className).toContain('btn-danger');
  });

  it('shows no approval actions without an interrupt', () => {
    fixture.detectChanges();

    expect(approvalButtons()).toEqual([]);
  });
});
