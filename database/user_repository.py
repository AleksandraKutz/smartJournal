from .db_manager import DatabaseManager

class DiscordUserRepository:
    """Repository for Discord user data"""
    
    def __init__(self, db_manager=None):
        """Initialize with a database manager"""
        self.db_manager = db_manager or DatabaseManager()
        self.collection = self.db_manager.get_collection('discord_users')
        # Create index on user_id for faster lookups
        self.collection.create_index('user_id', unique=True)
    
    def get_response_id(self, user_id):
        """Get the response_id for a user"""
        user_doc = self.collection.find_one({'user_id': user_id})
        return user_doc.get('response_id') if user_doc else None
    
    def save_response_id(self, user_id, response_id):
        """Save the response_id for a user"""
        self.collection.update_one(
            {'user_id': user_id},
            {'$set': {'response_id': response_id}},
            upsert=True
        )
    
    def delete_response_id(self, user_id):
        """Delete the response_id for a user"""
        self.collection.update_one(
            {'user_id': user_id},
            {'$unset': {'response_id': ''}}
        )
    
    def get_all_users(self):
        """Get all users"""
        return list(self.collection.find({}))
    
    # For different command types, we can store separate conversation states
    def save_command_state(self, user_id, command, state_data):
        """Save command-specific state data for a user"""
        self.collection.update_one(
            {'user_id': user_id},
            {'$set': {f'command_states.{command}': state_data}},
            upsert=True
        )
    
    def get_command_state(self, user_id, command):
        """Get command-specific state data for a user"""
        user_doc = self.collection.find_one({'user_id': user_id})
        if user_doc and 'command_states' in user_doc:
            return user_doc['command_states'].get(command)
        return None 