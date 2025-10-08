#!/usr/bin/env python3
"""
Test script to verify the improved image classification
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.pipeline import classify_report

def test_park_water_classification():
    """Test park filled with water classification"""
    print("Testing park filled with water classification...")
    
    report = {
        "report_id": "test_park_001",
        "description": "park is filled with water in this location",
        "category": "Parks & Recreation",
        "user_id": "test_user",
        "image_url": "https://example.com/park_water.jpg"
    }
    
    result = classify_report(report)
    print(f"Result: {result}")
    
    if result["status"] == "accepted":
        print("✅ Park water classification PASSED")
    else:
        print(f"❌ Park water classification FAILED: {result.get('reason', 'Unknown reason')}")
    
    return result["status"] == "accepted"

def test_streetlight_classification():
    """Test streetlight classification"""
    print("\nTesting streetlight classification...")
    
    report = {
        "report_id": "test_light_001",
        "description": "street light is not working in this location",
        "category": "Street Lighting",
        "user_id": "test_user",
        "image_url": "https://example.com/streetlight.jpg"
    }
    
    result = classify_report(report)
    print(f"Result: {result}")
    
    if result["status"] == "accepted":
        print("✅ Streetlight classification PASSED")
    else:
        print(f"❌ Streetlight classification FAILED: {result.get('reason', 'Unknown reason')}")
    
    return result["status"] == "accepted"

def test_without_image():
    """Test classification without image (should rely on text)"""
    print("\nTesting without image (text-only classification)...")
    
    report = {
        "report_id": "test_text_001",
        "description": "park is filled with water in this location",
        "category": "Parks & Recreation",
        "user_id": "test_user",
        "image_url": None
    }
    
    result = classify_report(report)
    print(f"Result: {result}")
    
    if result["status"] == "accepted":
        print("✅ Text-only classification PASSED")
    else:
        print(f"❌ Text-only classification FAILED: {result.get('reason', 'Unknown reason')}")
    
    return result["status"] == "accepted"

if __name__ == "__main__":
    print("🧪 Testing improved image classification...")
    print("=" * 50)
    
    # Run tests
    park_test = test_park_water_classification()
    light_test = test_streetlight_classification()
    text_test = test_without_image()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Park water classification: {'✅ PASSED' if park_test else '❌ FAILED'}")
    print(f"Streetlight classification: {'✅ PASSED' if light_test else '❌ FAILED'}")
    print(f"Text-only classification: {'✅ PASSED' if text_test else '❌ FAILED'}")
    
    all_passed = park_test and light_test and text_test
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
