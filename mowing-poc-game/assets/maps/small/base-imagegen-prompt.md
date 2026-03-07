# Small Map Base Art Prompt

Use case: stylized-concept
Asset type: gameplay background for the `small` mowing map
Primary request: top-down painted yard map for a lawn mowing game
Scene/background: cozy suburban backyard with a circular lawn island inside a larger yard
Subject: house at the top, long driveway on the right, kidney-like pool on the right side of the lawn, pale cement walk paths near the bottom, tree, flower bed, rock, and sprinkler positioned as fixed yard obstacles
Style/medium: top-down 2D painterly game art with clean readable silhouettes and subtle brush texture
Composition/framing: exact canvas framing for a 960x640 gameplay map, straight top-down camera, landmarks placed to match an existing gameplay guide, no perspective tilt
Lighting/mood: warm late-afternoon light, soft friendly shadows, readable and uncluttered
Color palette: muted earthy greens, warm beige house siding, gray driveway, blue pool water, restrained saturation
Materials/textures: painted concrete, trimmed lawn edges, subtle wood and roof texture, light brush-grain ground texture
Quality: high
Constraints: no mower, no characters, no text, no logo, no watermark, preserve clear open lawn read, keep pool and walk paths visibly non-grass
Avoid: isometric angle, dramatic perspective, heavy clutter, dense decorative props, photorealism, HUD elements, lettering

Layout notes from the current gameplay guide:
- House block spans the upper center.
- Driveway is a vertical strip on the right.
- Lawn is a circular island centered around `(460, 355)` with a radius of about `170`.
- Pool sits to the right of the lawn.
- Main walk path runs horizontally near the bottom with a short vertical branch upward.
- Obstacles should remain clearly readable at the current gameplay positions.

Implementation note:
- This prompt is intended to replace the temporary local placeholder `base.png` once `OPENAI_API_KEY` is available and the `imagegen` CLI can be run.
