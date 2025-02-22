import database_layer
import MachineLearning

def analyzeAndStoreJournal(username, text, title):

    ml_results = MachineLearning.analyze_text(text)

    database_layer.addNew_post(username, text, title, ml_results)

    return ml_results

