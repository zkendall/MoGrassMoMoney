Use case: illustration-story
Asset type: top-down game grass autotile sprite sheet
Primary request: create a consistent pixel-art grass autotile sheet for a top-down lawn mowing game
Style/medium: clean 16-bit inspired pixel art, crisp edges, readable at 1x scale
Composition/framing: one sprite sheet image, exactly 8 columns by 2 rows, uniform frame grid, each frame 16 pixels wide by 20 pixels high
Color palette: natural lawn greens only, with darker green side-wall greens; no brown dirt, no exposed soil, no earth tones anywhere
Materials/textures: top-down grass tufts on top faces; visible green grass-mass side skirt only on exposed south and east edges for taller grass
Constraints: transparent background around each tile; no text; no watermark; preserve exact frame alignment; keep all frames artistically consistent; top-down view, not isometric diamond tiles; no full tile borders; interior tiles must tile cleanly with no stripe bands
Avoid: blurry upscale artifacts, painterly shading, anti-aliased edges, inconsistent perspective, oversized dirt patches, brown edges, boxed outlines, visible seams on north or west edges

Frame layout specification:

- Row 0: unmowed grass, taller height
- Row 1: mowed grass, shorter height
- Column mapping is a 3-bit mask of lower neighboring cells:
  - Column 0: no lower south/east/southeast neighbors
  - Column 1: south lower only
  - Column 2: east lower only
  - Column 3: south and east lower
  - Column 4: southeast lower only
  - Column 5: south and southeast lower
  - Column 6: east and southeast lower
  - Column 7: south, east, and southeast lower

Art direction:

- Unmowed row should look fuller and taller, with skirts clearly visible only when exposed.
- Mowed row should look shorter and cleaner, with much subtler side visibility and still no dirt.
- South-facing skirt should read as a dark green grass wall along the bottom of the frame, never dirt.
- East-facing skirt should read as a dark green grass wall along the right side of the frame, never dirt.
- Southeast-exposed variants should clean up the bottom-right corner so the skirt silhouette reads correctly.
- Column 0 must have no visible skirt at all so interior tiles do not form horizontal bands when tiled.
