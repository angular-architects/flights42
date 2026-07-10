import { inject, Injectable } from '@angular/core';

import { LogFormatter } from './log-formatter';
import { LogLevel } from './log-level';
import { LoggerConfig } from './logger-config';

@Injectable()
export class LoggerService {
  private formatter = inject(LogFormatter);
  private config = inject(LoggerConfig);

  log(level: LogLevel, category: string, msg: string): void {
    if (level < this.config.level) {
      return;
    }

    const formatted = this.formatter.format(level, category, msg);

    console.log(formatted);
  }

  error(category: string, msg: string): void {
    this.log(LogLevel.ERROR, category, msg);
  }

  info(category: string, msg: string): void {
    this.log(LogLevel.INFO, category, msg);
  }

  debug(category: string, msg: string): void {
    this.log(LogLevel.DEBUG, category, msg);
  }
}
