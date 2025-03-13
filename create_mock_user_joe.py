#!/usr/bin/env python3
"""
Create a mock user 'Joe' with bipolar disorder and journal entries for March 2025.
This script generates entries with mood swings typical of bipolar disorder,
using all available templates in the system.
"""

import datetime
import random
import json
from pymongo import MongoClient
import sys
import os
from typing import Dict, List, Any, Optional

# Connect to MongoDB - adjust connection string as needed
try:
    # Load configuration from config.py if available
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from config import mongo_uri, mongo_db_name
    client = MongoClient(mongo_uri)
    db = client[mongo_db_name]
except (ImportError, ModuleNotFoundError):
    # Fallback to default connection if config not available
    client = MongoClient("mongodb://localhost:27017/")
    db = client["smartjournal"]

# Define user details
USER_NAME = "joe"
USER_INFO = {
    "username": USER_NAME,
    "profile": {
        "name": "Joe Smith",
        "age": 32,
        "bio": "Software developer with bipolar disorder, trying to track my mood patterns."
    },
    "created_at": datetime.datetime.now()
}

# Define templates to use
TEMPLATES = ["emotion", "themes", "self_reflection"]

# Model bipolar mood cycling with these intensity patterns for March 2025
# Represents the typical mood cycle of bipolar disorder:
# - Early March: Depressive episode
# - Mid March: Transition to manic episode
# - Late March: Full manic episode followed by start of decline
MOOD_CYCLE = {
    # Day: (Joy, Sadness, Anger, Fear, Surprise, Disgust)
    1: (10, 80, 30, 60, 5, 20),   # Deep depression
    3: (5, 85, 40, 65, 10, 25),   # Worsening depression
    5: (8, 78, 35, 55, 15, 20),   # Slight improvement
    7: (12, 75, 30, 50, 10, 15),  # Minor improvement
    10: (20, 65, 25, 45, 15, 10), # Depression starting to lift
    12: (30, 50, 20, 35, 25, 15), # Transition phase
    14: (45, 35, 15, 30, 35, 10), # Moving toward normal
    16: (55, 25, 20, 25, 40, 5),  # Normal mood
    18: (65, 15, 25, 20, 45, 5),  # Elevated mood
    20: (75, 10, 35, 15, 55, 5),  # Hypomanic
    22: (85, 5, 45, 10, 65, 10),  # Manic
    24: (90, 5, 60, 5, 70, 15),   # Full mania
    26: (95, 5, 70, 15, 75, 20),  # Peak mania with irritability
    28: (85, 10, 65, 25, 60, 15), # Start of decline
    30: (75, 20, 50, 30, 45, 10), # Coming down from mania
    31: (65, 30, 40, 35, 35, 15)  # Approaching normal but still elevated
}

# Fill in missing days with interpolated values
def interpolate_mood(day: int) -> tuple:
    """Interpolate mood values for days not explicitly defined"""
    # Find the nearest days before and after the target day
    days = sorted(MOOD_CYCLE.keys())
    if day in days:
        return MOOD_CYCLE[day]
    
    # Find the two closest days to interpolate between
    prev_day = max([d for d in days if d < day], default=days[0])
    next_day = min([d for d in days if d > day], default=days[-1])
    
    if prev_day == next_day:  # Edge case
        return MOOD_CYCLE[prev_day]
    
    # Calculate the interpolation factor
    factor = (day - prev_day) / (next_day - prev_day)
    
    # Interpolate each emotion value
    prev_emotions = MOOD_CYCLE[prev_day]
    next_emotions = MOOD_CYCLE[next_day]
    
    interpolated = tuple(
        round(prev_emotions[i] + factor * (next_emotions[i] - prev_emotions[i]))
        for i in range(len(prev_emotions))
    )
    
    return interpolated

