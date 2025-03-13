from pymongo import MongoClient
import config

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self, connection_string=None, db_name=None):
        """Initialize database connection"""
        if connection_string:
            self.connection_string = connection_string
        else:
            self.connection_string = f"mongodb://admin:{config.mongo_pass}@{config.mongo_host}:{config.mongo_port}/"
        
        self.db_name = db_name or config.mongo_db_name
        self.client = MongoClient(self.connection_string)
        self.db = self.client[self.db_name]
    
    def get_collection(self, collection_name):
        """Get a collection by name"""
        return self.db[collection_name]
    
    def close(self):
        """Close the database connection"""
        if self.client:
            self.client.close() 