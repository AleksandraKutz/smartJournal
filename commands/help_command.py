from .command_handler import CommandHandler

class HelpCommand(CommandHandler):
    async def _process_command(self, args, user_id, message):
        return "Available commands: !rebot, !define, !song, !help"
    
    def _validate_input(self, args):
        return True
    
    def get_usage_help(self):
        return "Usage: !help - Show available commands" 