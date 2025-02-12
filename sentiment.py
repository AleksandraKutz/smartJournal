from flask import Flask, jsonify, request
from pymongo import MongoClient
import datetime
from config import mongo_pass
from transformers import pipeline

client = MongoClient(f"mongodb://admin:{mongo_pass}@137.184.197.46:27017/")

db = client['smartJournal']

userTable_collection = db['user_table']



class SentimentAnalysis:
    
    def __init__(self):
        self.sentyment_analizer = pipeline("sentiment-analysis")

    def count_sentiment(self, text):
        result = self.sentyment_analizer(text)
        return result[0]
        
    def count_sentiment_many(self, texts):
        result = self.sentyment_analizer(texts)
        return result


def lookup_user(username):
    user = userTable_collection.find_one({"username": username})
    if user:
        return user
    else:
        print("This user does not exist in db")
        return None


def add_sentiment_to_user(username):
    user = lookup_user(username)

    if user:
        analysis_sentiment = SentimentAnalysis()

        for entry in user['entries']:
            text = entry['text']
            sentyment = analysis_sentiment.count_sentiment(text)

            sentyment_classification = {
                "name" : sentyment["label"].lower(),
                "score" : sentyment["score"]
            }

            if "classification" in entry:
               entry["classification"].append(sentyment_classification)
    
            else:
               entry["classification"] = [sentyment_classification]
            
        return user
    else:
        return None
    