#!/usr/bin/env python3

from pathlib import Path
import random
import sys

from PIL import Image, ImageDraw, ImageFilter


WIDTH = 960
HEIGHT = 640
ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "maps"


MAPS = {
    "small": {
        "label": "Small Lawn",
        "house": {"kind": "rect", "x": 165, "y": 35, "w": 590, "h": 105},
        "driveway": {"kind": "rect", "x": 660, "y": 140, "w": 80, "h": 395},
        "lawn": {"kind": "circle", "cx": 460, "cy": 355, "r": 170},
        "yard_features": [
            {"id": "pool-small", "style": "pool", "kind": "ellipse", "cx": 715, "cy": 365, "rx": 78, "ry": 50, "non_mowable": True},
            {"id": "walk-main-small", "style": "walk-path", "kind": "rect", "x": 210, "y": 532, "w": 530, "h": 22, "non_mowable": True},
            {"id": "walk-side-small", "style": "walk-path", "kind": "rect", "x": 392, "y": 520, "w": 22, "h": 85, "non_mowable": True},
        ],
        "obstacles": [
            {"id": "tree-small", "style": "tree", "kind": "circle", "x": 318, "y": 284, "r": 28},
            {"id": "flower-bed-small", "style": "flower-bed", "kind": "rect", "x": 485, "y": 230, "w": 108, "h": 52},
            {"id": "rock-small", "style": "rock", "kind": "circle", "x": 620, "y": 315, "r": 21},
            {"id": "sprinkler-small", "style": "sprinkler", "kind": "circle", "x": 372, "y": 438, "r": 17},
        ],
        "spawn": {"x": 352, "y": 286},
        "palette": {
            "sky": (164, 168, 143),
            "ground": (140, 149, 122),
            "ground_alt": (150, 157, 132),
            "drive": (177, 175, 169),
            "drive_shadow": (115, 116, 110, 120),
            "house": (209, 191, 165),
            "roof": (149, 111, 85),
            "door": (127, 88, 66),
            "window": (152, 188, 214),
            "lawn_glow": (122, 150, 92, 170),
        },
        "texture_seed": 11,
    },
    "medium": {
        "label": "Medium Lawn",
        "house": {"kind": "rect", "x": 95, "y": 20, "w": 770, "h": 95},
        "driveway": {"kind": "rect", "x": 760, "y": 115, "w": 90, "h": 500},
        "lawn": {"kind": "rect", "x": 145, "y": 130, "w": 665, "h": 455},
        "yard_features": [],
        "obstacles": [
            {"id": "tree-medium", "style": "tree", "kind": "circle", "x": 305, "y": 280, "r": 30},
            {"id": "flower-bed-medium", "style": "flower-bed", "kind": "rect", "x": 490, "y": 225, "w": 125, "h": 56},
            {"id": "rock-medium", "style": "rock", "kind": "circle", "x": 650, "y": 320, "r": 23},
            {"id": "sprinkler-medium", "style": "sprinkler", "kind": "circle", "x": 360, "y": 465, "r": 17},
            {"id": "gnome-medium", "style": "gnome", "kind": "rect", "x": 592, "y": 458, "w": 26, "h": 30},
        ],
        "spawn": {"x": 217, "y": 188},
        "palette": {
            "sky": (168, 176, 154),
            "ground": (135, 147, 121),
            "ground_alt": (145, 155, 128),
            "drive": (180, 179, 173),
            "drive_shadow": (108, 109, 104, 120),
            "house": (214, 196, 170),
            "roof": (123, 95, 73),
            "door": (110, 82, 64),
            "window": (156, 194, 224),
            "lawn_glow": (120, 154, 94, 160),
        },
        "texture_seed": 31,
    },
    "large": {
        "label": "Large Estate",
        "house": {"kind": "rect", "x": 60, "y": 20, "w": 805, "h": 92},
        "driveway": {"kind": "rect", "x": 95, "y": 112, "w": 104, "h": 503},
        "lawn": {"kind": "rect", "x": 95, "y": 125, "w": 735, "h": 470},
        "yard_features": [],
        "obstacles": [
            {"id": "tree-large-a", "style": "tree", "kind": "circle", "x": 260, "y": 278, "r": 31},
            {"id": "tree-large-b", "style": "tree", "kind": "circle", "x": 680, "y": 492, "r": 30},
            {"id": "flower-bed-large", "style": "flower-bed", "kind": "rect", "x": 445, "y": 225, "w": 138, "h": 58},
            {"id": "rock-large", "style": "rock", "kind": "circle", "x": 615, "y": 338, "r": 24},
            {"id": "sprinkler-large", "style": "sprinkler", "kind": "circle", "x": 360, "y": 472, "r": 18},
            {"id": "gnome-large", "style": "gnome", "kind": "rect", "x": 525, "y": 510, "w": 30, "h": 34},
        ],
        "spawn": {"x": 244, "y": 184},
        "palette": {
            "sky": (173, 180, 157),
            "ground": (131, 144, 118),
            "ground_alt": (142, 154, 126),
            "drive": (175, 173, 167),
            "drive_shadow": (102, 104, 98, 120),
            "house": (220, 202, 176),
            "roof": (116, 88, 68),
            "door": (108, 79, 61),
            "window": (161, 198, 226),
            "lawn_glow": (118, 151, 91, 150),
        },
        "texture_seed": 47,
    },
}


