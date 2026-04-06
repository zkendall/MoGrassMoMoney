import { getHouseById } from './movement.js';

function formatTagLabel(tag) {
  return tag.replaceAll('_', ' ');
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#cfe7bf');
  gradient.addColorStop(1, '#b6d599');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawNeighborhood(state, ctx) {
  for (const lot of state.neighborhood.lots) {
    ctx.fillStyle = lot.tint;
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
  }

  ctx.fillStyle = '#69757b';
  for (const road of state.neighborhood.roads) {
    ctx.fillRect(road.x, road.y, road.w, road.h);
  }

  ctx.fillStyle = '#d8cdb3';
  for (const sidewalk of state.neighborhood.sidewalks) {
    ctx.fillRect(sidewalk.x, sidewalk.y, sidewalk.w, sidewalk.h);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(0, 318);
  ctx.lineTo(state.world.width, 318);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHouseTags(ctx, house) {
  const chips = [];
  if (house.kindTags.includes('repeat_customer')) chips.push('repeat');
  if (house.kindTags.includes('qualified_lead')) chips.push('lead');
  if (house.churnRisk === 'high') chips.push('risk');
  if (house.valueBand === 'high') chips.push('value');

  if (!chips.length) return;

  const tagX = house.x;
  const tagY = house.y - 16;
  ctx.font = '12px Georgia';
  let offsetX = 0;

  for (const chip of chips) {
    const label = formatTagLabel(chip);
    const width = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(31, 47, 42, 0.78)';
    drawRoundedRect(ctx, tagX + offsetX, tagY, width, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#f7f2e6';
    ctx.fillText(label, tagX + offsetX + 8, tagY + 13);
    offsetX += width + 6;
  }
}

function drawHouses(state, ctx) {
  for (const house of state.neighborhood.houses) {
    const isNearby = state.nearbyHouseId === house.id;
    const isInspected = state.inspectedHouseId === house.id;
    ctx.fillStyle = house.color;
    drawRoundedRect(ctx, house.x, house.y, house.w, house.h, 14);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(house.x + 16, house.y + 16, 42, 24);
    ctx.fillRect(house.x + 72, house.y + 16, 42, 24);
    ctx.fillRect(house.x + 16, house.y + 48, 42, 24);
    ctx.fillRect(house.x + 72, house.y + 48, 42, 24);

    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(house.porch.x, house.porch.y, house.porch.w, house.porch.h);

    ctx.fillStyle = house.flyerDelivered ? '#2a9d8f' : '#f4f1de';
    ctx.fillRect(house.mailbox.x - 5, house.mailbox.y - 12, 10, 18);
    ctx.fillRect(house.mailbox.x - 1.5, house.mailbox.y + 6, 3, 14);

    if (isNearby || isInspected) {
      ctx.strokeStyle = isInspected ? '#f08f4f' : '#f4f1de';
      ctx.lineWidth = isInspected ? 4 : 3;
      ctx.beginPath();
      ctx.arc(house.mailbox.x, house.mailbox.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (house.flyerDelivered) {
      ctx.fillStyle = '#1d6f63';
      ctx.font = 'bold 15px Georgia';
      ctx.fillText('Delivered', house.x + 12, house.y + house.h - 12);
    }

    drawHouseTags(ctx, house);
  }
}

function drawPlayer(state, ctx) {
  ctx.fillStyle = '#274c77';
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fdf7ec';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(
    state.player.x + state.player.heading.x * 20,
    state.player.y + state.player.heading.y * 20
  );
  ctx.stroke();
}

function drawHud(state, ctx, canvas) {
  ctx.fillStyle = 'rgba(247, 242, 230, 0.94)';
  drawRoundedRect(ctx, 18, 18, 286, 110, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(62, 91, 83, 0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1f2f2a';
  ctx.font = 'bold 20px Georgia';
  ctx.fillText('Flyer Route', 34, 48);

  ctx.font = '16px Georgia';
  ctx.fillText(`Mode: ${state.mode}`, 34, 76);
  ctx.fillText(`Delivered: ${state.deliveredCount}/${state.neighborhood.houses.length}`, 34, 98);

  ctx.fillStyle = '#415a52';
  ctx.font = '14px Georgia';
  ctx.fillText(state.note, 34, 118);

  ctx.fillStyle = 'rgba(247, 242, 230, 0.92)';
  drawRoundedRect(ctx, canvas.width - 256, 18, 238, 72, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(62, 91, 83, 0.24)';
  ctx.stroke();
  ctx.fillStyle = '#2b423a';
  ctx.font = 'bold 14px Georgia';
  ctx.fillText('Nearby prompt', canvas.width - 236, 44);
  ctx.font = '13px Georgia';
  let nearbyText = 'Walk toward a mailbox';
  if (state.mode === 'inspect') {
    const inspected = getHouseById(state, state.inspectedHouseId);
    nearbyText = inspected?.flyerDelivered
      ? 'Flyer delivered here already'
      : 'Space or Enter to drop flyer';
  } else if (state.nearbyHouseId) {
    nearbyText = 'Space or Enter to inspect mailbox';
  }
  ctx.fillText(nearbyText, canvas.width - 236, 68);
}

function drawInspectPanel(state, ctx, canvas) {
  if (state.mode !== 'inspect' || !state.inspectedHouseId) return;

  const house = getHouseById(state, state.inspectedHouseId);
  if (!house) return;

  const panelX = canvas.width - 304;
  const panelY = 108;
  const panelW = 276;
  const panelH = 198;

  ctx.fillStyle = 'rgba(247, 242, 230, 0.97)';
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 18);
  ctx.fill();
  ctx.strokeStyle = '#385149';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#1f2f2a';
  ctx.font = 'bold 22px Georgia';
  ctx.fillText(house.name, panelX + 18, panelY + 34);

  ctx.font = '15px Georgia';
  ctx.fillText(`Value band: ${house.valueBand}`, panelX + 18, panelY + 66);
  ctx.fillText(`Churn risk: ${house.churnRisk}`, panelX + 18, panelY + 90);
  ctx.fillText(
    `Tags: ${house.kindTags.map(formatTagLabel).join(', ')}`,
    panelX + 18,
    panelY + 114
  );

  ctx.fillStyle = house.flyerDelivered ? '#2a9d8f' : '#f08f4f';
  drawRoundedRect(ctx, panelX + 18, panelY + 132, panelW - 36, 42, 12);
  ctx.fill();
  ctx.fillStyle = '#fdf7ec';
  ctx.font = 'bold 16px Georgia';
  const actionLabel = house.flyerDelivered
    ? 'Flyer already delivered'
    : 'Press Space or Enter to drop flyer';
  ctx.fillText(actionLabel, panelX + 26, panelY + 158);

  ctx.fillStyle = '#5f746d';
  ctx.font = '14px Georgia';
  ctx.fillText('Escape closes the panel.', panelX + 18, panelY + 190);
}

export function renderGame(state, ctx) {
  drawBackground(ctx, state.canvas);
  drawNeighborhood(state, ctx);
  drawHouses(state, ctx);
  drawPlayer(state, ctx);
  drawHud(state, ctx, state.canvas);
  drawInspectPanel(state, ctx, state.canvas);
}
