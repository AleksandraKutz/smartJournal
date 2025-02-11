

from pymongo import MongoClient
from config import mongo_pass


client = MongoClient("mongodb://admin:{mongo_pass}@137.184.197.46:27017/")



db = client['smartJournal']




userTable_collection = db['user_table']




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
   




new_users = [
    {
        "username": "journal_user123",
        "entries": [
            {
                "timestamp": "2025-02-09T09:30:00Z",
                "title": "Morning Reflections",
                "text": "I feel a bit nervous about the presentation later...",
                "word_frequencies": [
                    { "word": "nervous", "frequency": 1 },
                    { "word": "presentation", "frequency": 1 },
                    { "word": "hopeful", "frequency": 1 }
                ],
                "classification": [
                    { "class": "nervous", "score": 0.70 },
                    { "class": "hopeful", "score": 0.65 }
                ]
            }
        ]
    },
    {
        "username": "journal_user456",
        "entries": [
            {
                "timestamp": "2025-02-09T12:15:00Z",
                "title": "Lunchtime Check-in",
                "text": "Lunch was great! Feeling relaxed and ready to take on the afternoon tasks...",
                "word_frequencies": [
                    { "word": "lunch", "frequency": 1 },
                    { "word": "great", "frequency": 1 },
                    { "word": "feeling", "frequency": 1 }
                ],
                "classification": [
                    { "class": "relaxed", "score": 0.80 },
                    { "class": "motivated", "score": 0.60 }
                ]
            }
        ]
    }
]




adding_users(new_users)



for user in userTable_collection.find():
    print(user)



new_users2 = [
    {
        "username": "silly_billy77",
        "entries": [
            {
                "timestamp": "2025-02-10T10:30:00Z",
                "title": "Too Much Caffeine",
                "text": "I drank way too much coffee today and now I'm bouncing off the walls... help!",
                "word_frequencies": [
                    { "word": "coffee", "frequency": 2 },
                    { "word": "bouncing", "frequency": 1 },
                    { "word": "help", "frequency": 1 }
                ],
                "classification": [
                    { "class": "hyper", "score": 0.90 },
                    { "class": "panicked", "score": 0.60 }
                ]
            }
        ]
    },
    {
        "username": "lazy_louie23",
        "entries": [
            {
                "timestamp": "2025-02-09T14:45:00Z",
                "title": "Nap Time Again",
                "text": "I tried to get work done, but ended up napping on the couch instead. Oops...",
                "word_frequencies": [
                    { "word": "nap", "frequency": 2 },
                    { "word": "work", "frequency": 1 },
                    { "word": "couch", "frequency": 1 }
                ],
                "classification": [
                    { "class": "lazy", "score": 0.80 },
                    { "class": "guilty", "score": 0.50 }
                ]
            }
        ]
    },
    {
        "username": "meme_queen42",
        "entries": [
            {
                "timestamp": "2025-02-09T21:00:00Z",
                "title": "Lost in Memes",
                "text": "I spent three hours scrolling through memes and now I can't remember what I was supposed to do. Oops!",
                "word_frequencies": [
                    { "word": "memes", "frequency": 3 },
                    { "word": "scrolling", "frequency": 1 },
                    { "word": "remember", "frequency": 1 }
                ],
                "classification": [
                    { "class": "distracted", "score": 0.95 },
                    { "class": "confused", "score": 0.70 }
                ]
            }
        ]
    }
]




adding_users(new_users2)




for user in userTable_collection.find():
    print(user)




def lookup_user(username):
    user = userTable_collection.find_one({"username": username})
    if user:
        print(user)
    else:
        print("This user no exist in db")



lookup_user("lazy_louie23")



def getuser_post(username):
    user = userTable_collection.find_one({"username": username})
    if user:
        for entry in user['entries']:
            print(f"Date: {entry['timestamp']}")
            print(f"Title: {entry['title']}")
            print(f"Text: {entry['text']}")
            print(f"Word_frequencies: {entry['word_frequencies']}")
            print(f"Classification: {entry['classification']}")
            print("-------------")
    else:
        print("User is not in db")



getuser_post("meme_queen42")






