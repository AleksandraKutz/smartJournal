from .command_handler import CommandHandler

class DefineCommand(CommandHandler):
    async def _process_command(self, args, user_id, message):
        prompt = f"""The user is asking for a definition of a word in English, please provide the Polish translation of the word and a one-sentence summary.
        
            For example respond with:        
            "Word: Hello
            Polish Translation: Cześć
            Definition: A greeting said when meeting someone for the first time or at the start of a conversation."
        
        Word: {args}"""
        
        response_text, _, _ = await self.ai_client.generate_response(
            input_text=prompt,
            user_id=user_id
        )
        
        return response_text
    
    def _validate_input(self, args):
        return bool(args)
    
    def get_usage_help(self):
        return "Usage: !define [word] - Get a definition and Polish translation of a word" 