const B = '\x1b[1;34m';
const R = '\x1b[0m';

/**
 * Formats a string as bold dark-blue text using ANSI escape codes.
 * Used to highlight event names in the console output.
 */
export function title(name: string): string {
  return `${B}${name}${R}`;
}
