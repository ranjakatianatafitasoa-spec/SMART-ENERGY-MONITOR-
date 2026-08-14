import React, { useRef, useEffect } from 'react';

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

      // Dark background with subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#060a17');
      bgGrad.addColorStop(1, '#0c1329');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Oscilloscope Grid Mesh
      if (w > 0 && h > 0) {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
        ctx.lineWidth = 1;

        // Vertical division lines (10 divisions)
        const xStep = w / 10;
        for (let i = 1; i < 10; i++) {
          ctx.beginPath();
          ctx.moveTo(i * xStep, 0);
          ctx.lineTo(i * xStep, h);
          ctx.stroke();
        }

        // Horizontal division lines (6 divisions)
        const yStep = h / 6;
        for (let i = 1; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * yStep);
          ctx.lineTo(w, i * yStep);
          ctx.stroke();
        }

        // Center crosshair lines
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (w > 0 && h > 0) {
        const vAmplitude = voltage > 0 ? Math.max(0.05, Math.min(1.4, voltage / 230)) * (midY * 0.72) : 0;
        const iAmplitude = current > 0 ? Math.max(0.05, Math.min(1.4, current / 5)) * (midY * 0.45) : 0;

        // 1. Draw Current Waveform (Amber / Gold)
        if (current > 0) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f59e0b';
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();

          for (let x = 0; x <= w; x += 2) {
            const harmonic = Math.sin(x * 0.12 + phase * 1.5) * (iAmplitude * 0.08);
            const y = midY - Math.sin(x * 0.04 + phase + 0.3) * iAmplitude - harmonic;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // 2. Draw Primary Voltage Waveform (Cyan / Neon Violet / Flatline on 0V)
        ctx.shadowBlur = voltage > 0 ? 14 : 4;
        ctx.shadowColor = voltage > 0 ? '#00f2fe' : 'rgba(148, 163, 184, 0.4)';
        ctx.strokeStyle = voltage > 0 ? '#00f2fe' : 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = voltage > 0 ? 2.5 : 1.5;
        ctx.beginPath();

        for (let x = 0; x <= w; x += 2) {
          const y = voltage > 0 ? (midY - Math.sin(x * 0.04 + phase) * vAmplitude) : midY;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      phase += 0.08;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [voltage, current]);

  return (
    <div className="glass-panel p-2 sm:p-2.5 rounded-2xl relative overflow-hidden group">
      {/* Canvas Scope Display */}
      <div className="relative rounded-xl overflow-hidden border border-cyan-500/20 shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full aspect-[8/1] sm:aspect-[12/1] min-h-[50px] max-h-[70px] block cursor-crosshair"
        />
      </div>
    </div>
  );
};

