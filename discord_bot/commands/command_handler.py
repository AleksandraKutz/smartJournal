from abc import ABC, abstractmethod

class CommandHandler(ABC):
    """Base class for command handlers"""
    
    def __init__(self, ai_client, user_repository=None):
        self.ai_client = ai_client
        self.user_repository = user_repository
    
    async def handle(self, message, args):
        """Process a command"""
        user_id = str(message.author.id)
        
        if not self._validate_input(args):
            await message.channel.send(self.get_usage_help())
            return
        
        # Process the command
        response_text = await self._process_command(args, user_id, message)
            
        # Send response
        await self.send_chunked_message(message.channel, response_text)
    
    @abstractmethod
    async def _process_command(self, args, user_id, message):
        """Process the command and return response_text"""
        pass
    
    @abstractmethod
    def _validate_input(self, args):
        """Validate the command input"""
        pass
    
    @abstractmethod
    def get_usage_help(self):
        """Get usage help text"""
        pass
    
    async def send_chunked_message(self, channel, text):
        """Helper to send long messages in chunks"""
        if len(text) <= 2000:
            await channel.send(text)
        else:
            for i in range(0, len(text), 2000):
                chunk = text[i:i + 2000]
                await channel.send(chunk) 