import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Tab } from '../../domains/shared/ui-common/service-tabbed-pane/tab';
import { TabbedPane } from '../../domains/shared/ui-common/service-tabbed-pane/tabbed-pane';

@Component({
  selector: 'app-about',
  imports: [Tab, TabbedPane],
  templateUrl: './about.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {}
