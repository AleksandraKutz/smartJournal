from flask import Flask, jsonify, request
from pymongo import MongoClient
import datetime
from config import mongo_pass
from transformers import pipeline

client = MongoClient(f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/")

db = client['smartJournal']

userTable_collection = db['user_table']


print("before printing")
def adding_user(user_info):
    try:
        userTable_collection.insert_one(user_info)
    except Exception as e:
        print(f"Error with adding user to db {e}")
   



def adding_users(users_info):
    try:
        userTable_collection.insert_many(users_info)
    except Exception as e:
        print(f"Error with adding users to db {e}")
   


def getuser_post(username):
    print("before getuserpost inside");
    user  = userTable_collection.find_one({"username": username})
    if user:
        return user['entries']
    else:
        return None
    


def addNew_post(username):
    user = userTable_collection.find_one({"username": username})

    new_post = request.get_json()

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if "title" not in new_post or "text" not in new_post:
            return jsonify({"message": "Missing title or text"})
        
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



print("b efore getuser")
text  = getuser_post("silly_billy77")
print(text)
print("afterg getuser")
lookup_user("lazy_louie23")




