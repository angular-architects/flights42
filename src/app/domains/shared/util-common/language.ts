import { Injectable, Provider } from '@angular/core';

export abstract class LanguageService {
  abstract getUserLang(): string;
}

@Injectable()
export class DefaultLanguageService implements LanguageService {
  getUserLang(): string {
    return 'en';
  }
}

@Injectable()
export class BrowserLanguageService implements LanguageService {
  getUserLang(): string {
    return navigator.language;
  }
}

export type LanguageConfig = 'default' | 'browser';

export function provideLanguageService(
  config: LanguageConfig = 'default',
): Provider[] {
  if (config === 'browser') {
    return [{ provide: LanguageService, useClass: BrowserLanguageService }];
  } else {
    return [{ provide: LanguageService, useClass: DefaultLanguageService }];
  }
}
