export interface ToolCallInfo {
  toolName: string;
}

export interface Store {
  get: (key: string) => ToolCallInfo | undefined;
  set: (key: string, value: ToolCallInfo) => void;
}

export class MemoryStore implements Store {
  private readonly entries = new Map<string, ToolCallInfo>();

  get(key: string): ToolCallInfo | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: ToolCallInfo): void {
    this.entries.set(key, value);
  }
}

export const defaultStore: Store = new MemoryStore();
