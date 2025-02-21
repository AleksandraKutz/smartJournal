
function handleResponseToJournalSubmission(classification){

    console.log(classification);
    //use d3 to select and set slider values


}


function postUserJournal(){

    // get user journal parameters
    var username = d3.select("#username").property("value");
    var text = d3.select("#text").property("value");
    var title = d3.select("#title").property("value");

    const postData = {
        "username" : username,
        "text": text,
        "title": title
    };

    fetch("http://127.0.0.1:8800/new_journal_entry", {

            method: "POST",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify(postData)
        })
        .then(response => response.json())
        .then(data => {

            handleResponseToJournalSubmission(data);

        })
        .catch(error => {
            console.error("Error posting data:", error); 
        });

}


//button handler
d3.select("#submitButton").on("click", postUserJournal);
