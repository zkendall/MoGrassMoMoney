#!/usr/bin/env python3

from pathlib import Path

from PIL import Image


SOURCE_TILE_X = 0
SOURCE_TILE_Y = 0
SOURCE_TILE_SIZE = 256
FRAME_SIZE = 320
FRAME_COUNT = 16
COLUMNS = 4
ROWS = 4

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "assets" / "mower-sheet.png"
OUTPUT_PATH = ROOT / "assets" / "push-mower-16dir.png"


def main() -> None:
    source_sheet = Image.open(SOURCE_PATH).convert("RGBA")
    base_frame = source_sheet.crop(
        (
            SOURCE_TILE_X,
            SOURCE_TILE_Y,
            SOURCE_TILE_X + SOURCE_TILE_SIZE,
            SOURCE_TILE_Y + SOURCE_TILE_SIZE,
        )
    )

    centered_frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    frame_offset = (
        (FRAME_SIZE - SOURCE_TILE_SIZE) // 2,
        (FRAME_SIZE - SOURCE_TILE_SIZE) // 2,
    )
    centered_frame.alpha_composite(base_frame, frame_offset)

    output_sheet = Image.new(
        "RGBA",
        (FRAME_SIZE * COLUMNS, FRAME_SIZE * ROWS),
        (0, 0, 0, 0),
    )
    rotation_step = 360 / FRAME_COUNT
    resampling = Image.Resampling.BICUBIC

    for frame_index in range(FRAME_COUNT):
        rotated_frame = centered_frame.rotate(
            -(rotation_step * frame_index),
            resample=resampling,
            fillcolor=(0, 0, 0, 0),
        )
        frame_x = (frame_index % COLUMNS) * FRAME_SIZE
        frame_y = (frame_index // COLUMNS) * FRAME_SIZE
        output_sheet.alpha_composite(rotated_frame, (frame_x, frame_y))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    output_sheet.save(OUTPUT_PATH, optimize=True)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
