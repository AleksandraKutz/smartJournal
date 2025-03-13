// Flag to track whether analysis has been performed
let analysisDone = false;
let currentAnalysis = null;

/**
 * Handle the response from journal analysis
 * @param {Object} response - The analysis response from the server
 */
function handleResponseToJournalSubmission(response) {
    console.log("Analysis response:", response);
    
    // Extract emotion data based on whether we're getting a direct response
    // or a template-based response
    let emotionData = response;
    
    // If response has a template structure (using our new system)
    if (response.emotion) {
        emotionData = response.emotion;
    }
    
    // Store the full analysis for submission
    currentAnalysis = response;
    
    // Update UI sliders with emotion values
    d3.select("#angerSlider").property('value', emotionData['Anger']);
    d3.select("#fearSlider").property('value', emotionData['Fear']);
    d3.select("#joySlider").property('value', emotionData['Joy']);
    d3.select("#sadnessSlider").property('value', emotionData['Sadness']);
    d3.select("#surpriseSlider").property('value', emotionData['Surprise']);
    d3.select("#disgustSlider").property('value', emotionData['Disgust']);

    // Update analysis flag and enable submit button
    analysisDone = true;
    d3.select("#submitButton").classed('disabled', false);

    // Display triggers if available
    let triggersText = "";
    const triggers = emotionData['Triggers'];

    if (triggers && Object.keys(triggers).length > 0) {
        for (let emotion in triggers) {
            if (triggers[emotion] && triggers[emotion].length > 0) {
                triggersText += `<strong>${emotion}:</strong> ${triggers[emotion].join(', ')}<br>`;
            }
        }
    }
    
    // If no triggers were found, show a message
    if (triggersText === "") {
        triggersText = "<em>No triggers detected.</em>";
    }

    d3.select("#triggers").html(triggersText);
    
    // Show a success message
    showNotification("Analysis complete! You can adjust the values if needed.", "success");
}

/**
 * Display a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = "info") {
    // You can implement this with your preferred notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Simple alert for now - replace with a better UI component
    if (type === "error") {
        alert(message);
    }
}

/**
 * Analyze journal text without saving
 * Uses the template system for analysis
 */
function analyzeJournal() {
    const username = d3.select("#username").property("value");
    const text = d3.select("#text").property("value");
    const title = d3.select("#title").property("value");
    
    // Validate input
    if (!text) {
        showNotification("Please enter journal text to analyze.", "error");
        return;
    }

    // Show loading state
    d3.select("#analyzeButton").text("Analyzing...").attr("disabled", true);

    const postData = {
        "username": username,
        "text": text,
        "title": title,
        "action": "analyze",
        "templates": ["emotion"] // Use the emotion template by default
    };

    fetch("http://127.0.0.1:8800/new_journal_entry", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        handleResponseToJournalSubmission(data);
    })
    .catch(error => {
        console.error("Error analyzing data:", error);
        showNotification(`Analysis failed: ${error.message}`, "error");
    })
    .finally(() => {
        // Reset button state
        d3.select("#analyzeButton").text("Analyze").attr("disabled", null);
    });
}

/**
 * Submit journal entry with or without prior analysis
 */
function postUserJournal() {
    const username = d3.select("#username").property("value");
    const text = d3.select("#text").property("value");
    const title = d3.select("#title").property("value");
    
    // Validate input
    if (!username || !text || !title) {
        showNotification("Please fill in all required fields.", "error");
        return;
    }

    // Show loading state
    d3.select("#submitButton").text("Saving...").attr("disabled", true);

    const postData = {
        "username": username,
        "text": text,
        "title": title
    };

    // If analysis was done, use the slider values
    if (analysisDone) {
        // Get current slider values for emotions
        const sliderData = {
            "Anger": parseFloat(d3.select("#angerSlider").property('value')),
            "Fear": parseFloat(d3.select("#fearSlider").property('value')),
            "Joy": parseFloat(d3.select("#joySlider").property('value')),
            "Sadness": parseFloat(d3.select("#sadnessSlider").property('value')),
            "Surprise": parseFloat(d3.select("#surpriseSlider").property('value')),
            "Disgust": parseFloat(d3.select("#disgustSlider").property('value')),
            "Triggers": currentAnalysis?.Triggers || {}
        };

        postData["classification"] = sliderData;
        postData["action"] = "submit";
    } else {
        // If no analysis was done, analyze and save the journal
        postData["action"] = "analyze_and_save";
        postData["templates"] = ["emotion"]; // Use the emotion template
    }

    fetch("http://127.0.0.1:8800/new_journal_entry", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Journal data saved:", data);
        showNotification("Journal entry saved successfully!", "success");
        
        // Optional: Clear the form or redirect to history page
        // clearForm();
    })
    .catch(error => {
        console.error("Error posting data:", error);
        showNotification(`Failed to save journal: ${error.message}`, "error");
    })
    .finally(() => {
        // Reset button state
        d3.select("#submitButton").text("Submit").attr("disabled", null);
    });
}

/**
 * Clear the journal form
 */
function clearForm() {
    d3.select("#text").property("value", "");
    d3.select("#title").property("value", "");
    
    // Reset emotion sliders
    d3.select("#angerSlider").property('value', 0);
    d3.select("#fearSlider").property('value', 0);
    d3.select("#joySlider").property('value', 0);
    d3.select("#sadnessSlider").property('value', 0);
    d3.select("#surpriseSlider").property('value', 0);
    d3.select("#disgustSlider").property('value', 0);
    
    // Clear triggers
    d3.select("#triggers").html("");
    
    // Reset analysis state
    analysisDone = false;
    currentAnalysis = null;
    
    // Disable submit button until analysis is complete
    d3.select("#submitButton").classed('disabled', true);
}

// Event listeners
d3.select("#analyzeButton").on("click", analyzeJournal);
d3.select("#submitButton").on("click", postUserJournal);

// Example template selection UI
function loadAvailableTemplates() {
    fetch("http://127.0.0.1:8800/templates")
        .then(response => response.json())
        .then(data => {
            const templateSelector = d3.select("#templateSelector");
            
            data.templates.forEach(template => {
                templateSelector.append("option")
                    .attr("value", template)
                    .text(template);
            });
        });
}

// Call this when the page loads
document.addEventListener("DOMContentLoaded", loadAvailableTemplates);
