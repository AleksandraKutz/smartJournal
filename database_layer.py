from flask import Flask, jsonify, request
from pymongo import MongoClient
import datetime
from config import mongo_pass, mongo_uri, mongo_db_name
from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Abstract Repository interface
class Repository(ABC):
    @abstractmethod
    def add_user(self, user_info: Dict) -> bool:
        """Add a new user to the database"""
        pass
    
    @abstractmethod
    def get_user(self, username: str) -> Optional[Dict]:
        """Get a user by username"""
        pass
    
    @abstractmethod
    def get_user_journal_entries(self, username: str) -> Optional[List[Dict]]:
        """Get all journal entries for a user"""
        pass
    
    @abstractmethod
    def add_journal_entry(self, username: str, text: str, title: str, 
                         analysis: Dict) -> bool:
        """Add a new journal entry for a user"""
        pass
    
    @abstractmethod
    def add_suggested_activity(self, username: str, activity: Dict) -> bool:
        """Add a suggested activity for a user"""
        pass
    
    @abstractmethod
    def get_user_activities(self, username: str, 
                           include_completed: bool = False) -> Optional[List[Dict]]:
        """Get all suggested activities for a user"""
        pass
    
    @abstractmethod
    def update_activity_status(self, username: str, activity_id: str, 
                              completed: bool, rating: Optional[int] = None,
                              notes: Optional[str] = None) -> bool:
        """Update status of a suggested activity"""
        pass

