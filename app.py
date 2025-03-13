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

@app.route("/activities/<username>/", methods=["GET"])
def user_activities(username):
    """Get suggested activities for a user"""
    try:
        # Get query parameters
        include_completed = request.args.get('include_completed', 'false').lower() == 'true'
        
        # Get activities from service
        activities = journal_service.get_user_activities(username, include_completed)
        
        return jsonify({
            "activities": activities,
            "count": len(activities)
        })
        
    except Exception as e:
        print(f"Error retrieving activities: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/activities/<username>/<activity_id>", methods=["PUT"])
def update_activity(username, activity_id):
    """Update the status of an activity"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract fields from request
        completed = data.get('completed')
        if completed is None:
            return jsonify({"error": "Missing required field: completed"}), 400
            
        rating = data.get('rating')
        notes = data.get('notes')
        
        # Update activity status
        success = journal_service.update_activity_status(
            username, activity_id, completed, rating, notes
        )
        
        if success:
            return jsonify({"message": "Activity updated successfully"})
        else:
            return jsonify({"error": "Failed to update activity"}), 404
            
    except Exception as e:
        print(f"Error updating activity: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/suggest_activity/<username>", methods=["POST"])
def suggest_activity(username):
    """Manually trigger an activity suggestion"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Get journal analysis from request
        journal_analysis = data.get('analysis')
        if not journal_analysis:
            return jsonify({"error": "Missing journal analysis"}), 400
        
        # Get activity suggestion
        result = journal_service.suggest_activity(username, journal_analysis)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error suggesting activity: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/templates/user/<username>", methods=["GET", "PUT"])
def user_templates(username):
    """Get or update a user's template preferences"""
    try:
        if request.method == "GET":
            # Get the user's current template preferences
            templates = journal_service.get_user_template_preferences(username)
            
            if templates is None:
                return jsonify({"error": "User not found"}), 404
                
            return jsonify({
                "username": username,
                "templates": templates
            })
            
        elif request.method == "PUT":
            # Update the user's template preferences
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            # Get templates list from request
            templates = data.get('templates')
            if not templates or not isinstance(templates, list):
                return jsonify({"error": "Invalid templates format. Expected a list of template keys."}), 400
                
            # Validate templates against available templates
            available_templates = journal_service.get_available_templates()
            for template in templates:
                if template not in available_templates:
                    return jsonify({"error": f"Unknown template: {template}"}), 400
            
            # Update the user's template preferences
            success = journal_service.set_user_template_preferences(username, templates)
            
            if success:
                return jsonify({
                    "username": username,
                    "templates": templates,
                    "message": "Template preferences updated successfully"
                })
            else:
                return jsonify({"error": "Failed to update template preferences"}), 500
    
    except Exception as e:
        print(f"Error handling user templates: {e}")
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
        print(templates)
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