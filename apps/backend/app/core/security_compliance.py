import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Mock IP Geolocation Database for testing / simulation
MOCK_IP_GEO_DB = [
    {"prefix": "192.168.", "city": "Localhost Network", "lat": 0.0, "lon": 0.0},
    {"prefix": "127.0.0.", "city": "Loopback Local", "lat": 0.0, "lon": 0.0},
    {"prefix": "8.8.8.", "city": "Mountain View, USA", "lat": 37.386, "lon": -122.083},
    {"prefix": "103.5.", "city": "Bangalore, India", "lat": 12.971, "lon": 77.594},
    {"prefix": "185.86.", "city": "London, UK", "lat": 51.507, "lon": -0.127},
    {"prefix": "5.253.", "city": "Tokyo, Japan", "lat": 35.676, "lon": 139.65},
    {"prefix": "104.244.", "city": "San Francisco, USA", "lat": 37.774, "lon": -122.419},
    {"prefix": "82.165.", "city": "Berlin, Germany", "lat": 52.52, "lon": 13.404}
]

def resolve_ip_location(ip: str) -> Dict[str, Any]:
    """
    Simulates IP to Geo lookup based on configured patterns.
    """
    if not ip:
        return {"city": "Unknown", "lat": 0.0, "lon": 0.0}

    for item in MOCK_IP_GEO_DB:
        if ip.startswith(item["prefix"]):
            return {"city": item["city"], "lat": item["lat"], "lon": item["lon"]}
            
    # Fallback default location (Bangalore)
    return {"city": "Bangalore, India", "lat": 12.971, "lon": 77.594}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two geocoordinates in kilometers.
    """
    # Convert latitude and longitude from degrees to radians
    r_lat1, r_lon1 = math.radians(lat1), math.radians(lon1)
    r_lat2, r_lon2 = math.radians(lat2), math.radians(lon2)

    # Difference in coordinates
    dlat = r_lat2 - r_lat1
    dlon = r_lon2 - r_lon1

    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth radius in kilometers
    r = 6371.0
    return c * r

def check_impossible_travel(
    prev_ip: str,
    prev_time: datetime,
    curr_ip: str,
    curr_time: datetime
) -> Tuple[bool, float, float]:
    """
    Computes travel speed between sequential logins.
    If speed exceeds 800 km/h (airline speeds) and the distance is non-trivial (>5 km),
    flags the login as an impossible travel anomaly.
    
    Returns (is_anomaly, speed_kph, distance_km).
    """
    # Ensure both datetimes are timezone-naive UTC for comparison
    if prev_time.tzinfo is not None:
        prev_time = prev_time.astimezone(timezone.utc).replace(tzinfo=None)
    if curr_time.tzinfo is not None:
        curr_time = curr_time.astimezone(timezone.utc).replace(tzinfo=None)

    prev_geo = resolve_ip_location(prev_ip)
    curr_geo = resolve_ip_location(curr_ip)
    
    # Compute physical distance
    dist = haversine_distance(prev_geo["lat"], prev_geo["lon"], curr_geo["lat"], curr_geo["lon"])
    
    # Compute time difference in hours
    time_diff = (curr_time - prev_time).total_seconds()
    time_diff_hours = time_diff / 3600.0
    
    # Floor difference to 1 second to avoid division by zero
    if time_diff_hours <= 0.0:
        time_diff_hours = 0.00027  # ~1 second

    # Calculate velocity
    speed = dist / time_diff_hours
    
    # We trigger impossible travel if:
    # 1. Distance is greater than 10 km (rule out micro geo discrepancies)
    # 2. Travel speed exceeds 800 km/h
    # 3. Time difference is within 48 hours (to focus on sequential active sessions)
    is_anomaly = False
    if dist > 10.0 and speed > 800.0 and time_diff_hours < 48.0:
        is_anomaly = True
        logger.warning(
            f"Impossible Travel Detected! Speed: {speed:.2f} km/h, Distance: {dist:.2f} km, Time diff: {time_diff_hours:.2f} hrs"
        )
        
    return is_anomaly, speed, dist
