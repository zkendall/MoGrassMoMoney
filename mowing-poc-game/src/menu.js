import { DEFAULT_LAWN_MAP_ID, DEFAULT_MOWER_TYPE_ID, MENU_LAYOUT } from './constants.js';

export function createMenuApi(game, deps) {
  const {
    markTransientMessage,
    applySelectedSetup,
    initMowGrid,
    pointInRect,
  } = deps;

  function menuStartEnabled() {
    return Boolean(
      game.catalogs.mowerTypes[game.ui.selectedMowerId]
        && game.catalogs.lawnMaps[game.ui.selectedLawnId]
    );
  }

  function getMenuButtons() {
    return [
      {
        ...MENU_LAYOUT.startButton,
        enabled: menuStartEnabled(),
      },
      {
        ...MENU_LAYOUT.resetButton,
        enabled: true,
      },
    ];
  }

  function getMenuOptionRects() {
    const mowerIds = Object.keys(game.catalogs.mowerTypes);
    const lawnIds = Object.keys(game.catalogs.lawnMaps);

    const mowerStartX = MENU_LAYOUT.panel.x + 32;
    const mowerY = MENU_LAYOUT.panel.y + 150;
    const lawnStartX = MENU_LAYOUT.panel.x + 32;
    const lawnY = MENU_LAYOUT.panel.y + 282;

    const mowerOptions = mowerIds.map((id, index) => ({
      id,
      label: game.catalogs.mowerTypes[id].label,
      x: mowerStartX + index * (MENU_LAYOUT.optionWidth + MENU_LAYOUT.optionGap),
      y: mowerY,
      w: MENU_LAYOUT.optionWidth,
      h: MENU_LAYOUT.optionHeight,
      selected: id === game.ui.selectedMowerId,
    }));

    const lawnOptions = lawnIds.map((id, index) => ({
      id,
      label: game.catalogs.lawnMaps[id].label,
      x: lawnStartX + index * (MENU_LAYOUT.optionWidth + MENU_LAYOUT.optionGap),
      y: lawnY,
      w: MENU_LAYOUT.optionWidth,
      h: MENU_LAYOUT.optionHeight,
      selected: id === game.ui.selectedLawnId,
    }));

    return { mowerOptions, lawnOptions };
  }

  function startGameFromMenu() {
    if (!menuStartEnabled()) {
      markTransientMessage('Select mower and lawn to start.');
      return;
    }

    game.scene.lastSelections = {
      mowerId: game.ui.selectedMowerId,
      lawnId: game.ui.selectedLawnId,
    };
    applySelectedSetup(game);
    initMowGrid();
    game.ui.mode = 'start';
  }

  function resetMenuDefaults() {
    game.ui.selectedMowerId = DEFAULT_MOWER_TYPE_ID;
    game.ui.selectedLawnId = DEFAULT_LAWN_MAP_ID;
    game.ui.menu.section = 0;
    game.ui.menu.buttonIndex = 0;
    markTransientMessage('Menu reset to defaults.');
  }

  function openMenu() {
    game.input.pointerDown = false;
    game.effects.penaltyPopups.length = 0;
    game.ui.transientMessage = '';
    game.ui.transientTimer = 0;
    game.ui.selectedMowerId = game.scene.lastSelections.mowerId;
    game.ui.selectedLawnId = game.scene.lastSelections.lawnId;
    game.ui.menu.section = 0;
    game.ui.menu.buttonIndex = 0;
    applySelectedSetup(game);
    initMowGrid();
    game.ui.mode = 'menu';
  }

  function handleMenuClick(point) {
    if (game.ui.mode !== 'menu') return;
    const { mowerOptions, lawnOptions } = getMenuOptionRects();

    for (const option of mowerOptions) {
      if (pointInRect(point, option)) {
        game.ui.selectedMowerId = option.id;
        game.ui.menu.section = 0;
        return;
      }
    }
    for (const option of lawnOptions) {
      if (pointInRect(point, option)) {
        game.ui.selectedLawnId = option.id;
        game.ui.menu.section = 1;
        return;
      }
    }

    const buttons = getMenuButtons();
    for (let i = 0; i < buttons.length; i += 1) {
      const button = buttons[i];
      if (!pointInRect(point, button)) continue;
      game.ui.menu.section = 2;
      game.ui.menu.buttonIndex = i;
      if (button.id === 'start_job' && button.enabled) {
        startGameFromMenu();
      } else if (button.id === 'start_job') {
        markTransientMessage('Select mower and lawn to start.');
      } else if (button.id === 'reset_defaults') {
        resetMenuDefaults();
      }
      return;
    }
  }

  function getMenuCursorInfo() {
    const mowerIds = Object.keys(game.catalogs.mowerTypes);
    const lawnIds = Object.keys(game.catalogs.lawnMaps);
    const mowerIndex = Math.max(0, mowerIds.indexOf(game.ui.selectedMowerId));
    const lawnIndex = Math.max(0, lawnIds.indexOf(game.ui.selectedLawnId));
    return { mowerIds, lawnIds, mowerIndex, lawnIndex };
  }

  function shiftMenuSelection(direction) {
    const info = getMenuCursorInfo();
    if (game.ui.menu.section === 0) {
      const nextIndex = (info.mowerIndex + direction + info.mowerIds.length) % info.mowerIds.length;
      game.ui.selectedMowerId = info.mowerIds[nextIndex];
    } else if (game.ui.menu.section === 1) {
      const nextIndex = (info.lawnIndex + direction + info.lawnIds.length) % info.lawnIds.length;
      game.ui.selectedLawnId = info.lawnIds[nextIndex];
    } else if (game.ui.menu.section === 2) {
      const buttons = getMenuButtons();
      game.ui.menu.buttonIndex = (game.ui.menu.buttonIndex + direction + buttons.length) % buttons.length;
    }
  }

  function activateMenuSection() {
    if (game.ui.menu.section === 2) {
      const buttons = getMenuButtons();
      const activeButton = buttons[game.ui.menu.buttonIndex] || buttons[0];
      if (activeButton.id === 'start_job') {
        startGameFromMenu();
      } else {
        resetMenuDefaults();
      }
      return;
    }
    if (!menuStartEnabled()) {
      markTransientMessage('Select mower and lawn to start.');
      return;
    }
    startGameFromMenu();
  }

  return {
    menuStartEnabled,
    getMenuButtons,
    getMenuOptionRects,
    startGameFromMenu,
    resetMenuDefaults,
    openMenu,
    handleMenuClick,
    getMenuCursorInfo,
    shiftMenuSelection,
    activateMenuSection,
  };
}

