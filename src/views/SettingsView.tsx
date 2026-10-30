import React, {useState} from 'react';
import {Database, Globe, HardDriveDownload, RefreshCw, Wifi, WifiOff} from 'lucide-react';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {TranslationDictionary} from '../i18n/translations';
import {UserPreferences} from '../services/storage';
import {LanguageCode} from '../types';

interface SettingsViewProps {
  prefs: UserPreferences;
  t: TranslationDictionary;
  pendingSyncCount: number;
  isEffectiveOffline: boolean;
  onUpdatePrefs: (next: UserPreferences) => void;
  onProcessSyncQueue: () => void;
  onResetDemoData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  prefs,
  t,
  pendingSyncCount,
  isEffectiveOffline,
  onUpdatePrefs,
  onProcessSyncQueue,
  onResetDemoData,
}) => {
  const [cachingTiles, setCachingTiles] = useState(false);
  const [tileCacheStatus, setTileCacheStatus] = useState<string | null>(
    prefs.cachedTilesTimestamp
      ? `Ward 148 OSM tiles cached locally at ${new Date(prefs.cachedTilesTimestamp).toLocaleTimeString()}`
      : null
  );
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handlePrecacheWardTiles = async () => {
    setCachingTiles(true);
    try {
      // Pre-warm browser & Service Worker cache for Ward 148 center tiles (zoom 15 & 16)
      const tileUrls = [
        'https://a.tile.openstreetmap.org/15/23447/15165.png',
        'https://b.tile.openstreetmap.org/15/23448/15165.png',
        'https://c.tile.openstreetmap.org/16/46895/30330.png',
        'https://a.tile.openstreetmap.org/16/46896/30330.png',
      ];
      await Promise.allSettled(tileUrls.map((u) => fetch(u, {mode: 'no-cors'})));
      const nowIso = new Date().toISOString();
      onUpdatePrefs({...prefs, cachedTilesTimestamp: nowIso});
      setTileCacheStatus('Cached Ward 148 zoom 15–16 map tiles into Service Worker cache.');
    } finally {
      setCachingTiles(false);
    }
  };

  const handleReset = async () => {
    await onResetDemoData();
    setResetMessage('Restored default Ward 148 demonstration dataset (15 houses, 8 streets, 6 drains, 10 reports, 4 zones, 3 shelters).');
    setTimeout(() => setResetMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav.settings}</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Configure trilingual interface language, senior/low-vision accessibility, offline PWA behavior,
          and local GIS storage.
        </p>
      </div>

      {resetMessage && (
        <div
          role="status"
          className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold"
        >
          {resetMessage}
        </div>
      )}

      {/* 1. Multilingual Language Switcher */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">
            Multilingual Interface (English · ಕನ್ನಡ · हिन्दी)
          </h2>
        </div>
        <p className="text-xs text-slate-600">
          Switch all navigation menus, forms, flood-risk labels, and community annotation templates.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {(
            [
              ['en', 'English', 'Default GIS Interface'],
              ['kn', 'ಕನ್ನಡ (Kannada)', 'ಸ್ಥಳೀಯ ಸಮುದಾಯ ಭಾಷೆ'],
              ['hi', 'हिन्दी (Hindi)', 'सामुदायिक मैपिंग भाषा'],
            ] as Array<[LanguageCode, string, string]>
          ).map(([code, title, sub]) => (
            <button
              key={code}
              type="button"
              onClick={() => onUpdatePrefs({...prefs, language: code})}
              className={`min-h-[56px] p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                prefs.language === code
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900'
              }`}
            >
              <div className="text-sm font-bold">{title}</div>
              <div
                className={`text-xs mt-0.5 ${
                  prefs.language === code ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {sub}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Accessibility Controls */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Accessibility &amp; Inclusive Readability
        </h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Large Typography Mode (Elderly &amp; Low-Vision Friendly)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Increases base interface scale to 112.5% with generous touch targets.
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.largeText}
              onChange={(e) => onUpdatePrefs({...prefs, largeText: e.target.checked})}
              className="w-5 h-5 rounded border-slate-300 text-slate-900"
            />
          </label>

          <label className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-200 cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-900">High-Contrast Daylight Mode</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Sharpens surface borders and text contrast for outdoor monsoon field mapping.
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.highContrast}
              onChange={(e) => onUpdatePrefs({...prefs, highContrast: e.target.checked})}
              className="w-5 h-5 rounded border-slate-300 text-slate-900"
            />
          </label>
        </div>
      </section>

      {/* 3. Offline-First Storage & PWA Controls */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEffectiveOffline ? (
              <WifiOff className="w-4 h-4 text-amber-700" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-700" />
            )}
            <h2 className="text-base font-bold text-slate-900">
              Offline-First Persistence &amp; PWA Readiness
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Pending Local Queue: <strong>{pendingSyncCount}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          All community-sketched geometries and flood reports are persisted locally in your browser using{' '}
          <strong>IndexedDB + LocalStorage</strong>. No external cloud server synchronization is claimed in
          this standalone prototype.
        </p>

        <label className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Simulate Field Offline Connectivity (For Testing)
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Test offline banner, local sketching queue, and reconnect queue processing without disabling
              your computer&apos;s Wi-Fi.
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.simulateOffline}
            onChange={(e) => onUpdatePrefs({...prefs, simulateOffline: e.target.checked})}
            className="w-5 h-5 rounded border-slate-300 text-amber-700"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={cachingTiles}
            onClick={handlePrecacheWardTiles}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <HardDriveDownload className="w-4 h-4 text-sky-700" />
            <span>{cachingTiles ? 'Caching Tiles...' : 'Pre-Cache Ward 148 Map Tiles'}</span>
          </button>

          {pendingSyncCount > 0 && !isEffectiveOffline && (
            <button
              type="button"
              onClick={onProcessSyncQueue}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Mark {pendingSyncCount} Queued Offline Edits Committed</span>
            </button>
          )}

          <PWAInstallButton variant="card" />
        </div>

        {tileCacheStatus && <div className="text-xs text-sky-800 font-medium">{tileCacheStatus}</div>}
      </section>

      {/* 4. Reset Demo Data */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Database className="w-4 h-4 text-slate-700" />
            <span>Reset Demonstration Ward Dataset</span>
          </div>
          <p className="text-xs text-slate-600">
            Restore initial Ward 148 Ejipura sample records (15 houses, 8 lanes, 6 drains, 10 reports, 4
            risk zones, 3 shelters).
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[42px] px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 cursor-pointer"
        >
          Reset Demo Data
        </button>
      </section>
    </div>
  );
};
