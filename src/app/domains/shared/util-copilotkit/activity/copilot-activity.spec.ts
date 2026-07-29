import {
  A2uiRendererService,
  provideMarkdownRenderer,
} from '@a2ui/angular/v0_9';
import type { ActivityMessage } from '@ag-ui/client';
import { Component, ErrorHandler, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCopilotKit } from '@copilotkit/angular';

import { a2uiActivityRendererConfig } from '../a2ui/a2ui-activity-renderer';
import { provideA2uiCatalog } from '../a2ui/provide-a2ui-catalog';
import { CopilotActivity } from './copilot-activity';

const BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

function updateComponents(surfaceId: string, text: string) {
  return {
    version: 'v0.9',
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['t'] },
        { id: 't', component: 'Text', text },
      ],
    },
  };
}

function surfaceMessage(surfaceId: string, ...texts: string[]) {
  return {
    id: surfaceId,
    role: 'activity' as const,
    activityType: 'a2ui-surface',
    content: {
      operations: [
        {
          version: 'v0.9',
          createSurface: { surfaceId, catalogId: BASIC_CATALOG_ID },
        },
        ...texts.map((text) => updateComponents(surfaceId, text)),
      ],
    },
  };
}

@Component({
  imports: [CopilotActivity],
  template: `
    <app-copilot-activity [message]="message()" [agentId]="'test-agent'" />
  `,
})
class HostComponent {
  readonly message = signal<ActivityMessage>(
    surfaceMessage('surf-1', 'hi surf-1'),
  );
}

async function settle(fixture: {
  whenStable: () => Promise<unknown>;
  detectChanges: () => void;
}) {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 30));
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('CopilotActivity', () => {
  let errors: unknown[];

  beforeEach(() => {
    errors = [];
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({
          renderActivityMessages: [a2uiActivityRendererConfig],
        }),
        provideA2uiCatalog(),
        provideMarkdownRenderer(async (markdown) => markdown),
        {
          provide: ErrorHandler,
          useValue: { handleError: (error: unknown) => errors.push(error) },
        },
      ],
    });
  });

  it('re-delivers a cloned message without re-applying its operations', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;

    fixture.detectChanges();
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('hi surf-1');

    host.message.update((message) => structuredClone(message));
    fixture.detectChanges();
    await settle(fixture);

    expect(errors).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('hi surf-1');
  });

  it('builds a surface once: later snapshots for it are not applied', async () => {
    const renderer = TestBed.inject(A2uiRendererService);
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;

    fixture.detectChanges();
    await settle(fixture);

    host.message.set(surfaceMessage('surf-1', 'hi surf-1', 'updated surf-1'));
    fixture.detectChanges();
    await settle(fixture);

    expect(errors).toEqual([]);
    expect(renderer.surfaceGroup.getSurface('surf-1')).toBeDefined();
    expect(fixture.nativeElement.textContent).toContain('hi surf-1');
  });

  it('builds a new surface when the activity carries a different one', async () => {
    const renderer = TestBed.inject(A2uiRendererService);
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;

    fixture.detectChanges();
    await settle(fixture);

    host.message.set(surfaceMessage('surf-2', 'hi surf-2'));
    fixture.detectChanges();
    await settle(fixture);

    expect(errors).toEqual([]);
    expect(renderer.surfaceGroup.getSurface('surf-2')).toBeDefined();
    expect(renderer.surfaceGroup.getSurface('surf-1')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('hi surf-2');
  });
});
