import { createAudioApi } from './audio.js';
import { createGrassSprites, createMapArtRegistry, createMowerSpriteAssets } from './assets.js';
import { createDebugApi } from './debug.js';
import { createEconomyApi } from './economy.js';
import { attachKeyboardInput } from './input/keyboard.js';
import { attachPointerInput } from './input/pointer.js';
import {
  applySelectedSetup,
  circleRectIntersects,
  clampPointToLawn,
  getMapArtDiagnostics,
  hasActiveBaseArt,
  hasActiveForegroundArt,
  isPointMowable,
} from './lawn.js';
import { createMenuApi } from './menu.js';
import { createMowGridApi } from './mowGrid.js';
import {
  buildCumulativeLengths,
  clamp,
  dedupeClosePoints,
  dist,
  pointInRect,
  resamplePolyline,
  samplePointOnPath,
  smoothPolyline,
} from './pathing.js';
import { createPlaybackApi } from './playback.js';
import { createMowerRenderer } from './render/mower.js';
import { createOverlayRenderer } from './render/overlays.js';
import { createSceneRenderer } from './render/scene.js';
import { createUiRenderer } from './render/ui.js';
import { createInitialState } from './state.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const lawnMaps = typeof window.createMowingLawnMaps === 'function'
  ? window.createMowingLawnMaps()
  : window.MOWING_LAWN_MAPS;
if (!lawnMaps) {
  throw new Error('Missing lawn maps registry. Ensure maps.js loads before game.js.');
}

const mapArtAssets = createMapArtRegistry(lawnMaps);
const mowerSpriteAssets = createMowerSpriteAssets();
const grassSprites = createGrassSprites();
const game = createInitialState({
  canvas,
  ctx,
  lawnMaps,
  mapArtAssets,
  mowerSpriteAssets,
  grassSprites,
});

const audioApi = createAudioApi(game);
const economyApi = createEconomyApi(game);
const mowGridApi = createMowGridApi(game, { isPointMowable, clamp });
const playbackApi = createPlaybackApi(game, {
  clampPointToLawn,
  circleRectIntersects,
  dist,
  dedupeClosePoints,
  resamplePolyline,
  smoothPolyline,
  buildCumulativeLengths,
  samplePointOnPath,
  pointInRect,
  mowerUsesFuel: economyApi.mowerUsesFuel,
  markTransientMessage: economyApi.markTransientMessage,
  triggerCrashPenalty: economyApi.triggerCrashPenalty,
  mowUnderDeck: mowGridApi.mowUnderDeck,
});
const menuApi = createMenuApi(game, {
  markTransientMessage: economyApi.markTransientMessage,
  applySelectedSetup,
  initMowGrid: mowGridApi.initMowGrid,
  pointInRect,
});
const sceneRenderer = createSceneRenderer(game, {
  hasActiveBaseArt,
  hasActiveForegroundArt,
});
const mowerRenderer = createMowerRenderer(game);
const overlayRenderer = createOverlayRenderer(game);
const uiRenderer = createUiRenderer(game, {
  menuApi,
  playbackApi,
  mowerUsesFuel: economyApi.mowerUsesFuel,
  getGrassDebugInfoAt: sceneRenderer.getGrassDebugInfoAt,
});
const debugApi = createDebugApi(game, {
  menuApi,
  playbackApi,
  mowerUsesFuel: economyApi.mowerUsesFuel,
  getRefillCost: economyApi.getRefillCost,
  getMapArtDiagnostics,
  getGrassDebugInfoAt: sceneRenderer.getGrassDebugInfoAt,
});

function setGrassSpriteDebug(enabled) {
  game.debug.grassSpriteIndices = Boolean(enabled);
  economyApi.markTransientMessage(
    game.debug.grassSpriteIndices
      ? 'Grass debug panel on.'
      : 'Grass debug panel off.'
  );
  render();
}

function render() {
  sceneRenderer.drawScene();
  overlayRenderer.drawRouteLayers();
  mowerRenderer.drawMower();
  sceneRenderer.drawForegroundArt();
  overlayRenderer.drawPointerBrush();
  uiRenderer.drawUi();
  overlayRenderer.drawPenaltyPopups();
}

function update(dt) {
  game.ui.elapsed += dt;
  economyApi.updateTransients(dt);
  playbackApi.updateAnimation(dt);
}

function resetGame() {
  menuApi.openMenu();
}

function frame(now) {
  const dt = Math.min(0.05, (now - game.timing.lastTime) / 1000);
  game.timing.lastTime = now;
  game.timing.accumulator += dt;

  while (game.timing.accumulator >= game.timing.fixedStep) {
    update(game.timing.fixedStep);
    game.timing.accumulator -= game.timing.fixedStep;
  }

  render();
  requestAnimationFrame(frame);
}

attachPointerInput({
  game,
  audioApi,
  menuApi,
  playbackApi,
});

attachKeyboardInput({
  game,
  audioApi,
  economyApi,
  menuApi,
  resetGame,
  setGrassSpriteDebug,
});

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    update(1 / 60);
  }
  render();
};
window.render_game_to_text = debugApi.renderGameToText;
window.setGrassSpriteDebug = setGrassSpriteDebug;
window.getGrassDebugInfoAt = sceneRenderer.getGrassDebugInfoAt;

resetGame();
render();
requestAnimationFrame(frame);
