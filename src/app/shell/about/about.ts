<<<<<<< HEAD
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

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
=======
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
>>>>>>> 8f53c36 (feat: clean up about component)
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {}
