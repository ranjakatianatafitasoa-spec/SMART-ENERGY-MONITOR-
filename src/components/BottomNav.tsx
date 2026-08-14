import React from 'react';
import { LayoutGrid, Shield, Activity, FileText, Settings, Info } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'relais', label: 'RELAIS', icon: <Shield className="w-5 h-5" /> },
    { id: 'history', label: 'GRAPHIQUE', icon: <Activity className="w-5 h-5" /> },
    { id: 'reports', label: 'RAPPORTS', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'PARAMÈTRES', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 p-1.5 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className={isActive ? 'scale-110 transition-transform' : ''}>
                {tab.icon}
              </div>
              <span className="text-[9px] font-mono tracking-wider uppercase">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

