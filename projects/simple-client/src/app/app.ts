import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CopilotChat } from '@copilotkit/angular';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CopilotChat],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
