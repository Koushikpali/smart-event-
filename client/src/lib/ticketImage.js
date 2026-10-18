import QRCode from 'qrcode';
import { fmtDateTime, money } from './format';

export const ticketUrl = (code) => `${window.location.origin}/ticket/${code}`;
export const makeQr = (code, size = 320) => QRCode.toDataURL(ticketUrl(code), { width: size, margin: 1, color: { dark: '#14122B', light: '#FFFFFF' } });

function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Draws the ticket on a canvas and downloads it as a PNG. */
export async function downloadTicketPng(t) {
  const W = 1000, H = 420;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3B34FF'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(16, 16, W - 32, H - 32, 24); ctx.fill();

  // perforation + notches
  const px = 710;
  ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(20,18,43,.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, H - 40); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#3B34FF';
  ctx.beginPath(); ctx.arc(px, 16, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px, H - 16, 14, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#14122B';
  ctx.font = '700 22px sans-serif'; ctx.fillText('SmartEvents ticket', 56, 70);
  ctx.font = '800 40px sans-serif';
  ctx.fillText(fit(ctx, t.event_title, 600), 56, 130);
  ctx.font = '500 22px sans-serif'; ctx.fillStyle = 'rgba(20,18,43,.75)';
  ctx.fillText(fit(ctx, t.location, 600), 56, 172);
  ctx.fillText(fmtDateTime(t.event_date), 56, 206);

  ctx.fillStyle = '#14122B'; ctx.font = '700 24px sans-serif';
  ctx.fillText(fit(ctx, t.name, 600), 56, 270);
  ctx.font = '500 22px sans-serif'; ctx.fillStyle = 'rgba(20,18,43,.75)';
  ctx.fillText(`${t.quantity} × ${t.category_name}   ·   ${money(t.total_amount)}`, 56, 304);
  ctx.font = '500 15px monospace'; ctx.fillText(t.ticket_code, 56, 372);

  const qr = new Image();
  qr.src = await makeQr(t.ticket_code, 400);
  await new Promise((res, rej) => { qr.onload = res; qr.onerror = rej; });
  ctx.drawImage(qr, 745, 80, 220, 220);
  ctx.fillStyle = '#14122B'; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Scan at entry', 855, 335);
  ctx.textAlign = 'left';

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `ticket-${t.ticket_code.slice(0, 8)}.png`;
  a.click();
}
