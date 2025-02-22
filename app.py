from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from pymongo import MongoClient
import datetime
from config import mongo_pass
from sklearn.feature_extraction.text import CountVectorizer
import application_logic

app = Flask(__name__)

CORS(app)

@app.route("/")

def homepage():
    return render_template('index.html')


@app.route("/user/<username>/history", methods=["GET"])
def user_history(username):
    post = ""
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

    analysis = application_logic.analyzeAndStoreJournal(username,text,title)

    print(analysis)
    return jsonify(analysis)


if __name__ == "__main__":
    app.run(debug=True, port=8800)