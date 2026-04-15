export interface State {
  thoughtSignature?: string;
  toolName?: string;
}

export interface Store {
  get: (key: string) => State | undefined;
  set: (key: string, value: State) => void;
}

export class MemoryStore implements Store {
  private readonly entries = new Map<string, State>();

  get(key: string): State | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: State): void {
    const previousValue = this.entries.get(key);
    this.entries.set(key, { ...previousValue, ...value });
  }
}

export const defaultStore: Store = new MemoryStore();
