from app import storage, dataset
from app import image_classifier as ic
from app.text_rules import (
    is_abusive,
    detect_category,
    detect_urgency,
    CATEGORY_KEYWORDS
)
import warnings

warnings.filterwarnings("ignore", category=UserWarning, message=".*pkg_resources.*")


# ------------------------------------
# Image → Category reference (COMPREHENSIVE)
# ------------------------------------
IMAGE_TO_CATEGORY_MAP = {
    "Road & Traffic": [
        "pothole", "damaged road", "illegal parking", "broken footpath",
        "traffic signal not working", "road accident", "road", "street", "traffic",
        "speed breaker", "crosswalk", "footpath", "pavement", "crack", "broken road",
        "road caved", "road sinking", "uneven road", "traffic jam", "congestion",
        "signal", "junction", "crossroad", "accident", "collision", "crash", "hit",
        "speed bump", "divider", "sidewalk", "zebra crossing", "pedestrian", "highway",
        "bridge", "intersection", "pavement", "asphalt"
    ],
    "Garbage & Sanitation": [
        "garbage dump", "overflowing dustbin", "open drain", "sewage overflow",
        "dead animal", "toilet issue", "garbage", "trash", "waste", "bin",
        "sanitation", "dirty", "sewage", "cleanliness", "dustbin", "dump", "dumping",
        "garbage pile", "waste pile", "filthy", "unclean", "bad smell", "toxic smell",
        "foul smell", "overflowing bin", "sewer", "manhole", "dead", "animal carcass",
        "dead dog", "dead cat", "dead cow", "dead body", "mosquito", "flies", "infection", "disease"
    ],
    "Street Lighting": [
        "streetlight not working", "fallen electric pole", "loose wire", "power outage",
        "streetlight", "lamp", "bulb", "pole", "light", "electric pole",
        "street lamp", "lighting", "dark area", "electricity", "power",
        "broken streetlight", "non-working light", "flickering light", "dim light",
        "street lighting", "outdoor lighting", "public lighting", "night lighting",
        "lamp post", "pole light", "not working", "broken light", "flickering",
        "dark", "no lighting", "illumination"
    ],
    "Water & Drainage": [
        "waterlogging", "pipe burst", "no water supply", "drainage issue", "flood",
        "drain", "drainage", "sewage", "sewer", "leak", "leaking", "leakage",
        "pipe", "water", "overflow", "water supply", "drainage system",
        "no water", "low pressure", "drinking water", "contaminated water",
        "pipe leak", "broken pipe", "blocked drain", "overflowing drain",
        "stagnant water", "sewage water", "rain water", "water pipe"
    ],
    "Parks & Recreation": [
        "tree fallen", "illegal construction", "park maintenance", "encroachment",
        "park", "garden", "playground", "tree", "bench", "grass", "lawn",
        "recreation", "green space", "park area", "garden area", "flooded park",
        "water in park", "park with water", "playground equipment", "walking path",
        "fountain", "pond", "lake", "outdoor space", "public space",
        "children park", "public park", "swing", "slide", "walking track",
        "fallen tree", "broken fence", "garden bench"
    ],
    "Public Safety": [
        "fire", "gas leak", "building collapse", "accident site",
        "crime", "robbery", "theft", "violence", "hazard", "danger",
        "safety", "harassment", "emergency", "accident", "smoke", "burning",
        "gas", "cylinder leak", "collapse", "wall collapse", "roof falling",
        "theft", "fight", "assault", "unsafe", "life risk", "explosion"
    ],
    "Electricity": [
        "electric", "electricity", "power", "outage", "wire", "transformer",
        "short circuit", "shock", "cable", "meter", "electrical", "voltage", "current",
        "no power", "power cut", "pole", "electric pole", "spark",
        "electrocution", "electric shock", "live wire", "power line"
    ]
}

GENERIC_IMAGE_LABELS = {
    "other", "outdoor", "outdoor space", "public space", "area", "scene", "general"
}


