import React from 'react';
import { LayoutGrid, Shield, Activity, FileText, Settings, Info } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ACCUEIL', icon: <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'relais', label: 'RELAIS', icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'history', label: 'GRAPH', icon: <Activity className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'reports', label: 'RAPPORTS', icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'settings', label: 'CONFIG', icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'about', label: 'INFOS', icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] px-1 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5 items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={isActive ? 'scale-110 text-cyan-300 transition-transform' : ''}>
                {tab.icon}
              </div>
              <span className="text-[8.5px] font-mono tracking-tight uppercase mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