def circle_bbox(cx, cy, r):
    return (cx - r, cy - r, cx + r, cy + r)


def ellipse_bbox(cx, cy, rx, ry):
    return (cx - rx, cy - ry, cx + rx, cy + ry)


def rect_bbox(shape):
    return (shape["x"], shape["y"], shape["x"] + shape["w"], shape["y"] + shape["h"])


def shape_bbox(shape):
    if shape["kind"] == "circle":
        center_x = shape.get("x", shape.get("cx"))
        center_y = shape.get("y", shape.get("cy"))
        return circle_bbox(center_x, center_y, shape["r"])
    if shape["kind"] == "ellipse":
        return ellipse_bbox(shape["cx"], shape["cy"], shape["rx"], shape["ry"])
    return rect_bbox(shape)


def draw_shape(draw, shape, *, fill=None, outline=None, width=1, radius=12):
    if shape["kind"] == "circle":
        center_x = shape.get("x", shape.get("cx"))
        center_y = shape.get("y", shape.get("cy"))
        draw.ellipse(circle_bbox(center_x, center_y, shape["r"]), fill=fill, outline=outline, width=width)
        return
    if shape["kind"] == "ellipse":
        draw.ellipse(ellipse_bbox(shape["cx"], shape["cy"], shape["rx"], shape["ry"]), fill=fill, outline=outline, width=width)
        return
    if radius > 0:
        draw.rounded_rectangle(rect_bbox(shape), radius=radius, fill=fill, outline=outline, width=width)
    else:
        draw.rectangle(rect_bbox(shape), fill=fill, outline=outline, width=width)


def draw_cross(draw, x, y, color, radius=9, width=3):
    draw.line((x - radius, y, x + radius, y), fill=color, width=width)
    draw.line((x, y - radius, x, y + radius), fill=color, width=width)


def add_speckle(image, *, seed, count, palette, alpha_range=(24, 66), radius_range=(1, 3)):
    rng = random.Random(seed)
    speckles = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(speckles)
    for _ in range(count):
        x = rng.randint(0, image.width - 1)
        y = rng.randint(0, image.height - 1)
        r = rng.randint(radius_range[0], radius_range[1])
        color = rng.choice(palette)
        alpha = rng.randint(alpha_range[0], alpha_range[1])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*color, alpha))
    speckles = speckles.filter(ImageFilter.GaussianBlur(radius=0.6))
    return Image.alpha_composite(image, speckles)


def add_linear_grain(image, *, seed, y_min, y_max, count, palette):
    rng = random.Random(seed)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        y = rng.randint(y_min, y_max)
        x = rng.randint(0, image.width - 160)
        length = rng.randint(60, 220)
        color = rng.choice(palette)
        alpha = rng.randint(18, 42)
        draw.line((x, y, x + length, y + rng.randint(-6, 6)), fill=(*color, alpha), width=rng.randint(2, 5))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=1.2))
    return Image.alpha_composite(image, overlay)


