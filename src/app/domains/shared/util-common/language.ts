import { inject, Injectable, REQUEST } from '@angular/core';

export abstract class LanguageDetector {
  abstract getUserLang(): string;
}

@Injectable()
export class ServerLanguageDetector implements LanguageDetector {
  private request = inject(REQUEST);
  getUserLang(): string {
    return this.request?.headers.get('accept-language') ?? 'en';
  }
}

@Injectable()
export class ClientLanguageDetector {
  getUserLang(): string {
    return navigator.language;
  }
}
