import database_layer
from MachineLearning import MLService, AnalysisTemplateRegistry
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
import datetime
import logging
from activity_suggestion import suggest_activity_from_analysis, SuggestedActivity

print("importing application logic")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Command Pattern
class JournalCommand(ABC):
    @abstractmethod
    def execute(self):
        pass

class AnalyzeJournalCommand(JournalCommand):
    def __init__(self, text: str, ml_service: MLService, 
                 analysis_templates: Union[str, List[str]] = None,
                 custom_questions: List[str] = None,
                 custom_format: Dict = None):
        self.text = text
        self.ml_service = ml_service
        self.analysis_templates = analysis_templates
        self.custom_questions = custom_questions
        self.custom_format = custom_format
    
    def execute(self) -> Dict:
        # If custom questions and format are provided, use them directly
        if self.custom_questions and self.custom_format:
            return self.ml_service.analyze_text(
                self.text,
                questions=self.custom_questions,
                response_format=self.custom_format
            )
        
        # If templates are provided as a list, analyze with multiple templates
        if isinstance(self.analysis_templates, list):
            print()
            return self.ml_service.analyze_with_multiple_templates(
                self.text, 
                self.analysis_templates
            )
        
        # If a single template is provided as a string, use that template
        if isinstance(self.analysis_templates, str):
            return self.ml_service.analyze_with_template(
                self.text, 
                self.analysis_templates
            )
        
        # Default to emotion analysis if nothing specified
        return self.ml_service.analyze_with_template(self.text, "emotion")

class SaveJournalCommand(JournalCommand):
    def __init__(self, repository, username: str, text: str, title: str, classification: Dict):
        self.repository = repository
        self.username = username
        self.text = text
        self.title = title
        self.classification = classification
    
    def execute(self) -> Dict:
        # Save the journal entry
        success = self.repository.save_journal(
            self.username, self.text, self.title, self.classification)
        
        result = {"success": success, "message": "Journal saved" if success else "Failed to save journal"}
        
        # Check for activity suggestions based on analysis
        suggested_activity = suggest_activity_from_analysis(self.classification)
        
        # If an activity is suggested, save it and include in the result
        if suggested_activity:
            # Create a SuggestedActivity object
            activity = suggested_activity['activity']
            reason = suggested_activity['reason']
            
            activity_suggestion = {
                "activity_id": activity['id'],
                "activity_name": activity['name'],
                "activity_description": activity['description'],
                "activity_category": activity['category'],
                "reason": reason,
                "suggested_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "completed": False,
                "mood_benefits": activity.get('mood_benefits', []),
                "difficulty": activity.get('difficulty', 1),
                "duration_minutes": activity.get('duration_minutes', 15)
            }
            
            # Save the suggested activity
            database_layer.add_suggested_activity(self.username, activity_suggestion)
            
            # Add the suggestion to the result
            result["activity_suggested"] = True
            result["suggested_activity"] = activity_suggestion
        else:
            result["activity_suggested"] = False
        
        return result

class SuggestActivityCommand(JournalCommand):
    def __init__(self, username: str, journal_analysis: Dict):
        self.username = username
        self.journal_analysis = journal_analysis
    
    def execute(self) -> Dict:
        # Get activity suggestion based on analysis
        suggested_activity = suggest_activity_from_analysis(self.journal_analysis)
        
        # If no suggestion, return early
        if not suggested_activity:
            return {"activity_suggested": False}
        
        # Create activity suggestion object
        activity = suggested_activity['activity']
        reason = suggested_activity['reason']
        
        activity_suggestion = {
            "activity_id": activity['id'],
            "activity_name": activity['name'],
            "activity_description": activity['description'],
            "activity_category": activity['category'],
            "reason": reason,
            "suggested_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "completed": False,
            "mood_benefits": activity.get('mood_benefits', []),
            "difficulty": activity.get('difficulty', 1),
            "duration_minutes": activity.get('duration_minutes', 15)
        }
        
        # Save the suggested activity
        database_layer.add_suggested_activity(self.username, activity_suggestion)
        
        return {
            "activity_suggested": True,
            "suggested_activity": activity_suggestion
        }

# Journal Repository interface
class JournalRepository(ABC):
    @abstractmethod
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> str:
        pass
        
    @abstractmethod
    def get_user_history(self, username: str) -> List[Dict]:
        pass
    
    @abstractmethod
    def get_user_activities(self, username: str, include_completed: bool = False) -> List[Dict]:
        pass
    
    @abstractmethod
    def update_activity_status(self, username: str, activity_id: str, 
                              completed: bool, rating: Optional[int] = None, 
                              notes: Optional[str] = None) -> bool:
        pass
    
    @abstractmethod
    def get_user_template_preferences(self, username: str) -> Optional[List[str]]:
        """Get user's template preferences"""
        pass
    
    @abstractmethod
    def set_user_template_preferences(self, username: str, templates: List[str]) -> bool:
        """Set user's template preferences"""
        pass

