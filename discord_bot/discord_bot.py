import discord
import config
from api_clients.client_factory import AIClientFactory
from commands.command_registry import CommandRegistry
from database.user_repository import DiscordUserRepository

# Discord setup
intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

# Initialize user repository for MongoDB storage
user_repository = DiscordUserRepository()

# Initialize AI client using the factory
ai_client = AIClientFactory.create_client(config.default_ai_provider, user_repository)

# Initialize command registry
command_registry = CommandRegistry(ai_client, user_repository)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return
        
    # Check if message starts with command prefix
    if message.content.startswith(config.command_prefix):
        # Extract command name and arguments
        parts = message.content[len(config.command_prefix):].strip().split(maxsplit=1)
        command_name = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        # Get command handler
        handler = command_registry.get_handler(command_name)
        if handler:
            await handler.handle(message, args)

if __name__ == "__main__":
    print("Attempting to connect")
    client.run(config.discord_api_key) 