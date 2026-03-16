export const REFILL_GALLON_EPSILON = 0.005;
export const FUEL_PRICE_PER_GALLON = 3;
export const FIXED_STEP = 1 / 60;

export const DEFAULT_MOWER_TYPE_ID = 'small_gas';
export const DEFAULT_LAWN_MAP_ID = 'empty_field';

export const MOWER_SPRITE_ASSET_SOURCES = {
  mowerSheet: 'assets/mower-sheet.png',
  pushManual16: 'assets/push-mower-16dir.png',
};

export const GRASS_SPRITE_SOURCES = {
  unmowed: 'assets/grass-unmowed.png',
  mowed: 'assets/grass-mowed.png',
};

export const GRASS_TILE_CONFIG = {
  cellSize: 16,
  frameWidth: 16,
  frameHeight: 16,
  columns: 8,
};

export const MOWER_TYPES = {
  manual: {
    id: 'manual',
    label: 'Manual Push',
    playbackSpeed: 90,
    deckRadius: 16,
    fuelCapacity: 0,
    fuelBurnPerPixel: 0,
    spriteAssetId: 'pushManual16',
    spriteFrame: { x: 0, y: 0, w: 256, h: 256 },
    spriteDirectionalFrames: { frameW: 320, frameH: 320, columns: 4, count: 16 },
    spriteDraw: { w: 64, h: 64 },
  },
  small_gas: {
    id: 'small_gas',
    label: 'Small Gas',
    playbackSpeed: 120,
    deckRadius: 16,
    fuelCapacity: 0.5,
    fuelBurnPerPixel: 0.0002,
    spriteAssetId: 'mowerSheet',
    spriteFrame: { x: 256, y: 0, w: 256, h: 256 },
    spriteDraw: { w: 64, h: 64 },
  },
  large_rider: {
    id: 'large_rider',
    label: 'Large Rider',
    playbackSpeed: 158,
    deckRadius: 34,
    fuelCapacity: 1.5,
    fuelBurnPerPixel: 0.00032,
    spriteAssetId: 'mowerSheet',
    // Tight crop of row 2, col 3 orange rider to avoid neighboring bleed.
    spriteFrame: { x: 537, y: 348, w: 192, h: 164 },
    spriteDraw: { w: 72, h: 72 },
  },
};

export const REVIEW_LAYOUT = {
  width: 170,
  height: 50,
  gap: 24,
  y: 640 - 95,
};

export const MENU_LAYOUT = {
  panel: { x: 120, y: 94, w: 720, h: 492 },
  optionWidth: 180,
  optionHeight: 44,
  optionGap: 14,
  startButton: { id: 'start_job', label: 'Start Job', x: 270, y: 500, w: 220, h: 50 },
  resetButton: { id: 'reset_defaults', label: 'Reset Defaults', x: 510, y: 500, w: 220, h: 50 },
};