def draw_house(draw, house, palette):
    draw_shape(draw, house, fill=palette["house"], radius=18)
    roof = {"kind": "rect", "x": house["x"] - 12, "y": house["y"] + 10, "w": house["w"] + 22, "h": 30}
    draw_shape(draw, roof, fill=palette["roof"], radius=20)
    draw.rectangle((house["x"] + 20, house["y"] + 48, house["x"] + house["w"] - 20, house["y"] + 78), fill=(232, 220, 194, 255))
    window_count = max(4, min(8, house["w"] // 120))
    step = house["w"] / (window_count + 1)
    for idx in range(window_count):
        window_x = int(house["x"] + step * (idx + 1) - 22)
        draw.rounded_rectangle((window_x, house["y"] + 50, window_x + 42, house["y"] + 78), radius=6, fill=palette["window"])
    door_w = 48 if house["w"] < 700 else 56
    door_x = int(house["x"] + house["w"] * 0.48)
    draw.rounded_rectangle((door_x, house["y"] + 48, door_x + door_w, house["y"] + 95), radius=6, fill=palette["door"])


def draw_driveway(draw, driveway, palette):
    shadow = {
        "kind": "rect",
        "x": driveway["x"] - 8,
        "y": driveway["y"] + 10,
        "w": driveway["w"] + 13,
        "h": driveway["h"] + 8,
    }
    draw_shape(draw, shadow, fill=palette["drive_shadow"], radius=12)
    draw_shape(draw, driveway, fill=palette["drive"], radius=12)


def draw_lawn_underpaint(image, map_def):
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    lawn = map_def["lawn"]
    fill = map_def["palette"]["lawn_glow"]
    if lawn["kind"] == "circle":
        draw.ellipse(circle_bbox(lawn["cx"], lawn["cy"], lawn["r"] + 10), fill=fill)
    else:
        glow = {
            "kind": "rect",
            "x": lawn["x"] - 10,
            "y": lawn["y"] - 10,
            "w": lawn["w"] + 20,
            "h": lawn["h"] + 20,
        }
        draw_shape(draw, glow, fill=fill, radius=28)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=12))
    return Image.alpha_composite(image, overlay)


def draw_walk_path(draw, feature):
    draw_shape(draw, feature, fill=(203, 201, 193, 255), outline=(229, 226, 216, 255), width=3, radius=8)


def draw_pool(draw, feature):
    outer = {"kind": "ellipse", "cx": feature["cx"], "cy": feature["cy"], "rx": feature["rx"] + 10, "ry": feature["ry"] + 10}
    inner = {"kind": "ellipse", "cx": feature["cx"], "cy": feature["cy"], "rx": feature["rx"], "ry": feature["ry"]}
    draw_shape(draw, outer, fill=(210, 224, 232, 255))
    draw_shape(draw, inner, fill=(79, 133, 170, 255))
    draw.arc(ellipse_bbox(feature["cx"], feature["cy"], feature["rx"] - 10, feature["ry"] - 12), start=200, end=340, fill=(191, 233, 247, 255), width=4)
    draw.arc(ellipse_bbox(feature["cx"], feature["cy"], feature["rx"] - 20, feature["ry"] - 20), start=15, end=120, fill=(93, 162, 194, 255), width=3)


def draw_tree(draw, obstacle):
    draw.ellipse(circle_bbox(obstacle["x"], obstacle["y"] + 8, 11), fill=(108, 80, 50, 255))
    draw.ellipse(circle_bbox(obstacle["x"], obstacle["y"] - 6, obstacle["r"] + 6), fill=(55, 104, 64, 255))
    draw.ellipse(circle_bbox(obstacle["x"] + 7, obstacle["y"] - 14, obstacle["r"] - 3), fill=(74, 129, 73, 255))


