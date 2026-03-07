import { clamp, getMowerSpriteRenderState } from '../pathing.js';

export function createMowerRenderer(game) {
  function drawMower() {
    const { ctx } = game;
    let headingToDraw = game.mower.heading;
    if (game.animation.flipActive) {
      const t = clamp(game.animation.flipTimer / game.animation.flipDuration, 0, 1);
      headingToDraw = game.animation.flipBaseHeading + t * Math.PI * 2;
    }

    const spriteRender = getMowerSpriteRenderState(game, headingToDraw);
    if (spriteRender.asset?.loaded && !spriteRender.asset.error) {
      ctx.save();
      ctx.translate(game.mower.x, game.mower.y);
      if (!game.mowerSprite.directionalFrames) {
        ctx.rotate(spriteRender.rotationRad);
      }
      ctx.drawImage(
        spriteRender.asset.image,
        spriteRender.frame.x,
        spriteRender.frame.y,
        spriteRender.frame.w,
        spriteRender.frame.h,
        -game.mowerSprite.drawW * 0.5,
        -game.mowerSprite.drawH * 0.5,
        game.mowerSprite.drawW,
        game.mowerSprite.drawH
      );
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(game.mower.x, game.mower.y);
    ctx.rotate(headingToDraw);

    ctx.fillStyle = '#cf3f2f';
    ctx.fillRect(-18, -15, 36, 30);

    ctx.fillStyle = '#1f2125';
    ctx.fillRect(2, -12, 12, 24);

    ctx.fillStyle = '#f0efe8';
    ctx.fillRect(-16, -4, 12, 8);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -15);
    ctx.lineTo(-31, -26);
    ctx.lineTo(-44, -26);
    ctx.stroke();

    ctx.restore();
  }

  return {
    drawMower,
  };
}

