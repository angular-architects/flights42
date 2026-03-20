import { Provider } from '@angular/core';

import { ConfigService } from '../domains/shared/util-common/config-service';

export function provideTestConfig(): Provider {
  return {
    provide: ConfigService,
    useValue: {
      baseUrl: '',
      model: '',
    },
  };
}
