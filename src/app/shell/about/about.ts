import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

import { DataTable } from '../../domains/shared/ui-common/advanced-data-table/advanced-data-table';
import { ClickWithWarning } from '../../domains/shared/ui-common/click-with-warning';
import { TableField } from '../../domains/shared/ui-common/data-table/table-field';
import { DialogService } from '../../domains/shared/ui-common/dialog/dialog.service';
import { Tab } from '../../domains/shared/ui-common/service-tabbed-pane/tab';
import { TabbedPane } from '../../domains/shared/ui-common/service-tabbed-pane/tabbed-pane';
import { SimpleTooltip } from '../../domains/shared/ui-common/simple-tooltip';
import { Tooltip } from '../../domains/shared/ui-common/tooltip';
import { Flight } from '../../domains/ticketing/data/flight';
import { DemoDialog } from './demo-dialog';

@Component({
  selector: 'app-about',
  imports: [
    Tab,
    TabbedPane,
    ClickWithWarning,
    Tooltip,
    SimpleTooltip,
    TableField,
    DatePipe,
    DataTable,
  ],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private readonly dialogService = inject(DialogService);

  protected readonly vcRef = viewChild('vcRef', { read: ViewContainerRef });

  constructor() {
    afterNextRender(() => {
      const ref = this.vcRef();
      if (ref) {
        loadRemoteModule('miles', './Miles').then((esm) => {
          ref.createComponent(esm.default);
        });
      }
    });
  }

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

  protected deleteAll(): void {
    console.debug('delete ...');
  }

  protected showDialog(): void {
    this.dialogService.show(DemoDialog, 'Hello from About Component!');
  }
}
