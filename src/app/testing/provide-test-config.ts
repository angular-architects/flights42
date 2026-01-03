import { Provider } from '@angular/core';

import { Config, ConfigService } from '../shared/config-service';

export function provideTestConfig(): Provider {
  const testConfig: Config = {
    baseUrl: '',
  };
  return {
    provide: ConfigService,
    useValue: testConfig,
  };
}
