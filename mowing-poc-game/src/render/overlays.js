import { clamp } from '../pathing.js';

export function createOverlayRenderer(game) {
  function drawPathOverlay(points, options = {}) {
    if (points.length < 2) {
      return;
    }

    const { ctx } = game;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const showBrush = options.showBrush !== false;
    if (showBrush) {
      ctx.strokeStyle = options.fillColor || 'rgba(88, 181, 234, 0.34)';
      ctx.lineWidth = game.route.brushRadius * 2;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = options.centerColor || '#f4fbff';
    ctx.lineWidth = options.centerWidth || 2;
    ctx.setLineDash(Array.isArray(options.centerDash) ? options.centerDash : []);
    const smoothCenter = options.smoothCenter === true && points.length > 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (smoothCenter) {
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) * 0.5;
        const midY = (points[i].y + points[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const tail = points[points.length - 1];
      ctx.lineTo(tail.x, tail.y);
    } else {
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPenaltyPopups() {
    const { ctx } = game;
    for (const popup of game.effects.penaltyPopups) {
      const alpha = clamp(popup.ttl / popup.maxTtl, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff3d3d';
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
  }

  function drawPointerBrush() {
    if (!(game.ui.mode === 'drawing' && game.input.pointerDown)) {
      return;
    }

    const { ctx } = game;
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 248, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(game.input.pointer.x, game.input.pointer.y, game.route.brushRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRouteLayers() {
    if (game.ui.mode === 'animating' && game.route.playbackPoints.length > 1) {
      drawPathOverlay(game.route.playbackPoints, {
        centerColor: '#101010',
        centerWidth: 2,
        centerDash: [8, 6],
        showBrush: false,
        smoothCenter: true,
      });
      return;
    }

    if (
      (game.ui.mode === 'drawing' || game.ui.mode === 'review')
      && game.route.draftPoints.length > 1
    ) {
      drawPathOverlay(game.route.draftPoints, {
        fillColor: 'rgba(71, 166, 225, 0.32)',
        centerColor: '#f7fdff',
        centerWidth: 2,
      });
    }
  }

  return {
    drawPathOverlay,
    drawPenaltyPopups,
    drawPointerBrush,
    drawRouteLayers,
  };
}

