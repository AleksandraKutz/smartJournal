### count frequency :

from transformers import pipeline
from sklearn.feature_extraction.text import CountVectorizer
import nltk

def countFrequency(text):

    vectorizer = CountVectorizer(stop_words='english')
    X = vectorizer.fit_transform([text])
    count_words = vectorizer.get_feature_names_out()    
    
    word_frequencies = {}
    word_counts = X.toarray().sum(axis=0)

    for word_index, word in enumerate(count_words):
        word_frequencies[word] = int(word_counts[word_index])

    sorted_words = sorted(word_frequencies.items(), key=lambda x: x[1], reverse=True)

    top_10_words = sorted_words[:10]

    return top_10_words

### check emotions:

def checkEmotions(text):
    emotion_classifier = pipeline('text-classification', model='AdamCodd/tinybert-emotion-balanced')
    
    result = emotion_classifier(text)

    return result


