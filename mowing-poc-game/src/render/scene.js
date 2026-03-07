import { getCompressedBrightnessBlend, clamp } from '../pathing.js';

export function createSceneRenderer(game, deps) {
  const {
    hasActiveBaseArt,
    hasActiveForegroundArt,
  } = deps;

  function drawMowGrid() {
    const { ctx } = game;
    const grassSprites = game.assets.grassSprites;

    for (let row = 0; row < game.mowGrid.rows; row += 1) {
      for (let col = 0; col < game.mowGrid.cols; col += 1) {
        const idx = row * game.mowGrid.cols + col;
        const cell = game.mowGrid.states[idx];
        const layValue = clamp(game.mowGrid.layValues[idx] || 0, -1, 1);
        if (cell === 0) {
          continue;
        }

        const x = col * game.mowGrid.cell;
        const y = row * game.mowGrid.cell;
        if (cell === 1 && grassSprites.unmowedLoaded) {
          ctx.fillStyle = '#6aa65e';
          ctx.fillRect(x, y, game.mowGrid.cell, game.mowGrid.cell);
          ctx.drawImage(grassSprites.unmowed, 0, 0, 128, 128, x, y, game.mowGrid.cell, game.mowGrid.cell);
        } else if (cell === 2 && grassSprites.mowedLightLoaded && grassSprites.mowedDarkLoaded) {
          const lightAlpha = getCompressedBrightnessBlend(layValue);
          const darkAlpha = 1 - lightAlpha;
          const channel = Math.round(84 + lightAlpha * 12);
          const green = Math.round(137 + lightAlpha * 16);
          const blue = Math.round(80 + lightAlpha * 12);
          ctx.fillStyle = `rgb(${channel}, ${green}, ${blue})`;
          ctx.fillRect(x, y, game.mowGrid.cell, game.mowGrid.cell);
          if (darkAlpha > 0.001) {
            ctx.save();
            ctx.globalAlpha = darkAlpha;
            ctx.drawImage(grassSprites.mowedDark, 0, 0, 128, 128, x, y, game.mowGrid.cell, game.mowGrid.cell);
            ctx.restore();
          }
          if (lightAlpha > 0.001) {
            ctx.save();
            ctx.globalAlpha = lightAlpha;
            ctx.drawImage(grassSprites.mowedLight, 0, 0, 128, 128, x, y, game.mowGrid.cell, game.mowGrid.cell);
            ctx.restore();
          }
        } else if (cell === 1) {
          ctx.fillStyle = ((row + col) % 2 === 0) ? '#6aa65e' : '#72ad65';
          ctx.fillRect(x, y, game.mowGrid.cell, game.mowGrid.cell);
        } else {
          const tint = getCompressedBrightnessBlend(layValue);
          const channel = Math.round(84 + tint * 12);
          const green = Math.round(137 + tint * 16);
          const blue = Math.round(80 + tint * 12);
          ctx.fillStyle = `rgb(${channel}, ${green}, ${blue})`;
          ctx.fillRect(x, y, game.mowGrid.cell, game.mowGrid.cell);
        }
      }
    }
  }

  function drawYardFeatures() {
    const { ctx } = game;
    for (const feature of game.scene.activeYardFeatures) {
      const style = feature.style || feature.id || '';
      if (style.includes('pool')) {
        ctx.save();
        ctx.fillStyle = '#4f89ad';
        ctx.beginPath();
        if (feature.kind === 'ellipse') {
          ctx.ellipse(feature.cx, feature.cy, feature.rx, feature.ry, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(feature.x, feature.y, feature.r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.strokeStyle = '#d5eaf6';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (style.includes('walk-path')) {
        ctx.fillStyle = '#c8c6bf';
        if (feature.kind === 'rect') {
          ctx.fillRect(feature.x, feature.y, feature.w, feature.h);
          ctx.strokeStyle = '#e6e4dd';
          ctx.lineWidth = 2;
          ctx.strokeRect(feature.x + 0.5, feature.y + 0.5, feature.w - 1, feature.h - 1);
        }
      }
    }
  }

  function drawLawnBorder() {
    const { ctx } = game;
    ctx.strokeStyle = '#e8dfcf';
    ctx.lineWidth = 4;
    if (game.scene.activeScene.lawn.kind === 'circle') {
      ctx.beginPath();
      ctx.arc(
        game.scene.activeScene.lawn.cx,
        game.scene.activeScene.lawn.cy,
        game.scene.activeScene.lawn.r,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else {
      ctx.strokeRect(
        game.scene.activeScene.lawn.x,
        game.scene.activeScene.lawn.y,
        game.scene.activeScene.lawn.w,
        game.scene.activeScene.lawn.h
      );
    }
  }

  function drawProceduralObstacles() {
    const { ctx } = game;
    for (const obstacle of game.scene.activeObstacles) {
      const style = obstacle.style || obstacle.id;
      if (style.includes('tree')) {
        ctx.fillStyle = '#6e4f33';
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y + 8, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2b6b3f';
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y - 7, obstacle.r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (style.includes('flower-bed')) {
        ctx.fillStyle = '#7a5e45';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
        ctx.fillStyle = '#d9899e';
        for (let i = 0; i < 9; i += 1) {
          const fx = obstacle.x + 10 + (i % 5) * 22;
          const fy = obstacle.y + 11 + Math.floor(i / 5) * 24;
          ctx.beginPath();
          ctx.arc(fx, fy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }

      if (style.includes('rock')) {
        ctx.fillStyle = '#70767b';
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (style.includes('sprinkler')) {
        ctx.fillStyle = '#8aa9bf';
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#deeff7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      if (style.includes('gnome')) {
        ctx.fillStyle = '#f5e0c4';
        ctx.fillRect(obstacle.x, obstacle.y + 10, obstacle.w, obstacle.h - 10);
        ctx.fillStyle = '#c6534a';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.w * 0.5, obstacle.y);
        ctx.lineTo(obstacle.x, obstacle.y + 12);
        ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawScene() {
    const { ctx } = game;
    ctx.fillStyle = '#9aa18d';
    ctx.fillRect(0, 0, game.world.width, game.world.height);

    if (hasActiveBaseArt(game)) {
      ctx.drawImage(game.scene.activeMapArt.base.image, 0, 0, game.world.width, game.world.height);
      drawMowGrid();
      drawLawnBorder();
      return;
    }

    ctx.fillStyle = '#d3c4aa';
    ctx.fillRect(
      game.scene.activeScene.house.x,
      game.scene.activeScene.house.y,
      game.scene.activeScene.house.w,
      game.scene.activeScene.house.h
    );
    ctx.fillStyle = '#ae8f6f';
    ctx.fillRect(
      game.scene.activeScene.house.x + 18,
      game.scene.activeScene.house.y + 14,
      game.scene.activeScene.house.w - 36,
      20
    );

    ctx.fillStyle = '#b7b0a0';
    ctx.fillRect(
      game.scene.activeScene.driveway.x,
      game.scene.activeScene.driveway.y,
      game.scene.activeScene.driveway.w,
      game.scene.activeScene.driveway.h
    );

    drawMowGrid();
    drawYardFeatures();
    drawLawnBorder();
    drawProceduralObstacles();
  }

  function drawForegroundArt() {
    if (!hasActiveForegroundArt(game)) {
      return;
    }

    game.ctx.drawImage(
      game.scene.activeMapArt.foreground.image,
      0,
      0,
      game.world.width,
      game.world.height
    );
  }

  return {
    drawMowGrid,
    drawScene,
    drawForegroundArt,
  };
}

