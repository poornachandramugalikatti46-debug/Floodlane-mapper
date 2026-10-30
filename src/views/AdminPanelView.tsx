import React, {useState} from 'react';
import {CheckCircle, Eye, ShieldCheck, Trash2, XCircle} from 'lucide-react';
import {ResilientImage, RiskIndicator, StatusText} from '../components/RiskIndicator';
import {TranslationDictionary} from '../i18n/translations';
import {
  FloodReport,
  MappedFeature,
  RiskLevel,
  VerificationStatus,
} from '../types';

interface AdminPanelViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  t: TranslationDictionary;
  onUpdateReportStatus: (id: string, status: VerificationStatus, note?: string) => void;
  onDeleteReport: (id: string) => void;
  onUpdateFeature: (feature: MappedFeature) => void;
  onDeleteFeature: (id: string) => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  features,
  reports,
  t,
  onUpdateReportStatus,
  onDeleteReport,
  onUpdateFeature,
  onDeleteFeature,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'features'>('reports');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(reports[0] || null);
  const [confirmedFieldCheck, setConfirmedFieldCheck] = useState<boolean>(false);
  const [adminNote, setAdminNote] = useState<string>('');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && r.severity !== riskFilter) return false;
    return true;
  });

  const applyReportStatus = (report: FloodReport, newStatus: VerificationStatus) => {
    onUpdateReportStatus(report.id, newStatus, adminNote.trim() || undefined);
    setSelectedReport({...report, status: newStatus, reviewedNote: adminNote.trim() || undefined});
    setConfirmedFieldCheck(false);
    setAdminNote('');
    setActionToast(`Report "${report.locationName}" marked as ${newStatus}.`);
    setTimeout(() => setActionToast(null), 4000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['admin-panel']}</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Ward Disaster Cell &amp; NGO Moderation Console — review photographs, verify field reports, and
            audit community map geometries.
          </p>
        </div>

        {/* Workspace Sub-Tab Switcher */}
        <div className="inline-flex p-1 rounded-lg bg-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700'
            }`}
          >
            Flood Reports Queue ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'features' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700'
            }`}
          >
            Map Entries Audit ({features.length})
          </button>
        </div>
      </div>

      {actionToast && (
        <div
          role="status"
          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
        >
          {actionToast}
        </div>
      )}

      {activeTab === 'reports' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Columns: Filterable Moderation Table */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
                {(['ALL', 'Pending', 'Reviewed', 'Verified', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? t.common.all : t.status[st]}
                  </button>
                ))}
              </div>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'ALL')}
                aria-label="Filter admin queue by severity"
                className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium"
              >
                <option value="ALL">All Risks</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Incident &amp; Location</th>
                    <th className="py-2.5 px-3.5">Severity</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReports.map((rep) => {
                    const isSelected = selectedReport?.id === rep.id;
                    return (
                      <tr
                        key={rep.id}
                        onClick={() => {
                          setSelectedReport(rep);
                          setConfirmedFieldCheck(false);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900">
                            {rep.category} — {rep.locationName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {rep.reportedBy} · {new Date(rep.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <RiskIndicator level={rep.severity} label={rep.severity} />
                        </td>
                        <td className="py-3 px-3.5">
                          <StatusText status={rep.status} label={t.status[rep.status]} />
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReport(rep);
                            }}
                            className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 5 Columns: Report Evidence & Verification Decision Card */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            {selectedReport ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-[11px] text-amber-800 font-medium">
                      {selectedReport.dataOrigin}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedReport.category} — {selectedReport.locationName}
                    </h2>
                  </div>
                  <StatusText
                    status={selectedReport.status}
                    label={t.status[selectedReport.status]}
                  />
                </div>

                <ResilientImage
                  src={selectedReport.photoUrl}
                  alt={selectedReport.locationName}
                  className="w-full h-48 object-cover rounded-md border border-slate-200"
                  fallbackLabel="No Photograph Submitted"
                />

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <RiskIndicator
                      level={selectedReport.severity}
                      label={t.risk[selectedReport.severity]}
                    />
                    <span className="font-mono tabular-nums text-slate-600">
                      {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{selectedReport.description}</p>
                  <div className="text-slate-500">Submitted by: {selectedReport.reportedBy}</div>
                </div>

                <div>
                  <label htmlFor="admin-mod-note" className="block text-xs font-semibold text-slate-800 mb-1">
                    Ward Officer / Verifier Note (Optional)
                  </label>
                  <input
                    id="admin-mod-note"
                    type="text"
                    placeholder="e.g., Inspected by Junior Engineer Ward 148..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-300 text-xs"
                  />
                </div>

                {/* Strict Field Verification Guardrail before marking Verified */}
                <label className="flex items-start gap-2 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedFieldCheck}
                    onChange={(e) => setConfirmedFieldCheck(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-700"
                  />
                  <span>
                    I confirm field / ward cross-verification has been completed before elevating this
                    record to <strong>Verified</strong> status.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => applyReportStatus(selectedReport, 'Reviewed')}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{t.common.markReviewed}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!confirmedFieldCheck}
                    onClick={() => applyReportStatus(selectedReport, 'Verified')}
                    title={
                      confirmedFieldCheck
                        ? 'Mark as Verified'
                        : 'Tick the field verification confirmation box above first'
                    }
                    className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold ${
                      confirmedFieldCheck
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t.common.approveVerify}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyReportStatus(selectedReport, 'Rejected')}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t.common.reject}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDeleteReport(selectedReport.id);
                      setSelectedReport(null);
                    }}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Entry</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Select a community flood report on the left to review photographic evidence and update
                verification status.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Community Map Entries Audit Table */
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              Audit &amp; Moderate Community-Mapped Geometries
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update verification state or remove inaccurate map sketches before exporting official ward
              layers.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Feature</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Risk</th>
                  <th className="py-2.5 px-4">Verification Status</th>
                  <th className="py-2.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {features.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{f.name}</div>
                      <div className="text-[11px] text-slate-500">{f.createdBy}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{t.categories[f.category]}</td>
                    <td className="py-2.5 px-4">
                      <RiskIndicator level={f.riskLevel} label={f.riskLevel} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusText
                        status={f.verificationStatus}
                        label={t.status[f.verificationStatus]}
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFeature({...f, verificationStatus: 'Reviewed'})
                        }
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFeature({
                            ...f,
                            verificationStatus: 'Verified',
                            dataOrigin: 'VERIFIED FIELD RECORD',
                          })
                        }
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 font-semibold text-white cursor-pointer"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteFeature(f.id)}
                        className="px-2.5 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 font-semibold text-red-700 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
