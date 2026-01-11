import {
  EnvironmentProviders,
  Injectable,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';

export abstract class LanguageService {
  abstract getUserLang(): string;
}

@Injectable()
export class DefaultLanguageService implements LanguageService {
  getUserLang(): string {
    return 'en (default)';
  }
}

@Injectable()
export class BrowserLanguageService implements LanguageService {
  getUserLang(): string {
    return navigator.language + ' (browser)';
  }
}

export type LanguageConfig = 'default' | 'browser';

export function provideLanguageService(
  config: LanguageConfig = 'default',
): Provider {
  if (config === 'browser') {
    return { provide: LanguageService, useClass: BrowserLanguageService };
  } else {
    return { provide: LanguageService, useClass: DefaultLanguageService };
  }
}

export function provideLanguageService2(
  config: LanguageConfig,
): EnvironmentProviders {
  if (config === 'browser') {
    return makeEnvironmentProviders([
      { provide: LanguageService, useClass: BrowserLanguageService },
    ]);
  } else {
    return makeEnvironmentProviders([
      { provide: LanguageService, useClass: DefaultLanguageService },
    ]);
  }
}
