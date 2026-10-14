import re
from typing import Optional, Tuple

VULGAR_FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}

MASS_UNITS = {"g": 1.0, "gm": 1.0, "gram": 1.0, "kg": 1000.0, "kilo": 1000.0}
VOLUME_UNITS = {
    "ml": 1.0, "l": 1000.0, "litre": 1000.0, "liter": 1000.0,
    "cup": 240.0, "tbsp": 15.0, "tablespoon": 15.0, "tsp": 5.0, "teaspoon": 5.0,
}
COUNT_UNITS = {"pc", "piece", "no", "nos", "whole", "medium", "small", "large", "big", "unit"}
OTHER_UNITS = {
    "clove", "sprig", "bunch", "pinch", "inch", "slice", "pod", "leaf", "leave",
    "handful", "stick", "fillet", "stalk", "head", "packet", "can", "bulb", "dash",
}

NUMBER_PATTERN = re.compile(r"^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*([a-zA-Z]*)")


def _to_number(token: str) -> Optional[float]:
    token = token.strip()
    try:
        if " " in token and "/" in token:
            whole, fraction = token.split(None, 1)
            top, bottom = fraction.split("/")
            return float(whole) + float(top) / float(bottom)
        if "/" in token:
            top, bottom = token.split("/")
            return float(top) / float(bottom)
        return float(token)
    except (ValueError, ZeroDivisionError):
        return None


def _singular(unit: str) -> str:
    unit = unit.lower()
    if unit in ("nos", "gms"):
        return unit[:-1] if unit != "nos" else "nos"
    if len(unit) > 2 and unit.endswith("s") and unit not in ("us",):
        return unit[:-1]
    return unit


def parse_quantity(text: Optional[str]) -> Optional[Tuple[float, str]]:
    if not text:
        return None
    cleaned = str(text).strip()
    for symbol, value in VULGAR_FRACTIONS.items():
        cleaned = cleaned.replace(symbol, f" {value} ")
    match = NUMBER_PATTERN.match(cleaned)
    if not match:
        return None
    amount = _to_number(match.group(1))
    if amount is None or amount <= 0:
        return None
    unit = _singular(match.group(2)) if match.group(2) else ""

    if unit in MASS_UNITS:
        return amount * MASS_UNITS[unit], "mass"
    if unit in VOLUME_UNITS:
        return amount * VOLUME_UNITS[unit], "volume"
    if unit in OTHER_UNITS:
        return amount, f"other:{unit}"
    if unit == "" or unit in COUNT_UNITS:
        return amount, "count"
    return None


def compare_quantities(have_text: Optional[str], need_text: Optional[str]) -> Optional[Tuple[float, float, str]]:
    have = parse_quantity(have_text)
    need = parse_quantity(need_text)
    if not have or not need or have[1] != need[1]:
        return None
    return have[0], need[0], have[1]


def format_quantity(value: float, kind: str) -> str:
    def number(x: float) -> str:
        return str(int(round(x))) if abs(x - round(x)) < 0.05 else f"{x:.1f}"

    if kind == "mass":
        return f"{number(value / 1000)} kg" if value >= 1000 else f"{number(value)} g"
    if kind == "volume":
        return f"{number(value / 1000)} l" if value >= 1000 else f"{number(value)} ml"
    if kind.startswith("other:"):
        unit = kind.split(":", 1)[1]
        return f"{number(value)} {unit}{'' if abs(value - 1) < 0.05 else 's'}"
    return number(value)
