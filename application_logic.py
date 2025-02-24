import database_layer
import MachineLearning

def analyzeAndStoreJournal(username, text, title):

    ml_results = MachineLearning.analyze_text(text)

    database_layer.addNew_post(username, text, title, ml_results)

    return ml_results


def analyzeJournal(username, text, title):

    ml_analyze = MachineLearning.analyze_text(text)


    return ml_analyze

def saveJournal(username, text, title, classification):
    
    database_layer.addNew_post(username, text, title, classification)

    return "Journal saved"


#   assume sliders are there,  analyze button leads to new slider values, use changes on
# submit button would use get values from sliders
# difference no ML module would be called, 

#  My advice:  analyzeJournal method separate from store,  add in id draft field