# Templates for journal entries based on mood state
DEPRESSIVE_ENTRIES = [
    "Today was another dark day. I couldn't find the energy to get out of bed until noon. Everything feels heavy and pointless. {specific_detail}",
    "It's hard to focus on anything. My mind feels foggy and I keep making mistakes at work. {specific_detail} I just want to sleep all the time.",
    "I canceled plans again. The thought of socializing is exhausting. {specific_detail} I feel like I'm letting everyone down.",
    "Nothing seems enjoyable anymore. {specific_detail} I used to love coding but now it feels like a chore I have to force myself through.",
    "I keep thinking about all my failures. {specific_detail} It's like a spiral I can't escape from."
]

NEUTRAL_ENTRIES = [
    "Today was okay. I managed to get some work done and even went for a short walk. {specific_detail}",
    "I'm feeling more balanced today. Had a productive meeting and {specific_detail}. Not too high, not too low.",
    "Spent the evening reading. {specific_detail} It's nice to have the focus and calm to enjoy little things again.",
    "Had coffee with an old friend. {specific_detail} It was good to connect without feeling overwhelmed or too energetic.",
    "Today felt normal - whatever that means. {specific_detail} Just taking things one step at a time."
]

MANIC_ENTRIES = [
    "I have SO MANY IDEAS right now! Started three new projects today. {specific_detail} I barely need sleep - only got 2 hours last night but I'm FULL of energy!",
    "Talked to everyone at the coffee shop today. Made new friends! {specific_detail} Everything feels amazing and I can see connections between everything!",
    "Spent $500 on new programming books and equipment. {specific_detail} I'm going to master 5 new programming languages this week!",
    "Haven't slept in 36 hours but I don't even feel tired! {specific_detail} My mind is racing with brilliant solutions to every problem.",
    "EVERYTHING IS CLICKING into place! I'm writing code faster than ever. {specific_detail} People can't keep up with me but that's their problem!"
]

SPECIFIC_DETAILS = {
    "depressive": [
        "I keep thinking about that project I failed at last year.",
        "The pile of dishes in the sink just keeps growing.",
        "My apartment is a mess but I can't find the energy to clean it.",
        "I've been wearing the same clothes for three days now.",
        "Someone asked if I was okay and I nearly broke down crying.",
        "I keep having these intrusive thoughts about worthlessness.",
        "My appetite is completely gone.",
        "I've been ignoring calls from my family.",
        "The weight on my chest feels almost physical.",
        "Even taking a shower feels like climbing a mountain."
    ],
    "neutral": [
        "I remembered to water my plants.",
        "I actually enjoyed my morning coffee.",
        "I replied to some emails I'd been putting off.",
        "I organized my desk a little bit.",
        "I cooked a proper meal instead of just snacking.",
        "I managed to focus on a coding problem for a full hour.",
        "I listened to music and actually felt something.",
        "I made plans for the weekend without feeling anxious.",
        "I took my medication on time today.",
        "I noticed the sun was shining and it felt nice."
    ],
    "manic": [
        "I rearranged all the furniture in my apartment at 3 AM!",
        "I've signed up for six different online courses today!",
        "I'm planning a spontaneous trip to Japan - already bought the tickets!",
        "I called my boss to tell him my BRILLIANT ideas for restructuring the entire company!",
        "I've been writing code non-stop for 18 hours straight!",
        "I messaged every contact in my phone with my new life philosophy!",
        "I've started learning Russian, Japanese, AND Arabic simultaneously!",
        "I've made detailed plans to start three different businesses!",
        "I've written 50 pages of what will definitely be a bestselling novel!",
        "I've reorganized my entire digital life with a completely new system!"
    ]
}

# Journal entry titles based on mood
DEPRESSIVE_TITLES = [
    "Everything feels pointless",
    "Can't escape the darkness",
    "Another day of struggle",
    "The weight is crushing me",
    "Sinking deeper",
    "Lost in the fog",
    "No energy left",
    "The void grows",
    "Fighting to stay afloat",
    "Shadow over everything"
]

