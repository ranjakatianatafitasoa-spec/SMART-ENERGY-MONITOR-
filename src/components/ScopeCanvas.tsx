import React, { useRef, useEffect } from 'react';
import { Activity, Zap } from 'lucide-react';

interface ScopeCanvasProps {
  voltage: number;
  current: number;
}

export const ScopeCanvas: React.FC<ScopeCanvasProps> = ({ voltage, current }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const midY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Dark oscilloscope canvas gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#040814');
      bgGrad.addColorStop(0.5, '#070f24');
      bgGrad.addColorStop(1, '#040814');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Oscilloscope Grid Mesh
      if (w > 0 && h > 0) {
        // Subtle grid lines
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.lineWidth = 1;

        // Vertical division lines (12 divisions)
        const xStep = w / 12;
        for (let i = 1; i < 12; i++) {
          ctx.beginPath();
          ctx.moveTo(i * xStep, 0);
          ctx.lineTo(i * xStep, h);
          ctx.stroke();
        }

        // Horizontal division lines (8 divisions)
        const yStep = h / 8;
        for (let i = 1; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * yStep);
          ctx.lineTo(w, i * yStep);
          ctx.stroke();
        }

        // Center crosshair axis lines
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        
        // Horizontal centerline
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();

        // Vertical centerline
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small tick marks on center axes
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        for (let x = 0; x <= w; x += xStep / 5) {
          ctx.beginPath();
          ctx.moveTo(x, midY - 3);
          ctx.lineTo(x, midY + 3);
          ctx.stroke();
        }
        for (let y = 0; y <= h; y += yStep / 5) {
          ctx.beginPath();
          ctx.moveTo(w / 2 - 3, y);
          ctx.lineTo(w / 2 + 3, y);
          ctx.stroke();
        }
      }

      if (w > 0 && h > 0) {
        const vAmplitude = voltage > 0 ? Math.max(0.08, Math.min(1.2, voltage / 230)) * (midY * 0.72) : 0;
        const iAmplitude = current > 0 ? Math.max(0.08, Math.min(1.2, current / 5)) * (midY * 0.52) : 0;

        // 1. Draw Current Waveform (Amber / Gold)
        if (current > 0) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#f59e0b';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.2;
          ctx.beginPath();

          for (let x = 0; x <= w; x += 2) {
            const harmonic = Math.sin(x * 0.08 + phase * 1.5) * (iAmplitude * 0.06);
            const y = midY - Math.sin(x * 0.035 + phase + 0.25) * iAmplitude - harmonic;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // 2. Draw Primary Voltage Waveform (Cyan / Electric Neon / Flatline on 0V)
        ctx.shadowBlur = voltage > 0 ? 16 : 4;
        ctx.shadowColor = voltage > 0 ? '#00f2fe' : 'rgba(148, 163, 184, 0.4)';
        ctx.strokeStyle = voltage > 0 ? '#00f2fe' : 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = voltage > 0 ? 2.5 : 1.5;
        ctx.beginPath();

        for (let x = 0; x <= w; x += 2) {
          const y = voltage > 0 ? (midY - Math.sin(x * 0.035 + phase) * vAmplitude) : midY;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      phase += 0.07;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [voltage, current]);

  return (
    <div className="glass-panel p-2.5 sm:p-3 rounded-2xl relative overflow-hidden group border border-slate-800/90 bg-slate-950/90 shadow-xl">
      {/* Header Bar of the Scope */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/80 font-mono text-[10.5px]">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px]">
            OSCILLATION DU SIGNAL AC
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold hidden xs:inline">
            50.0 Hz
          </span>
        </div>

        {/* Channel Indicators */}
        <div className="flex items-center gap-2">
          {/* CH1: Voltage */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span className="text-cyan-300 font-bold">CH1: {voltage.toFixed(1)}V</span>
          </div>
          {/* CH2: Current */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-amber-300 font-bold">CH2: {current.toFixed(2)}A</span>
          </div>
        </div>
      </div>

      {/* Canvas Scope Display with responsive vh height */}
      <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 shadow-inner h-[18vh] sm:h-[22vh] min-h-[130px] max-h-[220px] w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Ambient Overlay Grid Details */}
        <div className="absolute bottom-1.5 left-2 flex items-center gap-2 font-mono text-[8.5px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80 pointer-events-none backdrop-blur-sm">
          <span>ÉCHELLE: 50V/div</span>
          <span className="text-slate-600">•</span>
          <span>1A/div</span>
          <span className="text-slate-600">•</span>
          <span>5ms/div</span>
        </div>

        <div className="absolute top-1.5 right-2 font-mono text-[8.5px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 pointer-events-none backdrop-blur-sm">
          {voltage > 0 ? 'AC SYNCHRONISÉ' : '0V FLATLINE'}
        </div>
      </div>
    </div>
  );
};
