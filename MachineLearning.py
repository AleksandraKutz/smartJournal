from config import openai_key
import openai
import json
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union

# Abstract API Client
class APIClient(ABC):
    @abstractmethod
    def analyze(self, text: str, questions: List[str] = None, 
                response_format: Dict = None) -> Dict:
        pass

# Concrete OpenAI Client
class OpenAIClient(APIClient):
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
    
    def analyze(self, text: str, questions: List[str] = None, 
                response_format: Dict = None) -> Dict:
        # Default questions if none provided
        if not questions:
            questions = [
                "Identify the emotions expressed and provide the intensity for each emotion."
            ]
        
        # Default response format if none provided
        if not response_format:
            response_format = {
                "format": {
                    "Joy": "number (0-100)",
                    "Sadness": "number (0-100)",
                    "Anger": "number (0-100)",
                    "Fear": "number (0-100)",
                    "Surprise": "number (0-100)",
                    "Disgust": "number (0-100)",
                    "Triggers": {
                        "Joy": ["string"],
                        "Sadness": ["string"],
                        "Anger": ["string"],
                        "Fear": ["string"],
                        "Surprise": ["string"],
                        "Disgust": ["string"]
                    }
                },
                "example": {
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
            }
        
        # Build prompt dynamically
        prompt = "Given a journal entry, please analyze it and respond to the following questions:\n\n"
        
        # Add each question to the prompt
        for i, question in enumerate(questions, 1):
            prompt += f"{i}. {question}\n"
        
        # Add response format instructions
        prompt += "\nReturn the response in valid JSON format according to this specification:\n"
        prompt += json.dumps(response_format["format"], indent=2) + "\n\n"
        
        # Add example if provided
        if "example" in response_format:
            prompt += "Example response:\n"
            prompt += json.dumps(response_format["example"], indent=2) + "\n\n"
        
        # Add the journal entry
        prompt += f"Here is the journal entry to analyze:\n{text}"
        
        # Add a stronger instruction about requiring valid JSON
        prompt += "\n\nIMPORTANT: Your response MUST be valid, parseable JSON that exactly follows the format specified above. Do not include any explanation or text outside of the JSON object."
        
        print(f"Analyzing with prompt length: {len(prompt)}")
        try:
            response = self.client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': 'You are a specialized journal analysis assistant. Always return valid JSON in the exact format requested.'},
                    {'role': 'user', 'content': prompt}
                ],
                response_format={"type": "json_object"}  # Force JSON response if API supports it
            )
            
            content = response.choices[0].message.content
            
            # Try to parse the JSON response
            try:
                result = json.loads(content)
                return result
            except json.JSONDecodeError as json_err:
                print(f"JSON decode error: {json_err}. Attempting to fix response.")
                
                # Try to extract JSON from the response if it might be surrounded by markdown or other text
                import re
                json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```|(\{[\s\S]*\})', content)
                if json_match:
                    json_content = json_match.group(1) or json_match.group(2)
                    try:
                        result = json.loads(json_content.strip())
                        return result
                    except:
                        pass
                        
                # If we still can't parse it, return a structured error
                return {
                    "error": f"Failed to parse JSON response: {str(json_err)}",
                    "message": "Failed to analyze journal entry due to invalid response format",
                    "raw_response": content[:500]  # Include a truncated version of the raw response for debugging
                }
                
        except Exception as e:
            print(f"Error analyzing text with OpenAI: {e}")
            # Return a basic structure in case of error
            return {
                "error": str(e),
                "message": "Failed to analyze journal entry",
                "details": "An error occurred while communicating with the language model"
            }

# Mock client for testing
class MockMLClient(APIClient):
    def analyze(self, text: str, questions: List[str] = None, 
                response_format: Dict = None) -> Dict:
        # Return mock data for testing that adapts to the requested format
        if response_format and "format" in response_format:
            # Create a mock response that matches the requested format
            mock_response = {}
            for key, value_type in response_format["format"].items():
                if isinstance(value_type, dict):
                    mock_response[key] = {}
                    for sub_key, sub_value_type in value_type.items():
                        if isinstance(sub_value_type, list):
                            mock_response[key][sub_key] = ["mock value"]
                elif "number" in str(value_type):
                    mock_response[key] = 5
                else:
                    mock_response[key] = "mock value"
            return mock_response
        
        # Default mock response
        return {
            "Joy": 5, "Sadness": 0, "Anger": 0, 
            "Fear": 0, "Surprise": 0, "Disgust": 0,
            "Triggers": {"Joy": ["testing"]}
        }

# Command Pattern
class Command(ABC):
    @abstractmethod
    def execute(self) -> Any:
        pass

# Concrete Commands
class AnalyzeTextCommand(Command):
    def __init__(self, api_client: APIClient, text: str, 
                 questions: List[str] = None, response_format: Dict = None):
        self.api_client = api_client
        self.text = text
        self.questions = questions
        self.response_format = response_format
    
    def execute(self) -> Dict:
        return self.api_client.analyze(
            self.text, 
            questions=self.questions, 
            response_format=self.response_format
        )

# Factory for creating the appropriate API client
class APIClientFactory:
    @staticmethod
    def create_client(client_type: str = "openai", api_key: Optional[str] = None) -> APIClient:
        if client_type.lower() == "openai":
            return OpenAIClient(api_key or openai_key)
        elif client_type.lower() == "mock":
            return MockMLClient()
        # Add more client types as needed
        raise ValueError(f"Unsupported client type: {client_type}")

# Analysis template registry
class AnalysisTemplateRegistry:
    _templates = {
        "emotion": {
            "questions": [
                "Identify the emotions expressed in the journal entry.",
                "Rate the intensity of each emotion on a scale from 0 to 100.",
                "Identify specific triggers for each emotion if mentioned."
            ],
            "format": {
                "format": {
                    "Joy": "number (0-100)",
                    "Sadness": "number (0-100)",
                    "Anger": "number (0-100)",
                    "Fear": "number (0-100)",
                    "Surprise": "number (0-100)",
                    "Disgust": "number (0-100)",
                    "Triggers": {
                        "Joy": ["string"],
                        "Sadness": ["string"],
                        "Anger": ["string"],
                        "Fear": ["string"],
                        "Surprise": ["string"],
                        "Disgust": ["string"]
                    }
                },
                "example": {
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
            }
        },
        "themes": {
            "questions": [
                "Identify the main themes present in the journal entry.",
                "For each theme, provide relevant quotes or references from the text.",
                "Rate the prominence of each theme on a scale of 1-10."
            ],
            "format": {
                "format": {
                    "themes": [
                        {
                            "name": "string",
                            "prominence": "number (1-10)",
                            "evidence": ["string"]
                        }
                    ]
                },
                "example": {
                    "themes": [
                        {
                            "name": "Anxiety",
                            "prominence": 8,
                            "evidence": ["I couldn't stop worrying", "My heart was racing"]
                        },
                        {
                            "name": "Hope",
                            "prominence": 4,
                            "evidence": ["Tomorrow might be better"]
                        }
                    ]
                }
            }
        },
        "self_reflection": {
            "questions": [
                "Identify moments of self-reflection in the journal entry.",
                "Evaluate the depth of introspection on a scale of 1-10.",
                "Identify any insights or realizations mentioned."
            ],
            "format": {
                "format": {
                    "introspection_level": "number (1-10)",
                    "self_reflections": [
                        {
                            "reflection": "string",
                            "insight": "string"
                        }
                    ],
                    "summary": "string"
                },
                "example": {
                    "introspection_level": 7,
                    "self_reflections": [
                        {
                            "reflection": "I realized I've been avoiding confrontation",
                            "insight": "This stems from childhood experiences"
                        }
                    ],
                    "summary": "The entry shows significant self-awareness about patterns of behavior."
                }
            }
        }
    }
    
    @classmethod
    def get_template(cls, template_name: str) -> Dict:
        """Get an analysis template by name"""
        if template_name in cls._templates:
            return cls._templates[template_name]
        raise ValueError(f"Unknown template: {template_name}")
    
    @classmethod
    def register_template(cls, name: str, questions: List[str], response_format: Dict) -> None:
        """Register a new analysis template"""
        cls._templates[name] = {
            "questions": questions,
            "format": response_format
        }
    
    @classmethod
    def list_templates(cls) -> List[str]:
        """List all available template names"""
        return list(cls._templates.keys())

# Facade for ML operations
class MLService:
    def __init__(self, client_type: str = "openai", api_key: Optional[str] = None):
        self.api_client = APIClientFactory.create_client(client_type, api_key)
    
    def analyze_text(self, text: str, questions: List[str] = None, 
                    response_format: Dict = None) -> Dict:
        """Analyze text with custom questions and response format"""
        command = AnalyzeTextCommand(
            self.api_client, 
            text, 
            questions=questions, 
            response_format=response_format
        )
        return command.execute()
    
    def analyze_with_template(self, text: str, template_name: str) -> Dict:
        """Analyze text using a predefined template"""
        template = AnalysisTemplateRegistry.get_template(template_name)
        return self.analyze_text(
            text, 
            questions=template["questions"], 
            response_format=template["format"]
        )
    
    def analyze_with_multiple_templates(self, text: str, template_names: List[str]) -> Dict:
        """Analyze text using multiple templates and combine results"""
        results = {}

        # Make sure we have at least one template
        if not template_names or len(template_names) == 0:
            # Default to emotion if no templates specified
            template_names = ["emotion"]
        
        # Process each template with proper error handling
        for template_name in template_names:
            try:
                # Analyze with this template
                template_results = self.analyze_with_template(text, template_name)
                
                # Check if the result contains an error
                if "error" in template_results:
                    print(f"Warning: Template {template_name} returned an error: {template_results['error']}")
                    # Store a simplified error response
                    results[template_name] = {
                        "error": f"Analysis with template '{template_name}' failed",
                        "details": template_results.get("error", "Unknown error")
                    }
                else:
                    # Store successful results
                    results[template_name] = template_results
            except Exception as e:
                print(f"Error analyzing with template {template_name}: {str(e)}")
                # Store error but continue with other templates
                results[template_name] = {
                    "error": f"Analysis with template '{template_name}' failed",
                    "details": str(e)
                }
        
        # If all templates failed, return a top-level error
        if all("error" in results.get(template, {}) for template in template_names):
            return {
                "error": "All template analyses failed",
                "message": "Failed to analyze journal entry with any template",
                "template_errors": results
            }
            
        # If no emotion template included but we need emotions for activity suggestions,
        # add a default empty emotion structure
        if "emotion" not in results and "emotion" not in template_names:
            results["emotion"] = {
                "Joy": 0,
                "Sadness": 0,
                "Anger": 0,
                "Fear": 0, 
                "Surprise": 0,
                "Disgust": 0,
                "Triggers": {}
            }
            
        return results

# For backward compatibility
def analyze_text(entry: str, template_name: str = "emotion") -> Dict:
    service = MLService()
    return service.analyze_with_template(entry, template_name)

print("ML module loaded")