NEUTRAL_TITLES = [
    "Finding balance",
    "A normal day",
    "Small steps forward",
    "Steady ground",
    "Breathing easier",
    "Middle path",
    "Quiet moments",
    "Simple pleasures",
    "Just being",
    "Acceptance"
]

MANIC_TITLES = [
    "UNLIMITED POTENTIAL!!!",
    "Breakthrough after breakthrough!",
    "My mind is ELECTRIC!",
    "The world can't keep up!",
    "EVERYTHING IS POSSIBLE!",
    "Racing thoughts and brilliant ideas!",
    "I see EVERYTHING clearly now!",
    "Supercharged and unstoppable!",
    "Epic productivity day!",
    "Riding the lightning!"
]

def get_mood_state(emotions: tuple) -> str:
    """Determine mood state based on emotion values"""
    joy, sadness, *_ = emotions
    
    if joy > 70:  # High joy indicates mania
        return "manic"
    elif sadness > 60:  # High sadness indicates depression
        return "depressive"
    else:
        return "neutral"

def generate_emotion_analysis(emotions: tuple) -> Dict:
    """Generate mock emotion analysis results"""
    joy, sadness, anger, fear, surprise, disgust = emotions
    
    # Determine which emotions are significant enough to have triggers
    triggers = {}
    mood_state = get_mood_state(emotions)
    
    if joy > 30:
        triggers["Joy"] = random.sample([
            "Starting new projects",
            "Feeling connected to everyone",
            "Having 'brilliant' ideas",
            "Feeling invincible",
            "Rapid thoughts"
        ], k=min(2, int(joy/30)))
    
    if sadness > 30:
        triggers["Sadness"] = random.sample([
            "Feeling worthless",
            "Lack of energy",
            "Isolation",
            "Past failures",
            "Feeling burdensome to others"
        ], k=min(2, int(sadness/30)))
    
    if anger > 30:
        triggers["Anger"] = random.sample([
            "People working too slowly",
            "Being misunderstood",
            "Feeling restricted",
            "Others' perceived incompetence",
            "Interruptions to my flow"
        ], k=min(2, int(anger/30)))
    
    if fear > 30:
        triggers["Fear"] = random.sample([
            "Future consequences of actions",
            "Losing control",
            "Health concerns",
            "Financial worries",
            "Social rejection"
        ], k=min(2, int(fear/30)))
        
    return {
        "Joy": joy,
        "Sadness": sadness,
        "Anger": anger,
        "Fear": fear,
        "Surprise": surprise,
        "Disgust": disgust,
        "Triggers": triggers
    }

