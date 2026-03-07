import {
  DEFAULT_LAWN_MAP_ID,
  DEFAULT_MOWER_TYPE_ID,
  FIXED_STEP,
  MOWER_TYPES,
} from './constants.js';

function cloneObstacle(obstacle) {
  return { ...obstacle };
}

function cloneFeature(feature) {
  return { ...feature };
}

function cloneScene(scene) {
  return {
    ...scene,
    lawn: scene?.lawn ? { ...scene.lawn } : null,
    house: scene?.house ? { ...scene.house } : null,
    driveway: scene?.driveway ? { ...scene.driveway } : null,
    spawn: scene?.spawn ? { ...scene.spawn } : null,
    yardFeatures: Array.isArray(scene?.yardFeatures)
      ? scene.yardFeatures.map(cloneFeature)
      : [],
  };
}

function getDefaultSpawn(scene) {
  return {
    x: scene.spawn?.x ?? scene.lawn.x + 72,
    y: scene.spawn?.y ?? scene.lawn.y + 58,
  };
}

export function createInitialState({
  canvas,
  ctx,
  lawnMaps,
  mapArtAssets,
  mowerSpriteAssets,
  grassSprites,
}) {
  const defaultLawn = lawnMaps[DEFAULT_LAWN_MAP_ID];
  const activeScene = cloneScene(defaultLawn.scene);
  const mowerType = MOWER_TYPES[DEFAULT_MOWER_TYPE_ID];
  const spawn = getDefaultSpawn(activeScene);

  return {
    canvas,
    ctx,
    world: {
      width: canvas.width,
      height: canvas.height,
    },
    catalogs: {
      lawnMaps,
      mowerTypes: MOWER_TYPES,
    },
    defaults: {
      mowerId: DEFAULT_MOWER_TYPE_ID,
      lawnId: DEFAULT_LAWN_MAP_ID,
    },
    assets: {
      mapArtAssets,
      mowerSpriteAssets,
      grassSprites,
    },
    scene: {
      activeMapId: DEFAULT_LAWN_MAP_ID,
      activeScene,
      activeObstacles: defaultLawn.obstacles.map(cloneObstacle),
      activeYardFeatures: Array.isArray(activeScene.yardFeatures)
        ? activeScene.yardFeatures.map(cloneFeature)
        : [],
      activeMapArt: mapArtAssets[DEFAULT_LAWN_MAP_ID] || null,
      lastSelections: {
        mowerId: null,
        lawnId: null,
      },
    },
    mowerSprite: {
      assetId: 'mowerSheet',
      frame: { x: 256, y: 0, w: 256, h: 256 },
      drawW: 54,
      drawH: 54,
      headingOffset: -Math.PI / 2,
      directionalFrames: null,
    },
    mower: {
      x: spawn.x,
      y: spawn.y,
      heading: 0,
      radius: 18,
      deckRadius: mowerType.deckRadius,
      playbackSpeed: mowerType.playbackSpeed,
      typeId: DEFAULT_MOWER_TYPE_ID,
      typeLabel: mowerType.label,
      fuelCapacity: mowerType.fuelCapacity,
      fuel: mowerType.fuelCapacity,
      fuelBurnPerPixel: mowerType.fuelBurnPerPixel,
    },
    input: {
      pointerDown: false,
      pointer: { x: spawn.x, y: spawn.y },
      fastForward: false,
    },
    mowGrid: {
      cell: 9,
      cols: Math.floor(canvas.width / 9),
      rows: Math.floor(canvas.height / 9),
      states: [],
      layValues: [],
      layBlendStrength: 0.08,
      mowableCount: 0,
      mowedCount: 0,
    },
    ui: {
      mode: 'menu',
      elapsed: 0,
      coverage: 0,
      lastWinAt: null,
      musicMuted: true,
      cash: 0,
      totalCrashes: 0,
      lastPenalty: 0,
      transientMessage: '',
      transientTimer: 0,
      selectedMowerId: null,
      selectedLawnId: null,
      menu: {
        section: 0,
        buttonIndex: 0,
        buttons: [],
      },
    },
    route: {
      draftPoints: [],
      draftLength: 0,
      playbackPoints: [],
      playbackLengths: [],
      totalLength: 0,
      progress: 0,
      brushRadius: mowerType.deckRadius,
      minPointSpacing: 5,
      minPathLength: 20,
      fastForwardMultiplier: 3,
      pausedForFuel: false,
    },
    animation: {
      flipActive: false,
      flipTimer: 0,
      flipDuration: 0.4,
      flipBaseHeading: 0,
    },
    effects: {
      penaltyPopups: [],
      overlappingObstacleIds: [],
    },
    audio: {
      ctx: null,
      master: null,
      started: false,
      muted: true,
      step: 0,
      timerId: null,
      bassOsc: null,
      bassGain: null,
      padOsc: null,
      padGain: null,
    },
    timing: {
      accumulator: 0,
      lastTime: performance.now(),
      fixedStep: FIXED_STEP,
    },
  };
}

