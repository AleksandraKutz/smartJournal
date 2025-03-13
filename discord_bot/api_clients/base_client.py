from abc import ABC, abstractmethod
import uuid

class BaseAIClient(ABC):
    """Base class for AI clients with common functionality"""
    
    def __init__(self, user_repository=None):
        self.user_repository = user_repository
    
    async def generate_response(self, input_text, system_prompt=None, user_id=None, conversation_id=None):
        """Generate a response while handling conversation state"""
        
        # Get conversation_id from repository if not provided but user_id is
        if conversation_id is None and user_id is not None and self.user_repository:
            conversation_id = self.user_repository.get_response_id(user_id)
        
        # Call API-specific implementation
        response_text, new_conversation_id, raw_response = await self._call_api(
            input_text=input_text,
            system_prompt=system_prompt,
            conversation_id=conversation_id
        )
        
        # Store the new conversation_id in repository if provided user_id
        if user_id is not None and new_conversation_id and self.user_repository:
            self.user_repository.save_response_id(user_id, new_conversation_id)
        
        return response_text, new_conversation_id, raw_response
    
    @abstractmethod
    async def _call_api(self, input_text, system_prompt, conversation_id):
        """Make the actual API call to the specific AI provider - to be implemented by subclasses"""
        pass 