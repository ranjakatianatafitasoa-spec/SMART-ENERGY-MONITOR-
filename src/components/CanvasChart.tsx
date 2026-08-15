import React, { useRef, useEffect, useState } from 'react';

interface CanvasChartProps {
  data: number[];
  color: string;
  unit: string;
  title: string;
  step?: number;
  divisions?: number;
  maxDataPoints?: number;
  nominalTarget?: number;
}

export const CanvasChart: React.FC<CanvasChartProps> = ({
  data,
  color,
  unit,
  title,
  step,
  divisions = 4,
  maxDataPoints = 60,
  nominalTarget,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Statistics
  const sliceData = data.slice(-maxDataPoints);
  const avg = sliceData.length > 0 ? sliceData.reduce((a, b) => a + b, 0) / sliceData.length : 0;
  const maxVal = sliceData.length > 0 ? Math.max(...sliceData) : 0;
  const minVal = sliceData.length > 0 ? Math.min(...sliceData) : 0;
  const currentVal = sliceData.length > 0 ? sliceData[sliceData.length - 1] : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeAndRedraw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Dark sleek background
      ctx.fillStyle = 'rgba(6, 10, 23, 0.6)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const y = (h * i) / 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (sliceData.length < 2) return;

      // Scale bounds calculation
      let lo: number, hi: number;
      if (step && step > 0) {
        const centre = sliceData.reduce((a, b) => a + b, 0) / sliceData.length;
        const demiPlage = step * divisions;
        lo = centre - demiPlage;
        hi = centre + demiPlage;
      } else {
        lo = Math.min(...sliceData);
        hi = Math.max(...sliceData);
        if (hi === lo) hi = lo + 1;
        const pad = (hi - lo) * 0.15;
        lo -= pad;
        hi += pad;
      }

      const clamp = (v: number) => Math.min(hi, Math.max(lo, v));
      const stepX = w / Math.max(maxDataPoints - 1, 1);
      const getY = (v: number) => h - ((clamp(v) - lo) / (hi - lo)) * h;

      // Nominal Target Line (e.g. 230V reference)
      if (nominalTarget !== undefined && nominalTarget >= lo && nominalTarget <= hi) {
        const nomY = getY(nominalTarget);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, nomY);
        ctx.lineTo(w, nomY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Y Axis Values Labels
      const decimales = hi - lo < 3 ? 2 : hi - lo < 30 ? 1 : 0;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.textBaseline = 'bottom';
      for (let i = 1; i < 5; i++) {
        const yLigne = (h * i) / 5;
        const valeur = hi - (i / 5) * (hi - lo);
        ctx.fillText(valeur.toFixed(decimales), 4, yLigne - 2);
      }

      // Glowing Gradient Area Fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color + '45');
      grad.addColorStop(1, color + '00');

      ctx.beginPath();
      sliceData.forEach((v, i) => {
        const x = i * stepX;
        if (i === 0) ctx.moveTo(x, getY(v));
        else ctx.lineTo(x, getY(v));
      });
      ctx.lineTo((sliceData.length - 1) * stepX, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line Path with Neon Glow
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.beginPath();
      sliceData.forEach((v, i) => {
        const x = i * stepX;
        if (i === 0) ctx.moveTo(x, getY(v));
        else ctx.lineTo(x, getY(v));
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset glow

      // End pulse handle
      const lastVal = sliceData[sliceData.length - 1];
      const lx = (sliceData.length - 1) * stepX;
      const ly = getY(lastVal);
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Hover Crosshair
      if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < sliceData.length) {
        const hX = hoverIndex * stepX;
        const hY = getY(sliceData[hoverIndex]);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        ctx.beginPath();
        ctx.moveTo(hX, 0);
        ctx.lineTo(hX, h);
        ctx.moveTo(0, hY);
        ctx.lineTo(w, hY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(hX, hY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    resizeAndRedraw();
    window.addEventListener('resize', resizeAndRedraw);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        resizeAndRedraw();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      window.removeEventListener('resize', resizeAndRedraw);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [sliceData, color, step, divisions, maxDataPoints, hoverIndex, nominalTarget]);

  // Handle Mouse / Touch
  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || sliceData.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const stepX = rect.width / Math.max(maxDataPoints - 1, 1);
    const index = Math.min(sliceData.length - 1, Math.max(0, Math.round(x / stepX)));
    setHoverIndex(index);
    setHoverPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
    setHoverPos(null);
  };

  return (
    <div className="space-y-2">
      {/* Top Chart Stats Banner */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{title}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-semibold">{currentVal.toFixed(unit === 'A' ? 2 : unit === 'V' ? 1 : 0)} {unit}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[9.5px] sm:text-[10px] flex-wrap justify-end">
          <span>Moy: <strong className="text-slate-200">{avg.toFixed(unit === 'A' ? 2 : 1)}</strong></span>
          <span>Max: <strong className="text-slate-200">{maxVal.toFixed(unit === 'A' ? 2 : 0)}</strong></span>
          <span>Min: <strong className="text-slate-200">{minVal.toFixed(unit === 'A' ? 2 : 0)}</strong></span>
        </div>
      </div>

      {/* Canvas Container with Glass Frame */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-inner group">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handlePointerLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handlePointerLeave}
          className="w-full aspect-[16/10] block cursor-crosshair touch-none"
        />

        {/* Hover Tooltip Overlay */}
        {hoverIndex !== null && hoverPos && (
          <div
            className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-white/20 text-[11px] font-mono text-white shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full -mt-2"
            style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
          >
            <div className="text-[9px] text-slate-400">Relevé -t={maxDataPoints - hoverIndex}s</div>
            <div className="font-bold text-cyan-300">
              {sliceData[hoverIndex].toFixed(unit === 'A' ? 2 : 1)} {unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
