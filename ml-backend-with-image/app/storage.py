from PIL import Image
import imagehash
import requests
import io
from math import radians, cos, sin, asin, sqrt

# In-memory stores (ephemeral - reset on server restart)
seen_reports = set()
seen_image_hashes = []   # store imagehash objects
seen_locations = []  # list of tuples (lat, lon, description, category)

def is_duplicate(user_id: str, description: str, category: str) -> bool:
    key = (user_id or "anon", description.strip().lower(), category.lower())
    if key in seen_reports:
        return True
    seen_reports.add(key)
    return False

def is_duplicate_image(image_url: str, threshold: int = 5) -> bool:
    """Check if an image is a duplicate using perceptual hash (pHash).
    threshold = maximum Hamming distance allowed to consider images equal.
    Returns True if duplicate found, else stores the hash and returns False.
    """
    try:
        resp = requests.get(image_url, timeout=5)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert('RGB')
        img_hash = imagehash.phash(img)

        for h in seen_image_hashes:
            # imagehash library supports subtraction to get Hamming distance
            if abs(img_hash - h) <= threshold:
                return True

        # store hash
        seen_image_hashes.append(img_hash)
        return False
    except Exception:
        # On any failure to fetch/process image, treat as non-duplicate
        return False

def haversine(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance between two lat/lon points in meters."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    a = sin(delta_lat/2)**2 + cos(lat1) * cos(lat2) * sin(delta_lon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Earth radius in meters
    return c * r

def is_duplicate_location(lat: float, lon: float, description: str, category: str, threshold: int = 20) -> bool:
    """Return True if an existing report with same text+category exists within threshold meters."""
    try:
        for (lat0, lon0, desc0, cat0) in seen_locations:
            if desc0.strip().lower() == description.strip().lower() and cat0.lower() == category.lower():
                dist = haversine(lat, lon, lat0, lon0)
                if dist <= threshold:
                    return True
        # not duplicate — store this location for future checks
        seen_locations.append((lat, lon, description, category))
        return False
    except Exception:
        return False
