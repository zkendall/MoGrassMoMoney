export function attachKeyboardInput({
  game,
  audioApi,
  economyApi,
  menuApi,
  resetGame,
}) {
  window.addEventListener('keydown', (event) => {
    audioApi.ensureMusicStarted();

    if (event.key.toLowerCase() === 'f') {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        game.canvas.requestFullscreen?.();
      }
    }

    if (event.key.toLowerCase() === 'r') {
      resetGame();
    }

    if (event.key.toLowerCase() === 'm') {
      audioApi.setMusicMuted(!game.audio.muted);
    }

    if (event.key.toLowerCase() === 'e') {
      economyApi.tryRefillMower();
      return;
    }

    if (game.ui.mode === 'menu') {
      if (event.key === 'ArrowUp') {
        game.ui.menu.section = (game.ui.menu.section + 2) % 3;
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowDown') {
        game.ui.menu.section = (game.ui.menu.section + 1) % 3;
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowLeft') {
        menuApi.shiftMenuSelection(-1);
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowRight') {
        menuApi.shiftMenuSelection(1);
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' || event.code === 'Space' || event.key === ' ') {
        menuApi.activateMenuSection();
        event.preventDefault();
        return;
      }
    }

    if (event.code === 'Space' && game.ui.mode === 'animating') {
      game.input.fastForward = true;
      event.preventDefault();
      return;
    }

    if ((event.key === ' ' || event.code === 'Space') && game.ui.mode === 'start') {
      game.ui.mode = 'drawing';
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      game.input.fastForward = false;
    }
  });
}

