#!/usr/bin/env python3

import json
import os
from app.utils.file_utils import load_sot_config, add_sot_to_config, get_sot_config, update_sot_headers, delete_sot_config

def test_sot_config_system():
    print("Testing SOT Configuration System...")
    
    # Test 1: Load existing config
    print("\n1. Loading existing SOT config...")
    config = load_sot_config()
    print(f"Found {len(config['sots'])} SOTs in configuration")
    for sot in config['sots']:
        print(f"  - {sot['name']}: {len(sot['headers'])} headers")
    
    # Test 2: Add new SOT
    print("\n2. Adding new test SOT...")
    success, message = add_sot_to_config(
        "test_sot", 
        ["id", "name", "email", "status"], 
        "test_user"
    )
    print(f"Result: {success}, Message: {message}")
    
    # Test 3: Get SOT config
    print("\n3. Getting test SOT config...")
    sot_config = get_sot_config("test_sot")
    if sot_config:
        print(f"Found SOT: {sot_config['name']}")
        print(f"Headers: {sot_config['headers']}")
    else:
        print("SOT not found")
    
    # Test 4: Update SOT headers
    print("\n4. Updating test SOT headers...")
    success, message = update_sot_headers(
        "test_sot", 
        ["id", "name", "email", "status", "department"], 
        "test_user"
    )
    print(f"Result: {success}, Message: {message}")
    
    # Test 5: Verify update
    print("\n5. Verifying update...")
    sot_config = get_sot_config("test_sot")
    if sot_config:
        print(f"Updated headers: {sot_config['headers']}")
    
    # Test 6: Delete test SOT
    print("\n6. Deleting test SOT...")
    success, message = delete_sot_config("test_sot")
    print(f"Result: {success}, Message: {message}")
    
    # Test 7: Verify deletion
    print("\n7. Verifying deletion...")
    sot_config = get_sot_config("test_sot")
    if sot_config:
        print("SOT still exists (ERROR)")
    else:
        print("SOT successfully deleted")
    
    print("\nSOT Configuration System Test Complete!")

if __name__ == "__main__":
    test_sot_config_system() 