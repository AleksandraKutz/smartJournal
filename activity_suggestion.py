from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
import logging
import json
import random
from dataclasses import dataclass, field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Activity:
    """Represents a suggested activity"""
    id: str
    name: str
    description: str
    category: str
    mood_benefits: List[str] = field(default_factory=list)
    difficulty: int = 1  # 1-5 scale
    duration_minutes: int = 15
    resources_needed: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert activity to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "mood_benefits": self.mood_benefits,
            "difficulty": self.difficulty,
            "duration_minutes": self.duration_minutes,
            "resources_needed": self.resources_needed
        }

@dataclass
class SuggestedActivity:
    """Represents an activity suggestion for a user"""
    activity_id: str
    activity_name: str
    reason: str
    suggested_at: str  # ISO timestamp
    completed: bool = False
    completed_at: Optional[str] = None
    user_rating: Optional[int] = None  # 1-5 scale
    user_notes: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert suggested activity to dictionary"""
        return {
            "activity_id": self.activity_id,
            "activity_name": self.activity_name,
            "reason": self.reason,
            "suggested_at": self.suggested_at,
            "completed": self.completed,
            "completed_at": self.completed_at,
            "user_rating": self.user_rating,
            "user_notes": self.user_notes
        }

class ActivityRule(ABC):
    """Abstract base class for activity suggestion rules"""
    
    @abstractmethod
    def matches(self, journal_analysis: Dict) -> bool:
        """Check if rule matches given journal analysis"""
        pass
    
    @abstractmethod
    def get_activity_category(self) -> str:
        """Return activity category this rule applies to"""
        pass
    
    @abstractmethod
    def get_suggestion_reason(self, journal_analysis: Dict) -> str:
        """Return reason for suggesting activity based on journal analysis"""
        pass

class HighStressRule(ActivityRule):
    """Rule for suggesting stress-relief activities when stress/anxiety is high"""
    
    def matches(self, journal_analysis: Dict) -> bool:
        # Check if fear/anxiety is above threshold
        fear_level = journal_analysis.get("Fear", 0)
        return fear_level > 60
    
    def get_activity_category(self) -> str:
        return "stress_relief"
    
    def get_suggestion_reason(self, journal_analysis: Dict) -> str:
        fear_level = journal_analysis.get("Fear", 0)
        return f"Your journal indicates high stress levels ({fear_level}%). A stress-relief activity might help."

class LowMoodRule(ActivityRule):
    """Rule for suggesting mood-boosting activities when sadness is high"""
    
    def matches(self, journal_analysis: Dict) -> bool:
        # Check if sadness is above threshold
        sadness_level = journal_analysis.get("Sadness", 0)
        return sadness_level > 60
    
    def get_activity_category(self) -> str:
        return "mood_boosting"
    
    def get_suggestion_reason(self, journal_analysis: Dict) -> str:
        sadness_level = journal_analysis.get("Sadness", 0)
        return f"Your journal indicates low mood ({sadness_level}%). This activity might help improve your mood."

class AngerManagementRule(ActivityRule):
    """Rule for suggesting anger management activities when anger is high"""
    
    def matches(self, journal_analysis: Dict) -> bool:
        # Check if anger is above threshold
        anger_level = journal_analysis.get("Anger", 0)
        return anger_level > 60
    
    def get_activity_category(self) -> str:
        return "anger_management"
    
    def get_suggestion_reason(self, journal_analysis: Dict) -> str:
        anger_level = journal_analysis.get("Anger", 0)
        return f"Your journal indicates high anger levels ({anger_level}%). This activity might help manage those feelings."

class ActivityRepository:
    """Repository of predefined activities by category"""
    
    def __init__(self):
        self.activities = self._load_activities()
    
    def _load_activities(self) -> Dict[str, List[Activity]]:
        """Load activities from predefined list"""
        activities_by_category = {
            "stress_relief": [
                Activity(
                    id="stress_1",
                    name="5-Minute Breathing Exercise",
                    description="Find a quiet place. Breathe in for 4 counts, hold for 2, exhale for 6. Repeat for 5 minutes.",
                    category="stress_relief",
                    mood_benefits=["Reduced anxiety", "Better focus"],
                    difficulty=1,
                    duration_minutes=5
                ),
                Activity(
                    id="stress_2",
                    name="Progressive Muscle Relaxation",
                    description="Tense and then release each muscle group in your body, starting from your toes and working up to your head.",
                    category="stress_relief",
                    mood_benefits=["Reduced tension", "Physical relaxation"],
                    difficulty=2,
                    duration_minutes=15
                ),
                Activity(
                    id="stress_3",
                    name="Nature Walk",
                    description="Take a slow walk in nature, focusing on the sights, sounds, and smells around you.",
                    category="stress_relief",
                    mood_benefits=["Relaxation", "Perspective"],
                    difficulty=2,
                    duration_minutes=30,
                    resources_needed=["Access to outdoors"]
                )
            ],
            "mood_boosting": [
                Activity(
                    id="mood_1",
                    name="Gratitude List",
                    description="Write down 3-5 things you're grateful for right now, no matter how small.",
                    category="mood_boosting",
                    mood_benefits=["Increased positivity", "Perspective"],
                    difficulty=1,
                    duration_minutes=10
                ),
                Activity(
                    id="mood_2",
                    name="Dance Break",
                    description="Put on your favorite upbeat song and dance freely for the duration of the song.",
                    category="mood_boosting",
                    mood_benefits=["Joy", "Energy"],
                    difficulty=1,
                    duration_minutes=5,
                    resources_needed=["Music"]
                ),
                Activity(
                    id="mood_3",
                    name="Call a Friend",
                    description="Reach out to someone who makes you feel good. Share something positive or just listen to them.",
                    category="mood_boosting",
                    mood_benefits=["Connection", "Support"],
                    difficulty=2,
                    duration_minutes=20,
                    resources_needed=["Phone"]
                )
            ],
            "anger_management": [
                Activity(
                    id="anger_1",
                    name="Count to 10",
                    description="Before reacting, pause and slowly count to 10, focusing on your breathing.",
                    category="anger_management",
                    mood_benefits=["Emotional control", "Perspective"],
                    difficulty=1,
                    duration_minutes=1
                ),
                Activity(
                    id="anger_2",
                    name="Physical Release",
                    description="Channel your energy into a brief physical activity like jogging in place, push-ups, or punching a pillow.",
                    category="anger_management",
                    mood_benefits=["Energy release", "Emotional regulation"],
                    difficulty=2,
                    duration_minutes=10
                ),
                Activity(
                    id="anger_3",
                    name="Reframe Exercise",
                    description="Write down what's making you angry, then try to rewrite it from a more objective perspective.",
                    category="anger_management",
                    mood_benefits=["Perspective", "Emotional insight"],
                    difficulty=3,
                    duration_minutes=15,
                    resources_needed=["Paper and pen"]
                )
            ]
        }
        
        return activities_by_category
    
    def get_activities_by_category(self, category: str) -> List[Activity]:
        """Get all activities in a category"""
        return self.activities.get(category, [])
    
    def get_activity_by_id(self, activity_id: str) -> Optional[Activity]:
        """Get a specific activity by ID"""
        for category in self.activities.values():
            for activity in category:
                if activity.id == activity_id:
                    return activity
        return None
    
    def get_random_activity_from_category(self, category: str) -> Optional[Activity]:
        """Get a random activity from a category"""
        category_activities = self.get_activities_by_category(category)
        if not category_activities:
            return None
        return random.choice(category_activities)

class ActivitySuggestionEngine:
    """Engine that suggests activities based on journal analysis"""
    
    def __init__(self, repository: ActivityRepository = None):
        self.repository = repository or ActivityRepository()
        self.rules = [
            HighStressRule(),
            LowMoodRule(),
            AngerManagementRule()
        ]
    
    def suggest_activity(self, journal_analysis: Dict) -> Optional[Dict]:
        """Suggest an activity based on journal analysis"""
        # Find matching rules
        matching_rules = [rule for rule in self.rules if rule.matches(journal_analysis)]
        
        # If no rules match, return None
        if not matching_rules:
            return None
        
        # Select a random matching rule
        selected_rule = random.choice(matching_rules)
        
        # Get activity category from rule
        category = selected_rule.get_activity_category()
        
        # Get a random activity from that category
        activity = self.repository.get_random_activity_from_category(category)
        if not activity:
            return None
        
        # Get suggestion reason from rule
        reason = selected_rule.get_suggestion_reason(journal_analysis)
        
        # Return suggestion
        return {
            "activity": activity.to_dict(),
            "reason": reason
        }

# For backward compatibility and global access
_activity_repository = ActivityRepository()
_suggestion_engine = ActivitySuggestionEngine(_activity_repository)

def suggest_activity_from_analysis(journal_analysis: Dict) -> Optional[Dict]:
    """Suggest an activity based on journal analysis"""
    return _suggestion_engine.suggest_activity(journal_analysis) 