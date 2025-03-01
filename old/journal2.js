


function handleResponseToJournalSubmission(classification) {
    console.log(classification);
    // use d3 to select and set slider values
}

function postUserJournal() {
    // get user journal parameters
    var username = d3.select("#username").property("value");
    var text = d3.select("#text").property("value");
    var title = d3.select("#title").property("value");

    const postData = {
        "username": username,
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

// button handler
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



data = [5,4,1,8,10]

// d3.select("#demoChart").append("svg")
//     .attr("width", 500)
//     .attr("height", 500)
//     .selectAll("rect")
//         .data(data)
//         .enter()
//             .append("rect")
//                 .attr("x", (d, i) => i * 100)
//                 .attr("y", (d) => 100 - d * 10)
//                 .attr("width", 50)
//                 .attr("height", (d) => d * 10)
//                 .attr("fill", "blue");