import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Activity,
  FileSpreadsheet,
  Search,
  X,
  AlertCircle,
  LayoutGrid,
  List,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { HistoryRecord } from '../types';

interface ReportsTabProps {
  records: HistoryRecord[];
  onClearReports: (resetEnergyToo: boolean) => void;
  onExportPdf: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  records,
  onClearReports,
  onExportPdf,
  showToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'incidents' | 'normal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetEnergyOption, setResetEnergyOption] = useState<boolean>(false);

  // Statistics
  const totalCount = records.length;
  const incidentCount = records.filter((r) => r.incident || r.niveau !== 'NORMAL').length;
  const normalCount = totalCount - incidentCount;
  const complianceRate = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 100;

  const avgVoltage = totalCount > 0
    ? (records.reduce((sum, r) => sum + r.tension, 0) / totalCount).toFixed(1)
    : '230.0';

  // Filtered and Searched records
  const filteredRecords = records.filter((rec) => {
    // 1. Level filter
    if (filter === 'incidents' && !rec.incident && rec.niveau === 'NORMAL') return false;
    if (filter === 'normal' && (rec.incident || rec.niveau !== 'NORMAL')) return false;

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const messageMatch = (rec.message || '').toLowerCase().includes(q);
      const levelMatch = (rec.niveau || '').toLowerCase().includes(q);
      const voltMatch = `${rec.tension}`.includes(q);
      return messageMatch || levelMatch || voltMatch;
    }

    return true;
  });

  // Export CSV function (Professional engineering feature)
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast('Aucun enregistrement à exporter', 'warning');
      return;
    }

    const headers = ['Date', 'Heure', 'Tension (V)', 'Courant (A)', 'Puissance (W)', 'Energie (kWh)', 'Niveau', 'Relais', 'Message'];
    const rows = records.map((r) => {
      const d = new Date(r.t);
      return [
        d.toLocaleDateString('fr-FR'),
        d.toLocaleTimeString('fr-FR'),
        r.tension.toFixed(1),
        r.courant.toFixed(2),
        r.puissance.toFixed(0),
        (r.energie / 1000).toFixed(3),
        r.niveau,
        r.relais ? 'ON' : 'OFF',
        `"${(r.message || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Rapport_Smart_Energy_Monitor_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Export CSV téléchargé avec succès', 'success');
  };

  const handleConfirmReset = () => {
    onClearReports(resetEnergyOption);
    setIsResetModalOpen(false);
    showToast(
      resetEnergyOption
        ? 'Journal et accumulateurs d\'énergie réinitialisés'
        : 'Journal des rapports réinitialisé avec succès',
      'success'
    );
  };

  return (
    <div className="space-y-3 sm:space-y-3.5 animate-fadeIn w-full max-w-full font-mono text-xs overflow-hidden">
      {/* 1. Header & Summary Statistics Cards */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 bg-slate-950/90 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2 truncate">
                <span>JOURNAL D'AUDIT ÉLECTRIQUE</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  {totalCount} RELEVÉS
                </span>
              </h2>
              <p className="text-[10.5px] text-slate-400 font-sans truncate">
                Suivi des anomalies, surtensions et commutations relais
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vue Tableau compact"
              >
                <List className="w-3 h-3" />
                <span className="hidden sm:inline">Tableau</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vue Cartes détaillées"
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Cartes</span>
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 text-xs shadow-sm"
              title="Purger l'historique et réinitialiser"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Réinitialiser</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 text-xs"
              title="Exporter sous format Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={onExportPdf}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 text-xs disabled:opacity-40"
              title="Générer et imprimer le rapport PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics Boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mt-3">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Événements</span>
              <Activity className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5 truncate">
              {totalCount} <span className="text-[9.5px] font-normal text-slate-400">enregistrés</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Incidents</span>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            </div>
            <div className={`text-base sm:text-lg font-black mt-0.5 truncate ${incidentCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {incidentCount} <span className="text-[9.5px] font-normal text-slate-400">anomalies</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Tension Moy.</span>
              <Zap className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-cyan-300 mt-0.5 truncate">
              {avgVoltage} <span className="text-[9.5px] font-normal text-slate-400">V</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Conformité</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5 truncate">
              {complianceRate}% <span className="text-[9.5px] font-normal text-slate-400">nominal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Controls Bar */}
      <div className="glass-panel p-2.5 rounded-xl border border-slate-800/90 bg-slate-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Tous ({totalCount})
          </button>
          <button
            onClick={() => setFilter('incidents')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
              filter === 'incidents'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Incidents ({incidentCount})
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
              filter === 'normal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Nominal ({normalCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer un mot clé..."
            className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. CONTENT AREA: Structured Table or Compact Responsive Cards */}
      {viewMode === 'table' ? (
        <div className="glass-panel rounded-2xl border border-slate-800/90 bg-slate-950/85 overflow-hidden shadow-xl">
          {/* Scrollable Container with max height to avoid page overflowing */}
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left font-mono text-[11px] border-collapse min-w-[700px]">
              <thead className="bg-slate-900/95 text-slate-400 uppercase text-[9.5px] border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-2.5 px-3 w-28">Horodatage</th>
                  <th className="py-2.5 px-2.5 w-20 text-right">Tension</th>
                  <th className="py-2.5 px-2.5 w-20 text-right">Courant</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">Puissance</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">Énergie</th>
                  <th className="py-2.5 px-2.5 w-16 text-center">Relais</th>
                  <th className="py-2.5 px-2.5 w-24 text-center">Statut</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Message / Événement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-slate-600" />
                        <span>Aucun enregistrement ne correspond aux critères.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const d = new Date(rec.t);
                    const isDanger = rec.niveau === 'DANGER' || rec.tension === 0;
                    const isAttention = rec.niveau === 'ATTENTION';

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isDanger
                            ? 'bg-rose-950/25 hover:bg-rose-950/35'
                            : isAttention
                            ? 'bg-amber-950/20 hover:bg-amber-950/30'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          <span className="font-bold text-slate-200">{d.toLocaleTimeString('fr-FR')}</span>
                          <span className="text-[9.5px] text-slate-500 ml-1.5">{d.toLocaleDateString('fr-FR')}</span>
                        </td>

                        <td className="py-2 px-2.5 font-bold text-cyan-300 text-right whitespace-nowrap">
                          {rec.tension.toFixed(1)} <span className="text-[9.5px] text-slate-500 font-normal">V</span>
                        </td>

                        <td className="py-2 px-2.5 font-bold text-amber-300 text-right whitespace-nowrap">
                          {rec.courant.toFixed(2)} <span className="text-[9.5px] text-slate-500 font-normal">A</span>
                        </td>

                        <td className="py-2 px-2.5 font-bold text-violet-300 text-right whitespace-nowrap">
                          {rec.puissance.toFixed(0)} <span className="text-[9.5px] text-slate-500 font-normal">W</span>
                        </td>

                        <td className="py-2 px-2.5 font-bold text-emerald-300 text-right whitespace-nowrap">
                          {(rec.energie / 1000).toFixed(3)} <span className="text-[9.5px] text-slate-500 font-normal">kWh</span>
                        </td>

                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border inline-block ${
                              rec.relais
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {rec.relais ? 'ON' : 'OFF'}
                          </span>
                        </td>

                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border inline-block ${
                              rec.niveau === 'NORMAL'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : rec.niveau === 'ATTENTION'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {rec.niveau}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-slate-300 text-[10.5px]">
                          <div className="truncate max-w-[260px] sm:max-w-none" title={rec.message}>
                            {rec.message || 'Fonctionnement standard'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredRecords.length === 0 ? (
            <div className="col-span-full glass-panel p-8 text-center text-slate-500 rounded-2xl border border-slate-800">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>Aucun enregistrement ne correspond aux critères.</span>
            </div>
          ) : (
            filteredRecords.map((rec, idx) => {
              const d = new Date(rec.t);
              const isDanger = rec.niveau === 'DANGER' || rec.tension === 0;
              const isAttention = rec.niveau === 'ATTENTION';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isDanger
                      ? 'bg-rose-950/25 border-rose-500/40 shadow-sm'
                      : isAttention
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/80 border-slate-800/90'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{d.toLocaleTimeString('fr-FR')}</span>
                      <span className="text-slate-600">•</span>
                      <span>{d.toLocaleDateString('fr-FR')}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          rec.relais
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {rec.relais ? 'ON' : 'OFF'}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                          rec.niveau === 'NORMAL'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : rec.niveau === 'ATTENTION'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {rec.niveau}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800/60">
                    <div>
                      <div className="text-[9.5px] text-slate-500 uppercase">Tension</div>
                      <div className="font-bold text-cyan-300">{rec.tension.toFixed(1)} V</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] text-slate-500 uppercase">Courant</div>
                      <div className="font-bold text-amber-300">{rec.courant.toFixed(2)} A</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] text-slate-500 uppercase">Puissance</div>
                      <div className="font-bold text-violet-300">{rec.puissance.toFixed(0)} W</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] text-slate-500 uppercase">Énergie</div>
                      <div className="font-bold text-emerald-300">{(rec.energie / 1000).toFixed(3)} kWh</div>
                    </div>
                  </div>

                  <div className="text-[10.5px] text-slate-300 truncate" title={rec.message}>
                    {rec.message || 'Fonctionnement standard'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. PROFESSIONAL RESET CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetModalOpen(false);
          }}
        >
          <div className="w-full max-w-md glass-panel border border-rose-500/40 rounded-2xl p-4 sm:p-5 relative shadow-[0_0_30px_rgba(244,63,94,0.25)] bg-slate-950 overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
                  RÉINITIALISER LES RAPPORTS
                </h3>
                <p className="text-[10.5px] text-slate-400 font-sans truncate">
                  Maintenance et purge des relevés
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                Vous êtes sur le point d'effacer les <strong className="text-white">{totalCount} enregistrements</strong> du journal d'audit électrique.
              </p>

              {/* Energy Counter Reset Option */}
              <div
                onClick={() => setResetEnergyOption(!resetEnergyOption)}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="text-xs pr-2">
                  <div className="font-bold text-slate-200">Remise à zéro de l'énergie</div>
                  <div className="text-[10.5px] text-slate-400">Réinitialise aussi le cumul en kWh</div>
                </div>
                <input
                  type="checkbox"
                  checked={resetEnergyOption}
                  onChange={() => {}}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer shrink-0"
                />
              </div>

              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Action irréversible. Exportez en PDF ou CSV au préalable si nécessaire.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition-all"
              >
                Annuler
              </button>

              <button
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
