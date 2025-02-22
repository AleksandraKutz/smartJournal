import user_data
import MachineLearning

def analyzeAndStoreJournal(username, text, title):

    ml_results = MachineLearning.analyze_text(text)

    user_data.addNew_post(username, text, title, ml_results)

    return ml_results

