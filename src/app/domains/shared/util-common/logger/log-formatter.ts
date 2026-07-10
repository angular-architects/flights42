import { Injectable } from '@angular/core';

import { LogLevel } from './log-level';

export abstract class LogFormatter {
  abstract format(level: LogLevel, category: string, msg: string): string;
}

@Injectable()
export class DefaultLogFormatter implements LogFormatter {
  format(level: LogLevel, category: string, msg: string): string {
    const levelString = LogLevel[level].padEnd(5);
    return `[${levelString}] ${category.toUpperCase()} ${msg}`;
  }
}
