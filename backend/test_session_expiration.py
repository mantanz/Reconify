#!/usr/bin/env python3
"""
Test script to verify session expiration audit logging
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_session_expiration_audit():
    """Test session expiration audit logging"""
    print("🔍 Testing Session Expiration Audit Logging")
    print("=" * 50)
    
    # 1. Check current audit trail for session expiration events
    print("\n1. Checking current audit trail for SESSION_EXPIRED events...")
    try:
        response = requests.get(f"{BASE_URL}/audit/trail?action=SESSION_EXPIRED")
        if response.status_code == 200:
            data = response.json()
            session_expired_events = data.get('audit_entries', [])
            print(f"   Found {len(session_expired_events)} SESSION_EXPIRED events")
            
            if session_expired_events:
                print("\n   Recent SESSION_EXPIRED events:")
                for event in session_expired_events[:3]:  # Show last 3
                    print(f"   - {event.get('timestamp')}: {event.get('user_name')} - {event.get('details', {}).get('reason', 'Unknown')}")
            else:
                print("   No SESSION_EXPIRED events found yet")
        else:
            print(f"   Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Error checking audit trail: {e}")
    
    # 2. Test with invalid token
    print("\n2. Testing with invalid token...")
    try:
        invalid_token = "invalid_token_here"
        headers = {"Authorization": f"Bearer {invalid_token}"}
        
        # Try to access a protected endpoint
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Correctly rejected invalid token")
        else:
            print(f"   ⚠️ Unexpected response: {response.text}")
    except Exception as e:
        print(f"   Error testing invalid token: {e}")
    
    # 3. Test with expired token (if we can create one)
    print("\n3. Testing with expired token...")
    try:
        # Create a token that expires immediately
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImV4cCI6MTYwOTQ0NzIwMH0.invalid_signature"
        headers = {"Authorization": f"Bearer {expired_token}"}
        
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 401:
            print("   ✅ Correctly rejected expired token")
        else:
            print(f"   ⚠️ Unexpected response: {response.text}")
    except Exception as e:
        print(f"   Error testing expired token: {e}")
    
    # 4. Check audit trail again for new events
    print("\n4. Checking audit trail again for new SESSION_EXPIRED events...")
    try:
        time.sleep(2)  # Wait a moment for audit events to be logged
        response = requests.get(f"{BASE_URL}/audit/trail?action=SESSION_EXPIRED")
        if response.status_code == 200:
            data = response.json()
            new_session_expired_events = data.get('audit_entries', [])
            print(f"   Found {len(new_session_expired_events)} total SESSION_EXPIRED events")
            
            if len(new_session_expired_events) > len(session_expired_events):
                print("   ✅ New SESSION_EXPIRED events were logged!")
                for event in new_session_expired_events[:3]:
                    print(f"   - {event.get('timestamp')}: {event.get('user_name')} - {event.get('details', {}).get('reason', 'Unknown')}")
            else:
                print("   ⚠️ No new SESSION_EXPIRED events detected")
        else:
            print(f"   Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Error checking audit trail: {e}")
    
    # 5. Test logout with invalid token
    print("\n5. Testing logout with invalid token...")
    try:
        invalid_token = "invalid_token_here"
        headers = {"Authorization": f"Bearer {invalid_token}"}
        
        response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Logout endpoint handled invalid token gracefully")
        else:
            print(f"   ⚠️ Unexpected response: {response.text}")
    except Exception as e:
        print(f"   Error testing logout with invalid token: {e}")
    
    # 6. Check audit summary
    print("\n6. Checking audit summary...")
    try:
        response = requests.get(f"{BASE_URL}/audit/summary")
        if response.status_code == 200:
            data = response.json()
            print(f"   Total audit entries: {data.get('total_entries', 0)}")
            print(f"   Recent activity (24h): {data.get('recent_activity_24h', 0)}")
            
            actions_breakdown = data.get('actions_breakdown', [])
            session_expired_count = 0
            for action in actions_breakdown:
                if action.get('action') == 'SESSION_EXPIRED':
                    session_expired_count = action.get('count', 0)
                    break
            
            print(f"   SESSION_EXPIRED events: {session_expired_count}")
        else:
            print(f"   Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   Error checking audit summary: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Session Expiration Audit Test Complete!")
    print("\n📋 Next Steps:")
    print("1. Check the audit trail in the frontend (Audit Trail page)")
    print("2. Look for SESSION_EXPIRED events in the audit log")
    print("3. Verify that session expiration details are captured correctly")
    print("4. Test with real expired tokens by waiting for JWT expiration")

if __name__ == "__main__":
    test_session_expiration_audit() 