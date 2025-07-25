#!/usr/bin/env python3
"""
Test script to verify panel add audit logging functionality
"""

import requests
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
TEST_PANEL = {
    "name": f"test_panel_audit_{timestamp}",
    "key_mapping": {
        "hr_data": {
            "email": "email"
        }
    }
}

def test_panel_add_audit():
    """Test panel add with audit logging"""
    print("🧪 Testing Panel Add Audit Logging")
    print("=" * 50)
    
    try:
        # Test panel add
        print("1. Adding test panel...")
        response = requests.post(
            f"{BASE_URL}/panels/add",
            json=TEST_PANEL,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("   ✅ Panel added successfully")
        else:
            print(f"   ❌ Failed to add panel: {response.status_code} - {response.text}")
            return False
        
        # Check audit trail
        print("2. Checking audit trail...")
        audit_response = requests.get(f"{BASE_URL}/audit/trail")
        
        if audit_response.status_code == 200:
            audit_data = audit_response.json()
            audit_entries = audit_data.get("audit_entries", [])
            
            # Look for NEW_PANEL_ADDED action
            panel_audit_entries = [
                entry for entry in audit_entries 
                if entry.get("action") == "NEW_PANEL_ADDED"
            ]
            
            if panel_audit_entries:
                print(f"   ✅ Found {len(panel_audit_entries)} new panel added audit entries")
                latest_entry = panel_audit_entries[0]  # Most recent first
                print(f"   📋 Latest entry: {latest_entry.get('user_name')} - {latest_entry.get('action')} - {latest_entry.get('status')}")
                print(f"   📋 Details: {latest_entry.get('details', {})}")
            else:
                print("   ❌ No new panel added audit entries found")
                return False
        else:
            print(f"   ❌ Failed to get audit trail: {audit_response.status_code}")
            return False
        
        # Clean up - delete the test panel
        print("3. Cleaning up test panel...")
        delete_response = requests.delete(
            f"{BASE_URL}/panels/delete",
            json={"name": TEST_PANEL["name"]},
            headers={"Content-Type": "application/json"}
        )
        
        if delete_response.status_code == 200:
            print("   ✅ Test panel deleted successfully")
        else:
            print(f"   ⚠️  Failed to delete test panel: {delete_response.status_code}")
        
        print("\n🎉 Panel Add Audit Test Complete!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    test_panel_add_audit() 