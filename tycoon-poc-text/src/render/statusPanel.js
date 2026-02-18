import { currentTier } from '../jobs.js';

export function drawStatusPanel(state, canvas, ctx) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = 220;
  const targetWidth = Math.floor(width * dpr);
  const targetHeight = Math.floor(height * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#223125';
  ctx.font = 'bold 20px Courier New';
  ctx.fillText('Tycoon Meta Loop Status', 14, 28);

  ctx.font = '17px Courier New';
  ctx.fillStyle = '#304936';
  ctx.fillText(`Day ${state.day}`, 14, 56);
  ctx.fillText(`Cash $${state.cash}`, 14, 80);
  ctx.fillText(`Mower ${currentTier(state).label}`, 14, 104);

  const gaugeX = 14;
  const gaugeY = 124;
  const gaugeW = width - 28;
  const gaugeH = 20;
  const cashNorm = Math.max(0, Math.min(1, state.cash / 1800));

  ctx.fillStyle = '#95ad90';
  ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
  ctx.fillStyle = '#537447';
  ctx.fillRect(gaugeX, gaugeY, Math.round(gaugeW * cashNorm), gaugeH);
  ctx.strokeStyle = '#2d4833';
  ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);
  ctx.fillStyle = '#1f3325';
  ctx.fillText('Cash Progress', gaugeX, gaugeY - 8);

  const customerGaugeY = 176;
  const custNorm = Math.max(0, Math.min(1, state.repeatCustomers.length / 12));
  ctx.fillStyle = '#95ad90';
  ctx.fillRect(gaugeX, customerGaugeY, gaugeW, gaugeH);
  ctx.fillStyle = '#6b8f5b';
  ctx.fillRect(gaugeX, customerGaugeY, Math.round(gaugeW * custNorm), gaugeH);
  ctx.strokeStyle = '#2d4833';
  ctx.strokeRect(gaugeX, customerGaugeY, gaugeW, gaugeH);
  ctx.fillStyle = '#1f3325';
  ctx.fillText('Repeat Customer Count', gaugeX, customerGaugeY - 8);
}
