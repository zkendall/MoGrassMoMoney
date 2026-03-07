import { MOWED_BRIGHTNESS_RANGE } from './constants.js';

export function dist(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getCompressedBrightnessBlend(layValue) {
  const normalized = (clamp(layValue, -1, 1) + 1) * 0.5;
  return clamp(
    0.5 + (normalized - 0.5) * MOWED_BRIGHTNESS_RANGE,
    0,
    1
  );
}

export function normalizeAngle(rad) {
  let angle = rad;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function normalizeAnglePositive(rad) {
  let angle = rad % (Math.PI * 2);
  if (angle < 0) {
    angle += Math.PI * 2;
  }
  return angle;
}

export function getDirectionalFrameSelection(config, rotationRad) {
  if (!config) {
    return null;
  }

  const step = (Math.PI * 2) / config.count;
  const normalized = normalizeAnglePositive(rotationRad);
  const index = Math.floor((normalized + step * 0.5) / step) % config.count;

  return {
    index,
    frame: {
      x: (index % config.columns) * config.frameW,
      y: Math.floor(index / config.columns) * config.frameH,
      w: config.frameW,
      h: config.frameH,
    },
  };
}

export function getMowerSpriteRenderState(game, headingRad) {
  const rotationRad = headingRad + game.mowerSprite.headingOffset;
  const directionalFrame = getDirectionalFrameSelection(
    game.mowerSprite.directionalFrames,
    rotationRad
  );

  return {
    asset: game.assets.mowerSpriteAssets[game.mowerSprite.assetId] || null,
    frame: directionalFrame?.frame || game.mowerSprite.frame,
    rotationRad: directionalFrame ? 0 : rotationRad,
    directionalFrameIndex: directionalFrame?.index ?? null,
  };
}

export function dedupeClosePoints(points, minSpacing = 1) {
  if (points.length < 2) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (dist(out[out.length - 1], points[i]) >= minSpacing) {
      out.push(points[i]);
    }
  }
  return out;
}

export function resamplePolyline(points, spacing) {
  if (points.length < 2 || spacing <= 0) return points.slice();

  const out = [points[0]];
  let segmentStart = { ...points[0] };
  let carry = 0;

  for (let i = 1; i < points.length; i += 1) {
    const segmentEnd = points[i];
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) {
      segmentStart = { ...segmentEnd };
      continue;
    }

    const ux = dx / length;
    const uy = dy / length;
    let traveled = spacing - carry;

    while (traveled <= length) {
      out.push({
        x: segmentStart.x + ux * traveled,
        y: segmentStart.y + uy * traveled,
      });
      traveled += spacing;
    }

    carry = length - (traveled - spacing);
    segmentStart = { ...segmentEnd };
  }

  const last = points[points.length - 1];
  if (dist(out[out.length - 1], last) > 0.1) {
    out.push({ ...last });
  }

  return out;
}

export function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x)
      + (-p0.x + p2.x) * t
      + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
      + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y)
      + (-p0.y + p2.y) * t
      + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
      + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function smoothPolyline(points, samplesPerSegment = 6) {
  if (points.length < 3) return points.slice();

  const out = [{ ...points[0] }];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 1; j <= samplesPerSegment; j += 1) {
      const t = j / samplesPerSegment;
      out.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  return out;
}

export function measurePolyline(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

export function buildCumulativeLengths(points) {
  if (!points.length) return [];
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + dist(points[i - 1], points[i]));
  }
  return lengths;
}

export function samplePointOnPath(game, points, lengths, distanceAlongPath) {
  if (!points.length) return null;
  if (points.length === 1 || lengths.length < 2) {
    return { x: points[0].x, y: points[0].y, heading: game.mower.heading };
  }

  const total = lengths[lengths.length - 1];
  const distance = clamp(distanceAlongPath, 0, total);

  let index = 1;
  while (index < lengths.length && lengths[index] < distance) {
    index += 1;
  }
  const hi = Math.min(lengths.length - 1, index);
  const lo = Math.max(0, hi - 1);

  const a = points[lo];
  const b = points[hi];
  const span = Math.max(0.0001, lengths[hi] - lengths[lo]);
  const t = clamp((distance - lengths[lo]) / span, 0, 1);

  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const heading = normalizeAngle(Math.atan2(b.y - a.y, b.x - a.x));

  return { x, y, heading };
}

export function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}
