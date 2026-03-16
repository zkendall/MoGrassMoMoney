import { FUEL_PRICE_PER_GALLON, MENU_LAYOUT } from '../constants.js';

export function createUiRenderer(game, deps) {
  const {
    menuApi,
    playbackApi,
    mowerUsesFuel,
    getGrassDebugInfoAt,
  } = deps;

  function drawRoundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    game.ctx.beginPath();
    game.ctx.moveTo(x + radius, y);
    game.ctx.lineTo(x + w - radius, y);
    game.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    game.ctx.lineTo(x + w, y + h - radius);
    game.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    game.ctx.lineTo(x + radius, y + h);
    game.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    game.ctx.lineTo(x, y + radius);
    game.ctx.quadraticCurveTo(x, y, x + radius, y);
    game.ctx.closePath();
  }

  function drawReviewButtons() {
    for (const button of playbackApi.getReviewButtons()) {
      game.ctx.save();
      drawRoundedRect(button.x, button.y, button.w, button.h, 12);
      game.ctx.fillStyle = button.id === 'accept' ? '#2d7f49' : '#a34b3f';
      if (!button.enabled) {
        game.ctx.fillStyle = 'rgba(90, 90, 90, 0.7)';
      }
      game.ctx.fill();
      game.ctx.strokeStyle = 'rgba(236, 233, 218, 0.95)';
      game.ctx.lineWidth = 2;
      game.ctx.stroke();

      game.ctx.fillStyle = '#f4f0e0';
      game.ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
      const textWidth = game.ctx.measureText(button.label).width;
      game.ctx.fillText(button.label, button.x + (button.w - textWidth) * 0.5, button.y + 33);
      game.ctx.restore();
    }
  }

  function drawInstructionToast(title, subtitle, options = {}) {
    const w = options.width || 620;
    const h = options.height || 92;
    const x = options.x ?? (game.world.width - w) * 0.5;
    const y = options.y ?? (game.world.height - h - 18);

    game.ctx.fillStyle = 'rgb(12 18 14 / 72%)';
    game.ctx.fillRect(x, y, w, h);
    game.ctx.strokeStyle = '#d3c8aa';
    game.ctx.lineWidth = 2;
    game.ctx.strokeRect(x, y, w, h);

    game.ctx.fillStyle = '#f4f0e0';
    game.ctx.font = 'bold 27px "Trebuchet MS", sans-serif';
    game.ctx.fillText(title, x + 24, y + 38);
    game.ctx.font = '16px "Trebuchet MS", sans-serif';
    game.ctx.fillText(subtitle, x + 24, y + 65);
  }

  function drawStatusBar() {
    game.ctx.fillStyle = 'rgb(20 30 24 / 72%)';
    game.ctx.fillRect(16, 12, 285, 104);

    game.ctx.fillStyle = '#f4f0e0';
    game.ctx.font = '16px "Trebuchet MS", sans-serif';
    game.ctx.fillText(`Coverage: ${game.ui.coverage.toFixed(1)}%`, 28, 34);
    game.ctx.fillText(`Target: ${game.scene.activeScene.targetCoverage}%`, 28, 56);
    game.ctx.fillText(`Cash: $${game.ui.cash.toFixed(2)}`, 28, 78);

    const fuelText = mowerUsesFuel()
      ? `${game.mower.fuel.toFixed(2)} / ${game.mower.fuelCapacity.toFixed(2)} gal`
      : 'N/A (manual)';
    game.ctx.fillText(`Fuel: ${fuelText}`, 28, 100);
  }

  function drawGrassDebugPanel() {
    if (!game.debug.grassSpriteIndices) {
      return;
    }

    const info = getGrassDebugInfoAt(game.input.pointer.x, game.input.pointer.y);
    const x = game.world.width - 276;
    const y = 12;
    const w = 260;
    const h = 122;

    game.ctx.fillStyle = 'rgb(20 30 24 / 82%)';
    game.ctx.fillRect(x, y, w, h);
    game.ctx.strokeStyle = '#d3c8aa';
    game.ctx.lineWidth = 2;
    game.ctx.strokeRect(x, y, w, h);

    game.ctx.fillStyle = '#f4f0e0';
    game.ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    game.ctx.fillText('Grass Debug', x + 14, y + 24);
    game.ctx.font = '14px "Trebuchet MS", sans-serif';

    if (!info) {
      game.ctx.fillText('Cursor: outside mow grid', x + 14, y + 50);
      return;
    }

    game.ctx.fillText(`Cursor: row ${info.row}, col ${info.col}`, x + 14, y + 50);
    game.ctx.fillText(`State: ${info.state}`, x + 14, y + 70);
    game.ctx.fillText(`Frame: ${info.frame_column ?? '-'}`, x + 14, y + 90);
    game.ctx.fillText(`Rotation: ${info.rotation_degrees} deg`, x + 14, y + 110);
  }

  function drawMenu() {
    const panel = MENU_LAYOUT.panel;
    const { mowerOptions, lawnOptions } = menuApi.getMenuOptionRects();
    const buttons = menuApi.getMenuButtons();
    game.ui.menu.buttons = buttons.map((button) => ({ ...button }));

    game.ctx.save();
    drawRoundedRect(panel.x, panel.y, panel.w, panel.h, 18);
    game.ctx.fillStyle = 'rgba(8, 15, 12, 0.86)';
    game.ctx.fill();
    game.ctx.strokeStyle = 'rgba(220, 205, 164, 0.95)';
    game.ctx.lineWidth = 2;
    game.ctx.stroke();

    game.ctx.fillStyle = '#f4f0e0';
    game.ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    game.ctx.fillText('MoGrassMoMoney Setup', panel.x + 28, panel.y + 52);
    game.ctx.font = '16px "Trebuchet MS", sans-serif';
    game.ctx.fillText(
      'Pick your mower and lawn map before starting the route-planning loop.',
      panel.x + 28,
      panel.y + 78
    );

    game.ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    game.ctx.fillText('Mower Type', panel.x + 28, panel.y + 126);
    for (const option of mowerOptions) {
      drawRoundedRect(option.x, option.y, option.w, option.h, 10);
      game.ctx.fillStyle = option.selected ? '#2f7f48' : 'rgba(48, 64, 55, 0.94)';
      game.ctx.fill();
      game.ctx.strokeStyle = option.selected ? '#e9e2ca' : 'rgba(168, 178, 171, 0.8)';
      game.ctx.lineWidth = game.ui.menu.section === 0 && option.selected ? 3 : 1.5;
      game.ctx.stroke();
      game.ctx.fillStyle = '#f4f0e0';
      game.ctx.font = '16px "Trebuchet MS", sans-serif';
      game.ctx.fillText(option.label, option.x + 12, option.y + 28);
    }

    game.ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    game.ctx.fillText('Lawn Map', panel.x + 28, panel.y + 258);
    for (const option of lawnOptions) {
      drawRoundedRect(option.x, option.y, option.w, option.h, 10);
      game.ctx.fillStyle = option.selected ? '#2f7f48' : 'rgba(48, 64, 55, 0.94)';
      game.ctx.fill();
      game.ctx.strokeStyle = option.selected ? '#e9e2ca' : 'rgba(168, 178, 171, 0.8)';
      game.ctx.lineWidth = game.ui.menu.section === 1 && option.selected ? 3 : 1.5;
      game.ctx.stroke();
      game.ctx.fillStyle = '#f4f0e0';
      game.ctx.font = '16px "Trebuchet MS", sans-serif';
      game.ctx.fillText(option.label, option.x + 12, option.y + 28);
    }

    for (const button of buttons) {
      drawRoundedRect(button.x, button.y, button.w, button.h, 12);
      const isPrimary = button.id === 'start_job';
      if (!button.enabled) {
        game.ctx.fillStyle = 'rgba(86, 86, 86, 0.82)';
      } else {
        game.ctx.fillStyle = isPrimary ? '#2d7f49' : '#8b5d3c';
      }
      game.ctx.fill();
      const isFocused = game.ui.menu.section === 2
        && buttons[game.ui.menu.buttonIndex]?.id === button.id;
      game.ctx.strokeStyle = isFocused
        ? '#f7efd0'
        : 'rgba(236, 233, 218, 0.95)';
      game.ctx.lineWidth = isFocused ? 3 : 2;
      game.ctx.stroke();
      game.ctx.fillStyle = '#f4f0e0';
      game.ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      const textWidth = game.ctx.measureText(button.label).width;
      game.ctx.fillText(button.label, button.x + (button.w - textWidth) * 0.5, button.y + 32);
    }

    game.ctx.font = '15px "Trebuchet MS", sans-serif';
    game.ctx.fillStyle = 'rgba(240, 235, 219, 0.95)';
    game.ctx.fillText(
      'Mouse: click options and Start Job. Keyboard: Up/Down section, Left/Right cycle, Enter/Space start.',
      panel.x + 28,
      panel.y + panel.h - 18
    );
    game.ctx.restore();
  }

  function drawUi() {
    if (game.ui.mode === 'menu') {
      drawMenu();
      drawGrassDebugPanel();
      if (game.ui.transientMessage) {
        drawInstructionToast(game.ui.transientMessage, 'Choose your setup and start the job.');
      }
      return;
    }

    drawStatusBar();
    drawGrassDebugPanel();

    if (game.ui.mode === 'start') {
      drawInstructionToast(
        'Click to begin planning',
        'Draw with left mouse. Accept/Retry after release. E refill, R menu, F fullscreen, M music.'
      );
    } else if (game.ui.mode === 'review') {
      drawInstructionToast(
        'Review Path',
        'Click Accept to execute this route, or Retry to draw again.',
        { y: game.world.height - 208 }
      );
      drawReviewButtons();
    } else if (game.ui.mode === 'animating') {
      const animatingSubtitle = game.route.pausedForFuel
        ? `Out of fuel. Press E to refill ($${FUEL_PRICE_PER_GALLON.toFixed(2)}/gal) and continue.`
        : 'Mower is following your planned path. Hold Space to fast-forward.';
      drawInstructionToast('Executing Route', animatingSubtitle);
    } else if (game.ui.mode === 'won') {
      drawInstructionToast(
        'Job complete!',
        `Coverage ${game.ui.coverage.toFixed(1)}%. Final cash: $${game.ui.cash}. Press R to restart.`
      );
    } else if (game.ui.mode === 'drawing' && game.route.draftPoints.length < 2) {
      drawInstructionToast('Plan Your Route', 'Click and drag to draw a mow path.');
    }

    if (game.ui.transientMessage) {
      drawInstructionToast(game.ui.transientMessage, 'Adjust your path and try again.');
    }
  }

  return {
    drawRoundedRect,
    drawReviewButtons,
    drawInstructionToast,
    drawStatusBar,
    drawMenu,
    drawUi,
  };
}
