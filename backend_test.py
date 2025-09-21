import requests
import sys
from datetime import datetime

class CivicConnectAPITester:
    def __init__(self, base_url="https://citiguard-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {response_data}")
                except:
                    print(f"Response: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test the basic endpoints that exist in server.py"""
        print("=== Testing Basic Backend Endpoints ===")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "api/", 200)
        
        # Test create status check
        test_data = {"client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"}
        self.run_test("Create Status Check", "POST", "api/status", 200, test_data)
        
        # Test get status checks
        self.run_test("Get Status Checks", "GET", "api/status", 200)

    def test_civic_endpoints(self):
        """Test expected civic app endpoints (these may not exist yet)"""
        print("\n=== Testing Expected Civic App Endpoints ===")
        
        # Test auth endpoints
        self.run_test("Admin Login", "POST", "api/auth/admin/login", 200, 
                     {"username": "admin", "password": "admin123"})
        
        # Test citizen auth
        self.run_test("Send OTP", "POST", "api/auth/send-otp", 200, 
                     {"mobile": "9876543210"})
        
        # Test issues endpoints
        self.run_test("Get Issues", "GET", "api/issues", 200)
        
        # Test create issue
        issue_data = {
            "title": "Test Issue",
            "description": "Test description",
            "category": "Infrastructure",
            "location": {"lat": 23.2599, "lng": 77.4126},
            "evidence": []
        }
        self.run_test("Create Issue", "POST", "api/issues", 201, issue_data)

def main():
    print("🚀 Starting CivicConnect Backend API Tests")
    tester = CivicConnectAPITester()
    
    # Test basic endpoints first
    tester.test_basic_endpoints()
    
    # Test expected civic app endpoints
    tester.test_civic_endpoints()
    
    # Print results
    print(f"\n📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed < 3:  # At least basic endpoints should work
        print("❌ Critical: Basic backend endpoints are not working")
        return 1
    elif tester.tests_passed < tester.tests_run * 0.5:
        print("⚠️  Warning: More than 50% of expected functionality is missing")
        return 1
    else:
        print("✅ Backend tests completed")
        return 0

if __name__ == "__main__":
    sys.exit(main())