import discord
import openai
import config

openai_key = config.openai_key  
DISCORD_TOKEN = config.discord_api_key  

intents = discord.Intents.default()
intents.message_content = True  
client = discord.Client(intents=intents)
ai_client = openai.OpenAI(api_key=openai_key)

async def analyze_text_with_openai(user_input):
    try:
        response = ai_client.chat.completions.create(
            model="gpt-4.5-preview",  # Verify this model exists; it might be "gpt-4" or "gpt-3.5-turbo"
            messages=[{"role": "user", "content": user_input}],
            max_tokens=500  # Increased from 150 to allow longer responses
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error with OpenAI API: {e}"

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

history = ""
counter = 0

@client.event
async def on_message(message):
    global counter
    global history

    if message.author == client.user:
        return
    
    # Helper function to split and send long messages
    async def send_chunked_message(channel, text):
        if len(text) <= 2000:
            await channel.send(text)
        else:
            # Split into chunks of 2000 characters or less
            for i in range(0, len(text), 2000):
                chunk = text[i:i + 2000]
                await channel.send(chunk)

    if message.content.startswith("!rebot"):
        user_input = message.content[len("!rebot"):].strip()
        if user_input:
            response = await analyze_text_with_openai(user_input)
            await send_chunked_message(message.channel, response)
        else:
            await message.channel.send("Please provide text after the command !rebot.")

    elif message.content.startswith("!define"):
        user_input = message.content[len("!define"):].strip()
        prompt = """The user is asking for a definition of a word in English, please provide the Polish translation of the word and a one-sentence summary.
        
            For example respond with:        
            "Word: Hello
            Polish Translation: Cześć
            Definition: A greeting said when meeting someone for the first time or at the start of a conversation."
        
        :""" + user_input
        if user_input:
            response = await analyze_text_with_openai(prompt)
            await send_chunked_message(message.channel, response)
        else:
            await message.channel.send("Please provide a word after the command !define.")

    elif message.content.startswith("!song"):
        if counter == 4:
            counter = 1
            history = ""
        else:
            counter += 1

        user_input = message.content[len("!song"):].strip()
        prompt = '''You are playing a choose-your-own-adventure game with the user to select a song. You are asking three questions (one at a time), two acoustic and one theme with multiple-choice answers, and then recommend a song.
            Here is the conversation history (if blank, we begin from scratch): ''' + history
        
        if counter == 1:
            prompt = user_input + prompt
        else:
            prompt += " I said: " + user_input

        if prompt:
            print(f'user input: {user_input}')
            print(prompt)
            response = await analyze_text_with_openai(prompt)
            history += " You said: " + response 
            await send_chunked_message(message.channel, response)
        else:
            await message.channel.send("Please provide text after the command !song.")

print("attempting to connect")
client.run(DISCORD_TOKEN)