def draw_flower_bed(draw, obstacle):
    draw_shape(draw, obstacle, fill=(118, 90, 63, 255), radius=10)
    flower_count = max(5, obstacle["w"] // 24)
    rows = 2 if obstacle["h"] > 48 else 1
    for idx in range(flower_count):
        col = idx % max(1, flower_count // rows + (1 if flower_count % rows else 0))
        row = idx % rows
        fx = obstacle["x"] + 16 + col * 22
        fy = obstacle["y"] + 14 + row * 18
        if fx > obstacle["x"] + obstacle["w"] - 10:
            fx = obstacle["x"] + obstacle["w"] - 14
        draw.ellipse((fx - 7, fy - 7, fx + 7, fy + 7), fill=(214, 139, 157, 255))
        draw.ellipse((fx - 3, fy - 3, fx + 3, fy + 3), fill=(245, 223, 164, 255))


def draw_rock(draw, obstacle):
    draw.ellipse(circle_bbox(obstacle["x"], obstacle["y"], obstacle["r"] + 4), fill=(101, 109, 116, 255))
    draw.ellipse((obstacle["x"] - 12, obstacle["y"] - 7, obstacle["x"] + 10, obstacle["y"] + 11), fill=(132, 140, 146, 180))


def draw_sprinkler(draw, obstacle):
    draw.ellipse(circle_bbox(obstacle["x"], obstacle["y"], obstacle["r"] + 7), outline=(211, 236, 244, 220), width=2)
    draw.ellipse(circle_bbox(obstacle["x"], obstacle["y"], obstacle["r"]), fill=(135, 168, 188, 255))


def draw_gnome(draw, obstacle):
    draw.rectangle((obstacle["x"], obstacle["y"] + 10, obstacle["x"] + obstacle["w"], obstacle["y"] + obstacle["h"]), fill=(245, 224, 196, 255))
    draw.polygon(
        [
            (obstacle["x"] + obstacle["w"] * 0.5, obstacle["y"]),
            (obstacle["x"], obstacle["y"] + 12),
            (obstacle["x"] + obstacle["w"], obstacle["y"] + 12),
        ],
        fill=(198, 83, 74, 255),
    )


def draw_feature(draw, feature):
    style = feature["style"]
    if "pool" in style:
        draw_pool(draw, feature)
    elif "walk-path" in style:
        draw_walk_path(draw, feature)


def draw_obstacle(draw, obstacle):
    style = obstacle["style"]
    if "tree" in style:
        draw_tree(draw, obstacle)
    elif "flower-bed" in style:
        draw_flower_bed(draw, obstacle)
    elif "rock" in style:
        draw_rock(draw, obstacle)
    elif "sprinkler" in style:
        draw_sprinkler(draw, obstacle)
    elif "gnome" in style:
        draw_gnome(draw, obstacle)


def create_base_image(map_id, map_def):
    palette = map_def["palette"]
    image = Image.new("RGBA", (WIDTH, HEIGHT), (*palette["ground_alt"], 255))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(*palette["ground_alt"], 255))
    draw.rectangle((0, 0, WIDTH, 150), fill=(*palette["sky"], 255))
    draw.rectangle((0, 150, WIDTH, HEIGHT), fill=(*palette["ground"], 255))

    draw_driveway(draw, map_def["driveway"], palette)
    draw_house(draw, map_def["house"], palette)
    image = draw_lawn_underpaint(image, map_def)
    draw = ImageDraw.Draw(image)

    for feature in map_def["yard_features"]:
        draw_feature(draw, feature)

    for obstacle in map_def["obstacles"]:
        draw_obstacle(draw, obstacle)

    image = add_speckle(
        image,
        seed=map_def["texture_seed"],
        count=4200,
        palette=[palette["ground"], palette["ground_alt"], palette["sky"], (191, 195, 173)],
    )
    image = add_linear_grain(
        image,
        seed=map_def["texture_seed"] + 8,
        y_min=110,
        y_max=HEIGHT - 20,
        count=170,
        palette=[palette["ground"], palette["ground_alt"], (112, 120, 99)],
    )
    return image


def create_mow_mask(map_def):
    image = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw_shape(draw, map_def["lawn"], fill=(255, 255, 255), radius=18)
    draw_shape(draw, map_def["house"], fill=(0, 0, 0), radius=0)
    draw_shape(draw, map_def["driveway"], fill=(0, 0, 0), radius=0)
    for feature in map_def["yard_features"]:
        if feature.get("non_mowable"):
            draw_shape(draw, feature, fill=(0, 0, 0), radius=0)
    for obstacle in map_def["obstacles"]:
        draw_shape(draw, obstacle, fill=(0, 0, 0), radius=0)
    return image


def create_collision_mask(map_def):
    image = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    for obstacle in map_def["obstacles"]:
        draw_shape(draw, obstacle, fill=(255, 255, 255), radius=0)
    return image


def create_guide_image(map_id, map_def):
    image = Image.new("RGBA", (WIDTH, HEIGHT), (245, 243, 236, 255))
    draw = ImageDraw.Draw(image)
    lawn = map_def["lawn"]

    draw_shape(draw, map_def["house"], fill=(227, 208, 176, 255), outline=(129, 98, 66, 255), width=4, radius=0)
    draw_shape(draw, map_def["driveway"], fill=(182, 180, 173, 255), outline=(92, 94, 98, 255), width=4, radius=0)
    draw_shape(draw, lawn, fill=None, outline=(63, 140, 66, 255), width=8, radius=0)

    if lawn["kind"] == "circle":
        draw_shape(draw, {"kind": "circle", "x": lawn["cx"], "y": lawn["cy"], "r": lawn["r"] - 16}, fill=None, outline=(146, 197, 122, 255), width=3, radius=0)
    else:
        inner = {
            "kind": "rect",
            "x": lawn["x"] + 12,
            "y": lawn["y"] + 12,
            "w": lawn["w"] - 24,
            "h": lawn["h"] - 24,
        }
        draw_shape(draw, inner, fill=None, outline=(146, 197, 122, 255), width=3, radius=0)

    for feature in map_def["yard_features"]:
        fill = (118, 180, 211, 220) if "pool" in feature["style"] else (212, 209, 201, 255)
        outline = (52, 102, 142, 255) if "pool" in feature["style"] else (143, 139, 131, 255)
        draw_shape(draw, feature, fill=fill, outline=outline, width=4 if "pool" in feature["style"] else 3, radius=0)

    for obstacle in map_def["obstacles"]:
        draw_shape(draw, obstacle, fill=None, outline=(160, 55, 46, 255), width=5, radius=0)

    draw_cross(draw, map_def["spawn"]["x"], map_def["spawn"]["y"], (177, 27, 122, 255))

    if lawn["kind"] == "circle":
        lawn_label_x = lawn["cx"] - 38
        lawn_label_y = lawn["cy"] - lawn["r"] - 28
    else:
        lawn_label_x = lawn["x"] + 180
        lawn_label_y = lawn["y"] - 24

    labels = [
        ("House", map_def["house"]["x"] + map_def["house"]["w"] * 0.45, map_def["house"]["y"] + 12),
        ("Driveway", map_def["driveway"]["x"] - 6, map_def["driveway"]["y"] - 24),
        ("Lawn edge", lawn_label_x, lawn_label_y),
        ("Spawn", map_def["spawn"]["x"] + 16, map_def["spawn"]["y"] - 30),
        ("Obstacle", map_def["obstacles"][0]["x"] - 22 if "x" in map_def["obstacles"][0] else map_def["obstacles"][0]["cx"] - 22, shape_bbox(map_def["obstacles"][0])[1] - 28),
    ]
    if map_def["yard_features"]:
        feature = map_def["yard_features"][0]
        labels.append(("Pool" if "pool" in feature["style"] else "Walk path", shape_bbox(feature)[0] + 24, shape_bbox(feature)[1] - 24))

    for text, x, y in labels:
        draw.text((int(x) + 1, int(y) + 1), text, fill=(255, 255, 255, 255))
        draw.text((int(x), int(y)), text, fill=(36, 39, 42, 255))

    return image


def write_map_assets(map_id, map_def):
    out_dir = ASSET_ROOT / map_id
    out_dir.mkdir(parents=True, exist_ok=True)

    create_guide_image(map_id, map_def).save(out_dir / "guide.png")
    create_mow_mask(map_def).save(out_dir / "mow-mask.png")
    create_collision_mask(map_def).save(out_dir / "collision-mask.png")
    create_base_image(map_id, map_def).save(out_dir / "base.png")

    print(f"Wrote assets for {map_id} to {out_dir}")


def main(selected_ids=None):
    map_ids = selected_ids or list(MAPS.keys())
    for map_id in map_ids:
        if map_id not in MAPS:
            raise SystemExit(f"Unknown map id: {map_id}")
        write_map_assets(map_id, MAPS[map_id])


if __name__ == "__main__":
    main(sys.argv[1:] or None)
