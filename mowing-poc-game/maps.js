(() => {
  function createMowingLawnMaps() {
    return {
      small: {
        id: 'small',
        label: 'Small Lawn',
        scene: {
          lawn: { x: 210, y: 165, w: 500, h: 350 },
          house: { x: 165, y: 35, w: 590, h: 105 },
          driveway: { x: 660, y: 140, w: 80, h: 395 },
          targetCoverage: 95,
        },
        obstacles: [
          { id: 'tree-small', style: 'tree', kind: 'circle', x: 318, y: 284, r: 28 },
          { id: 'flower-bed-small', style: 'flower-bed', kind: 'rect', x: 485, y: 230, w: 108, h: 52 },
          { id: 'rock-small', style: 'rock', kind: 'circle', x: 620, y: 315, r: 21 },
          { id: 'sprinkler-small', style: 'sprinkler', kind: 'circle', x: 372, y: 438, r: 17 },
        ],
      },
      medium: {
        id: 'medium',
        label: 'Medium Lawn',
        scene: {
          lawn: { x: 145, y: 130, w: 665, h: 455 },
          house: { x: 95, y: 20, w: 770, h: 95 },
          driveway: { x: 760, y: 115, w: 90, h: 500 },
          targetCoverage: 95,
        },
        obstacles: [
          { id: 'tree-medium', style: 'tree', kind: 'circle', x: 305, y: 280, r: 30 },
          { id: 'flower-bed-medium', style: 'flower-bed', kind: 'rect', x: 490, y: 225, w: 125, h: 56 },
          { id: 'rock-medium', style: 'rock', kind: 'circle', x: 650, y: 320, r: 23 },
          { id: 'sprinkler-medium', style: 'sprinkler', kind: 'circle', x: 360, y: 465, r: 17 },
          { id: 'gnome-medium', style: 'gnome', kind: 'rect', x: 592, y: 458, w: 26, h: 30 },
        ],
      },
      large: {
        id: 'large',
        label: 'Large Estate',
        scene: {
          lawn: { x: 95, y: 125, w: 735, h: 470 },
          house: { x: 60, y: 20, w: 805, h: 92 },
          driveway: { x: 95, y: 112, w: 104, h: 503 },
          targetCoverage: 95,
        },
        obstacles: [
          { id: 'tree-large-a', style: 'tree', kind: 'circle', x: 260, y: 278, r: 31 },
          { id: 'tree-large-b', style: 'tree', kind: 'circle', x: 680, y: 492, r: 30 },
          { id: 'flower-bed-large', style: 'flower-bed', kind: 'rect', x: 445, y: 225, w: 138, h: 58 },
          { id: 'rock-large', style: 'rock', kind: 'circle', x: 615, y: 338, r: 24 },
          { id: 'sprinkler-large', style: 'sprinkler', kind: 'circle', x: 360, y: 472, r: 18 },
          { id: 'gnome-large', style: 'gnome', kind: 'rect', x: 525, y: 510, w: 30, h: 34 },
        ],
      },
    };
  }

  window.createMowingLawnMaps = createMowingLawnMaps;
  window.MOWING_LAWN_MAPS = createMowingLawnMaps();
})();
