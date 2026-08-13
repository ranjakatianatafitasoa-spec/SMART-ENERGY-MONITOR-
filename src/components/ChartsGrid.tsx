import React, { useState } from 'react';
import { SlidersHorizontal, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { CanvasChart } from './CanvasChart';
import { ESP32Data, ScaleOption } from '../types';

interface ChartsGridProps {
  currentData: ESP32Data;
  historyV: number[];
  historyI: number[];
  historyP: number[];
}

const pasOptions: Record<'V' | 'I' | 'P', ScaleOption[]> = {
  V: [
    { v: 0.1, l: '0,1' },
    { v: 0.5, l: '0,5' },
    { v: 1, l: '1' },
    { v: 2, l: '2' },
    { v: 5, l: '5' },
    { v: 10, l: '10' },
    { v: 20, l: '20' },
    { v: 50, l: '50' },
  ],
  I: [
    { v: 0.05, l: '0,05' },
    { v: 0.1, l: '0,1' },
    { v: 0.5, l: '0,5' },
    { v: 1, l: '1' },
    { v: 2, l: '2' },
    { v: 5, l: '5' },
    { v: 10, l: '10' },
    { v: 20, l: '20' },
  ],
  P: [
    { v: 10, l: '10' },
    { v: 25, l: '25' },
    { v: 50, l: '50' },
    { v: 100, l: '100' },
    { v: 250, l: '250' },
    { v: 500, l: '500' },
    { v: 1000, l: '1000' },
    { v: 2000, l: '2000' },
  ],
};

export const ChartsGrid: React.FC<ChartsGridProps> = ({
  currentData,
  historyV,
  historyI,
  historyP,
}) => {
  const [indexV, setIndexV] = useState<number>(4); // ± 5 V
  const [indexI, setIndexI] = useState<number>(4); // ± 2 A
  const [indexP, setIndexP] = useState<number>(3); // ± 100 W

  const handleAdjustScale = (type: 'V' | 'I' | 'P', delta: number) => {
    const list = pasOptions[type];
    if (type === 'V') {
      setIndexV((prev) => Math.max(0, Math.min(list.length - 1, prev + delta)));
    } else if (type === 'I') {
      setIndexI((prev) => Math.max(0, Math.min(list.length - 1, prev + delta)));
    } else {
      setIndexP((prev) => Math.max(0, Math.min(list.length - 1, prev + delta)));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
      {/* 1. Tension Vector Chart */}
      <div className="glass-panel p-4 rounded-2xl relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
            <h3 className="text-xs font-mono font-bold uppercase text-slate-200">
              COURBE TENSION SECTEUR
            </h3>
          </div>

          {/* Scale Control */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => handleAdjustScale('V', -1)}
              disabled={indexV <= 0}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Avancé"
            >
              −
            </button>
            <span className="font-mono text-[11px] text-cyan-300 font-bold px-1 min-w-[50px] text-center">
              ±{pasOptions.V[indexV].l}V
            </span>
            <button
              onClick={() => handleAdjustScale('V', 1)}
              disabled={indexV >= pasOptions.V.length - 1}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Reculé"
            >
              +
            </button>
          </div>
        </div>

        <CanvasChart
          data={historyV}
          color="#00f2fe"
          unit="V"
          title="Tension (V)"
          step={pasOptions.V[indexV].v}
          nominalTarget={230}
        />
      </div>

      {/* 2. Courant Vector Chart */}
      <div className="glass-panel p-4 rounded-2xl relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <h3 className="text-xs font-mono font-bold uppercase text-slate-200">
              COURBE COURANT (I)
            </h3>
          </div>

          {/* Scale Control */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => handleAdjustScale('I', -1)}
              disabled={indexI <= 0}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Avancé"
            >
              −
            </button>
            <span className="font-mono text-[11px] text-amber-300 font-bold px-1 min-w-[50px] text-center">
              ±{pasOptions.I[indexI].l}A
            </span>
            <button
              onClick={() => handleAdjustScale('I', 1)}
              disabled={indexI >= pasOptions.I.length - 1}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Reculé"
            >
              +
            </button>
          </div>
        </div>

        <CanvasChart
          data={historyI}
          color="#f59e0b"
          unit="A"
          title="Courant (I)"
          step={pasOptions.I[indexI].v}
        />
      </div>

      {/* 3. Puissance Vector Chart */}
      <div className="glass-panel p-4 rounded-2xl relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_#8b5cf6]" />
            <h3 className="text-xs font-mono font-bold uppercase text-slate-200">
              COURBE PUISSANCE INSTANTANÉE
            </h3>
          </div>

          {/* Scale Control */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => handleAdjustScale('P', -1)}
              disabled={indexP <= 0}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Avancé"
            >
              −
            </button>
            <span className="font-mono text-[11px] text-violet-300 font-bold px-1 min-w-[50px] text-center">
              ±{pasOptions.P[indexP].l}W
            </span>
            <button
              onClick={() => handleAdjustScale('P', 1)}
              disabled={indexP >= pasOptions.P.length - 1}
              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer"
              title="Zoom Reculé"
            >
              +
            </button>
          </div>
        </div>

        <CanvasChart
          data={historyP}
          color="#8b5cf6"
          unit="W"
          title="Puissance W"
          step={pasOptions.P[indexP].v}
        />
      </div>
    </div>
  );
};