def generate_themes_analysis(mood_state: str) -> Dict:
    """Generate mock themes analysis based on mood state"""
    themes = []
    
    if mood_state == "depressive":
        themes = [
            {
                "name": "Isolation",
                "prominence": random.randint(7, 10),
                "evidence": ["Avoiding social interaction", "Feeling disconnected", "Canceling plans"]
            },
            {
                "name": "Worthlessness",
                "prominence": random.randint(6, 9),
                "evidence": ["Self-critical thoughts", "Focus on failures", "Feeling burdensome"]
            },
            {
                "name": "Fatigue",
                "prominence": random.randint(8, 10),
                "evidence": ["Lack of energy", "Sleeping too much", "Difficulty with basic tasks"]
            }
        ]
        
        # Occasionally add a theme of hope
        if random.random() < 0.3:
            themes.append({
                "name": "Hope",
                "prominence": random.randint(2, 4),
                "evidence": ["Brief moments of relief", "Small accomplishments", "Memories of better times"]
            })
            
    elif mood_state == "manic":
        themes = [
            {
                "name": "Grandiosity",
                "prominence": random.randint(7, 10),
                "evidence": ["Inflated self-confidence", "Unrealistic plans", "Feeling exceptional"]
            },
            {
                "name": "Productivity",
                "prominence": random.randint(6, 9),
                "evidence": ["Starting multiple projects", "Working for extended periods", "Rapid task switching"]
            },
            {
                "name": "Impulsivity",
                "prominence": random.randint(7, 10),
                "evidence": ["Spontaneous decisions", "Excessive spending", "Risk-taking behavior"]
            }
        ]
        
        # Occasionally add a theme of irritability
        if random.random() < 0.4:
            themes.append({
                "name": "Irritability",
                "prominence": random.randint(5, 8),
                "evidence": ["Frustration with others", "Impatience", "Agitation"]
            })
            
    else:  # neutral
        themes = [
            {
                "name": "Balance",
                "prominence": random.randint(6, 8),
                "evidence": ["Moderate energy levels", "Proportionate reactions", "Stability"]
            },
            {
                "name": "Mindfulness",
                "prominence": random.randint(5, 7),
                "evidence": ["Present moment awareness", "Appreciation of small things", "Reduced rumination"]
            }
        ]
        
        # Add either lingering depression or emerging elevation
        if random.random() < 0.5:
            themes.append({
                "name": "Recovery",
                "prominence": random.randint(4, 6),
                "evidence": ["Moving past depression", "Increasing engagement", "Return of interests"]
            })
        else:
            themes.append({
                "name": "Anticipation",
                "prominence": random.randint(4, 6),
                "evidence": ["Slight increase in energy", "Forward-looking thoughts", "Emerging optimism"]
            })
    
    # Randomize and select 2-3 themes
    random.shuffle(themes)
    return {"themes": themes[:random.randint(2, 3)]}

def generate_self_reflection_analysis(mood_state: str) -> Dict:
    """Generate mock self-reflection analysis based on mood state"""
    
    if mood_state == "depressive":
        # During depression, self-reflection can be overly negative or ruminative
        introspection_level = random.randint(4, 7)  # Moderate to high, but often distorted
        
        reflections = [
            {
                "reflection": "I notice I've been isolating myself more and more.",
                "insight": "This pattern always makes me feel worse, but it's hard to break out of."
            },
            {
                "reflection": "My energy seems completely depleted these days.",
                "insight": "I need to consider whether my medication needs adjustment."
            },
            {
                "reflection": "I've been dwelling on past failures too much.",
                "insight": "This rumination isn't helping me grow, it's just reinforcing negative patterns."
            },
            {
                "reflection": "I'm having trouble seeing any positive qualities in myself.",
                "insight": "This black-and-white thinking is a sign my depression is affecting my self-perception."
            }
        ]
        
        summary = "The entry shows awareness of depressive symptoms, but the reflection is colored by negative thought patterns. There's some insight into how depression affects perception, but limited perspective on potential solutions."
        
    elif mood_state == "manic":
        # During mania, self-reflection is often limited or has grandiose elements
        introspection_level = random.randint(1, 4)  # Low to moderate
        
        reflections = [
            {
                "reflection": "I'm accomplishing so much more than ever before!",
                "insight": "I've finally broken through my limitations and am reaching my true potential."
            },
            {
                "reflection": "People seem concerned about my behavior, but they just don't understand my vision.",
                "insight": "Others often can't keep up with innovative thinking."
            },
            {
                "reflection": "I haven't been sleeping much but don't feel tired at all.",
                "insight": "I've discovered I need much less sleep than most people."
            }
        ]
        
        summary = "The entry shows limited self-awareness about current elevated mood state. Reflections are characterized by grandiosity and lack of recognition of potential mania. Minimal insight into how current behaviors might be symptoms rather than achievements."
        
    else:  # neutral
        # During euthymia, self-reflection tends to be more balanced and insightful
        introspection_level = random.randint(6, 9)  # Moderate to high
        
        reflections = [
            {
                "reflection": "I'm noticing the pattern of my mood cycles more clearly now.",
                "insight": "Tracking my mood has helped me see early warning signs of both depression and mania."
            },
            {
                "reflection": "I've been more consistent with my routine lately.",
                "insight": "Structure seems to help stabilize my mood significantly."
            },
            {
                "reflection": "I'm more aware of my triggers for mood episodes.",
                "insight": "Sleep disruption and stress are consistent precursors to my manic episodes."
            },
            {
                "reflection": "I handled that conflict without overreacting.",
                "insight": "When my mood is stable, my relationships are much healthier."
            }
        ]
        
        summary = "The entry demonstrates good self-awareness and recognition of bipolar patterns. There's meaningful insight into triggers and management strategies. The reflection shows a balanced perspective that's neither overly negative nor grandiose."
    
    # Randomize and select 1-3 reflections
    random.shuffle(reflections)
    selected_reflections = reflections[:random.randint(1, min(3, len(reflections)))]
    
    return {
        "introspection_level": introspection_level,
        "self_reflections": selected_reflections,
        "summary": summary
    }

