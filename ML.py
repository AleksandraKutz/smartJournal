### count frequency :

from transformers import pipeline
from sklearn.feature_extraction.text import CountVectorizer

def countFrequency(text):

    vectorizer = CountVectorizer()
    X = vectorizer.fit_transform([text])
    count_words = vectorizer.get_feature_names_out()    
    
    word_frequencies = {}
    word_counts = X.toarray().sum(axis=0)

    for word_index, word in enumerate(count_words):
        word_frequencies[word] = int(word_counts[word_index])

    sorted_words = sorted(word_frequencies.items(), key=lambda x: x[1], reverse=True)

    for word in word_frequencies:
        top_10_words = sorted_words[:10]

    return top_10_words


### check emotions:

def checkEmotions(text):

    emotion_classifier = pipeline('text-classification', model='AdamCodd/tinybert-emotion-balanced')
    classification_result = emotion_classifier(text)
    classification_label = classification_result[0]['label']
    classification_score = classification_result[0]['score']

    classification = {
        'label': classification_label,
        'score': classification_score
    }
    return classification