# MongoDB Implementation
class MongoRepository(Repository):
    def __init__(self, connection_string: str, database_name: str):
        """Initialize MongoDB connection"""
        try:
            self.client = MongoClient(connection_string)
            self.database = self.client[database_name]
            self.users_collection = self.database['user_table']
            logger.info(f"Connected to MongoDB database: {database_name}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise ConnectionError(f"Could not connect to MongoDB: {e}")
    
    def add_user(self, user_info: Dict) -> bool:
        """Add a new user to the database"""
        try:
            self.users_collection.insert_one(user_info)
            logger.info(f"Added new user: {user_info.get('username')}")
            return True
        except Exception as e:
            logger.error(f"Error adding user to database: {e}")
            return False
    
    def get_user(self, username: str) -> Optional[Dict]:
        """Get a user by username"""
        try:
            user = self.users_collection.find_one({"username": username})
            if user:
                logger.info(f"Retrieved user: {username}")
                return user
            logger.info(f"User not found: {username}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving user from database: {e}")
            return None
    
    def get_user_journal_entries(self, username: str) -> Optional[List[Dict]]:
        """Get all journal entries for a user"""
        try:
            user = self.users_collection.find_one({"username": username})
            if user and 'entries' in user:
                logger.info(f"Retrieved journal entries for user: {username}")
                return user['entries']
            logger.info(f"No journal entries found for user: {username}")
            return None
        except Exception as e:
            logger.error(f"Error retrieving journal entries from database: {e}")
            return None
    
    def add_journal_entry(self, username: str, text: str, title: str, 
                          analysis: Dict) -> bool:
        """Add a new journal entry for a user"""
        try:
            # Check if user exists
            user = self.users_collection.find_one({"username": username})
            
            # Create timestamp
            timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Create user if they don't exist
            if not user:
                logger.info(f"Creating new user: {username}")
                new_user = {
                    "username": username,
                    "entries": [],
                    "suggested_activities": []  # Add activities array
                }
                self.users_collection.insert_one(new_user)
            
            # Add journal entry
            entry = {
                "timestamp": timestamp,
                "title": title,
                "text": text,
                "word_frequencies": [],
                "classification": analysis
            }
            
            self.users_collection.update_one(
                {"username": username},
                {"$push": {"entries": entry}}
            )
            
            logger.info(f"Added journal entry for user: {username}, title: {title}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding journal entry to database: {e}")
            return False
    
    def add_suggested_activity(self, username: str, activity: Dict) -> bool:
        """Add a suggested activity for a user"""
        try:
            # Check if user exists
            user = self.users_collection.find_one({"username": username})
            
            # Create user if they don't exist
            if not user:
                logger.info(f"Creating new user: {username}")
                new_user = {
                    "username": username,
                    "entries": [],
                    "suggested_activities": []
                }
                self.users_collection.insert_one(new_user)
            
            # Ensure suggested_activities array exists
            self.users_collection.update_one(
                {"username": username, "suggested_activities": {"$exists": False}},
                {"$set": {"suggested_activities": []}}
            )
            
            # Add activity to suggested_activities array
            self.users_collection.update_one(
                {"username": username},
                {"$push": {"suggested_activities": activity}}
            )
            
            logger.info(f"Added suggested activity for user: {username}, activity: {activity.get('activity_name')}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding suggested activity to database: {e}")
            return False
    
    def get_user_activities(self, username: str, 
                           include_completed: bool = False) -> Optional[List[Dict]]:
        """Get all suggested activities for a user"""
        try:
            user = self.users_collection.find_one({"username": username})
            
            if not user or 'suggested_activities' not in user:
                logger.info(f"No suggested activities found for user: {username}")
                return []
            
            activities = user['suggested_activities']
            
            # Filter out completed activities if requested
            if not include_completed:
                activities = [a for a in activities if not a.get('completed', False)]
            
            logger.info(f"Retrieved {len(activities)} suggested activities for user: {username}")
            return activities
            
        except Exception as e:
            logger.error(f"Error retrieving suggested activities from database: {e}")
            return None
    
    def update_activity_status(self, username: str, activity_id: str, 
                              completed: bool, rating: Optional[int] = None,
                              notes: Optional[str] = None) -> bool:
        """Update status of a suggested activity"""
        try:
            # Create update object
            update = {"completed": completed}
            
            # Add completion timestamp if completed
            if completed:
                update["completed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Add rating if provided
            if rating is not None:
                update["user_rating"] = rating
            
            # Add notes if provided
            if notes is not None:
                update["user_notes"] = notes
            
            # Update the activity
            result = self.users_collection.update_one(
                {
                    "username": username,
                    "suggested_activities.activity_id": activity_id
                },
                {
                    "$set": {
                        f"suggested_activities.$.completed": completed,
                        f"suggested_activities.$.completed_at": update.get("completed_at"),
                        f"suggested_activities.$.user_rating": update.get("user_rating"),
                        f"suggested_activities.$.user_notes": update.get("user_notes")
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated activity status for user: {username}, activity: {activity_id}")
                return True
            else:
                logger.warning(f"Activity not found or not updated: {activity_id} for user: {username}")
                return False
            
        except Exception as e:
            logger.error(f"Error updating activity status in database: {e}")
            return False

# Repository Factory
class RepositoryFactory:
    @staticmethod
    def create_repository(repository_type: str = "mongo") -> Repository:
        """Create and return the appropriate repository implementation"""
        if repository_type.lower() == "mongo":
            connection_string = mongo_uri if mongo_uri else f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/"
            return MongoRepository(connection_string, mongo_db_name)
        # Add more repository types here (e.g., SQL, file-based, etc.)
        raise ValueError(f"Unsupported repository type: {repository_type}")

# Global repository instance for backward compatibility
_repository = RepositoryFactory.create_repository()

# Clean modern functions
def add_user(user_info: Dict) -> bool:
    """Add a new user to the database"""
    return _repository.add_user(user_info)

def get_user(username: str) -> Optional[Dict]:
    """Get user data by username"""
    return _repository.get_user(username)

def get_user_journal_entries(username: str) -> Optional[List[Dict]]:
    """Get journal entries for a user"""
    return _repository.get_user_journal_entries(username)

def add_journal_entry(username: str, text: str, title: str, analysis: Dict) -> bool:
    """Add a new journal entry for a user"""
    return _repository.add_journal_entry(username, text, title, analysis)

def add_suggested_activity(username: str, activity: Dict) -> bool:
    """Add a suggested activity for a user"""
    return _repository.add_suggested_activity(username, activity)

def get_user_activities(username: str, include_completed: bool = False) -> List[Dict]:
    """Get suggested activities for a user"""
    return _repository.get_user_activities(username, include_completed)

def update_activity_status(username: str, activity_id: str, completed: bool,
                          rating: Optional[int] = None, notes: Optional[str] = None) -> bool:
    """Update status of a suggested activity"""
    return _repository.update_activity_status(username, activity_id, completed, rating, notes)

# Map legacy function names to new ones for backward compatibility
adding_user = add_user
getuser_post = get_user
getuser_history = get_user_journal_entries
addNew_post = add_journal_entry

logger.info("Database layer imported")

