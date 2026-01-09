import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { DataTable } from '../../domains/shared/ui-common/advanced-data-table/advanced-data-table';
import { ClickWithWarningDirective } from '../../domains/shared/ui-common/click-with-warning.directive';
import { TableFieldDirective } from '../../domains/shared/ui-common/data-table/table-field.directive';
import { Tab } from '../../domains/shared/ui-common/service-tabbed-pane/tab';
import { TabbedPane } from '../../domains/shared/ui-common/service-tabbed-pane/tabbed-pane';
import { SimpleTooltipDirective } from '../../domains/shared/ui-common/simple-tooltip.directive';
import { TooltipDirective } from '../../domains/shared/ui-common/tooltip.directive';
import { DialogOutlet } from '../../domains/shared/ui-common/dialog/dialog-outlet';
import { DialogService } from '../../domains/shared/ui-common/dialog/dialog.service';
import { DemoDialog } from '../../domains/shared/ui-common/dialog/demo-dialog';
import { Flight } from '../../domains/ticketing/data/flight';

@Component({
  selector: 'app-about',
  imports: [
    Tab,
    TabbedPane,
    ClickWithWarningDirective,
    TooltipDirective,
    SimpleTooltipDirective,
    TableFieldDirective,
    DatePipe,
    DataTable,
    DialogOutlet,
  ],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private readonly dialogService = inject(DialogService);

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

  showDialog(): void {
    this.dialogService.show(DemoDialog, 'Hello from About Component!');
  }
}
