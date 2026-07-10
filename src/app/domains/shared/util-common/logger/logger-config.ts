import { LogLevel } from './log-level';

export abstract class LoggerConfig {
  abstract level: LogLevel;
}

export const defaultConfig: LoggerConfig = {
  level: LogLevel.DEBUG,
};
