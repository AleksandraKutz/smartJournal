from .command_handler import CommandHandler

class RebotCommand(CommandHandler):
    async def _process_command(self, args, user_id, message):
        if not args:
            return "Please provide text after the command !rebot."
            
        response_text, _, _ = await self.ai_client.generate_response(
            input_text=args,
            user_id=user_id
        )
        
        return response_text
    
    def _validate_input(self, args):
        return bool(args)
    
    def get_usage_help(self):
        return "Usage: !rebot [text] - Get a response from the AI" 