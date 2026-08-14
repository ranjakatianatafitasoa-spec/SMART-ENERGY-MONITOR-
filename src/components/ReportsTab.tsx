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
  Filter,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
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

  const maxPower = totalCount > 0
    ? Math.max(...records.map((r) => r.puissance)).toFixed(0)
    : '0';

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
        ? 'Journal et compteurs d\'énergie réinitialisés'
        : 'Journal des rapports réinitialisé avec succès',
      'success'
    );
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-5xl mx-auto font-mono text-xs">
      {/* 1. Header & Summary Statistics Cards */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/85 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>JOURNAL D'AUDIT & RAPPORTS DE SÉCURITÉ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  TEMPS RÉEL
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Historique des événements, anomalies électriques et déclenchements du relais
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Reset Button */}
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 text-xs shadow-sm"
              title="Réinitialiser l'historique et les rapports"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 text-xs"
              title="Exporter au format tableur Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={onExportPdf}
              disabled={records.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 text-xs disabled:opacity-40"
              title="Générer un rapport PDF imprimable"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rapport PDF</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Événements</span>
              <Activity className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {totalCount} <span className="text-[10px] font-normal text-slate-400">enregistrés</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Incidents</span>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            </div>
            <div className={`text-lg font-black mt-1 ${incidentCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {incidentCount} <span className="text-[10px] font-normal text-slate-400">anomalies</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Tension Moy.</span>
              <Zap className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-cyan-300 mt-1">
              {avgVoltage} <span className="text-[10px] font-normal text-slate-400">V</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Conformité</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-emerald-300 mt-1">
              {complianceRate}% <span className="text-[10px] font-normal text-slate-400">nominal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Controls Bar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-800/90 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Tous ({totalCount})
          </button>
          <button
            onClick={() => setFilter('incidents')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'incidents'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Incidents ({incidentCount})
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'normal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Nominal ({normalCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer (ex: surtension, relais...)"
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
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

      {/* 3. Detailed Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800/90 bg-slate-950/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900/95 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">Horodatage</th>
                <th className="py-3 px-3">Tension</th>
                <th className="py-3 px-3">Courant</th>
                <th className="py-3 px-3">Puissance</th>
                <th className="py-3 px-3">Énergie</th>
                <th className="py-3 px-3">Relais</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-3.5">Message / Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-600" />
                      <span>Aucun enregistrement ne correspond aux critères sélectionnés.</span>
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
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : isAttention
                          ? 'bg-amber-950/15 hover:bg-amber-950/25'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="font-bold text-slate-200">{d.toLocaleTimeString('fr-FR')}</div>
                        <div className="text-[9.5px] text-slate-500">{d.toLocaleDateString('fr-FR')}</div>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-cyan-300 whitespace-nowrap">
                        {rec.tension.toFixed(1)} V
                      </td>

                      <td className="py-2.5 px-3 font-bold text-amber-300 whitespace-nowrap">
                        {rec.courant.toFixed(2)} A
                      </td>

                      <td className="py-2.5 px-3 font-bold text-violet-300 whitespace-nowrap">
                        {rec.puissance.toFixed(0)} W
                      </td>

                      <td className="py-2.5 px-3 font-bold text-emerald-300 whitespace-nowrap">
                        {(rec.energie / 1000).toFixed(3)} kWh
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            rec.relais
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {rec.relais ? 'ON' : 'OFF'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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

                      <td className="py-2.5 px-3.5 text-slate-300 text-[11px]">
                        {rec.message || 'Fonctionnement standard nominal'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PROFESSIONAL RESET CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetModalOpen(false);
          }}
        >
          <div className="w-full max-w-md glass-panel border border-rose-500/40 rounded-2xl p-5 relative shadow-[0_0_30px_rgba(244,63,94,0.25)] bg-slate-950 overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  RÉINITIALISER LES RAPPORTS & L'HISTORIQUE
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Action de maintenance et purge des données de session
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                Vous êtes sur le point d'effacer les <strong className="text-white">{totalCount} enregistrements</strong> du journal d'incidents et d'audit électrique.
              </p>

              {/* Energy Counter Reset Option */}
              <div
                onClick={() => setResetEnergyOption(!resetEnergyOption)}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="text-xs">
                  <div className="font-bold text-slate-200">Remettre à zéro l'accumulateur d'énergie</div>
                  <div className="text-[11px] text-slate-400">Réinitialise aussi le total cumulé en Wh/kWh</div>
                </div>
                <input
                  type="checkbox"
                  checked={resetEnergyOption}
                  onChange={() => {}}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Cette action est irréversible. Pensez à exporter en PDF ou CSV si vous souhaitez conserver les données.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition-all"
              >
                Annuler
              </button>

              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Réinitialisation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
