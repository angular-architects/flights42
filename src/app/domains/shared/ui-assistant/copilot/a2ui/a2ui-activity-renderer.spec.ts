import { provideMarkdownRenderer } from '@a2ui/angular/v0_9';
import { NgComponentOutlet } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideA2uiCatalog } from '../../../util-copilotkit/a2ui/provide-a2ui-catalog';
import { A2uiActivityRenderer } from './a2ui-activity-renderer';

const BASIC_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/basic_catalog.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inputsFor(id: string): Record<string, any> {
  const content = {
    operations: [
      {
        version: 'v0.9',
        createSurface: { surfaceId: id, catalogId: BASIC_CATALOG_ID },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: id,
          components: [
            { id: 'root', component: 'Column', children: ['t'] },
            { id: 't', component: 'Text', text: `hi ${id}` },
          ],
        },
      },
    ],
  };
  return {
    activityType: 'a2ui-surface',
    content,
    message: { id, role: 'activity', activityType: 'a2ui-surface', content },
    agent: undefined,
  };
}

// Mirrors CopilotActivity: renders A2uiActivityRenderer via `ngComponentOutlet`
// with dynamic `inputs`, one per activity message, appended reactively.
@Component({
  imports: [NgComponentOutlet],
  template: `
    @for (it of items(); track it.id) {
      <ng-container *ngComponentOutlet="renderer; inputs: it.inputs" />
    }
  `,
})
class HostComponent {
  readonly renderer = A2uiActivityRenderer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly items = signal<{ id: string; inputs: Record<string, any> }[]>([]);
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

describe('A2uiActivityRenderer', () => {
  it('renders a SECOND A2UI surface appended after the first (via ngComponentOutlet)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideA2uiCatalog(),
        provideMarkdownRenderer(async (markdown) => markdown),
      ],
    });

    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;

    host.items.set([{ id: 'surf-1', inputs: inputsFor('surf-1') }]);
    fixture.detectChanges();
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('hi surf-1');

    host.items.update((current) => [
      ...current,
      { id: 'surf-2', inputs: inputsFor('surf-2') },
    ]);
    fixture.detectChanges();
    await settle(fixture);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('hi surf-1');
    expect(text).toContain('hi surf-2'); // the second table must also render
  });
});
