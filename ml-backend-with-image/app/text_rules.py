import re


def normalize(text: str) -> str:
    return text.lower().strip()


# ------------------------------------
# Utility: safe word/phrase matching
# ------------------------------------
def contains(text: str, keyword: str) -> bool:
    """
    Matches whole words or exact phrases safely.
    Prevents:
      road matching broad
      gas matching gasoline
    """
    return re.search(rf"\b{re.escape(keyword)}\b", text) is not None


# ------------------------------------
# Abusive words
# ------------------------------------
ABUSIVE_WORDS = [
    # Direct profanity
    "fuck", "fucking", "motherfucker",
    "shit", "shitty",
    "asshole", "arsehole",
    "bitch", "bastard",
    "slut", "whore",

    # Insults
    "idiot", "moron", "stupid", "dumb",
    "fool", "loser", "nonsense",
    "useless", "worthless",
    "pathetic", "disgusting",

    # Aggression / hostility
    "bloody", "damn", "hell",
    "scam", "fraud",
    "cheater", "corrupt", "corruption", "bribe",

    # Demeaning phrases
    "dirty people", "garbage people",
    "worst people", "illiterate",
    "uneducated", "shameless",

    # Harassment
    "go to hell",
    "shut up",
    "get lost",
    "no sense",
    "piece of shit"
]



def is_abusive(description: str) -> bool:
    text = normalize(description)
    return any(contains(text, word) for word in ABUSIVE_WORDS)


# ------------------------------------
# Category keywords (CORRECTED)
# ------------------------------------
CATEGORY_KEYWORDS = {

    "Road & Traffic": [
        "road", "pothole", "crack", "broken road", "damaged road",
        "road caved", "road sinking", "uneven road",
        "traffic", "traffic jam", "congestion",
        "signal", "traffic signal", "junction", "crossroad",
        "accident", "collision", "crash", "hit",
        "speed breaker", "speed bump", "divider",
        "footpath", "sidewalk", "zebra crossing", "pedestrian"
    ],

    "Garbage & Sanitation": [
        "garbage", "trash", "waste", "dump", "dumping",
        "garbage pile", "waste pile",
        "dirty", "filthy", "unclean",
        "bad smell", "toxic smell", "foul smell",
        "dustbin", "overflowing bin",
        "sanitation", "sewage", "sewer", "manhole",

        # DEAD ANIMAL (strict & safe)
        "dead", "dead animal", "animal carcass",
        "dead dog", "dead cat", "dead cow",
        "dead body",

        "mosquito", "flies", "infection", "disease"
    ],

    "Water & Drainage": [
        "water", "no water", "low pressure",
        "drinking water", "contaminated water",
        "leak", "leakage", "pipe leak",
        "pipe burst", "broken pipe",
        "drain", "drainage", "blocked drain",
        "overflow", "overflowing drain",
        "flood", "waterlogging", "stagnant water",
        "sewage water", "rain water"
    ],

    "Electricity": [
        "electricity", "electric", "power",
        "no power", "power cut", "power outage",
        "wire", "cable", "pole", "electric pole",
        "transformer", "meter",
        "short circuit", "spark",
        "electrocution", "electric shock",
        "live wire"
    ],

    "Street Lighting": [
        "streetlight", "street light", "lamp",
        "lamp post", "pole light",
        "not working", "broken light",
        "flickering", "dim light",
        "dark", "dark area", "no lighting"
    ],

    "Public Safety": [
        "fire", "smoke", "burning",
        "gas", "gas leak", "cylinder leak",
        "collapse", "building collapse",
        "wall collapse", "roof falling",
        "crime", "theft", "robbery",
        "violence", "fight", "assault",
        "hazard", "danger", "unsafe",
        "emergency", "life risk"
    ],

    "Parks & Recreation": [
        "park", "garden", "playground",
        "children park", "public park",
        "bench", "swing", "slide",
        "walking track",
        "tree", "fallen tree", "tree fallen",
        "lawn", "grass", "maintenance",
        "broken fence"
    ]
}


# ------------------------------------
# Category detection (IMPROVED)
# ------------------------------------
def detect_category(description: str) -> str:
    text = normalize(description)

    best_category = "Other"
    max_score = 0
    max_keyword_length = 0

    for category, keywords in CATEGORY_KEYWORDS.items():
        matches = [kw for kw in keywords if contains(text, kw)]
        score = len(matches)

        if score > max_score:
            max_score = score
            best_category = category
            max_keyword_length = max(len(kw) for kw in matches)
        elif score == max_score and score > 0:
            # Tie-breaker: more specific (longer phrase) wins
            longest = max(len(kw) for kw in matches)
            if longest > max_keyword_length:
                best_category = category
                max_keyword_length = longest

    return best_category


# ------------------------------------
# Urgency keywords
# ------------------------------------
URGENCY_KEYWORDS = {

    "high": [
        "fire", "burning", "smoke",
        "accident", "collision", "crash",
        "collapse", "building collapse",
        "electrocution", "electric shock",
        "gas leak", "explosion",
        "dead", "death", "dead body",
        "sewage overflow", "toxic",
        "contaminated water",
        "flood", "waterlogging",
        "tree fallen"
    ],

    "medium": [
        "broken", "damaged", "cracked",
        "not working", "malfunction",
        "leak", "leakage", "overflow",
        "pipe burst", "no water",
        "power cut", "power outage",
        "traffic jam", "blocked",
        "garbage overflow"
    ]
}


# ------------------------------------
# Urgency detection (SAFE OVERRIDE)
# ------------------------------------
def detect_urgency(description: str) -> str:
    text = normalize(description)

    # Hard safety override
    if any(contains(text, k) for k in ["dead", "fire", "collapse", "gas leak"]):
        return "high"

    for kw in URGENCY_KEYWORDS["high"]:
        if contains(text, kw):
            return "high"

    for kw in URGENCY_KEYWORDS["medium"]:
        if contains(text, kw):
            return "medium"

    return "low"
