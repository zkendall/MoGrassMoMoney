function midiToHz(note) {
  return 440 * (2 ** ((note - 69) / 12));
}

export function createAudioApi(game) {
  function setMusicMuted(isMuted) {
    game.audio.muted = isMuted;
    game.ui.musicMuted = isMuted;
    if (game.audio.master && game.audio.ctx) {
      const now = game.audio.ctx.currentTime;
      game.audio.master.gain.cancelScheduledValues(now);
      game.audio.master.gain.setTargetAtTime(isMuted ? 0 : 0.09, now, 0.05);
    }
  }

  function ensureMusicStarted() {
    if (!game.audio.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      game.audio.ctx = new AudioCtx();
      game.audio.master = game.audio.ctx.createGain();
      game.audio.master.gain.value = 0.09;
      game.audio.master.connect(game.audio.ctx.destination);

      const padFilter = game.audio.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 850;
      padFilter.Q.value = 0.8;
      padFilter.connect(game.audio.master);

      game.audio.padOsc = game.audio.ctx.createOscillator();
      game.audio.padOsc.type = 'triangle';
      game.audio.padGain = game.audio.ctx.createGain();
      game.audio.padGain.gain.value = 0.03;
      game.audio.padOsc.connect(game.audio.padGain);
      game.audio.padGain.connect(padFilter);
      game.audio.padOsc.start();

      game.audio.bassOsc = game.audio.ctx.createOscillator();
      game.audio.bassOsc.type = 'sine';
      game.audio.bassGain = game.audio.ctx.createGain();
      game.audio.bassGain.gain.value = 0.045;
      game.audio.bassOsc.connect(game.audio.bassGain);
      game.audio.bassGain.connect(game.audio.master);
      game.audio.bassOsc.start();
    }

    game.audio.ctx.resume();
    if (game.audio.started) return;
    game.audio.started = true;

    const bassPattern = [40, 40, 43, 45, 47, 45, 43, 40];
    const padPattern = [52, 55, 59, 57];

    game.audio.timerId = window.setInterval(() => {
      if (!game.audio.ctx || !game.audio.bassOsc || !game.audio.padOsc) return;
      const now = game.audio.ctx.currentTime;
      const bassNote = bassPattern[game.audio.step % bassPattern.length];
      const padNote = padPattern[game.audio.step % padPattern.length];

      game.audio.bassOsc.frequency.setTargetAtTime(midiToHz(bassNote), now, 0.08);
      game.audio.padOsc.frequency.setTargetAtTime(midiToHz(padNote), now, 0.15);

      game.audio.bassGain.gain.cancelScheduledValues(now);
      game.audio.bassGain.gain.setValueAtTime(0.03, now);
      game.audio.bassGain.gain.linearRampToValueAtTime(0.055, now + 0.06);
      game.audio.bassGain.gain.linearRampToValueAtTime(0.03, now + 0.28);

      game.audio.step += 1;
    }, 320);

    setMusicMuted(game.audio.muted);
  }

  return {
    ensureMusicStarted,
    setMusicMuted,
  };
}

