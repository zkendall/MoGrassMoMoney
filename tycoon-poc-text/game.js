(() => {
  import('./src/index.js').catch((error) => {
    // Keep startup failures visible in-browser for quick debugging.
    // eslint-disable-next-line no-console
    console.error('Failed to load tycoon app', error);
  });
})();
