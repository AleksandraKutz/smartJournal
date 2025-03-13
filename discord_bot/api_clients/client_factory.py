from .openai_client import OpenAIClient
#from .claude_client import ClaudeClient

class AIClientFactory:
    """Factory for creating AI clients"""
    
    @staticmethod
    def create_client(provider_name, user_repository=None):
        """Create an AI client based on the provider name"""
        if provider_name.lower() == "openai":
            return OpenAIClient(user_repository=user_repository)
        elif provider_name.lower() == "claude" or provider_name.lower() == "anthropic":
            return ClaudeClient(user_repository=user_repository)
        else:
            raise ValueError(f"Unknown AI provider: {provider_name}") 