# ------------------------------------
# Main pipeline
# ------------------------------------
def classify_report(report: dict):
    try:
        description = (report.get("description") or "").strip()
        if not description:
            return reject(report, "Description is required")

        category = detect_category(description)
        if category == "Other":
            return reject(report, "Unable to determine issue category")

        if is_abusive(description):
            return reject(report, "Abusive language detected", category)

        # STEP 1: Check image against detected category FIRST (BEFORE duplicate check)
        image_url = report.get("image_url")
        if image_url:
            print(f"[DEBUG] Processing image for category '{category}': {image_url}")
            
            # CRITICAL: Validate image matches category FIRST
            # If image doesn't match, reject immediately - don't check duplicates
            image_matches = image_matches_category(image_url, category)
            
            if not image_matches:
                # Image doesn't match category - reject immediately
                # Don't check for duplicates if image doesn't even match
                print(f"[DEBUG] Image does NOT match category '{category}' - rejecting without duplicate check")
                return reject(
                    report,
                    "Image does not match the issue description. Please provide an image related to the reported category.",
                    category
                )
            
            print(f"[DEBUG] Image matches category '{category}' - proceeding to duplicate check")
            
            # STEP 2: Only check for duplicates if image matches category
            # We only reach here if image_matches == True
            try:
                # Check for duplicates with threshold=0 (EXACT match only - most strict)
                # This prevents false positives from similar but different images
                print(f"[DEBUG] Checking for duplicate image: {image_url}")
                is_dup = storage.is_duplicate_image(image_url, threshold=0, store=False)
                
                if is_dup:
                    print(f"[DEBUG] DUPLICATE DETECTED for URL: {image_url}")
                    return reject(report, "Duplicate image detected. This image has already been used in another report.", category)
                
                print(f"[DEBUG] Image is NOT duplicate - storing for future checks")
                # Only store if not a duplicate (to track for future checks)
                # This ensures we remember this image for future duplicate detection
                storage.is_duplicate_image(image_url, threshold=0, store=True)
                print(f"[DEBUG] Image validated and stored successfully")
            except Exception as e:
                # If duplicate check fails, allow submission (don't block on technical errors)
                print(f"[ERROR] Duplicate check failed (allowing submission): {str(e)}")
                import traceback
                print(traceback.format_exc())
                # Continue - don't block legitimate reports due to technical issues

        urgency = detect_urgency(description)
        priority = {
            "high": "urgent",
            "medium": "medium",
            "low": "low"
        }.get(urgency, "medium")
        
        result = {
            "report_id": report.get("report_id", "unknown"),
            "accept": True,
            "status": "accepted",
            "category": category,
            "department": category,
            "urgency": urgency,
            "priority": priority,
            "reason": "Report accepted successfully"
        }

        dataset.save_report({**report, **result})
        return result

    except Exception as e:
        return reject(report, f"Processing error: {str(e)}")


# ------------------------------------
# Image validation logic (STRICT & ACCURATE)
# ------------------------------------
def image_matches_category(image_url: str, category: str) -> bool:
    """
    Check if image matches the detected category.
    Returns True ONLY if image is clearly related to category.
    Returns False if image is unrelated or classification fails.
    """
    try:
        image_label = ic.classify_image(image_url)
        image_label = str(image_label).lower().strip() if image_label else "other"
        
        # If classifier completely fails, reject (don't allow unknown images)
        if not image_label or image_label == "":
            print(f"Image classification returned empty - rejecting")
            return False
        
        # Get allowed labels and keywords for this category
        allowed_labels = [lbl.lower() for lbl in IMAGE_TO_CATEGORY_MAP.get(category, [])]
        category_keywords = [kw.lower() for kw in CATEGORY_KEYWORDS.get(category, [])]

        # If "other" - this means classifier couldn't identify, REJECT it
        # Don't allow "other" - it means image doesn't match any known category
        if image_label == "other":
            print(f"Image classified as 'other' - does not match category '{category}' - rejecting")
            return False

        # If generic label, also reject (too vague, likely doesn't match)
        if image_label in GENERIC_IMAGE_LABELS:
            print(f"Image classified as generic '{image_label}' - does not match category '{category}' - rejecting")
            return False

        # Method 1: Direct exact match with allowed labels
        if image_label in allowed_labels:
            print(f"Image label '{image_label}' exactly matches category '{category}' - accepting")
            return True

        # Method 2: Check if image label contains any allowed label (substring match)
        for lbl in allowed_labels:
            if lbl in image_label or image_label in lbl:
                print(f"Image label '{image_label}' contains allowed label '{lbl}' for category '{category}' - accepting")
                return True

        # Method 3: Check if image label contains any category keyword from description
        for kw in category_keywords:
            if kw in image_label or image_label in kw:
                print(f"Image label '{image_label}' matches keyword '{kw}' for category '{category}' - accepting")
                return True

        # Method 4: Word-level matching (split and check for common words)
        image_words = set(image_label.split())
        for lbl in allowed_labels:
            lbl_words = set(lbl.split())
            common_words = image_words.intersection(lbl_words)
            if common_words and len(common_words) > 0:
                print(f"Image label '{image_label}' shares words with '{lbl}' for category '{category}' - accepting")
                return True

        # Method 5: Check if any word from image appears in category keywords
        for word in image_words:
            if len(word) > 2:  # Only check meaningful words (length > 2)
                for kw in category_keywords:
                    if word in kw or kw in word:
                        print(f"Image word '{word}' matches keyword '{kw}' for category '{category}' - accepting")
                        return True
                for lbl in allowed_labels:
                    if word in lbl or lbl in word:
                        print(f"Image word '{word}' matches label '{lbl}' for category '{category}' - accepting")
                        return True

        # If none of the methods match, the image is clearly unrelated
        print(f"Image label '{image_label}' does NOT match category '{category}' - rejecting")
        return False

    except Exception as e:
        # If classification fails completely, REJECT (don't allow unknown)
        print(f"Image classification error for category '{category}' - rejecting: {str(e)}")
        return False


# ------------------------------------
# Reject helper
# ------------------------------------
def reject(report, reason, category="Other"):
    result = {
        "report_id": report.get("report_id", "unknown"),
        "accept": False,
        "status": "rejected",
        "category": category,
        "department": category,
        "reason": reason
    }
    dataset.save_report({**report, **result})
    return result
