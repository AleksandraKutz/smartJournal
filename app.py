from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import traceback
from application_logic import ServiceLocator

print("starting api")
app = Flask(__name__)
CORS(app)

# Initialize services
service_locator = ServiceLocator.get_instance()
journal_service = service_locator.journal_service

@app.route("/")
def homepage():
    return render_template('index.html')

@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route("/templates", methods=["GET"])
def list_templates():
    """Return a list of available analysis templates"""
    templates = journal_service.get_available_templates()
    return jsonify({"templates": templates})

@app.route("/history/<username>/", methods=["GET"])
def user_history(username):
    try:
        history = journal_service.get_journal_history(username)
        if history:
            return jsonify(list(history))
        else:
            return jsonify({"message": "User not found"}), 404
    except Exception as e:
        print(f"Error retrieving history: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/new_journal_entry", methods=["POST"])
def new_journal_entry():
    try:
        print("entering new journal post")
        post = request.get_json()
        
        if not post:
            return jsonify({"error": "Invalid request format"}), 400
            
        username = post.get("username")
        text = post.get("text")
        title = post.get("title")
        
        if not all([username, text, title]):
            return jsonify({"error": "Missing required fields"}), 400
            
        action = post.get("action", "analyze_and_save")
        
        # Get templates if specified
        templates = post.get("templates")
        
        # Get custom questions and format if provided
        custom_questions = post.get("questions")
        custom_format = post.get("format")
        
        print(post)

        if action == "analyze":
            analysis = journal_service.analyze_journal(
                text, 
                templates=templates,
                custom_questions=custom_questions,
                custom_format=custom_format
            )
        
        elif action == "analyze_and_save":
            analysis = journal_service.analyze_and_store_journal(
                username, text, title, templates=templates
            )
        
        elif action == "submit":
            classification = post.get("classification", {})
            analysis = journal_service.save_journal(username, text, title, classification)
        
        else:
            return jsonify({"error": f"Unknown action: {action}"}), 400
        
        print(analysis)
        return jsonify(analysis)
    
    except Exception as e:
        print(f"Error processing journal entry: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8800)