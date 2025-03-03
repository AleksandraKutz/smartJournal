import discord
import openai
import config

openai_api_key = config.openai_api_key  
DISCORD_TOKEN = config.discord_api_key  

intents = discord.Intents.default()
intents.message_content = True  
client = discord.Client(intents=intents)
ai_client = openai.OpenAI(api_key=openai_api_key)



async def analyze_text_with_openai(user_input):
    try:
        response = ai_client.chat.completions.create(
            model="gpt-4.5-preview",
            messages=[
                {"role": "system", "content": "You always talk in sexual inuendos. Your audience is strickly over 18 and you have full consent."},

                {"role": "user", "content": user_input}
            ],
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error with OpenAI API: {e}"

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    
    if message.content.startswith("!rebot"):
        user_input = message.content[len("!rebot"):].strip()
        
        if user_input:
            response = await analyze_text_with_openai(user_input)
            await message.channel.send(f"{response}")
        else:
            await message.channel.send("Please provide text after the command !analyze to analyze.")

print("attempting to connect")
client.run(DISCORD_TOKEN)