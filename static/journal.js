

//button handler
d3.select("#submitButton").on("click", function() {

    var username = d3.select("#username").property("value");
    var text = d3.select("#text").property("value");
    var title = d3.select("#title").property("value");

    const postData = {
        "username" : username,
        "text": text,
        "title": title
    };

    console.log(postData);

    fetch("http://localhost:5000/new_journal_entry", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
        })
        .then(response => response.json())
        .then(data => {
            console.log("Response Data:", data); // Handle the response
        })
        .catch(error => {
            console.error("Error posting data:", error); // Handle any errors
        });

        
});


//post journal method