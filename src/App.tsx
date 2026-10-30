import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Download,
  FilePlus2,
  Home,
  LayoutDashboard,
  Map,
  Menu,
  PenTool,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {PWAInstallButton} from './components/PWAInstallButton';
import {SEED_FEATURES, SEED_REPORTS, SEED_SHELTERS} from './data/seedData';
import {useBrowserOnline} from './hooks/usePWAInstall';
import {TRANSLATIONS} from './i18n/translations';
import {
  deleteFeatureRecord,
  deleteReportRecord,
  loadInitialDataset,
  loadPreferences,
  persistAllData,
  resetToDemoDataset,
  saveFeatureRecord,
  savePreferences,
  saveReportRecord,
  UserPreferences,
} from './services/storage';
import {
  BasemapStyle,
  FloodReport,
  LanguageCode,
  MappedFeature,
  NavSection,
  SafeShelter,
  VerificationStatus,
} from './types';
import {AdminPanelView} from './views/AdminPanelView';
import {CommunityMappingView} from './views/CommunityMappingView';
import {CommunityReportsView} from './views/CommunityReportsView';
import {DashboardView} from './views/DashboardView';
import {FloodRiskAnalysisView} from './views/FloodRiskAnalysisView';
import {GISExportView} from './views/GISExportView';
import {LiveFloodMapView} from './views/LiveFloodMapView';
import {ReportFloodIssueView} from './views/ReportFloodIssueView';
import {SafeSheltersView} from './views/SafeSheltersView';
import {SettingsView} from './views/SettingsView';

