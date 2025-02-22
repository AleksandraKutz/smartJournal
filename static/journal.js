

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

    fetch("http://127.0.0.1:8800/new_journal_entry", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
        })
        .then(response => {
            console.log("fetching");
            return response.json()
        })
        .then(data => {

            d3.select("#analysis").text(JSON.stringify(data));
            console.log("Response Data:", data); // Handle the response
        })
        .catch(error => {
            console.error("Error posting data:", error); // Handle any errors
        });

        
});


//post journal method