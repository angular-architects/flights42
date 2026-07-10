import { Injectable, InjectionToken } from '@angular/core';

import { LogLevel } from './log-level';

export abstract class LogAppender {
  abstract append(level: LogLevel, category: string, msg: string): void;
}

@Injectable()
export class DefaultLogAppender implements LogAppender {
  append(level: LogLevel, category: string, msg: string): void {
    console.log(msg);
  }
}

export const LOG_APPENDERS = new InjectionToken<LogAppender[]>('LOG_APPENDERS');
