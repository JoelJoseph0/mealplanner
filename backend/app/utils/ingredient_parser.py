import re
from difflib import get_close_matches
from typing import Dict, Iterable, List, Optional, Tuple

UNIT_WORDS = {
    "g", "gm", "gram", "kg", "ml", "l", "litre", "liter", "cup", "tbsp", "tablespoon",
    "tsp", "teaspoon", "pinch", "handful", "bunch", "sprig", "piece", "pc", "slice",
    "can", "packet", "no", "inch", "dash", "stick", "pod", "bowl", "glass", "fillet",
    "head", "stalk", "sheet", "drop", "clove",
}

SIZE_WORDS = {"small", "medium", "large", "big", "mini", "heaped", "level", "few", "some", "half", "quarter"}

DESCRIPTOR_WORDS = {
    "fresh", "chopped", "sliced", "diced", "minced", "grated", "ripe", "finely", "roughly",
    "boiled", "cooked", "peeled", "crushed", "steamed", "roasted", "toasted", "soaked",
    "organic", "frozen", "thick", "thin", "of", "a", "an", "the", "to", "taste", "for",
    "garnish", "and", "or", "optional", "warm", "cold", "chilled", "beaten", "whisked",
    "shredded", "cubed", "mashed", "pureed", "halved", "deseeded", "torn", "dry", "plain",
    "homemade", "store", "bought", "spicy", "mild", "tender", "baby", "extra", "virgin",
    "unsalted", "salted", "lightly", "well", "about", "approx", "approximately",
}

NUMBER_PATTERN = re.compile(r"^[\d½¼¾⅓⅔⅛.,/\-]+$")


def _singular(word: str) -> str:
    if len(word) <= 3:
        return word
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith("oes"):
        return word[:-2]
    if word.endswith(("ss", "us", "is")):
        return word
    if word.endswith("s"):
        return word[:-1]
    return word


def normalize_key(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\(.*?\)", " ", str(text).lower())
    cleaned = re.sub(r"[^a-z\s]", " ", cleaned)
    return " ".join(_singular(w) for w in cleaned.split())


def _strip_noise(key: str) -> str:
    words = [w for w in key.split() if w not in UNIT_WORDS and w not in SIZE_WORDS and w not in DESCRIPTOR_WORDS]
    return " ".join(words)


def _candidate_texts(text: str) -> List[str]:
    raw = str(text or "").strip()
    candidates = [raw]
    candidates.extend(m.strip() for m in re.findall(r"\((.*?)\)", raw) if m.strip())
    return candidates


def parse_ingredient_line(line: str) -> Tuple[str, Optional[str], bool]:
    text = str(line or "").strip()
    is_optional = bool(re.search(r"\boptional\b", text, re.IGNORECASE))
    text = re.sub(r"\(?\boptional\b\)?", "", text, flags=re.IGNORECASE).strip(" ,-")

    for separator in (" - ", " – ", " — ", ":"):
        if separator in text:
            name_part, quantity_part = text.split(separator, 1)
            quantity = quantity_part.strip() or None
            return name_part.strip(), quantity, is_optional

    tokens = text.split()
    quantity_tokens = []
    for token in tokens:
        lowered = token.lower().strip(".,")
        if NUMBER_PATTERN.match(lowered) or _singular(lowered) in UNIT_WORDS or lowered in SIZE_WORDS:
            quantity_tokens.append(token)
        else:
            break
    if quantity_tokens and len(quantity_tokens) < len(tokens):
        name_part = " ".join(tokens[len(quantity_tokens):])
        if name_part.lower().startswith("of "):
            name_part = name_part[3:]
        return name_part.strip(), " ".join(quantity_tokens), is_optional
    return text, None, is_optional


class IngredientIndex:
    def __init__(self, foods: Iterable):
        self.key_to_id: Dict[str, int] = {}
        self.names: Dict[int, str] = {}
        food_list = list(foods)
        for food in food_list:
            self.names[food.id] = food.name
            key = normalize_key(food.name)
            if key:
                self.key_to_id.setdefault(key, food.id)
        for food in food_list:
            for alias in food.aliases or []:
                key = normalize_key(alias)
                if key:
                    self.key_to_id.setdefault(key, food.id)

    def _lookup_phrases(self, key: str) -> Optional[int]:
        if key in self.key_to_id:
            return self.key_to_id[key]
        stripped = _strip_noise(key)
        if stripped in self.key_to_id:
            return self.key_to_id[stripped]
        words = stripped.split()
        for size in range(len(words) - 1, 0, -1):
            for start in range(len(words) - size, -1, -1):
                phrase = " ".join(words[start:start + size])
                if phrase in self.key_to_id:
                    return self.key_to_id[phrase]
        return None

    def resolve(self, text: str) -> Optional[int]:
        for candidate in _candidate_texts(text):
            found = self._lookup_phrases(normalize_key(candidate))
            if found is not None:
                return found
        name_part, _, _ = parse_ingredient_line(text)
        if name_part and name_part != text:
            return self._lookup_phrases(normalize_key(name_part))
        return None

    def suggest(self, text: str, limit: int = 3) -> List[str]:
        key = _strip_noise(normalize_key(text))
        if not key:
            return []
        matches = get_close_matches(key, list(self.key_to_id.keys()), n=limit * 3, cutoff=0.72)
        names: List[str] = []
        for match in matches:
            name = self.names.get(self.key_to_id[match])
            if name and name not in names:
                names.append(name)
            if len(names) >= limit:
                break
        return names

    def name_of(self, food_id: int) -> Optional[str]:
        return self.names.get(food_id)
