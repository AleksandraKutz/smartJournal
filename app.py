from flask import Flask, jsonify, request
from pymongo import MongoClient
import datetime
from config import mongo_pass
import user_data as u


app = Flask(__name__)


client = MongoClient(f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/")

db = client['smartJournal']
userTable_collection = db['user_table']


@app.route("/")

def homepage():
    return "Homepage"


@app.route("/user/<username>/history", methods=["GET"])

def user_history(username):
    post = u.getuser_post(username)
    if post:
        return jsonify(list(post))
    else:
        return jsonify({"message":"User not found"})



@app.route("/user/<username>/new_post", methods=["POST"])

def add_new_post(username):
    return u.addNew_post(username)


if __name__ == "__main__":
    app.run(debug=True)