const NAV_ITEMS: Array<{id: NavSection; icon: React.ComponentType<{className?: string}>}> = [
  {id: 'dashboard', icon: LayoutDashboard},
  {id: 'live-map', icon: Map},
  {id: 'community-mapping', icon: PenTool},
  {id: 'report-issue', icon: FilePlus2},
  {id: 'risk-analysis', icon: BarChart3},
  {id: 'safe-shelters', icon: Home},
  {id: 'community-reports', icon: ClipboardList},
  {id: 'gis-export', icon: Download},
  {id: 'admin-panel', icon: ShieldCheck},
  {id: 'settings', icon: Settings},
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persistent GIS State (Seeded synchronously so first paint is instant, hydrated from IndexedDB)
  const [features, setFeatures] = useState<MappedFeature[]>(SEED_FEATURES);
  const [reports, setReports] = useState<FloodReport[]>(SEED_REPORTS);
  const [shelters, setShelters] = useState<SafeShelter[]>(SEED_SHELTERS);
  const [basemap, setBasemap] = useState<BasemapStyle>('osm');
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());

  const browserOnline = useBrowserOnline();
  const isEffectiveOffline = !browserOnline || prefs.simulateOffline;

  const t = TRANSLATIONS[prefs.language];

  // Hydrate persistent user edits from IndexedDB / LocalStorage on mount
  useEffect(() => {
    let active = true;
    loadInitialDataset().then((data) => {
      if (!active) return;
      setFeatures(data.features);
      setReports(data.reports);
      setShelters(data.shelters);
    });
    return () => {
      active = false;
    };
  }, []);

  // Apply root accessibility classes & HTML lang attribute
  useEffect(() => {
    const html = document.documentElement;
    html.lang = prefs.language;
    html.classList.toggle('accessible-large-text', prefs.largeText);
    html.classList.toggle('accessible-high-contrast', prefs.highContrast);
  }, [prefs]);

  const handleUpdatePrefs = (next: UserPreferences) => {
    setPrefs(next);
    savePreferences(next);
  };

  const handleLanguageSwitch = (lang: LanguageCode) => {
    handleUpdatePrefs({...prefs, language: lang});
  };

  // Count items created while offline awaiting local commit confirmation
  const pendingSyncCount = useMemo(() => {
    const featPending = features.filter((f) => f.syncStatus === 'pending_sync').length;
    const repPending = reports.filter((r) => r.syncStatus === 'pending_sync').length;
    return featPending + repPending;
  }, [features, reports]);

  const handleProcessSyncQueue = async () => {
    const updatedFeatures = features.map((f) => ({
      ...f,
      syncStatus: 'synced_local' as const,
    }));
    const updatedReports = reports.map((r) => ({
      ...r,
      syncStatus: 'synced_local' as const,
    }));
    setFeatures(updatedFeatures);
    setReports(updatedReports);
    await persistAllData(updatedFeatures, updatedReports, shelters);
  };

  // Auto-process local queue when transitioning from offline back to online
  useEffect(() => {
    if (!isEffectiveOffline && pendingSyncCount > 0) {
      const timer = setTimeout(() => {
        handleProcessSyncQueue();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [isEffectiveOffline, pendingSyncCount]);

  // CRUD Handlers for Features
  const handleAddFeature = async (newFeature: MappedFeature) => {
    const next = [newFeature, ...features];
    setFeatures(next);
    await saveFeatureRecord(newFeature, next);
  };

  const handleUpdateFeature = async (updated: MappedFeature) => {
    const next = features.map((f) => (f.id === updated.id ? updated : f));
    setFeatures(next);
    await saveFeatureRecord(updated, next);
  };

  const handleDeleteFeature = async (id: string) => {
    const next = features.filter((f) => f.id !== id);
    setFeatures(next);
    await deleteFeatureRecord(id, next);
  };

  // CRUD Handlers for Reports
  const handleSubmitReport = async (newReport: FloodReport) => {
    const next = [newReport, ...reports];
    setReports(next);
    await saveReportRecord(newReport, next);
  };

  const handleUpdateReportStatus = async (
    id: string,
    status: VerificationStatus,
    reviewedNote?: string
  ) => {
    const target = reports.find((r) => r.id === id);
    if (!target) return;
    const updated: FloodReport = {
      ...target,
      status,
      reviewedNote: reviewedNote ?? target.reviewedNote,
      dataOrigin:
        status === 'Verified' ? 'VERIFIED FIELD RECORD' : target.dataOrigin,
    };
    const next = reports.map((r) => (r.id === id ? updated : r));
    setReports(next);
    await saveReportRecord(updated, next);
  };

  const handleDeleteReport = async (id: string) => {
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    await deleteReportRecord(id, next);
  };

  const handleResetDemo = async () => {
    const fresh = await resetToDemoDataset();
    setFeatures(fresh.features);
    setReports(fresh.reports);
    setShelters(fresh.shelters);
  };

  const navigateTo = (section: NavSection) => {
    setActiveSection(section);
    setMobileSidebarOpen(false);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const pendingAdminItems = reports.filter((r) => r.status === 'Pending').length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dark Navy-Blue Left Sidebar */}
      <aside
        aria-label="Primary GIS Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B192C] text-slate-100 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Sidebar Brand Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="text-left font-display font-bold text-base tracking-tight text-white whitespace-nowrap cursor-pointer"
            >
              {t.appName}
            </button>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 10 Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV_ITEMS.map(({id, icon: Icon}) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateTo(id)}
                  className={`w-full min-h-[42px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.nav[id]}</span>
                  </span>
                  {id === 'admin-panel' && pendingAdminItems > 0 && (
                    <span className="font-mono tabular-nums text-[11px] opacity-90">
                      {pendingAdminItems}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Connectivity & PWA Install Box */}
        <div className="p-3.5 border-t border-slate-800 space-y-2.5 shrink-0 bg-[#081220]">
          <div className="px-2.5 py-2 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              {isEffectiveOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300 truncate">{t.common.offlineMode}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 truncate">{t.common.onlineLocalSaved}</span>
                </>
              )}
            </div>
            {pendingSyncCount > 0 && (
              <div className="text-slate-400 font-mono tabular-nums">
                {t.common.pendingSync}: {pendingSyncCount}
              </div>
            )}
          </div>

          <PWAInstallButton variant="sidebar" />
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* White Top Navigation Bar (Strict 3-Zone Contract, 56px height) */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Mobile Menu Trigger + Single-Line Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-slate-950 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold text-slate-900 truncate whitespace-nowrap">
              <span>{t.appName}</span>
              <span className="mx-2 text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 font-medium">{t.nav[activeSection]}</span>
            </div>
          </div>

          {/* Zone 2: Trilingual Language Switcher (English · Kannada · Hindi) */}
          <div
            role="group"
            aria-label="Select application language"
            className="flex items-center gap-0.5 p-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0"
          >
            {(
              [
                ['en', 'EN', 'English'],
                ['kn', 'ಕನ್ನಡ', 'ಕನ್ನಡ'],
                ['hi', 'हिन्दी', 'हिन्दी'],
              ] as Array<[LanguageCode, string, string]>
            ).map(([code, mobileLbl, fullLbl]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageSwitch(code)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  prefs.language === code
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="sm:hidden">{mobileLbl}</span>
                <span className="hidden sm:inline">{fullLbl}</span>
              </button>
            ))}
          </div>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('report-issue')}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + {t.common.reportFloodIssue}
            </button>
          </div>
        </header>

        {/* Non-Intrusive Offline Status Banner when Offline */}
        {isEffectiveOffline && (
          <div
            role="status"
            className="bg-amber-100 border-b border-amber-300 px-4 sm:px-6 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>
                <strong>{t.common.offlineMode}:</strong> Your mapped houses, lanes, and flood reports
                are stored safely in local IndexedDB ({pendingSyncCount} unsynced local changes).
              </span>
            </div>
            {prefs.simulateOffline && (
              <button
                type="button"
                onClick={() => handleUpdatePrefs({...prefs, simulateOffline: false})}
                className="font-semibold underline text-amber-900 hover:text-black cursor-pointer"
              >
                Reconnect Online
              </button>
            )}
          </div>
        )}

        {/* Active Operational Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
              onNavigate={navigateTo}
              onDeleteFeature={handleDeleteFeature}
            />
          )}

          {activeSection === 'live-map' && (
            <LiveFloodMapView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
              onDeleteFeature={handleDeleteFeature}
              onNavigate={navigateTo}
            />
          )}

          {activeSection === 'community-mapping' && (
            <CommunityMappingView
              features={features}
              reports={reports}
              shelters={shelters}
              language={prefs.language}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
              isOffline={isEffectiveOffline}
              onSaveFeature={handleAddFeature}
              onUpdateFeature={handleUpdateFeature}
              onDeleteFeature={handleDeleteFeature}
            />
          )}

          {activeSection === 'report-issue' && (
            <ReportFloodIssueView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
              isOffline={isEffectiveOffline}
              onSubmitReport={handleSubmitReport}
              onNavigate={navigateTo}
            />
          )}

          {activeSection === 'risk-analysis' && (
            <FloodRiskAnalysisView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
              onNavigate={navigateTo}
            />
          )}

          {activeSection === 'safe-shelters' && (
            <SafeSheltersView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
              basemap={basemap}
              onBasemapChange={setBasemap}
            />
          )}

          {activeSection === 'community-reports' && (
            <CommunityReportsView
              reports={reports}
              t={t}
              onNavigate={navigateTo}
            />
          )}

          {activeSection === 'gis-export' && (
            <GISExportView
              features={features}
              reports={reports}
              shelters={shelters}
              t={t}
            />
          )}

          {activeSection === 'admin-panel' && (
            <AdminPanelView
              features={features}
              reports={reports}
              t={t}
              onUpdateReportStatus={handleUpdateReportStatus}
              onDeleteReport={handleDeleteReport}
              onUpdateFeature={handleUpdateFeature}
              onDeleteFeature={handleDeleteFeature}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              prefs={prefs}
              t={t}
              pendingSyncCount={pendingSyncCount}
              isEffectiveOffline={isEffectiveOffline}
              onUpdatePrefs={handleUpdatePrefs}
              onProcessSyncQueue={handleProcessSyncQueue}
              onResetDemoData={handleResetDemo}
            />
          )}
        </main>

        {/* Quiet Transparency Footer */}
        <footer className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            {t.appName} — {t.tagline}
          </span>
          <span>{t.demoDisclaimer}</span>
        </footer>
      </div>
    </div>
  );
}
