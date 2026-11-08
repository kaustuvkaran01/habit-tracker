import { Directory, File, Paths } from 'expo-file-system';
import * as Picker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKUP_MAX_BYTES, decodeBackup, encodeBackup } from '../data/habit-backup';
import { type HabitSnapshot } from '../data/habit-archive';

const IMPORTS_KEY = '@habit-tracker/import-files/v1';
const folder = () => new Directory(Paths.cache, 'habit-tracker-backups');
const inCache = (uri: string) => {
  try { const path = decodeURIComponent(uri); return path.startsWith(decodeURIComponent(Paths.cache.uri).replace(/\/$/, '') + '/') && !path.split('/').includes('..'); }
  catch { return false; }
};
async function importedFiles(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(IMPORTS_KEY);
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return []; }
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && inCache(item)) : [];
}
export async function clearBackupFiles() {
  for (const uri of await importedFiles()) { const file = new File(uri); if (file.exists) file.delete(); }
  if (folder().exists) folder().delete();
  await AsyncStorage.removeItem(IMPORTS_KEY);
}
export async function exportBackupFile(snapshot: HabitSnapshot, now: Date, title = 'Habit Tracker') {
  if (!(await Sharing.isAvailableAsync())) throw Error('File sharing is unavailable.');
  await clearBackupFiles();
  const directory = folder(); directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `habit-tracker-${now.toISOString().replace(/[:.]/g, '-')}.json`);
  try {
    file.create({ overwrite: true });
    await file.write(encodeBackup(snapshot, now));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: title });
  } finally { if (file.exists) file.delete(); }
  // The share API does not confirm whether a destination saved the file.
}
export async function pickBackupFile() {
  await clearBackupFiles();
  const result = await Picker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw Error('No backup file selected.');
  const file = new File(asset.uri), ownedCopy = inCache(file.uri);
  if (ownedCopy) await AsyncStorage.setItem(IMPORTS_KEY, JSON.stringify([file.uri]));
  try {
    const size = file.size;
    if ((asset.size ?? 0) > BACKUP_MAX_BYTES || (size ?? asset.size ?? BACKUP_MAX_BYTES + 1) > BACKUP_MAX_BYTES) throw Error('Backup exceeds the supported file size.');
    return { backup: decodeBackup(await file.text()), name: asset.name };
  } finally {
    if (ownedCopy) { if (file.exists) file.delete(); await AsyncStorage.removeItem(IMPORTS_KEY); }
  }
}
