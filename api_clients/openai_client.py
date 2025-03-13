import requests
import config
from .base_client import BaseAIClient

class OpenAIClient(BaseAIClient):
    def __init__(self, api_key=None, default_model=None, user_repository=None):
        super().__init__(user_repository)
        self.api_key = api_key or config.openai_key
        self.default_model = default_model or config.default_model
    
    async def _call_api(self, input_text, system_prompt, conversation_id):
        """OpenAI-specific API call implementation"""
        try:
            url = "https://api.openai.com/v1/responses"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.default_model,
                "input": input_text,
                "max_output_tokens": config.max_tokens
            }
            
            if system_prompt:
                data["instructions"] = system_prompt
            
            if conversation_id:
                data["previous_response_id"] = conversation_id
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                response_dict = response.json()
                reply = response_dict["output"][0]["content"][0]["text"].strip()
                new_conversation_id = response_dict["id"]
                return reply, new_conversation_id, response_dict
            else:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            return f"Error with OpenAI API: {e}", None, None 