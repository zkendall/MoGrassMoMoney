import { FUEL_PRICE_PER_GALLON } from './constants.js';
import { getMowerSpriteRenderState } from './pathing.js';

export function createDebugApi(game, deps) {
  const {
    menuApi,
    playbackApi,
    mowerUsesFuel,
    getRefillCost,
    getMapArtDiagnostics,
  } = deps;

  function renderGameToText() {
    const visibleObstacles = game.scene.activeObstacles.map((obstacle) => (
      obstacle.kind === 'circle'
        ? { id: obstacle.id, style: obstacle.style, kind: obstacle.kind, x: obstacle.x, y: obstacle.y, r: obstacle.r }
        : { id: obstacle.id, style: obstacle.style, kind: obstacle.kind, x: obstacle.x, y: obstacle.y, w: obstacle.w, h: obstacle.h }
    ));
    const visibleYardFeatures = game.scene.activeYardFeatures.map((feature) => {
      if (feature.kind === 'circle') {
        return {
          id: feature.id,
          style: feature.style,
          kind: feature.kind,
          x: feature.x,
          y: feature.y,
          r: feature.r,
          non_mowable: Boolean(feature.nonMowable),
        };
      }
      if (feature.kind === 'ellipse') {
        return {
          id: feature.id,
          style: feature.style,
          kind: feature.kind,
          cx: feature.cx,
          cy: feature.cy,
          rx: feature.rx,
          ry: feature.ry,
          non_mowable: Boolean(feature.nonMowable),
        };
      }
      return {
        id: feature.id,
        style: feature.style,
        kind: feature.kind,
        x: feature.x,
        y: feature.y,
        w: feature.w,
        h: feature.h,
        non_mowable: Boolean(feature.nonMowable),
      };
    });

    const reviewButtons = playbackApi.getReviewButtons().map((button) => ({
      id: button.id,
      label: button.label,
      x: Number(button.x.toFixed(2)),
      y: Number(button.y.toFixed(2)),
      w: Number(button.w.toFixed(2)),
      h: Number(button.h.toFixed(2)),
      enabled: Boolean(button.enabled),
    }));
    const menuOptionRects = menuApi.getMenuOptionRects();
    const mowerSpriteRender = getMowerSpriteRenderState(game, game.mower.heading);

    const payload = {
      coordinate_system: 'origin top-left; +x right; +y down; units in canvas pixels',
      mode: game.ui.mode,
      coverage_percent: Number(game.ui.coverage.toFixed(2)),
      target_percent: game.scene.activeScene.targetCoverage,
      setup: {
        menu_active: game.ui.mode === 'menu',
        selected_mower_id: game.ui.selectedMowerId,
        selected_lawn_id: game.ui.selectedLawnId,
        start_enabled: menuApi.menuStartEnabled(),
        mower_options: Object.keys(game.catalogs.mowerTypes).map((id) => ({
          id,
          label: game.catalogs.mowerTypes[id].label,
          selected: id === game.ui.selectedMowerId,
        })),
        lawn_options: Object.keys(game.catalogs.lawnMaps).map((id) => ({
          id,
          label: game.catalogs.lawnMaps[id].label,
          selected: id === game.ui.selectedLawnId,
        })),
        mower_option_hitboxes: menuOptionRects.mowerOptions.map((option) => ({
          id: option.id,
          x: Number(option.x.toFixed(2)),
          y: Number(option.y.toFixed(2)),
          w: Number(option.w.toFixed(2)),
          h: Number(option.h.toFixed(2)),
        })),
        lawn_option_hitboxes: menuOptionRects.lawnOptions.map((option) => ({
          id: option.id,
          x: Number(option.x.toFixed(2)),
          y: Number(option.y.toFixed(2)),
          w: Number(option.w.toFixed(2)),
          h: Number(option.h.toFixed(2)),
        })),
        buttons: menuApi.getMenuButtons().map((button) => ({
          id: button.id,
          label: button.label,
          x: Number(button.x.toFixed(2)),
          y: Number(button.y.toFixed(2)),
          w: Number(button.w.toFixed(2)),
          h: Number(button.h.toFixed(2)),
          enabled: Boolean(button.enabled),
        })),
      },
      planning: {
        is_drawing: game.ui.mode === 'drawing' && game.input.pointerDown,
        point_count: game.route.draftPoints.length,
        path_length_px: Number(game.route.draftLength.toFixed(2)),
        brush_radius_px: game.route.brushRadius,
        has_review_path: game.ui.mode === 'review' && game.route.draftPoints.length > 1,
      },
      mowing_visuals: {
        tile_size_px: game.mowGrid.cell,
        assets: {
          unmowed: 'assets/grass-unmowed.png',
          mowed: 'assets/grass-mowed.png',
        },
        frame_width_px: 16,
        frame_height_px: 16,
        autotile_columns: 8,
        autotile_mask_bits: ['south_lower', 'east_lower', 'southeast_lower'],
        column_zero_rotation: 'deterministic quarter-turn from hashed grid row/col',
      },
      review: {
        mode_active: game.ui.mode === 'review',
        buttons: reviewButtons,
      },
      playback: {
        is_animating: game.ui.mode === 'animating',
        waiting_for_fuel: game.route.pausedForFuel,
        progress_0_to_1: game.route.totalLength > 0
          ? Number((game.route.progress / game.route.totalLength).toFixed(4))
          : 0,
        speed_px_per_sec: game.mower.playbackSpeed,
        effective_speed_px_per_sec: game.input.fastForward
          ? game.mower.playbackSpeed * game.route.fastForwardMultiplier
          : game.mower.playbackSpeed,
        flip_active: game.animation.flipActive,
        current_heading_radians: Number(game.mower.heading.toFixed(3)),
      },
      economy: {
        cash: Number(game.ui.cash.toFixed(2)),
        total_crashes: game.ui.totalCrashes,
        last_penalty: game.ui.lastPenalty,
        refill_price_per_gallon: FUEL_PRICE_PER_GALLON,
        refill_cost: Number(getRefillCost().toFixed(2)),
      },
      effects: {
        active_penalty_popups: game.effects.penaltyPopups.length,
      },
      mower: {
        x: Number(game.mower.x.toFixed(2)),
        y: Number(game.mower.y.toFixed(2)),
        heading_radians: Number(game.mower.heading.toFixed(3)),
        body_radius: game.mower.radius,
        deck_radius: game.mower.deckRadius,
        type_id: game.mower.typeId,
        type_label: game.mower.typeLabel,
        uses_fuel: mowerUsesFuel(),
        fuel: Number(game.mower.fuel.toFixed(2)),
        fuel_capacity: game.mower.fuelCapacity,
        fuel_burn_per_pixel: game.mower.fuelBurnPerPixel,
        sprite_asset_id: game.mowerSprite.assetId,
        sprite_directional_frame_index: mowerSpriteRender.directionalFrameIndex,
      },
      collision_debug: {
        overlapping_obstacle_ids: game.effects.overlappingObstacleIds.slice(),
      },
      map: {
        id: game.scene.activeMapId,
        lawn: {
          ...game.scene.activeScene.lawn,
          kind: game.scene.activeScene.lawn.kind || 'rect',
        },
        house_block: game.scene.activeScene.house,
        driveway_block: game.scene.activeScene.driveway,
        yard_features: visibleYardFeatures,
        obstacles: visibleObstacles,
        art: getMapArtDiagnostics(game),
      },
      input: {
        pointer_down: game.input.pointerDown,
        pointer: {
          x: Number(game.input.pointer.x.toFixed(2)),
          y: Number(game.input.pointer.y.toFixed(2)),
        },
        fast_forward: game.input.fastForward,
        music_muted: game.ui.musicMuted,
      },
      objective: 'Pick mower + lawn, draw routes, accept playback, and reach 95% coverage while minimizing crash penalties.',
    };

    return JSON.stringify(payload);
  }

  return {
    renderGameToText,
  };
}
