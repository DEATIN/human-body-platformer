import { LEVEL } from './engine.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function rounded(ctx, x, y, w, h, radius = 10) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

/** Procedural artwork only. The game controller owns time, input and its single loop. */
export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas 2D is unavailable');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.cameraX = 0;
    this.viewWidth = LEVEL.width;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || LEVEL.width);
    const height = Math.max(1, rect.height || width * LEVEL.height / LEVEL.width);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.viewWidth = width <= 650 ? 720 : LEVEL.width;
  }

  render(model, timeSeconds = 0) {
    if (!this.canvas) return;
    this.resize();
    const ctx = this.ctx;
    const time = this.reducedMotion.matches ? 0 : Number.isFinite(timeSeconds) ? timeSeconds : 0;
    const player = model.player;
    this.cameraX = this.viewWidth < LEVEL.width
      ? clamp(player.x + player.w / 2 - this.viewWidth * .4, 0, LEVEL.width - this.viewWidth)
      : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.canvas.width / this.viewWidth, 0, 0, this.canvas.height / LEVEL.height, 0, 0);
    ctx.save();
    ctx.translate(-this.cameraX, 0);
    this.drawBackground(time);
    this.drawTissue(time);
    this.drawHazards(time);
    LEVEL.platforms.forEach((platform, index) => this.drawPlatform(platform, index));
    this.drawFinish(model.collectedCount >= 3, time);
    model.items.forEach(item => { if (!item.collected) this.drawOxygen(item, time); });
    this.drawPlayer(player, model.status, time);
    ctx.restore();
    this.drawViewportDetails(model);
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, LEVEL.height);
    bg.addColorStop(0, '#061a28'); bg.addColorStop(.55, '#0b313b'); bg.addColorStop(1, '#123f45');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);

    // Fixed seeded positions keep the composition stable when the game pauses.
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 173 + 53) % LEVEL.width;
      const y = 65 + (i * 97) % 460;
      const float = Math.sin(time * .35 + i * 1.7) * 4;
      ellipse(ctx, x, y + float, 1.5 + i % 3, 1.5 + i % 3, i % 4 ? 'rgba(137,223,217,.13)' : 'rgba(235,169,146,.19)');
    }
    for (let i = 0; i < 9; i += 1) {
      const x = 75 + i * 160;
      const y = 230 + Math.sin(i * 1.8) * 95;
      ellipse(ctx, x, y, 49 + i % 3 * 9, 29, 'rgba(44,103,105,.09)', 'rgba(126,196,184,.055)', 2);
      ellipse(ctx, x - 8, y + 2, 11, 7, 'rgba(120,192,177,.035)');
    }

    ctx.strokeStyle = 'rgba(126,208,194,.09)'; ctx.lineWidth = 38; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, 188); ctx.bezierCurveTo(220, 48, 235, 245, 490, 165); ctx.bezierCurveTo(730, 62, 960, 250, 1320, 155); ctx.stroke();
    ctx.strokeStyle = 'rgba(141,214,200,.09)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-30, 182); ctx.bezierCurveTo(220, 42, 235, 239, 490, 159); ctx.bezierCurveTo(730, 56, 960, 244, 1320, 149); ctx.stroke();

    ctx.textBaseline = 'middle'; ctx.font = '600 10px system-ui, sans-serif'; ctx.letterSpacing = '2px';
    ctx.fillStyle = '#91bab8'; ctx.fillText('ЛЁГКИЕ', 54, 57); ctx.fillText('МЫШЦА', 1152, 57);
    ctx.fillStyle = 'rgba(140,190,184,.4)'; ctx.textAlign = 'center'; ctx.fillText('П У Т Ь   К И С Л О Р О Д А', 640, 55); ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
  }

  drawTissue(time) {
    const ctx = this.ctx;
    // Alveolar silhouettes at the beginning of the route.
    for (let i = 0; i < 6; i += 1) {
      const x = 14 + i * 33;
      const y = 94 + Math.sin(i * 1.3) * 24;
      ellipse(ctx, x, y, 24, 31, 'rgba(80,142,144,.12)', 'rgba(112,192,186,.13)', 1.5);
    }
    ctx.strokeStyle = 'rgba(111,188,181,.13)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(92, 86); ctx.bezierCurveTo(99, 130, 150, 130, 160, 176); ctx.stroke();
    // Striated working tissue behind the destination.
    ctx.save(); ctx.translate(1100, 100); ctx.rotate(-.12);
    for (let i = 0; i < 5; i += 1) {
      rounded(ctx, 0, i * 19, 190, 13, 7); ctx.fillStyle = i % 2 ? 'rgba(192,106,115,.17)' : 'rgba(202,130,128,.14)'; ctx.fill();
      for (let j = 1; j < 9; j += 1) { ctx.fillStyle = 'rgba(233,165,153,.12)'; ctx.fillRect(j * 22, i * 19 + 3, 2, 7); }
    }
    ctx.restore();
    // The foreground membrane below the playable tissue ledges.
    ctx.beginPath(); ctx.moveTo(0, 600); ctx.lineTo(0, 540);
    for (let x = 0; x <= LEVEL.width; x += 40) ctx.lineTo(x, 538 + Math.sin(x * .012) * 15);
    ctx.lineTo(LEVEL.width, 600); ctx.closePath(); ctx.fillStyle = '#173f46'; ctx.fill();
    ctx.strokeStyle = 'rgba(89,151,145,.2)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i += 1) {
      const x = i * 99 + 18;
      ctx.beginPath(); ctx.moveTo(x, 600); ctx.bezierCurveTo(x - 14, 571, x + 20, 572, x + 5, 542); ctx.stroke();
    }
  }

  drawHazards(time) {
    const ctx = this.ctx;
    LEVEL.hazards.forEach(hazard => {
      const gradient = ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h);
      gradient.addColorStop(0, 'rgba(235,110,112,.28)'); gradient.addColorStop(1, 'rgba(116,49,71,.8)');
      ctx.fillStyle = gradient; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
      ctx.strokeStyle = '#d97f83'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = hazard.x; x <= hazard.x + hazard.w; x += 8) {
        const y = hazard.y + Math.sin(x * .06 + time * .7) * 2;
        x === hazard.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (let x = hazard.x + 25; x < hazard.x + hazard.w; x += 70) {
        ctx.beginPath(); ctx.moveTo(x - 5, hazard.y + 22); ctx.lineTo(x, hazard.y + 15); ctx.lineTo(x + 5, hazard.y + 22); ctx.strokeStyle = 'rgba(240,160,158,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    });
  }

  drawPlatform(p, index) {
    const ctx = this.ctx;
    // Supporting tissue stays behind the exact solid collision rectangle.
    const stem = ctx.createLinearGradient(0, p.y + p.h, 0, 555);
    stem.addColorStop(0, 'rgba(151,99,105,.18)'); stem.addColorStop(1, 'rgba(151,99,105,0)');
    ctx.fillStyle = stem; rounded(ctx, p.x + 11, p.y + p.h - 4, p.w - 22, Math.max(10, 555 - p.y - p.h), 18); ctx.fill();
    ctx.fillStyle = 'rgba(1,15,25,.28)'; rounded(ctx, p.x, p.y + 6, p.w, p.h, 12); ctx.fill();
    const top = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    top.addColorStop(0, '#e9aaa0'); top.addColorStop(.25, '#cf8c89'); top.addColorStop(1, '#a96773');
    rounded(ctx, p.x, p.y, p.w, p.h, 11); ctx.fillStyle = top; ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x + 13, p.y + 4); ctx.lineTo(p.x + p.w - 13, p.y + 4); ctx.strokeStyle = '#ffd4ba'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < Math.floor(p.w / 32); i += 1) ellipse(ctx, p.x + 18 + i * 31, p.y + 20, 5, 2, 'rgba(117,55,77,.25)');
    ctx.fillStyle = 'rgba(222,182,169,.3)'; ctx.font = '500 9px system-ui, sans-serif'; ctx.fillText(`0${index + 1}`, p.x + 12, p.y + p.h + 17);
  }

  drawOxygen(item, time) {
    const ctx = this.ctx;
    const x = item.x + item.w / 2;
    const y = item.y + item.h / 2;
    const pulse = .75 + Math.sin(time * 2 + item.x * .01) * .15;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 35);
    glow.addColorStop(0, `rgba(111,239,237,${.24 * pulse})`); glow.addColorStop(1, 'rgba(111,239,237,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 35, y - 35, 70, 70);
    ctx.save(); ctx.shadowColor = '#7affec'; ctx.shadowBlur = 10;
    rounded(ctx, item.x, item.y, item.w, item.h, item.w / 2); ctx.fillStyle = '#adf6e8'; ctx.fill(); ctx.restore();
    rounded(ctx, item.x + 3, item.y + 3, item.w - 6, item.h - 6, 7); ctx.fillStyle = '#3aafa9'; ctx.fill();
    ctx.fillStyle = '#e9fff6'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O₂', x, y + 1); ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(148,240,221,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, item.y - 8); ctx.lineTo(x, item.y - 12); ctx.stroke();
  }

  drawFinish(unlocked, time) {
    const ctx = this.ctx;
    const finish = LEVEL.finish;
    const x = finish.x + finish.w / 2;
    const y = finish.y + finish.h / 2;
    const glow = ctx.createRadialGradient(x, y, 5, x, y, 57);
    glow.addColorStop(0, unlocked ? 'rgba(130,240,190,.22)' : 'rgba(107,184,181,.1)'); glow.addColorStop(1, 'rgba(130,240,190,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 60, y - 60, 120, 120);
    ellipse(ctx, x, y, finish.w * .4, finish.h * .44, 'rgba(8,39,44,.62)', unlocked ? '#b7f2c7' : '#5b9b9b', unlocked ? 3 : 2);
    ellipse(ctx, x, y, finish.w * .28, finish.h * .33, null, unlocked ? 'rgba(165,245,201,.5)' : 'rgba(100,171,167,.24)', 1);
    ctx.fillStyle = unlocked ? '#c5f7d7' : '#7eaaaa'; ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(unlocked ? '✓' : '3', x, y);
    ctx.font = '600 8px system-ui, sans-serif'; ctx.fillText(unlocked ? 'ДОСТАВИТЬ O₂' : 'НУЖНЫ 3 O₂', x, finish.y - 14); ctx.textAlign = 'left';
    if (unlocked) {
      for (let i = 0; i < 4; i += 1) {
        const phase = time * .65 + i * TAU / 4;
        ellipse(ctx, x + Math.cos(phase) * 29, y + Math.sin(phase) * 35, 1.8, 1.8, '#c5f7d7');
      }
    }
  }

  drawPlayer(p, status, time) {
    const ctx = this.ctx;
    const moving = status === 'running' && Math.abs(p.vx) > 1 && p.grounded;
    const step = moving ? Math.sin(time * 15) * 1.5 : 0;
    const x = p.x; const y = p.y;
    ellipse(ctx, x + p.w / 2, y + p.h + 3, p.w * .38, 3, 'rgba(1,15,24,.3)');
    ctx.fillStyle = '#a6c3bb'; rounded(ctx, x + 3, y + p.h - 6 + step, 8, 8, 3); ctx.fill(); rounded(ctx, x + p.w - 11, y + p.h - 6 - step, 8, 8, 3); ctx.fill();
    ctx.strokeStyle = '#a7e9dc'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + p.w / 2, y + 3); ctx.lineTo(x + p.w / 2 + 3, y - 5); ctx.stroke();
    ellipse(ctx, x + p.w / 2 + 3, y - 6, 2.5, 2.5, '#b9f8df');
    // A small coral oxygen pack makes the direction of travel readable.
    const packX = p.facing < 0 ? x + p.w - 3 : x - 4;
    rounded(ctx, packX, y + 13, 7, 15, 3); ctx.fillStyle = '#d48e8b'; ctx.fill();
    const pod = ctx.createLinearGradient(x, y, x + p.w, y + p.h);
    pod.addColorStop(0, '#fff9e7'); pod.addColorStop(1, '#c8ddd1');
    rounded(ctx, x, y, p.w, p.h - 1, 13); ctx.fillStyle = pod; ctx.fill();
    ctx.strokeStyle = '#e5f3df'; ctx.lineWidth = 1; ctx.stroke();
    const eyeX = x + p.w / 2 + p.facing * 2;
    ellipse(ctx, eyeX, y + 17, 10, 10, '#23616a');
    ellipse(ctx, eyeX + p.facing, y + 17, 7, 7, status === 'lost' ? '#75b9bc' : '#6ce7df');
    ellipse(ctx, eyeX + p.facing * 2, y + 17, 3, 4, '#123d4d');
    ellipse(ctx, eyeX - 2, y + 14, 2, 2, '#e2fff2');
    ctx.strokeStyle = '#5b8b86'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + p.w / 2, y + 26, 4, .2, Math.PI - .2); ctx.stroke();
  }

  drawViewportDetails(model) {
    const ctx = this.ctx;
    // Small edge ticks signal that the compact mobile view follows the probe.
    if (this.viewWidth < LEVEL.width) {
      ctx.fillStyle = 'rgba(185,220,206,.6)'; ctx.font = '600 8px system-ui, sans-serif';
      if (this.cameraX > 1) ctx.fillText('← ЛЁГКИЕ', 17, 26);
      if (this.cameraX < LEVEL.width - this.viewWidth - 1) { ctx.textAlign = 'right'; ctx.fillText('МЫШЦА →', this.viewWidth - 17, 26); ctx.textAlign = 'left'; }
    }
  }

  destroy() {
    if (!this.canvas) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas = null;
    this.ctx = null;
  }
}
