import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { DataTable } from '../../domains/shared/ui-common/advanced-data-table/advanced-data-table';
import { ClickWithWarningDirective } from '../../domains/shared/ui-common/click-with-warning.directive';
import { TableFieldDirective } from '../../domains/shared/ui-common/data-table/table-field.directive';
import { Tab } from '../../domains/shared/ui-common/service-tabbed-pane/tab';
import { TabbedPane } from '../../domains/shared/ui-common/service-tabbed-pane/tabbed-pane';
import { TooltipDirective } from '../../domains/shared/ui-common/tooltip.directive';
import { Flight } from '../../domains/ticketing/data/flight';

@Component({
  selector: 'app-about',
  imports: [
    Tab,
    TabbedPane,
    ClickWithWarningDirective,
    TooltipDirective,
    TableFieldDirective,
    DatePipe,
    DataTable,
  ],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected readonly flights = signal<Flight[]>([
    {
      id: 1,
      from: 'Hamburg',
      to: 'Berlin',
      date: '2025-02-01T17:00+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'A320', registration: 'D-AIUA' },
      prices: [],
    },
    {
      id: 2,
      from: 'Hamburg',
      to: 'Frankfurt',
      date: '2025-02-01T17:30+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'B737', registration: 'D-ABKA' },
      prices: [],
    },
    {
      id: 3,
      from: 'Hamburg',
      to: 'Mallorca',
      date: '2025-02-01T17:45+01:00',
      delayed: false,
      delay: 0,
      aircraft: { type: 'A321', registration: 'D-AISN' },
      prices: [],
    },
  ]);

  deleteAll(): void {
    console.debug('delete ...');
  }
}
