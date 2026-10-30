import {openDB, IDBPDatabase} from 'idb';
import {SEED_FEATURES, SEED_REPORTS, SEED_SHELTERS} from '../data/seedData';
import {FloodReport, LanguageCode, MappedFeature, SafeShelter} from '../types';

const DB_NAME = 'floodlane_mapper_gis_db';
const DB_VERSION = 1;

const LS_FEATURES_KEY = 'floodlane_features_v1';
const LS_REPORTS_KEY = 'floodlane_reports_v1';
const LS_SHELTERS_KEY = 'floodlane_shelters_v1';
const LS_PREFS_KEY = 'floodlane_prefs_v1';

export interface UserPreferences {
  language: LanguageCode;
  highContrast: boolean;
  largeText: boolean;
  simulateOffline: boolean;
  cachedTilesTimestamp?: string;
}

const DEFAULT_PREFS: UserPreferences = {
  language: 'en',
  highContrast: false,
  largeText: false,
  simulateOffline: false,
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('features')) {
          db.createObjectStore('features', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', {keyPath: 'id'});
        }
        if (!db.objectStoreNames.contains('shelters')) {
          db.createObjectStore('shelters', {keyPath: 'id'});
        }
      },
    });
  }
  return dbPromise;
}

function readLS<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLS<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode fallback handled via IndexedDB
  }
}

export async function loadInitialDataset(): Promise<{
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
}> {
  try {
    const db = await getDB();
    const [idbFeatures, idbReports, idbShelters] = await Promise.all([
      db.getAll('features') as Promise<MappedFeature[]>,
      db.getAll('reports') as Promise<FloodReport[]>,
      db.getAll('shelters') as Promise<SafeShelter[]>,
    ]);

    if (idbFeatures.length > 0 || idbReports.length > 0) {
      const shelters = idbShelters.length > 0 ? idbShelters : SEED_SHELTERS;
      return {
        features: idbFeatures,
        reports: idbReports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        shelters,
      };
    }
  } catch {
    // Fallback to localStorage if IndexedDB is restricted
  }

  const lsFeatures = readLS<MappedFeature[]>(LS_FEATURES_KEY);
  const lsReports = readLS<FloodReport[]>(LS_REPORTS_KEY);
  const lsShelters = readLS<SafeShelter[]>(LS_SHELTERS_KEY);

  if (lsFeatures && lsReports) {
    return {
      features: lsFeatures,
      reports: lsReports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      shelters: lsShelters || SEED_SHELTERS,
    };
  }

  // First boot: seed demo dataset into both IndexedDB and localStorage
  await persistAllData(SEED_FEATURES, SEED_REPORTS, SEED_SHELTERS);
  return {
    features: SEED_FEATURES,
    reports: [...SEED_REPORTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    shelters: SEED_SHELTERS,
  };
}

export async function persistAllData(
  features: MappedFeature[],
  reports: FloodReport[],
  shelters: SafeShelter[]
): Promise<void> {
  writeLS(LS_FEATURES_KEY, features);
  writeLS(LS_REPORTS_KEY, reports);
  writeLS(LS_SHELTERS_KEY, shelters);

  try {
    const db = await getDB();
    const tx = db.transaction(['features', 'reports', 'shelters'], 'readwrite');
    await Promise.all([
      tx.objectStore('features').clear(),
      tx.objectStore('reports').clear(),
      tx.objectStore('shelters').clear(),
    ]);
    for (const f of features) {
      await tx.objectStore('features').put(f);
    }
    for (const r of reports) {
      await tx.objectStore('reports').put(r);
    }
    for (const s of shelters) {
      await tx.objectStore('shelters').put(s);
    }
    await tx.done;
  } catch {
    // LocalStorage backup already saved
  }
}

export async function saveFeatureRecord(feature: MappedFeature, allFeatures: MappedFeature[]): Promise<void> {
  writeLS(LS_FEATURES_KEY, allFeatures);
  try {
    const db = await getDB();
    await db.put('features', feature);
  } catch {
    // LocalStorage backup active
  }
}

export async function deleteFeatureRecord(id: string, remainingFeatures: MappedFeature[]): Promise<void> {
  writeLS(LS_FEATURES_KEY, remainingFeatures);
  try {
    const db = await getDB();
    await db.delete('features', id);
  } catch {
    // LocalStorage backup active
  }
}

export async function saveReportRecord(report: FloodReport, allReports: FloodReport[]): Promise<void> {
  writeLS(LS_REPORTS_KEY, allReports);
  try {
    const db = await getDB();
    await db.put('reports', report);
  } catch {
    // LocalStorage backup active
  }
}

export async function deleteReportRecord(id: string, remainingReports: FloodReport[]): Promise<void> {
  writeLS(LS_REPORTS_KEY, remainingReports);
  try {
    const db = await getDB();
    await db.delete('reports', id);
  } catch {
    // LocalStorage backup active
  }
}

export async function resetToDemoDataset(): Promise<{
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
}> {
  await persistAllData(SEED_FEATURES, SEED_REPORTS, SEED_SHELTERS);
  return {
    features: SEED_FEATURES,
    reports: [...SEED_REPORTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    shelters: SEED_SHELTERS,
  };
}

export function loadPreferences(): UserPreferences {
  const saved = readLS<Partial<UserPreferences>>(LS_PREFS_KEY);
  return {...DEFAULT_PREFS, ...(saved || {})};
}

export function savePreferences(prefs: UserPreferences): void {
  writeLS(LS_PREFS_KEY, prefs);
}

/**
 * Compress uploaded photo file on client canvas so it stores reliably in IndexedDB/LocalStorage
 */
export function compressImageFile(file: File, maxWidth = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not decode selected image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}
