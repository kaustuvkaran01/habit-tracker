export const ERASE_MARKER_KEY = '@habit-tracker/erase/v1';
export interface EraseStorage {
  getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>;
  getAllKeys(): Promise<readonly string[]>; removeItem(key: string): Promise<unknown>;
}
export function createLocalEraser(storage: EraseStorage, clearReminders: () => Promise<void>, clearFiles: () => Promise<void>) {
  let running: Promise<void> | null = null;
  const perform = async () => {
    await clearReminders();
    await clearFiles();
    // Enumerate only our namespace; never clear another Expo Go experience.
    for (const key of await storage.getAllKeys()) {
      if (key.startsWith('@habit-tracker/') && key !== ERASE_MARKER_KEY) await storage.removeItem(key);
    }
    await storage.removeItem(ERASE_MARKER_KEY);
  };
  const run = (action: () => Promise<void>) => {
    if (!running) running = action().finally(() => { running = null; });
    return running;
  };
  return {
    recover() { return run(async () => {
      const raw = await storage.getItem(ERASE_MARKER_KEY);
      if (raw === null) return;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('erase' in value) || value.erase !== true) throw Error('Reset marker could not be read.');
      await perform();
    }); },
    erase() {
      return run(async () => {
        await storage.setItem(ERASE_MARKER_KEY, JSON.stringify({ version: 1, erase: true }));
        await perform();
      });
    },
  };
}
