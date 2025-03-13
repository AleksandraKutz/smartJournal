#!/usr/bin/env python3
"""
Create a mock user 'Missy' with journal entries that track both moods and urges.
This script generates entries with various mood states and urge intensity levels.
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
USER_NAME = "missy"
USER_INFO = {
    "username": USER_NAME,
    "profile": {
        "name": "Melissa Johnson",
        "age": 29,
        "bio": "Marketing professional tracking both mood patterns and urges to develop better coping strategies."
    },
    "created_at": datetime.datetime.now()
}

# Define templates to use
TEMPLATES = ["emotion", "themes", "self_reflection", "urges"]

# Define urge categories with their descriptions
URGE_CATEGORIES = {
    "Shopping": "Urge to shop or make unnecessary purchases",
    "Social_Media": "Urge to check or post on social media",
    "Food": "Urge to eat when not hungry or binge eat",
    "Exercise": "Urge to exercise excessively",
    "Work": "Urge to overwork or take on too many tasks",
    "Isolation": "Urge to isolate from others",
    "Substance": "Urge to use substances (caffeine, alcohol, etc.)",
    "Procrastination": "Urge to avoid important tasks"
}

# Model mood and urge patterns for March 2025
# Map days to (Joy, Sadness, Anger, Fear, Surprise, Disgust, Shopping, Social_Media, Food, Exercise, Work, Isolation, Substance, Procrastination)
PATTERN = {
    # Day: (Joy, Sadness, Anger, Fear, Surprise, Disgust, Shopping, Social_Media, Food, Exercise, Work, Isolation, Substance, Procrastination)
    1: (50, 20, 15, 25, 30, 10, 30, 70, 40, 20, 60, 20, 15, 40),
    3: (45, 30, 20, 30, 25, 15, 40, 75, 45, 15, 65, 25, 20, 45),
    5: (55, 25, 15, 20, 30, 10, 35, 80, 35, 25, 70, 15, 10, 35),
    7: (60, 15, 10, 15, 35, 5, 25, 75, 30, 30, 65, 10, 5, 30),
    10: (40, 35, 30, 40, 20, 20, 60, 40, 55, 15, 40, 35, 25, 65),
    12: (35, 40, 35, 45, 15, 25, 65, 30, 60, 10, 35, 40, 30, 70),
    14: (30, 45, 40, 50, 10, 30, 70, 25, 65, 5, 30, 45, 35, 75),
    16: (35, 40, 30, 45, 15, 25, 65, 35, 60, 10, 35, 40, 30, 70),
    18: (45, 30, 20, 35, 25, 20, 55, 45, 50, 20, 45, 30, 25, 60),
    20: (55, 20, 15, 25, 35, 15, 40, 60, 40, 30, 55, 20, 15, 50),
    22: (65, 15, 10, 15, 40, 10, 30, 70, 35, 45, 60, 15, 10, 40),
    24: (70, 10, 15, 20, 45, 15, 45, 65, 50, 60, 50, 25, 20, 35),
    26: (60, 20, 25, 30, 35, 20, 60, 50, 60, 50, 40, 30, 30, 45),
    28: (50, 30, 30, 35, 25, 25, 70, 40, 65, 40, 35, 35, 35, 55),
    30: (45, 35, 35, 40, 20, 30, 75, 35, 70, 30, 30, 40, 40, 60),
    31: (40, 40, 40, 45, 15, 35, 80, 30, 75, 20, 25, 45, 45, 65)
}

# Fill in missing days with interpolated values
def interpolate_values(day: int) -> tuple:
    """Interpolate values for days not explicitly defined"""
    # Find the nearest days before and after the target day
    days = sorted(PATTERN.keys())
    if day in days:
        return PATTERN[day]
    
    # Find the two closest days to interpolate between
    prev_day = max([d for d in days if d < day], default=days[0])
    next_day = min([d for d in days if d > day], default=days[-1])
    
    if prev_day == next_day:  # Edge case
        return PATTERN[prev_day]
    
    # Calculate the interpolation factor
    factor = (day - prev_day) / (next_day - prev_day)
    
    # Interpolate each value
    prev_values = PATTERN[prev_day]
    next_values = PATTERN[next_day]
    
    interpolated = tuple(
        round(prev_values[i] + factor * (next_values[i] - prev_values[i]))
        for i in range(len(prev_values))
    )
    
    return interpolated

# Templates for journal entries based on primary urge
SHOPPING_ENTRIES = [
    "I spent an hour browsing online stores today. {specific_detail} I didn't buy anything, but the urge was strong.",
    "Walked through the mall this afternoon and felt drawn to every sale sign. {specific_detail} Had to really focus to stick to my budget.",
    "Found myself looking at new phones again even though mine works perfectly fine. {specific_detail} The shopping urge is definitely elevated today.",
    "Almost bought three new shirts I don't need. {specific_detail} The desire to buy something new was overwhelming at points."
]

SOCIAL_MEDIA_ENTRIES = [
    "Kept checking my phone constantly today. {specific_detail} I must have opened Instagram at least 40 times.",
    "Spent way too much time scrolling through feeds. {specific_detail} It's like I couldn't stop comparing myself to others.",
    "Found myself reaching for my phone even during important conversations. {specific_detail} The urge to check notifications was so strong.",
    "Posted three times today and kept checking for likes. {specific_detail} The dopamine hit from each notification is so addictive."
]

FOOD_ENTRIES = [
    "Had strong cravings for sweets all day. {specific_detail} Even after eating a proper meal, I couldn't stop thinking about dessert.",
    "Ate past the point of fullness at dinner. {specific_detail} The urge to keep eating was hard to resist.",
    "Found myself snacking continuously while working. {specific_detail} Wasn't even hungry, just felt compelled to eat.",
    "Ordered takeout even though I had food at home. {specific_detail} The craving for that specific taste was overwhelming."
]

WORK_ENTRIES = [
    "Stayed late at the office again. {specific_detail} I know I should maintain boundaries but the urge to finish everything was too strong.",
    "Took on three new projects today even though I'm already overloaded. {specific_detail} Can't seem to say no to more work.",
    "Worked through lunch again. {specific_detail} The thought of stepping away from my desk made me anxious.",
    "Found myself checking work emails at 11pm. {specific_detail} The compulsion to always be productive is exhausting."
]

ISOLATION_ENTRIES = [
    "Canceled plans with friends again. {specific_detail} The thought of socializing was too overwhelming.",
    "Ignored several calls and messages today. {specific_detail} The urge to just be alone was very strong.",
    "Stayed home instead of going to the event I was looking forward to. {specific_detail} The pull to isolate myself won out.",
    "Worked from home even though I was supposed to be in the office. {specific_detail} Couldn't bring myself to face people today."
]

NEUTRAL_ENTRIES = [
    "Today was fairly balanced. {specific_detail} I noticed some urges but they didn't control my decisions.",
    "Managed my impulses well today. {specific_detail} Felt the usual urges but kept them in check.",
    "A steady day with moderate urges. {specific_detail} Nothing overwhelmed me though.",
    "Found myself aware of my patterns today. {specific_detail} The awareness helped me make better choices."
]

SPECIFIC_DETAILS = {
    "shopping": [
        "I keep adding things to my cart and then closing the browser.",
        "I've been making a wishlist that's getting longer by the day.",
        "The sales emails are so hard to resist clicking on.",
        "I've been comparing different brands for hours.",
        "My credit card is practically burning a hole in my pocket."
    ],
    "social_media": [
        "I feel anxious when I'm away from my phone for too long.",
        "I've checked my likes at least 20 times today.",
        "My screen time report this week is embarrassing.",
        "I get a rush every time I post something new.",
        "I feel like I'm missing out if I don't keep scrolling."
    ],
    "food": [
        "I ate an entire box of cookies in one sitting.",
        "I'm thinking about what to eat next before I've finished my meal.",
        "I ordered delivery twice in one day.",
        "I'm hiding snack wrappers so I don't have to acknowledge how much I ate.",
        "I keep opening the refrigerator even though I know what's in there."
    ],
    "work": [
        "My to-do list is impossibly long but I keep adding to it.",
        "I feel guilty whenever I take a break.",
        "I canceled plans to finish a project that could have waited.",
        "I'm checking my work email before I even get out of bed.",
        "I can't seem to turn off my work brain even during personal time."
    ],
    "isolation": [
        "I've let my phone battery die just to avoid calls.",
        "I've been making excuses to avoid any social gatherings.",
        "The thought of small talk makes me want to hide.",
        "I've been keeping my curtains closed all day.",
        "I haven't left my apartment in three days."
    ],
    "neutral": [
        "I took a mindful moment when I felt an urge rising.",
        "I checked in with myself before making decisions.",
        "I followed my planned schedule without impulsive changes.",
        "I used some coping strategies I learned in therapy.",
        "I balanced work and personal time effectively."
    ]
}

# Journal entry titles based on primary urge
SHOPPING_TITLES = [
    "Fighting the shopping impulse",
    "The pull of new purchases",
    "Resisting retail therapy",
    "When buying feels necessary",
    "The shopping urge strikes again"
]

SOCIAL_MEDIA_TITLES = [
    "The scroll that never ends",
    "Digital dopamine chase",
    "Screen time struggles",
    "The social media pull",
    "Always connected, never content"
]

FOOD_TITLES = [
    "Cravings and comfort eating",
    "When food is more than nutrition",
    "The snacking cycle",
    "Emotional hunger vs. physical hunger",
    "Food as coping mechanism"
]

WORK_TITLES = [
    "The overwork compulsion",
    "Never feeling done enough",
    "Work boundaries challenge",
    "Productivity at what cost?",
    "The busy trap"
]

ISOLATION_TITLES = [
    "The comfort of solitude",
    "Withdrawing from the world",
    "When connection feels too hard",
    "The isolation instinct",
    "Retreating inward"
]

NEUTRAL_TITLES = [
    "Finding balance",
    "Moderate day, moderate urges",
    "Steady ground",
    "Managing impulses",
    "Awareness and choice"
]

def get_primary_urge(values: tuple) -> str:
    """Determine the primary urge based on the values"""
    # Extract just the urge values (indices 6-13 in our tuple)
    urge_values = values[6:]
    urge_names = list(URGE_CATEGORIES.keys())
    
    # Find the index of the maximum urge value
    max_index = urge_values.index(max(urge_values))
    
    # Return the corresponding urge name
    return urge_names[max_index].lower()

def generate_urge_analysis(values: tuple) -> Dict:
    """Generate mock urge analysis results"""
    # Extract the urge values (indices 6-13)
    urge_values = values[6:]
    urge_names = list(URGE_CATEGORIES.keys())
    
    # Create a dictionary of urge scores
    urges = {}
    for i, urge_name in enumerate(urge_names):
        urges[urge_name] = urge_values[i]
    
    # Determine triggers for significant urges (score > 50)
    triggers = {}
    for urge_name, score in urges.items():
        if score > 50:
            if urge_name == "Shopping":
                triggers[urge_name] = random.sample([
                    "Advertisements", 
                    "Stress relief", 
                    "Sale notifications", 
                    "Social comparison", 
                    "Boredom"
                ], k=min(2, int(score/30)))
            elif urge_name == "Social_Media":
                triggers[urge_name] = random.sample([
                    "FOMO (Fear of missing out)", 
                    "Dopamine seeking", 
                    "Boredom", 
                    "Social validation", 
                    "Habit"
                ], k=min(2, int(score/30)))
            elif urge_name == "Food":
                triggers[urge_name] = random.sample([
                    "Emotional comfort", 
                    "Stress", 
                    "Boredom", 
                    "Social eating", 
                    "Restrictive mindset backfire"
                ], k=min(2, int(score/30)))
            elif urge_name == "Exercise":
                triggers[urge_name] = random.sample([
                    "Body image concerns", 
                    "Anxiety management", 
                    "Control seeking", 
                    "Endorphin chase", 
                    "Social pressure"
                ], k=min(2, int(score/30)))
            elif urge_name == "Work":
                triggers[urge_name] = random.sample([
                    "Perfectionism", 
                    "Fear of failure", 
                    "External validation", 
                    "Avoiding personal issues", 
                    "Financial concerns"
                ], k=min(2, int(score/30)))
            elif urge_name == "Isolation":
                triggers[urge_name] = random.sample([
                    "Social anxiety", 
                    "Emotional overwhelm", 
                    "Rejection sensitivity", 
                    "Energy conservation", 
                    "Avoiding conflict"
                ], k=min(2, int(score/30)))
            elif urge_name == "Substance":
                triggers[urge_name] = random.sample([
                    "Stress relief", 
                    "Social pressure", 
                    "Habit", 
                    "Emotional regulation", 
                    "Sleep aid"
                ], k=min(2, int(score/30)))
            elif urge_name == "Procrastination":
                triggers[urge_name] = random.sample([
                    "Task aversion", 
                    "Perfectionism", 
                    "Overwhelm", 
                    "Fear of failure", 
                    "Decision fatigue"
                ], k=min(2, int(score/30)))
    
    return {
        "urges": urges,
        "triggers": triggers,
        "primary_urge": get_primary_urge(values)
    }

def generate_emotion_analysis(values: tuple) -> Dict:
    """Generate mock emotion analysis results"""
    joy, sadness, anger, fear, surprise, disgust = values[:6]
    
    # Determine which emotions are significant enough to have triggers
    triggers = {}
    
    if joy > 30:
        triggers["Joy"] = random.sample([
            "Accomplishing goals",
            "Social connection",
            "Creative expression",
            "Nature",
            "Physical activity"
        ], k=min(2, int(joy/30)))
    
    if sadness > 30:
        triggers["Sadness"] = random.sample([
            "Disappointment",
            "Loneliness",
            "Past regrets",
            "Compassion fatigue",
            "Unmet expectations"
        ], k=min(2, int(sadness/30)))
    
    if anger > 30:
        triggers["Anger"] = random.sample([
            "Feeling disrespected",
            "Injustice",
            "Boundaries violated",
            "Feeling controlled",
            "Frustration with obstacles"
        ], k=min(2, int(anger/30)))
    
    if fear > 30:
        triggers["Fear"] = random.sample([
            "Uncertainty",
            "Performance anxiety",
            "Social evaluation",
            "Financial insecurity",
            "Health concerns"
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

def generate_themes_analysis(primary_urge: str) -> Dict:
    """Generate mock themes analysis based on primary urge"""
    themes = []
    
    if primary_urge == "shopping":
        themes = [
            {
                "name": "Immediate Gratification",
                "prominence": random.randint(7, 10),
                "evidence": ["Focus on new purchases", "Excitement about buying", "Anticipation of ownership"]
            },
            {
                "name": "Self-Soothing",
                "prominence": random.randint(6, 9),
                "evidence": ["Shopping as stress relief", "Connecting purchases to emotions", "Temporary mood improvement"]
            }
        ]
    elif primary_urge == "social_media":
        themes = [
            {
                "name": "Connection Seeking",
                "prominence": random.randint(7, 10),
                "evidence": ["Frequent checking for interactions", "Focus on notifications", "FOMO (Fear of Missing Out)"]
            },
            {
                "name": "Validation",
                "prominence": random.randint(6, 9),
                "evidence": ["Concern with likes/comments", "Comparing engagement to others", "Self-worth tied to online presence"]
            }
        ]
    elif primary_urge == "food":
        themes = [
            {
                "name": "Emotional Regulation",
                "prominence": random.randint(7, 10),
                "evidence": ["Eating in response to feelings", "Food as comfort", "Cravings tied to emotional states"]
            },
            {
                "name": "Control/Release",
                "prominence": random.randint(6, 9),
                "evidence": ["Cycles of restriction and indulgence", "Food rules", "Guilt and permission patterns"]
            }
        ]
    elif primary_urge == "work":
        themes = [
            {
                "name": "Self-Worth Through Productivity",
                "prominence": random.randint(7, 10),
                "evidence": ["Identity tied to work output", "Difficulty resting", "Achievement focus"]
            },
            {
                "name": "Control",
                "prominence": random.randint(6, 9),
                "evidence": ["Perfectionism", "Difficulty delegating", "Overpreparation"]
            }
        ]
    elif primary_urge == "isolation":
        themes = [
            {
                "name": "Self-Protection",
                "prominence": random.randint(7, 10),
                "evidence": ["Avoiding vulnerability", "Social energy depletion", "Overwhelm from interactions"]
            },
            {
                "name": "Safety Seeking",
                "prominence": random.randint(6, 9),
                "evidence": ["Comfort in familiar environments", "Anxiety about social evaluation", "Relief when alone"]
            }
        ]
    else:  # neutral or other urges
        themes = [
            {
                "name": "Balance",
                "prominence": random.randint(5, 8),
                "evidence": ["Moderation in behaviors", "Awareness of urges", "Healthy boundaries"]
            },
            {
                "name": "Self-Awareness",
                "prominence": random.randint(6, 9),
                "evidence": ["Reflection on patterns", "Recognition of triggers", "Conscious decision-making"]
            }
        ]
    
    # Add a random additional theme
    additional_themes = [
        {
            "name": "Growth",
            "prominence": random.randint(3, 7),
            "evidence": ["Learning from experiences", "Adaptive coping strategies", "Progress recognition"]
        },
        {
            "name": "Authenticity",
            "prominence": random.randint(3, 7),
            "evidence": ["Alignment with values", "True self expression", "Genuine connections"]
        },
        {
            "name": "Resilience",
            "prominence": random.randint(3, 7),
            "evidence": ["Bouncing back from setbacks", "Adapting to challenges", "Persistence through difficulty"]
        }
    ]
    
    themes.append(random.choice(additional_themes))
    return {"themes": themes}

def generate_self_reflection_analysis(primary_urge: str) -> Dict:
    """Generate mock self-reflection analysis based on primary urge"""
    # Base reflection level on how heightened the primary urge is
    if primary_urge in ["neutral"]:
        introspection_level = random.randint(7, 10)  # High when balanced
        reflections = [
            {
                "reflection": "I'm noticing how my urges fluctuate throughout the day.",
                "insight": "Being aware of these patterns helps me intervene before they become overwhelming."
            },
            {
                "reflection": "I'm getting better at distinguishing between genuine needs and impulsive urges.",
                "insight": "This awareness creates a space where I can make conscious choices rather than automatic reactions."
            },
            {
                "reflection": "When I maintain routines, my urges seem less intense.",
                "insight": "Structure and predictability appear to regulate my emotional and behavioral patterns."
            },
            {
                "reflection": "I handled that trigger without giving in to my usual urge.",
                "insight": "My coping strategies are becoming more effective with practice."
            }
        ]
        summary = "The entry demonstrates good self-awareness and recognition of urge patterns. There's meaningful insight into triggers and management strategies. The reflection shows a balanced perspective."
    else:
        # Lower introspection when in the grip of strong urges
        introspection_level = random.randint(3, 7)
        
        if primary_urge == "shopping":
            reflections = [
                {
                    "reflection": "I keep browsing online stores even though I know I shouldn't buy anything.",
                    "insight": "My shopping urges seem to spike when I'm feeling stressed or bored."
                },
                {
                    "reflection": "I rationalize purchases as 'necessary' even when they're clearly not.",
                    "insight": "I'm using shopping as a way to feel more in control or accomplished."
                }
            ]
            summary = "The entry reveals some awareness of shopping urges and their emotional triggers, but shows limited implementation of alternative coping strategies."
        
        elif primary_urge == "social_media":
            reflections = [
                {
                    "reflection": "I notice I check my phone most when I'm feeling anxious or bored.",
                    "insight": "Social media scrolling seems to be my default distraction from uncomfortable feelings."
                },
                {
                    "reflection": "I feel both connected and isolated after long social media sessions.",
                    "insight": "The superficial connection might actually be increasing my sense of loneliness."
                }
            ]
            summary = "The entry shows emerging awareness of social media usage patterns and their emotional impact, though the urge remains strong."
        
        elif primary_urge == "food":
            reflections = [
                {
                    "reflection": "I notice I turn to food when I'm feeling emotionally overwhelmed.",
                    "insight": "Eating temporarily numbs difficult feelings but doesn't actually resolve them."
                },
                {
                    "reflection": "My food urges are strongest at night or when I'm alone.",
                    "insight": "There seems to be a pattern of using food to fill emotional or social voids."
                }
            ]
            summary = "The entry demonstrates growing awareness of emotional eating patterns and their contextual triggers, though alternative strategies are still developing."
        
        elif primary_urge == "work":
            reflections = [
                {
                    "reflection": "I keep working long after I should stop, even when I'm not productive.",
                    "insight": "My self-worth seems too connected to my productivity levels."
                },
                {
                    "reflection": "I feel anxious when I'm not working or being 'useful'.",
                    "insight": "I may be using constant work to avoid other aspects of life that feel uncomfortable."
                }
            ]
            summary = "The entry shows recognition of workaholic tendencies and their connection to self-worth, though breaking the pattern remains challenging."
        
        elif primary_urge == "isolation":
            reflections = [
                {
                    "reflection": "I keep canceling plans even though I know connection is important.",
                    "insight": "The short-term relief of avoiding social interaction comes with longer-term costs to my wellbeing."
                },
                {
                    "reflection": "I feel both relief and loneliness when I isolate.",
                    "insight": "There's a push-pull between my need for safety and my need for connection."
                }
            ]
            summary = "The entry reflects awareness of isolation patterns and their mixed emotional effects, showing some insight into this internal conflict."
        
        else:
            reflections = [
                {
                    "reflection": "I notice my urges are strongest when I'm trying to avoid difficult emotions.",
                    "insight": "These behaviors serve as escape routes from discomfort."
                },
                {
                    "reflection": "There's a predictable pattern to when my urges intensify.",
                    "insight": "Environmental and emotional triggers play a significant role in my behavioral patterns."
                }
            ]
            summary = "The entry shows moderate self-awareness about urge patterns and triggers, with emerging insight into the function these behaviors serve."
    
    # Randomize and select 1-2 reflections
    random.shuffle(reflections)
    selected_reflections = reflections[:random.randint(1, min(2, len(reflections)))]
    
    return {
        "introspection_level": introspection_level,
        "self_reflections": selected_reflections,
        "summary": summary
    }

def generate_journal_entry(day: int, month: int = 3, year: int = 2025) -> Dict:
    """Generate a mock journal entry for the given date"""
    # Get the values for this day
    values = interpolate_values(day)
    primary_urge = get_primary_urge(values)
    
    # Select appropriate templates for text and title
    if primary_urge == "shopping":
        templates = SHOPPING_ENTRIES
        titles = SHOPPING_TITLES
        details = SPECIFIC_DETAILS["shopping"]
    elif primary_urge == "social_media":
        templates = SOCIAL_MEDIA_ENTRIES
        titles = SOCIAL_MEDIA_TITLES
        details = SPECIFIC_DETAILS["social_media"]
    elif primary_urge == "food":
        templates = FOOD_ENTRIES
        titles = FOOD_TITLES
        details = SPECIFIC_DETAILS["food"]
    elif primary_urge == "work":
        templates = WORK_ENTRIES
        titles = WORK_TITLES
        details = SPECIFIC_DETAILS["work"]
    elif primary_urge == "isolation":
        templates = ISOLATION_ENTRIES
        titles = ISOLATION_TITLES
        details = SPECIFIC_DETAILS["isolation"]
    else:
        templates = NEUTRAL_ENTRIES
        titles = NEUTRAL_TITLES
        details = SPECIFIC_DETAILS["neutral"]
    
    # Generate text and title
    specific_detail = random.choice(details)
    text = random.choice(templates).format(specific_detail=specific_detail)
    title = random.choice(titles)
    
    # Create timestamp with some randomness to the hour
    hour = random.randint(8, 22)  # Between 8am and 10pm
    timestamp = datetime.datetime(year, month, day, hour, random.randint(0, 59))
    
    # Generate analysis based on all templates
    analysis = {
        "emotion": generate_emotion_analysis(values[:6]),
        "urges": generate_urge_analysis(values),
        "themes": generate_themes_analysis(primary_urge),
        "self_reflection": generate_self_reflection_analysis(primary_urge)
    }
    
    # Add gratitude section randomly to some entries
    if random.random() < 0.6:  # 60% of entries have gratitude
        gratitude_items = [
            "I'm grateful for my supportive friends who understand my struggles.",
            "Thankful for the moments of calm I experienced today.",
            "Grateful for the tools and strategies I'm learning to manage my urges.",
            "I appreciate having access to resources that help me understand myself better.",
            "Thankful for the small progress I made today in resisting my impulses.",
            "Grateful for nature and how it helps ground me when urges are strong.",
            "I appreciate the understanding of my therapist/counselor.",
            "Thankful for second chances when I slip up.",
            "Grateful for moments of clarity between the strong urges.",
            "I appreciate my increasing self-awareness, even when it's uncomfortable."
        ]
        analysis["gratitude"] = random.sample(gratitude_items, k=random.randint(1, 3))
    
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
    print(f"Mock user '{USER_NAME}' with urge tracking created successfully with {len(entries)} entries.")

if __name__ == "__main__":
    create_user_and_entries() 