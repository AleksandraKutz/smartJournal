from config import openai_key
import openai
import json
client = openai.OpenAI( api_key = openai_key )


def analyze_text(entry):
    
    prompt = '''
    Given a journal entry, identify the emotions expressed and provide the intensity for each of the following emotions:


    Use the following emotion categories for consistent labeling:
    - Joy
    - Sadness
    - Anger
    - Fear
    - Surprise
    - Disgust

    For each emotion, provide:
    1. The intensity of the emotion (on a scale from 0 to 100).
    2. A list of triggers if they are communicated. If no triggers are explicitly stated, leave the list empty.

    Return the response in valid JSON format. Example response format:

            {
                "Joy": 8,
                "Sadness": 0,
                "Anger": 0,
                "Fear": 0,
                "Surprise": 0,
                "Disgust": 0,
                "Triggers": {
                    "Joy": ["Won lottery"],
                    "Fear": ["Wild animal attack"]
                }
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

print("ML module loaded")



