import argparse
import io
import json
import random
import re
import shutil
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "ml" / "dataset"
SOURCE_REPO = "SunnyAgarwal4274/Food_and_Vegetables"
SOURCE_LICENSE = "apache-2.0"
API_TREE = f"https://huggingface.co/api/datasets/{SOURCE_REPO}/tree/main?recursive=true"
RESOLVE = f"https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main/"
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

CLASS_MAP = {
    "apple": "Apple",
    "banana": "Banana",
    "beetroot": "Beetroot",
    "bell pepper": "Capsicum",
    "capsicum": "Capsicum",
    "paprika": "Capsicum",
    "cabbage": "Cabbage",
    "carrot": "Carrot",
    "cauliflower": "Cauliflower",
    "chilli pepper": "Green Chilli",
    "jalepeno": "Green Chilli",
    "corn": "Sweet Corn",
    "sweetcorn": "Sweet Corn",
    "cucumber": "Cucumber",
    "eggplant": "Brinjal",
    "garlic": "Garlic",
    "ginger": "Ginger",
    "grapes": "Grapes",
    "lemon": "Lemon",
    "lettuce": "Lettuce",
    "mango": "Mango",
    "onion": "Onion",
    "orange": "Orange",
    "peas": "Green Peas",
    "pineapple": "Pineapple",
    "pomegranate": "Pomegranate",
    "potato": "Potato",
    "raddish": "Radish",
    "spinach": "Spinach",
    "sweetpotato": "Sweet Potato",
    "tomato": "Tomato",
    "watermelon": "Watermelon",
}


def _fetch_json_pages(url: str):
    items = []
    while url:
        with urllib.request.urlopen(url, timeout=120) as response:
            items.extend(json.load(response))
            link = response.headers.get("Link") or ""
        match = re.search(r'<([^>]+)>;\s*rel="next"', link)
        url = match.group(1) if match else None
    return items


def list_source_images():
    entries = _fetch_json_pages(API_TREE)
    grouped = defaultdict(lambda: defaultdict(list))
    for entry in entries:
        path = entry.get("path", "")
        if entry.get("type") != "file" or not path.lower().endswith(IMAGE_EXTENSIONS):
            continue
        parts = path.split("/")
        if len(parts) < 3:
            continue
        split, folder = parts[0], parts[1]
        ingredient = CLASS_MAP.get(folder)
        if ingredient:
            grouped[split][ingredient].append({"path": path, "size": entry.get("size", 0)})
    return grouped


def select_files(files, limit, max_bytes, rng):
    eligible = sorted((f for f in files if f["size"] <= max_bytes), key=lambda f: f["size"])
    chosen = eligible[:limit]
    rng.shuffle(chosen)
    return chosen


def download_image(source_path: str, target: Path, max_side: int, retries: int = 6) -> bool:
    url = RESOLVE + urllib.parse.quote(source_path)
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=120) as response:
                data = response.read()
            image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
            image.thumbnail((max_side, max_side))
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, "JPEG", quality=90)
            return True
        except Exception as error:
            if attempt == retries:
                print(f"    [skip] {source_path}: {error}")
                return False
            time.sleep(min(30, 2 ** attempt))
    return False


def prepare_dataset(
    max_train: int = 100,
    max_validation: int = 15,
    test_fraction: float = 0.15,
    max_file_mb: float = 2.5,
    max_side: int = 320,
    workers: int = 8,
    seed: int = 42,
    clean: bool = True,
):
    rng = random.Random(seed)
    print(f"--> Listing images in huggingface.co/datasets/{SOURCE_REPO} ({SOURCE_LICENSE})...")
    grouped = list_source_images()
    max_bytes = int(max_file_mb * 1024 * 1024)

    if clean:
        for split in ("train", "validation", "test"):
            split_dir = DATASET_DIR / split
            if split_dir.exists():
                for child in split_dir.iterdir():
                    if child.is_dir():
                        shutil.rmtree(child)

    jobs = []
    summary = defaultdict(dict)
    for ingredient in sorted(set(CLASS_MAP.values())):
        train_pool = select_files(grouped["train"].get(ingredient, []), max_train, max_bytes, rng)
        test_count = max(3, int(round(len(train_pool) * test_fraction)))
        test_files, train_files = train_pool[:test_count], train_pool[test_count:]
        validation_files = select_files(grouped["val"].get(ingredient, []), max_validation, max_bytes, rng)

        for split, files in (("train", train_files), ("validation", validation_files), ("test", test_files)):
            summary[ingredient][split] = len(files)
            for index, item in enumerate(files):
                target = DATASET_DIR / split / ingredient / f"{ingredient.lower().replace(' ', '_')}_{index:03d}.jpg"
                jobs.append((item["path"], target))

    print(f"--> Downloading {len(jobs)} images for {len(summary)} ingredient classes...")
    completed = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(download_image, source, target, max_side): source for source, target in jobs}
        for future in as_completed(futures):
            completed += 1
            if not future.result():
                failed += 1
            if completed % 100 == 0 or completed == len(jobs):
                print(f"    {completed}/{len(jobs)} processed ({failed} failed)")

    manifest = {
        "source": f"https://huggingface.co/datasets/{SOURCE_REPO}",
        "license": SOURCE_LICENSE,
        "image_max_side": max_side,
        "classes": summary,
        "failed_downloads": failed,
    }
    with open(DATASET_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[OK] Dataset ready in {DATASET_DIR} ({len(jobs) - failed} images, {failed} failed)")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and prepare the ingredient image dataset.")
    parser.add_argument("--max-train", type=int, default=100)
    parser.add_argument("--max-validation", type=int, default=15)
    parser.add_argument("--test-fraction", type=float, default=0.15)
    parser.add_argument("--max-file-mb", type=float, default=2.5)
    parser.add_argument("--max-side", type=int, default=320)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--keep-existing", action="store_true")
    args = parser.parse_args()
    prepare_dataset(
        max_train=args.max_train,
        max_validation=args.max_validation,
        test_fraction=args.test_fraction,
        max_file_mb=args.max_file_mb,
        max_side=args.max_side,
        workers=args.workers,
        clean=not args.keep_existing,
    )
