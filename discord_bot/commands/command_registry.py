from .rebot_command import RebotCommand
from .define_command import DefineCommand
from .song_command import SongCommand
from .help_command import HelpCommand

class CommandRegistry:
    def __init__(self, ai_client, user_repository=None):
        self.commands = {
            "rebot": RebotCommand(ai_client, user_repository),
            "define": DefineCommand(ai_client, user_repository),
            "song": SongCommand(ai_client, user_repository),
            "help": HelpCommand(ai_client, user_repository)
        }
    
    def get_handler(self, command_name):
        return self.commands.get(command_name.lower())
    
    def register_command(self, name, handler):
        self.commands[name.lower()] = handler 