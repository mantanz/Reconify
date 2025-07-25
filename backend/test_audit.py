#!/usr/bin/env python3
"""
Test script for the audit trail system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from audit.audit_utils import (
    create_audit_table, 
    log_audit_event, 
    get_audit_trail, 
    get_audit_summary,
    AUDIT_ACTIONS
)

def test_audit_system():
    """Test the complete audit system"""
    print("🧪 Testing Audit Trail System")
    print("=" * 50)
    
    # Test 1: Create audit table
    print("\n1. Testing audit table creation...")
    success = create_audit_table()
    print(f"   ✅ Table creation: {'SUCCESS' if success else 'FAILED'}")
    
    # Test 2: Log some test events
    print("\n2. Testing audit event logging...")
    
    test_events = [
        {
            "action": "SOT_UPLOAD",
            "user": "john.doe@company.com",
            "details": {
                "sot_type": "hr_data",
                "file_name": "employees.csv",
                "records_processed": 500
            },
            "status": "success"
        },
        {
            "action": "PANEL_UPLOAD",
            "user": "jane.smith@company.com",
            "details": {
                "panel_name": "internal_users",
                "file_name": "internal_users.csv",
                "records_processed": 200
            },
            "status": "success"
        },
        {
            "action": "RECONCILIATION",
            "user": "admin@company.com",
            "details": {
                "panel_name": "internal_users",
                "users_processed": 150,
                "matched": 120,
                "not_found": 30
            },
            "status": "success"
        },
        {
            "action": "SOT_UPLOAD",
            "user": "test.user@company.com",
            "details": {
                "sot_type": "hr_data",
                "file_name": "wrong_format.txt",
                "error": "Invalid file format"
            },
            "status": "failed"
        }
    ]
    
    for i, event in enumerate(test_events, 1):
        success = log_audit_event(
            action=event["action"],
            user=event["user"],
            details=event["details"],
            status=event["status"]
        )
        print(f"   ✅ Event {i} logging: {'SUCCESS' if success else 'FAILED'}")
    
    # Test 3: Retrieve audit trail
    print("\n3. Testing audit trail retrieval...")
    try:
        audit_entries = get_audit_trail(limit=10)
        print(f"   ✅ Retrieved {len(audit_entries)} audit entries")
        
        if audit_entries:
            print("   📋 Sample entries:")
            for i, entry in enumerate(audit_entries[:3], 1):
                print(f"      {i}. {entry['action']} by {entry['user_name']} - {entry['status']}")
    except Exception as e:
        print(f"   ❌ Failed to retrieve audit trail: {e}")
    
    # Test 4: Get audit summary
    print("\n4. Testing audit summary...")
    try:
        summary = get_audit_summary()
        print(f"   ✅ Total entries: {summary.get('total_entries', 0)}")
        print(f"   ✅ Recent activity (24h): {summary.get('recent_activity_24h', 0)}")
        
        if summary.get('actions_breakdown'):
            print("   📊 Actions breakdown:")
            for action in summary['actions_breakdown'][:3]:
                print(f"      - {action['action']}: {action['count']} total, {action['success_count']} success, {action['failed_count']} failed")
    except Exception as e:
        print(f"   ❌ Failed to get audit summary: {e}")
    
    # Test 5: Test filtering
    print("\n5. Testing audit trail filtering...")
    try:
        # Filter by action
        sot_uploads = get_audit_trail(filters={"action": "SOT_UPLOAD"})
        print(f"   ✅ SOT_UPLOAD entries: {len(sot_uploads)}")
        
        # Filter by status
        failed_events = get_audit_trail(filters={"status": "failed"})
        print(f"   ✅ Failed events: {len(failed_events)}")
        
        # Filter by user
        user_events = get_audit_trail(filters={"user": "john"})
        print(f"   ✅ Events by 'john': {len(user_events)}")
        
    except Exception as e:
        print(f"   ❌ Failed to test filtering: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Audit Trail System Test Complete!")
    print("\n📝 Available Actions:")
    for action, description in AUDIT_ACTIONS.items():
        print(f"   - {action}: {description}")
    
    print("\n🚀 Next Steps:")
    print("   1. Start the FastAPI server: python3 main.py")
    print("   2. Access audit trail at: http://localhost:8000/audit/trail")
    print("   3. Use the frontend Audit Trail component")
    print("   4. Monitor real user activities")

if __name__ == "__main__":
    test_audit_system() 