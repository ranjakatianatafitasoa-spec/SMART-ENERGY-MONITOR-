import { HistoryRecord } from '../types';

let compteurRapport = 0;

export function printWithFileName(prefix: string) {
  compteurRapport++;
  const n = String(compteurRapport).padStart(3, '0');
  const maintenant = new Date();
  const date = maintenant.toISOString().slice(0, 10);
  const heure = maintenant.toTimeString().slice(0, 5).replace(':', 'h');
  const originalTitle = document.title;
  document.title = `SmartEnergyMonitor_${prefix}_${n}_${date}_${heure}`;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

export function exportOrPrintPdf(prefix: string, htmlContent: string) {
  compteurRapport++;
  const n = String(compteurRapport).padStart(3, '0');
  const maintenant = new Date();
  const date = maintenant.toISOString().slice(0, 10);
  const heure = maintenant.toTimeString().slice(0, 5).replace(':', 'h');
  const fileName = `SmartEnergyMonitor_${prefix}_${n}_${date}_${heure}`;
  const originalTitle = document.title;
  document.title = fileName;

  // 1. Try primary window.print()
  try {
    window.print();
  } catch (err) {
    console.error('Print error:', err);
  }

  // 2. Open pop-up window fallback if iframe restricts print dialog
  try {
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${fileName}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1e293b; }
              @media print {
                @page { margin: 10mm; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  } catch (e) {
    // Popup might be blocked, main window.print handles it
  }

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

export function generateCurveImagePNG(
  valeurs: number[],
  couleur: string,
  largeur = 860,
  hauteur = 240
): string {
  const c = document.createElement('canvas');
  c.width = largeur;
  c.height = hauteur;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largeur, hauteur);
  ctx.strokeStyle = '#eeeef5';
  ctx.lineWidth = 1;

  for (let i = 1; i < 4; i++) {
    const y = (hauteur * i) / 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(largeur, y);
    ctx.stroke();
  }

  if (valeurs.length < 2) return c.toDataURL('image/png');

  let lo = Math.min(...valeurs);
  let hi = Math.max(...valeurs);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;

  const stepX = largeur / (valeurs.length - 1);
  const getY = (v: number) => hauteur - ((v - lo) / (hi - lo)) * hauteur;

  const grad = ctx.createLinearGradient(0, 0, 0, hauteur);
  grad.addColorStop(0, couleur + '55');
  grad.addColorStop(1, couleur + '05');

  ctx.beginPath();
  valeurs.forEach((v, i) => {
    const x = i * stepX;
    if (i === 0) ctx.moveTo(x, getY(v));
    else ctx.lineTo(x, getY(v));
  });
  ctx.lineTo((valeurs.length - 1) * stepX, hauteur);
  ctx.lineTo(0, hauteur);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  valeurs.forEach((v, i) => {
    const x = i * stepX;
    if (i === 0) ctx.moveTo(x, getY(v));
    else ctx.lineTo(x, getY(v));
  });
  ctx.strokeStyle = couleur;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  return c.toDataURL('image/png');
}

export function generateEnergyPdfHtml(historyE: number[]): string {
  if (historyE.length < 2) return '';
  const image = generateCurveImagePNG(historyE, '#3ee6a8');
  const derniere = historyE[historyE.length - 1];
  const premiere = historyE[0];
  const delta = derniere - premiere;
  const maintenant = new Date();

  return `
    <div style="color:#1a1d2b; font-family:-apple-system,BlinkMacSystemFont,sans-serif; padding:10px;">
      <div style="border-radius:10px; padding:18px 20px; margin-bottom:16px; background:linear-gradient(120deg,#8b7cff,#5b4fd6); color:#fff;">
        <div style="font-size:10px; letter-spacing:.16em; text-transform:uppercase; opacity:.85; font-weight:700;">Smart Energy Monitor</div>
        <h2 style="font-size:21px; margin:3px 0 6px; font-weight:800;">Énergie consommée</h2>
        <div style="font-size:11.5px; opacity:.92;">Généré le ${maintenant.toLocaleString('fr-FR')}</div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px;">
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Énergie actuelle</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${(derniere / 1000).toFixed(3)} kWh</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Évolution (fenêtre)</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${delta >= 0 ? '+' : ''}${delta.toFixed(1)} Wh</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Fenêtre affichée</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${historyE.length} s</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Généré le</div>
          <div style="font-size:13px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${maintenant.toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      <div style="font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; font-weight:800; color:#5b4fd6; margin:16px 2px 8px; padding-left:9px; border-left:3px solid #8b7cff;">
        Évolution de l'énergie consommée
      </div>
      <img style="width:100%; display:block; border-radius:10px; border:1px solid #e3e3ee; background:#fafaff; margin-bottom:6px;" src="${image}" alt="Graphique Energie" />
      <div style="font-size:10px; color:#767693; margin-top:10px; line-height:1.5;">
        Courbe en échelle automatique, adaptée à une grandeur cumulative qui ne fait qu'augmenter.
      </div>
      <div style="text-align:center; font-size:9.5px; color:#a0a0b8; margin-top:20px; border-top:1px solid #ececf3; padding-top:10px;">
        Smart Energy Monitor — Graphique généré automatiquement depuis le tableau de bord
      </div>
    </div>
  `;
}

export function generateFullReportPdfHtml(historique: HistoryRecord[]): string {
  if (historique.length === 0) return '';

  const tensions = historique.map((r) => r.tension);
  const courants = historique.map((r) => r.courant);
  const puissances = historique.map((r) => r.puissance);
  const moyenne = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const debut = new Date(historique[0].t);
  const fin = new Date(historique[historique.length - 1].t);
  const nbIncidents = historique.filter((r) => r.incident).length;
  const energies = historique.map((r) => r.energie / 1000);
  const imageEnergie = generateCurveImagePNG(energies, '#3ee6a8');

  let lignes = '';
  historique.forEach((r) => {
    const d = new Date(r.t);
    lignes += `
      <tr style="background:${r.incident ? '#fff0f3' : 'inherit'}; font-weight:${r.incident ? '600' : 'normal'}">
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${d.toLocaleDateString('fr-FR')}</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${d.toLocaleTimeString('fr-FR')}</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${r.tension.toFixed(1)} V</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${r.courant.toFixed(2)} A</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${r.puissance.toFixed(0)} W</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${(r.energie / 1000).toFixed(3)} kWh</td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">
          ${r.incident ? '⚠ ' : ''}
          <span style="display:inline-block; padding:2px 8px; border-radius:20px; font-size:9.5px; font-weight:800; background:${
            r.niveau === 'NORMAL' ? '#e1f9ee' : r.niveau === 'ATTENTION' ? '#fff2df' : '#ffe1e6'
          }; color:${
            r.niveau === 'NORMAL' ? '#0a8a56' : r.niveau === 'ATTENTION' ? '#b06a00' : '#c81f3d'
          }">${r.niveau}</span>
        </td>
        <td style="padding:6px; border-bottom:1px solid #ececf3;">${r.message}</td>
      </tr>
    `;
  });

  return `
    <div style="color:#1a1d2b; font-family:-apple-system,BlinkMacSystemFont,sans-serif; padding:10px;">
      <div style="border-radius:10px; padding:18px 20px; margin-bottom:16px; background:linear-gradient(120deg,#8b7cff,#5b4fd6); color:#fff;">
        <div style="font-size:10px; letter-spacing:.16em; text-transform:uppercase; opacity:.85; font-weight:700;">Smart Energy Monitor</div>
        <h2 style="font-size:21px; margin:3px 0 6px; font-weight:800;">Rapport de surveillance électrique</h2>
        <div style="font-size:11.5px; opacity:.92;">Période du ${debut.toLocaleString('fr-FR')} au ${fin.toLocaleString('fr-FR')} · Généré le ${new Date().toLocaleString('fr-FR')}</div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px;">
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Relevés</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${historique.length}</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Incidents</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${nbIncidents}</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Tension moy.</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${moyenne(tensions).toFixed(1)} V</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Courant moy.</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${moyenne(courants).toFixed(2)} A</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Puissance moy.</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${moyenne(puissances).toFixed(0)} W</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Puissance max</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${Math.max(...puissances).toFixed(0)} W</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Énergie totale*</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${(historique[historique.length - 1].energie / 1000).toFixed(3)} kWh</div>
        </div>
        <div style="border:1px solid #e3e3ee; border-left:3px solid #8b7cff; border-radius:8px; padding:9px 11px; background:#fafaff;">
          <div style="font-size:9.5px; color:#767693; text-transform:uppercase; letter-spacing:.07em; font-weight:700;">Niveau actuel</div>
          <div style="font-size:16px; font-weight:800; margin-top:2px; font-family:monospace; color:#2a2a3d;">${historique[historique.length - 1].niveau}</div>
        </div>
      </div>
      <div style="font-size:10.5px; text-transform:uppercase; letter-spacing:.08em; font-weight:800; color:#5b4fd6; margin:16px 2px 8px; padding-left:9px; border-left:3px solid #8b7cff;">
        Évolution de l'énergie consommée sur la période
      </div>
      <img style="width:100%; display:block; border-radius:10px; border:1px solid #e3e3ee; background:#fafaff; margin-bottom:6px;" src="${imageEnergie}" alt="Graphique Energie PDF" />
      <table style="width:100%; border-collapse:collapse; font-size:10.5px; margin-top:4px;">
        <thead>
          <tr style="background:#2a2a3d; color:#fff; font-size:9.5px; text-transform:uppercase;">
            <th style="padding:7px 6px; text-align:left;">Date</th>
            <th style="padding:7px 6px; text-align:left;">Heure</th>
            <th style="padding:7px 6px; text-align:left;">Tension</th>
            <th style="padding:7px 6px; text-align:left;">Courant</th>
            <th style="padding:7px 6px; text-align:left;">Puissance</th>
            <th style="padding:7px 6px; text-align:left;">Énergie</th>
            <th style="padding:7px 6px; text-align:left;">État</th>
            <th style="padding:7px 6px; text-align:left;">Message</th>
          </tr>
        </thead>
        <tbody>${lignes}</tbody>
      </table>
      <div style="font-size:10px; color:#767693; margin-top:10px; line-height:1.5;">
        Les lignes surlignées correspondent à un changement d'état détecté par le système
        (avertissement ou danger), enregistré immédiatement quel que soit l'intervalle habituel.<br>
        *Énergie cumulée depuis le démarrage du système, pas seulement depuis le début de la session.
      </div>
      <div style="text-align:center; font-size:9.5px; color:#a0a0b8; margin-top:20px; border-top:1px solid #ececf3; padding-top:10px;">
        Smart Energy Monitor — Rapport généré automatiquement depuis le tableau de bord
      </div>
    </div>
  `;
}
