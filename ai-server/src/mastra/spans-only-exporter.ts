import { MastraStorageExporter } from '@mastra/observability';

export class SpansOnlyExporter extends MastraStorageExporter {
  override async onMetricEvent(): Promise<void> {
    return;
  }
}
