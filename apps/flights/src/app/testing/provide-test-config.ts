import { Provider } from '@angular/core';

import {
  Config,
  ConfigService,
} from '../domains/shared/util-common/config-service';

export function provideTestConfig(): Provider {
  const testConfig: Config = {
    baseUrl: '',
    model: '',
  };
  return {
    provide: ConfigService,
    useValue: testConfig,
  };
}
