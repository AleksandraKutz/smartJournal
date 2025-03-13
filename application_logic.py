import database_layer
from MachineLearning import MLService, AnalysisTemplateRegistry
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union

print("importing application logic")

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
    
    def execute(self) -> str:
        return self.repository.save_journal(
            self.username, self.text, self.title, self.classification)

# Journal Repository interface
class JournalRepository(ABC):
    @abstractmethod
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> str:
        pass
        
    @abstractmethod
    def get_user_history(self, username: str) -> List[Dict]:
        pass

# Concrete MongoDB repository implementation
class MongoJournalRepository(JournalRepository):
    def __init__(self, repository=None):
        from database_layer import RepositoryFactory
        self.repository = repository or RepositoryFactory.create_repository()
    
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> str:
        success = self.repository.add_journal_entry(username, text, title, classification)
        return "Journal saved" if success else "Failed to save journal"
        
    def get_user_history(self, username: str) -> List[Dict]:
        history = self.repository.get_user_history(username)
        return history if history else []

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
    
    def save_journal(self, username: str, text: str, title: str, classification: Dict) -> str:
        command = SaveJournalCommand(
            self.repository, username, text, title, classification
        )
        return command.execute()
    
    def analyze_and_store_journal(self, username: str, text: str, title: str,
                                  templates: Union[str, List[str]] = None) -> Dict:
        # First analyze the journal
        analysis_results = self.analyze_journal(text, templates=templates)
        # Then save the journal with the analysis results
        self.save_journal(username, text, title, analysis_results)
        return analysis_results
    
    def get_journal_history(self, username: str) -> List[Dict]:
        return self.repository.get_user_history(username)
    
    def get_available_templates(self) -> List[str]:
        """Get list of all available analysis templates"""
        return AnalysisTemplateRegistry.list_templates()

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

def saveJournal(username: str, text: str, title: str, classification: Dict) -> str:
    service = ServiceLocator.get_instance().journal_service
    return service.save_journal(username, text, title, classification)

def getJournalHistory(username: str) -> List[Dict]:
    service = ServiceLocator.get_instance().journal_service
    return service.get_journal_history(username)

  
#   assume sliders are there,  analyze button leads to new slider values, use changes on
# submit button would use get values from sliders
# difference no ML module would be called, 

#  My advice:  analyzeJournal method separate from store,  add in id draft field

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
