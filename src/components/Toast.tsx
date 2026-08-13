import React from 'react';
import { Info, CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-2xl bg-slate-950/90 border border-cyan-400/80 text-cyan-200 text-xs font-mono font-bold flex items-center gap-2.5 shadow-[0_0_30px_rgba(0,242,254,0.5)] backdrop-blur-md transition-all duration-300 pointer-events-none">
      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
      <span className="tracking-wide uppercase">{message}</span>
    </div>
  );
};
