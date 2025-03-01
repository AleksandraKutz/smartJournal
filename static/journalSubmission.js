
let analysisDone = false; // Flag for analisis

function handleResponseToJournalSubmission(classification){
    console.log(classification);
    d3.select("#angerSlider").property('value', classification['Anger']);
    d3.select("#fearSlider").property('value', classification['Fear']);
    d3.select("#joySlider").property('value', classification['Joy']);
    d3.select("#sadnessSlider").property('value', classification['Sadness']);
    d3.select("#surpriseSlider").property('value', classification['Surprise']);
    d3.select("#disgustSlider").property('value', classification['Disgust']);

    // Update analysis flag
    analysisDone = true;
    d3.select("#submitButton").classed('disabled',false);

    let triggersText = "";
    const triggers = classification['Triggers'];

    if (triggers && Object.keys(triggers).length > 0) {
        for (let emotion in triggers) {
            triggersText += `<strong>${emotion}:</strong> ${triggers[emotion].join(', ')}<br>`;
        }
    } else {
        triggersText = "<em>No triggers detected.</em>";
    }

    d3.select("#triggers").html(triggersText);
};

function AnalyzeJournal() {
    var username = d3.select("#username").property("value");
    var text = d3.select("#text").property("value");
    var title = d3.select("#title").property("value");

    const postData = {
        "username": username,
        "text": text,
        "title": title,
        "action": "analyze"
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
        console.error("Error analyzing data:", error);
    });
}

function postUserJournal() {
    var username = d3.select("#username").property("value");
    var text = d3.select("#text").property("value");
    var title = d3.select("#title").property("value");

    const postData = {
        "username": username,
        "text": text,
        "title": title
    };

    // Take sliders data and submit without acalling functions
    if (analysisDone) {
        const sliderData = {
            "Anger": d3.select("#angerSlider").property('value'),
            "Fear": d3.select("#fearSlider").property('value'),
            "Joy": d3.select("#joySlider").property('value'),
            "Sadness": d3.select("#sadnessSlider").property('value'),
            "Surprise": d3.select("#surpriseSlider").property('value'),
            "Disgust": d3.select("#disgustSlider").property('value')
        };

        postData["classification"] = sliderData;
        postData["action"] = "submit";
    } else {
        // If no analysis was done analyze and save the journal.
        postData["action"] = "analyze_and_save";
    }

    fetch("http://127.0.0.1:8800/new_journal_entry", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Journal data saved:", data);
        
    })
    .catch(error => {
        console.error("Error posting data:", error);
    });
}

d3.select("#analyzeButton").on("click", AnalyzeJournal);
d3.select("#submitButton").on("click", postUserJournal);

// navigation link handler
d3.selectAll('.nav-link').on('click', function(event) {
    console.log('nav link clicked');   

    event.preventDefault();
    const target = d3.select(this).text().trim();

    console.log(target);
    if (target === 'Home') {
        d3.select('#journalEntryContainer').classed('d-none', false);
        d3.select('#journalHistoryContainer').classed('d-none', true);
    } else if (target === 'History') {
        d3.select('#journalEntryContainer').classed('d-none', true);
        d3.select('#journalHistoryContainer').classed('d-none', false);
    }
});