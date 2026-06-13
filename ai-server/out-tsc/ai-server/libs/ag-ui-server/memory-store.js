export class MemoryStore {
  entries = new Map();
  get(key) {
    return this.entries.get(key);
  }
  set(key, value) {
    const previousValue = this.entries.get(key);
    this.entries.set(key, { ...previousValue, ...value });
  }
}
export const defaultStore = new MemoryStore();
