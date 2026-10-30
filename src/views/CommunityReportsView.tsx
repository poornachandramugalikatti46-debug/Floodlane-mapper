import React, {useMemo, useState} from 'react';
import {Plus, Search, X} from 'lucide-react';
import {ResilientImage, RiskIndicator, StatusText} from '../components/RiskIndicator';
import {TranslationDictionary} from '../i18n/translations';
import {
  FloodReport,
  NavSection,
  ReportCategory,
  RiskLevel,
  VerificationStatus,
} from '../types';

interface CommunityReportsViewProps {
  reports: FloodReport[];
  t: TranslationDictionary;
  onNavigate: (section: NavSection) => void;
}

export const CommunityReportsView: React.FC<CommunityReportsViewProps> = ({
  reports,
  t,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [lightboxReport, setLightboxReport] = useState<FloodReport | null>(null);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (q) {
        const hay = `${r.locationName} ${r.description} ${r.reportedBy} ${r.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, searchQuery, categoryFilter, severityFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t.nav['community-reports']}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Accessible register of resident-submitted flood observations, drainage blockages, and photographs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('report-issue')}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.common.reportFloodIssue}</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search lane, note, or reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search community flood reports"
            className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-md border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ReportCategory | 'ALL')}
          aria-label="Filter by report category"
          className="min-h-[40px] px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">All Report Categories</option>
          <option value="Waterlogging">{t.reportCategories['Waterlogging']}</option>
          <option value="Blocked Drain">{t.reportCategories['Blocked Drain']}</option>
          <option value="Overflowing Drain">{t.reportCategories['Overflowing Drain']}</option>
          <option value="Flooded House">{t.reportCategories['Flooded House']}</option>
          <option value="Road Flooding">{t.reportCategories['Road Flooding']}</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as RiskLevel | 'ALL')}
          aria-label="Filter by flood severity"
          className="min-h-[40px] px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">All Severity Levels</option>
          <option value="CRITICAL">{t.risk.CRITICAL}</option>
          <option value="HIGH">{t.risk.HIGH}</option>
          <option value="MEDIUM">{t.risk.MEDIUM}</option>
          <option value="LOW">{t.risk.LOW}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | 'ALL')}
          aria-label="Filter by verification status"
          className="min-h-[40px] px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="Pending">{t.status.Pending}</option>
          <option value="Reviewed">{t.status.Reviewed}</option>
          <option value="Verified">{t.status.Verified}</option>
          <option value="Rejected">{t.status.Rejected}</option>
        </select>
      </div>

      {/* Reports Grid / Cards */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 text-center space-y-3">
          <div className="text-sm font-semibold text-slate-800">
            No flood reports match your current filter criteria.
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('ALL');
              setSeverityFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReports.map((rep) => (
            <article
              key={rep.id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setLightboxReport(rep)}
                  className="w-full block text-left cursor-pointer"
                >
                  <ResilientImage
                    src={rep.photoUrl}
                    alt={`${rep.category} at ${rep.locationName}`}
                    className="w-full h-44 object-cover border-b border-slate-200"
                    fallbackLabel="No Photo Attached — Text Report"
                  />
                </button>

                <div className="p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                    <RiskIndicator level={rep.severity} label={t.risk[rep.severity]} />
                    <span aria-hidden="true">·</span>
                    <StatusText status={rep.status} label={t.status[rep.status]} />
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900">
                    {t.reportCategories[rep.category]} — {rep.locationName}
                  </h2>

                  <p className="text-slate-600 leading-relaxed">{rep.description}</p>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                <span className="truncate pr-2">By {rep.reportedBy}</span>
                <span className="font-mono tabular-nums shrink-0">
                  {rep.latitude.toFixed(4)}, {rep.longitude.toFixed(4)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Photo & Detail Modal */}
      {lightboxReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-bold text-slate-900">
                {lightboxReport.category} — {lightboxReport.locationName}
              </div>
              <button
                type="button"
                onClick={() => setLightboxReport(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ResilientImage
              src={lightboxReport.photoUrl}
              alt={lightboxReport.locationName}
              className="w-full h-64 object-cover border-b border-slate-200"
            />
            <div className="p-4 space-y-2 text-xs">
              <div className="text-[11px] text-amber-800 font-medium">{lightboxReport.dataOrigin}</div>
              <p className="text-slate-700 leading-relaxed">{lightboxReport.description}</p>
              <div className="font-mono text-slate-500">
                Coordinates: {lightboxReport.latitude.toFixed(6)}, {lightboxReport.longitude.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
