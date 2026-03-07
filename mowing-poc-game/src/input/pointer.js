export function attachPointerInput({ game, audioApi, menuApi, playbackApi }) {
  function canvasPointFromEvent(event) {
    const rect = game.canvas.getBoundingClientRect();
    const scaleX = game.world.width / rect.width;
    const scaleY = game.world.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  game.canvas.addEventListener('mousedown', (event) => {
    audioApi.ensureMusicStarted();
    const point = canvasPointFromEvent(event);
    game.input.pointer = { ...point };

    if (event.button !== 0) {
      return;
    }

    if (game.ui.mode === 'menu') {
      menuApi.handleMenuClick(point);
      return;
    }

    if (game.ui.mode === 'review') {
      playbackApi.handleReviewClick(point);
      return;
    }

    if (game.ui.mode === 'won') {
      return;
    }

    if (game.ui.mode === 'start' || game.ui.mode === 'drawing') {
      playbackApi.beginDrawing(point);
    }
  });

  game.canvas.addEventListener('mousemove', (event) => {
    const point = canvasPointFromEvent(event);
    game.input.pointer = { ...point };

    if (!(game.input.pointerDown && game.ui.mode === 'drawing')) {
      return;
    }

    playbackApi.addDraftPoint(point);
  });

  game.canvas.addEventListener('mouseup', (event) => {
    if (event.button !== 0) {
      return;
    }

    if (game.input.pointerDown) {
      playbackApi.finalizeDrawing();
    }
  });

  window.addEventListener('mouseup', () => {
    if (game.input.pointerDown) {
      playbackApi.finalizeDrawing();
    }
  });
}

