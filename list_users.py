#!/usr/bin/env python3
"""
List all users in the Smart Journal database.
This script shows basic information about each user including their username,
profile details, and the number of journal entries they have.
"""

import sys
import os
from pymongo import MongoClient
import datetime

# Connect to MongoDB - adjust connection string as needed
try:
    # Load configuration from config.py if available
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from config import mongo_uri, mongo_db_name
    client = MongoClient(mongo_uri)
    db = client[mongo_db_name]
    print(f"Connected to database: {mongo_db_name}")
except (ImportError, ModuleNotFoundError):
    # Fallback to default connection if config not available
    client = MongoClient("mongodb://localhost:27017/")
    db = client["smartjournal"]
    print("Connected to database: smartjournal (using default connection)")

def list_users():
    """List all users in the database with their basic information."""
    users_collection = db["user_table"]
    
    # Count total users
    user_count = users_collection.count_documents({})
    print(f"\nFound {user_count} users in the database:\n")
    
    # Get all users
    users = users_collection.find({})
    
    for i, user in enumerate(users, 1):
        username = user.get("username", "Unknown")
        profile = user.get("profile", {})
        entries = user.get("entries", [])
        
        # Format created timestamp
        created_at = user.get("created_at", None)
        if created_at:
            if isinstance(created_at, str):
                created_timestamp = created_at
            else:
                created_timestamp = created_at.strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_timestamp = "Unknown"
        
        # Print user details
        print(f"{i}. Username: {username}")
        
        if profile:
            print(f"   Name: {profile.get('name', 'Not specified')}")
            print(f"   Age: {profile.get('age', 'Not specified')}")
            if 'bio' in profile:
                print(f"   Bio: {profile.get('bio', 'Not specified')}")
        
        print(f"   Created: {created_timestamp}")
        print(f"   Journal entries: {len(entries)}")
        
        # If entries exist, show date range
        if entries:
            # Sort entries by timestamp
            sorted_entries = sorted(entries, key=lambda x: x.get('timestamp', ''))
            if sorted_entries:
                first_entry = sorted_entries[0].get('timestamp', 'Unknown')
                last_entry = sorted_entries[-1].get('timestamp', 'Unknown')
                
                # Format timestamps if they're datetime objects
                if isinstance(first_entry, datetime.datetime):
                    first_entry = first_entry.strftime("%Y-%m-%d")
                if isinstance(last_entry, datetime.datetime):
                    last_entry = last_entry.strftime("%Y-%m-%d")
                    
                print(f"   Entry date range: {first_entry} to {last_entry}")
        
        print()  # Empty line between users

if __name__ == "__main__":
    try:
        list_users()
    except Exception as e:
        print(f"Error listing users: {e}")
    finally:
        # Close the MongoDB connection
        client.close()
        print("Database connection closed.") 