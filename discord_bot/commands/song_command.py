from .command_handler import CommandHandler

class SongCommand(CommandHandler):
    async def _process_command(self, args, user_id, message):
        system_prompt = """You are playing a choose-your-own-adventure game with the user to select a song. 
        Ask three multiple choice (A through C) questions (one at a time), two about acoustic preferences and one about theme, with multiple-choice answers, 
        then recommend a song based on the answers. If the user is giving an answer (A through C) then it 
        means they are already playing so refer to the history, if it is the third answer give a recommendation, anything else and restart the game."""
        
        try:
            response_text, _, _ = await self.ai_client.generate_response(
                input_text=args or "Start the song selection game",
                system_prompt=system_prompt,
                user_id=user_id
            )
            
            return response_text
        except Exception as e:
            return f"Error with song game: {e}"
    
    def _validate_input(self, args):
        # Always valid - empty input is OK if conversation exists
        return True
    
    def get_usage_help(self):
        return "Usage: !song [text] - Start or continue a song recommendation game" 