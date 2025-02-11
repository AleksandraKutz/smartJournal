from flask import Flask, jsonify, request
from pymongo import MongoClient
import datetime
from config import mongo_pass
app = Flask(__name__)

client = MongoClient(f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/")
db = client['smartJournal']
userTable_collection = db['user_table']

def getuser_post(username):
    user  = userTable_collection.find_one({"username": username})
    if user:
        return user['entries']
    else:
        return None



@app.route("/")

def homepage():
    return "Homepage"



@app.route("/user/<username>/history", methods=["GET"])

def user_history(username):
    post = getuser_post(username)
    if post:
        return jsonify(list(post))
    else:
        return jsonify({"message":"User not found"})



@app.route("/user/<username>/new_post", methods=["POST"])

def addNew_post(username):
    user = userTable_collection.find_one({"username": username})

    new_post = request.get_json()

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if "title" not in new_post or "text" not in new_post:
            return print("Missing title or text")
        
    if not user:
        new_user = {
            "username": username,
            "entries": [{
                "timestamp": timestamp,
                "title": new_post["title"],
                "text": new_post["text"],
                "word_frequencies": new_post.get("word_frequencies", []),
                "classification": new_post.get("classification", [])
            }]
        }

        userTable_collection.insert_one(new_user)
        return jsonify({"message": "New user created with new post"})

    
    userTable_collection.update_one(
        {"username": username},
        {"$push": {"entries": {
            "timestamp": timestamp,
            "title": new_post["title"],
            "text": new_post["text"],
            "word_frequencies": new_post.get("word_frequencies", []),
            "classification": new_post.get("classification", [])
        }}}
    )

    return jsonify({"message":"New post was added to the user"})

if __name__ == "__main__":
    app.run(debug=True)