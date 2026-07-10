import { inject, Injectable } from '@angular/core';

import { LOG_APPENDERS } from './log-appender';
import { LOG_FORMATTER } from './log-formatter';
import { LogLevel } from './log-level';
import { LoggerConfig } from './logger-config';

@Injectable()
export class LoggerService {
  private formatter = inject(LOG_FORMATTER);
  private config = inject(LoggerConfig);
  private appenders = inject(LOG_APPENDERS);

  private parentLogger = inject(LoggerService, {
    optional: true,
    skipSelf: true,
  });

  log(level: LogLevel, category: string, msg: string): void {
    if (level < this.config.level) {
      return;
    }

    const formatted = this.formatter(level, category, msg);

    for (const a of this.appenders) {
      a.append(level, category, formatted);
    }

    if (this.parentLogger) {
      this.parentLogger.log(level, category, msg);
    }
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