# Concrete MongoDB repository implementation
class MongoJournalRepository(JournalRepository):
    def __init__(self):
        self.repository = database_layer
    
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> str:
        success = self.repository.add_journal_entry(username, text, title, classification)
        return "Journal saved" if success else "Failed to save journal"
    
    def get_user_history(self, username: str) -> List[Dict]:
        history = self.repository.get_user_journal_entries(username)
        return history or []
    
    def get_user_activities(self, username: str, include_completed: bool = False) -> List[Dict]:
        """Get suggested activities for a user"""
        activities = self.repository.get_user_activities(username, include_completed)
        return activities or []
    
    def update_activity_status(self, username: str, activity_id: str, 
                              completed: bool, rating: Optional[int] = None, 
                              notes: Optional[str] = None) -> bool:
        """Update the status of a suggested activity"""
        return self.repository.update_activity_status(
            username, activity_id, completed, rating, notes)
    
    def get_user_template_preferences(self, username: str) -> Optional[List[str]]:
        """Get user's template preferences"""
        return self.repository.get_user_template_preferences(username)
    
    def set_user_template_preferences(self, username: str, templates: List[str]) -> bool:
        """Set user's template preferences"""
        return self.repository.set_user_template_preferences(username, templates)

# Journal Service
class JournalService:
    def __init__(self, repository: JournalRepository, ml_service: Optional[MLService] = None):
        self.repository = repository
        self.ml_service = ml_service or MLService()
    
    def analyze_journal(self, text: str, 
                        templates: Union[str, List[str]] = None,
                        custom_questions: List[str] = None,
                        custom_format: Dict = None) -> Dict:
        command = AnalyzeJournalCommand(
            text, 
            self.ml_service,
            analysis_templates=templates,
            custom_questions=custom_questions,
            custom_format=custom_format
        )
        return command.execute()
    
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> Dict:
        command = SaveJournalCommand(
            self.repository, username, text, title, classification
        )
        return command.execute()
    
    def suggest_activity(self, username: str, journal_analysis: Dict) -> Dict:
        """Suggest an activity based on journal analysis"""
        command = SuggestActivityCommand(username, journal_analysis)
        return command.execute()
    
    def get_user_activities(self, username: str, include_completed: bool = False) -> List[Dict]:
        """Get suggested activities for a user"""
        return self.repository.get_user_activities(username, include_completed)
    
    def update_activity_status(self, username: str, activity_id: str, 
                              completed: bool, rating: Optional[int] = None, 
                              notes: Optional[str] = None) -> bool:
        """Update the status of a suggested activity"""
        return self.repository.update_activity_status(
            username, activity_id, completed, rating, notes)
    
    def analyze_and_store_journal(self, username: str, text: str, title: str,
                                  templates: Union[str, List[str]] = None) -> Dict:
        # If no templates are explicitly provided, use the user's preferences
        if templates is None:
            user_templates = self.get_user_template_preferences(username)
            if user_templates:
                templates = user_templates
        
        # First analyze the journal
        analysis_results = self.analyze_journal(text, templates=templates)
        # Then save the journal with the analysis results
        save_result = self.save_journal(username, text, title, analysis_results)
        
        # Combine results
        result = {
            "analysis": analysis_results,
            "save_status": save_result.get("success", False),
            "message": save_result.get("message", ""),
            "activity_suggested": save_result.get("activity_suggested", False)
        }
        
        # If an activity was suggested, include it
        if save_result.get("activity_suggested", False):
            result["suggested_activity"] = save_result.get("suggested_activity")
        
        return result
    
    def get_journal_history(self, username: str) -> List[Dict]:
        return self.repository.get_user_history(username)
    
    def get_available_templates(self) -> List[str]:
        """Get list of all available analysis templates"""
        return AnalysisTemplateRegistry.list_templates()
        
    def get_user_template_preferences(self, username: str) -> Optional[List[str]]:
        """Get a user's template preferences"""
        return self.repository.get_user_template_preferences(username)
    
    def set_user_template_preferences(self, username: str, templates: List[str]) -> bool:
        """Set a user's template preferences"""
        return self.repository.set_user_template_preferences(username, templates)

# Service locator for global access to services
class ServiceLocator:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.journal_repository = MongoJournalRepository()
            cls._instance.ml_service = MLService()
            cls._instance.journal_service = JournalService(
                cls._instance.journal_repository, cls._instance.ml_service)
        return cls._instance

# For backward compatibility
def analyzeAndStoreJournal(username: str, text: str, title: str) -> Dict:
    service = ServiceLocator.get_instance().journal_service
    return service.analyze_and_store_journal(username, text, title)

def analyzeJournal(username: str, text: str, title: str, 
                   templates: Union[str, List[str]] = None) -> Dict:
    service = ServiceLocator.get_instance().journal_service
    return service.analyze_journal(text, templates=templates)

def saveJournal(username: str, text: str, title: str, classification: Dict) -> Dict:
    service = ServiceLocator.get_instance().journal_service
    return service.save_journal(username, text, title, classification)

def getJournalHistory(username: str) -> List[Dict]:
    service = ServiceLocator.get_instance().journal_service
    return service.get_journal_history(username)

def getUserActivities(username: str, include_completed: bool = False) -> List[Dict]:
    service = ServiceLocator.get_instance().journal_service
    return service.get_user_activities(username, include_completed)

def updateActivityStatus(username: str, activity_id: str, completed: bool,
                       rating: Optional[int] = None, notes: Optional[str] = None) -> bool:
    service = ServiceLocator.get_instance().journal_service
    return service.update_activity_status(username, activity_id, completed, rating, notes)

class AnalysisResult:
    def __init__(self, success: bool, data: Dict = None, error: str = None):
        self.success = success
        self.data = data or {}
        self.error = error
    
    @classmethod
    def success(cls, data: Dict):
        return cls(True, data=data)
    
    @classmethod
    def failure(cls, error: str):
        return cls(False, error=error)
