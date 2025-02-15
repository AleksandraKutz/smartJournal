from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from pymongo import MongoClient
import datetime
from config import mongo_pass
import user_data
from sklearn.feature_extraction.text import CountVectorizer

app = Flask(__name__)

CORS(app)
client = MongoClient(f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/")

db = client['smartJournal']
userTable_collection = db['user_table']


@app.route("/")

def homepage():
    return render_template('index.html')



@app.route("/user/<username>/history", methods=["GET"])
def user_history(username):
    post = user_data.getuser_post(username)
    if post:
        return jsonify(list(post))
    else:
        return jsonify({"message":"User not found"})



@app.route("/new_journal_entry", methods=["POST"])
def new_journal_entry():
    print("entering new journal post")
    post = request.get_json();
    username = post["username"]
    text = post["text"]
    title = post["title"]
    print(post)

    return user_data.addNew_post(username, text, title)


if __name__ == "__main__":
    app.run(debug=True)