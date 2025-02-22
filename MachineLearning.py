from config import openai_key
import openai
import json
client = openai.OpenAI( api_key = openai_key )


def analyze_text(entry):
    
    prompt = '''
    Given a journal entry, identify the emotions expressed and list any possible triggers for each emotion:


    Use the following emotion categories for consistent labeling:
    - Happiness
    - Sadness
    - Anger
    - Fear
    - Surprise
    - Disgust
    - Neutral

    For each emotion, provide:
    1. The intensity of the emotion (on a scale from 1 to 10).
    2. A list of triggers if they are communicated. If no triggers are explicitly stated, leave the list empty.

    Return the response in valid JSON format. Example response format:
    {
        "emotions": [
            {
                "emotion": "Happiness",
                "intensity": 8,
                "triggers": ["Friend's visit", "Achieved a goal"]
            },
            {
                "emotion": "Sadness",
                "intensity": 6,
                "triggers": ["Lost opportunity", "Distant relationship"]
            },
            ...
        ]
    }
    Here is the entry: ''' + entry

    response = client.chat.completions.create(
    model='gpt-4',
    messages=[
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': prompt}
        ]
    )
    assistant_reply = json.loads(response.choices[0].message.content)
    return assistant_reply

print(analyze_text("I am happy to work"))



