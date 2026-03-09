import {
  GRASS_SPRITE_SOURCES,
  MOWER_SPRITE_ASSET_SOURCES,
} from './constants.js';

export function createImageAsset(src, options = {}) {
  if (!src) return null;

  const asset = {
    src,
    image: new Image(),
    loaded: false,
    error: false,
    width: 0,
    height: 0,
    imageData: null,
    isMask: options.isMask === true,
  };

  asset.image.onload = () => {
    asset.loaded = true;
    asset.width = asset.image.naturalWidth || asset.image.width || 0;
    asset.height = asset.image.naturalHeight || asset.image.height || 0;
    if (asset.isMask) {
      try {
        const buffer = document.createElement('canvas');
        buffer.width = asset.width;
        buffer.height = asset.height;
        const bufferCtx = buffer.getContext('2d', { willReadFrequently: true });
        bufferCtx.drawImage(asset.image, 0, 0, asset.width, asset.height);
        asset.imageData = bufferCtx.getImageData(0, 0, asset.width, asset.height).data;
      } catch (error) {
        asset.error = true;
        asset.imageData = null;
      }
    }
  };

  asset.image.onerror = () => {
    asset.error = true;
  };
  asset.image.src = src;

  return asset;
}

export function createMowerSpriteAssets() {
  return {
    mowerSheet: createImageAsset(MOWER_SPRITE_ASSET_SOURCES.mowerSheet),
    pushManual16: createImageAsset(MOWER_SPRITE_ASSET_SOURCES.pushManual16),
  };
}

export function createGrassSprites() {
  return {
    sheet: createImageAsset(GRASS_SPRITE_SOURCES.sheet),
  };
}

export function createMapArtRegistry(lawnMaps) {
  const registry = {};

  for (const lawnMap of Object.values(lawnMaps)) {
    if (!lawnMap?.art?.enabled) {
      continue;
    }

    registry[lawnMap.id] = {
      enabled: true,
      base: createImageAsset(lawnMap.art.baseSrc),
      mowMask: createImageAsset(lawnMap.art.mowMaskSrc, { isMask: true }),
      collisionMask: createImageAsset(lawnMap.art.collisionMaskSrc, { isMask: true }),
      foreground: createImageAsset(lawnMap.art.foregroundSrc),
    };
  }

  return registry;
}