def generate_journal_entry(day: int, month: int = 3, year: int = 2025) -> Dict:
    """Generate a mock journal entry for the given date"""
    # Get the emotions for this day
    emotions = interpolate_mood(day)
    mood_state = get_mood_state(emotions)
    
    # Select appropriate templates for text and title
    if mood_state == "depressive":
        templates = DEPRESSIVE_ENTRIES
        titles = DEPRESSIVE_TITLES
        details = SPECIFIC_DETAILS["depressive"]
    elif mood_state == "manic":
        templates = MANIC_ENTRIES
        titles = MANIC_TITLES
        details = SPECIFIC_DETAILS["manic"]
    else:
        templates = NEUTRAL_ENTRIES
        titles = NEUTRAL_TITLES
        details = SPECIFIC_DETAILS["neutral"]
    
    # Generate text and title
    specific_detail = random.choice(details)
    text = random.choice(templates).format(specific_detail=specific_detail)
    title = random.choice(titles)
    
    # Add some randomness to the hour
    if mood_state == "depressive":
        hour = random.randint(10, 23)  # Later in the day during depression
    elif mood_state == "manic":
        hour = random.randint(0, 5) if random.random() < 0.7 else random.randint(6, 23)  # Often late night during mania
    else:
        hour = random.randint(7, 22)  # Normal hours during neutral mood
        
    # Create timestamp
    timestamp = datetime.datetime(year, month, day, hour, random.randint(0, 59))
    
    # Generate analysis based on all templates
    analysis = {
        "emotion": generate_emotion_analysis(emotions),
        "themes": generate_themes_analysis(mood_state),
        "self_reflection": generate_self_reflection_analysis(mood_state)
    }
    
    # Return the complete entry
    return {
        "username": USER_NAME,
        "title": title,
        "text": text,
        "timestamp": timestamp,
        "classification": analysis,
        "templates_used": TEMPLATES.copy()
    }

def create_user_and_entries():
    """Create the user and generate all journal entries"""
    users_collection = db["user_table"]
    
    # Check if user already exists
    existing_user = users_collection.find_one({"username": USER_NAME})
    if existing_user:
        print(f"User '{USER_NAME}' already exists. Deleting existing user...")
        users_collection.delete_one({"username": USER_NAME})
    
    # Generate entries for each day in March 2025
    entries = []
    for day in range(1, 32):  # March has 31 days
        entry = generate_journal_entry(day)
        # Format entry to match expected structure
        formatted_entry = {
            "timestamp": entry["timestamp"].isoformat(),
            "title": entry["title"],
            "text": entry["text"],
            "word_frequencies": [],
            "classification": entry["classification"]
        }
        entries.append(formatted_entry)
    
    # Create user with entries
    user_with_entries = USER_INFO.copy()
    user_with_entries["entries"] = entries
    
    # Insert user with entries
    users_collection.insert_one(user_with_entries)
    
    print(f"Created user: {USER_NAME}")
    print(f"Added {len(entries)} journal entries for March 2025")
    print(f"Mock user '{USER_NAME}' with bipolar disorder created successfully with {len(entries)} entries.")

if __name__ == "__main__":
    create_user_and_entries() 