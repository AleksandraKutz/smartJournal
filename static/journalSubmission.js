// Flag to track whether analysis has been performed
let analysisDone = false;
let currentAnalysis = null;

// DOM elements
const form = document.getElementById('journalForm');
const usernameInput = document.getElementById('username');
const titleInput = document.getElementById('title');
const textInput = document.getElementById('text');
const templateSelector = document.getElementById('templateSelector');
const analyzeButton = document.getElementById('analyzeButton');
const submitButton = document.getElementById('submitButton');
const analyzeSpinner = document.getElementById('analyzeSpinner');
const submitSpinner = document.getElementById('submitSpinner');

// Emotion sliders
const sliders = {
    joy: document.getElementById('joySlider'),
    sadness: document.getElementById('sadnessSlider'),
    anger: document.getElementById('angerSlider'),
    fear: document.getElementById('fearSlider'),
    surprise: document.getElementById('surpriseSlider'),
    disgust: document.getElementById('disgustSlider')
};

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
 * Display a notification message to the user using Bootstrap toast
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showNotification(message, type = "info") {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Get toast elements
    const toast = document.getElementById('notificationToast');
    const toastBody = document.getElementById('toastMessage');
    const toastTitle = document.getElementById('toastTitle');
    
    // Set content and styling based on type
    toastBody.textContent = message;
    
    // Set appropriate title and background color
    if (type === "error") {
        toastTitle.textContent = "Error";
        toast.classList.remove("bg-success", "bg-info");
        toast.classList.add("bg-danger", "text-white");
    } else if (type === "success") {
        toastTitle.textContent = "Success";
        toast.classList.remove("bg-danger", "bg-info");
        toast.classList.add("bg-success", "text-white");
    } else {
        toastTitle.textContent = "Information";
        toast.classList.remove("bg-danger", "bg-success");
        toast.classList.add("bg-info", "text-white");
    }
    
    // Create and show the Bootstrap toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: type === "error" ? 5000 : 3000
    });
    
    bsToast.show();
}

/**
 * Analyze journal text without saving
 * Uses the template system for analysis
 */
async function analyzeJournal() {
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get form data
    const username = usernameInput.value;
    const title = titleInput.value;
    const text = textInput.value;
    const template = templateSelector.value;
    
    // Show loading state
    analyzeButton.disabled = true;
    analyzeSpinner.classList.remove('d-none');
    
    try {
        // Make API request
        const response = await fetch('/new_journal_entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                title,
                text,
                templates: template,
                action: 'analyze'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to analyze journal');
        }
        
        // Update UI with analysis results
        updateAnalysisResults(result, template);
        
        // Enable submit button
        submitButton.classList.remove('disabled');
        
        // Show success message
        showNotification('Journal analyzed successfully!', 'success');
    } catch (error) {
        console.error('Error analyzing journal:', error);
        showNotification(`Failed to analyze journal: ${error.message}`, 'error');
    } finally {
        // Reset loading state
        analyzeButton.disabled = false;
        analyzeSpinner.classList.add('d-none');
    }
}

/**
 * Analyze and save the journal entry in one step
 */
async function analyzeAndSaveJournal() {
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get form data
    const username = usernameInput.value;
    const title = titleInput.value;
    const text = textInput.value;
    const template = templateSelector.value;
    
    // Show loading state
    analyzeButton.disabled = true;
    submitButton.disabled = true;
    analyzeSpinner.classList.remove('d-none');
    
    try {
        // Make API request for analyze and save
        const response = await fetch('/new_journal_entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                title,
                text,
                templates: template,
                action: 'analyze_and_save'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to analyze and save journal');
        }
        
        // Update UI with analysis results if available
        if (result.analysis) {
            updateAnalysisResults(result.analysis, template);
        }
        
        // Check if an activity was suggested
        if (result.activity_suggested && result.suggested_activity) {
            // Show activity suggestion
            showActivitySuggestion(result.suggested_activity);
            
            // Notify the activities module if it exists
            if (window.activities && window.activities.handleNewSuggestion) {
                window.activities.handleNewSuggestion(result.suggested_activity);
            }
        }
        
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        resetAnalysisResults();
        
        // Show success message
        showNotification('Journal analyzed and saved successfully!', 'success');
    } catch (error) {
        console.error('Error analyzing and saving journal:', error);
        showNotification(`Failed to analyze and save journal: ${error.message}`, 'error');
    } finally {
        // Reset loading state
        analyzeButton.disabled = false;
        submitButton.disabled = false;
        analyzeSpinner.classList.add('d-none');
        submitButton.classList.add('disabled');
    }
}

/**
 * Submit journal entry with or without prior analysis
 */
async function submitJournal() {
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get form data
    const username = usernameInput.value;
    const title = titleInput.value;
    const text = textInput.value;
    
    // Get emotion values from sliders
    const classification = {
        Joy: parseInt(sliders.joy.value),
        Sadness: parseInt(sliders.sadness.value),
        Anger: parseInt(sliders.anger.value),
        Fear: parseInt(sliders.fear.value),
        Surprise: parseInt(sliders.surprise.value),
        Disgust: parseInt(sliders.disgust.value),
        Triggers: {} // Triggers will be populated from analyzed results
    };
    
    // If we have a current analysis with triggers, include them
    if (currentAnalysis && currentAnalysis.Triggers) {
        classification.Triggers = currentAnalysis.Triggers;
    }
    
    // Show loading state
    submitButton.disabled = true;
    submitSpinner.classList.remove('d-none');
    
    try {
        // Make API request
        const response = await fetch('/new_journal_entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                title,
                text,
                classification,
                action: 'submit'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to save journal');
        }
        
        // Check if an activity was suggested
        if (result.activity_suggested) {
            // Show activity suggestion
            showActivitySuggestion(result.suggested_activity);
            
            // Notify the activities module if it exists
            if (window.activities && window.activities.handleNewSuggestion) {
                window.activities.handleNewSuggestion(result.suggested_activity);
            }
        }
        
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        resetAnalysisResults();
        submitButton.classList.add('disabled');
        
        // Show success message
        showNotification('Journal saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving journal:', error);
        showNotification(`Failed to save journal: ${error.message}`, 'error');
    } finally {
        // Reset loading state
        submitButton.disabled = false;
        submitSpinner.classList.add('d-none');
    }
}

/**
 * Update analysis results based on selected template
 * @param {Object} data - The analysis data from the server
 * @param {string} template - The selected template for analysis
 */
function updateAnalysisResults(data, template) {
    // Store the current analysis
    currentAnalysis = data;
    
    // Handle different template types
    const emotionResults = document.getElementById('emotionResults');
    const themeResults = document.getElementById('themeResults');
    const reflectionResults = document.getElementById('reflectionResults');
    
    // Hide all result sections
    emotionResults.classList.add('d-none');
    themeResults.classList.add('d-none');
    reflectionResults.classList.add('d-none');
    
    // Show appropriate section based on template
    if (template === 'emotion') {
        updateEmotionResults(data);
        emotionResults.classList.remove('d-none');
    } else if (template === 'themes') {
        updateThemeResults(data);
        themeResults.classList.remove('d-none');
    } else if (template === 'self_reflection') {
        updateReflectionResults(data);
        reflectionResults.classList.remove('d-none');
    }
}

/**
 * Update emotion analysis results
 * @param {Object} data - The analysis data from the server
 */
function updateEmotionResults(data) {
    // Update sliders
    sliders.joy.value = data.Joy || 0;
    sliders.sadness.value = data.Sadness || 0;
    sliders.anger.value = data.Anger || 0;
    sliders.fear.value = data.Fear || 0;
    sliders.surprise.value = data.Surprise || 0;
    sliders.disgust.value = data.Disgust || 0;
    
    // Update triggers
    const triggersContainer = document.getElementById('triggers');
    
    if (data.Triggers && Object.keys(data.Triggers).length > 0) {
        let triggersHtml = '';
        
        for (const [emotion, triggers] of Object.entries(data.Triggers)) {
            if (triggers && triggers.length > 0) {
                triggersHtml += `<div class="mb-2"><strong>${emotion}:</strong> ${triggers.join(', ')}</div>`;
            }
        }
        
        triggersContainer.innerHTML = triggersHtml || '<em class="text-muted">No specific triggers identified</em>';
    } else {
        triggersContainer.innerHTML = '<em class="text-muted">No specific triggers identified</em>';
    }
    
    // Check if the emotions might trigger activities
    const highEmotions = [];
    if (data.Fear > 60) highEmotions.push('Fear');
    if (data.Sadness > 60) highEmotions.push('Sadness');
    if (data.Anger > 60) highEmotions.push('Anger');
    
    // Show potential activity suggestion notification
    if (highEmotions.length > 0) {
        const emotionList = highEmotions.join(', ');
        const message = `High levels of ${emotionList} detected. Saving this entry may suggest helpful activities.`;
        showNotification(message, 'info');
    }
}

/**
 * Update theme analysis results
 * @param {Object} data - The analysis data from the server
 */
function updateThemeResults(data) {
    const themesList = document.getElementById('themesList');
    themesList.innerHTML = '';
    
    if (data.themes && data.themes.length > 0) {
        data.themes.forEach(theme => {
            const themeItem = document.createElement('li');
            themeItem.className = 'list-group-item';
            
            // Create prominence badge
            const prominenceBadge = document.createElement('span');
            prominenceBadge.className = 'badge rounded-pill bg-primary float-end';
            prominenceBadge.textContent = `${theme.prominence}/10`;
            
            themeItem.appendChild(prominenceBadge);
            
            // Theme name
            const themeName = document.createElement('h6');
            themeName.textContent = theme.name;
            themeItem.appendChild(themeName);
            
            // Evidence
            if (theme.evidence && theme.evidence.length > 0) {
                const evidenceList = document.createElement('small');
                evidenceList.className = 'text-muted';
                evidenceList.innerHTML = '<strong>Evidence:</strong> ' + theme.evidence.join('; ');
                themeItem.appendChild(evidenceList);
            }
            
            themesList.appendChild(themeItem);
        });
    } else {
        themesList.innerHTML = '<li class="list-group-item text-muted">No themes identified</li>';
    }
}

/**
 * Update reflection analysis results
 * @param {Object} data - The analysis data from the server
 */
function updateReflectionResults(data) {
    const reflectionLevel = document.getElementById('reflectionLevel');
    const reflectionSummary = document.getElementById('reflectionSummary');
    
    // Update introspection level
    if (data.introspection_level) {
        let levelClass = 'alert-info';
        let levelText = 'Moderate';
        
        if (data.introspection_level >= 7) {
            levelClass = 'alert-success';
            levelText = 'High';
        } else if (data.introspection_level <= 3) {
            levelClass = 'alert-warning';
            levelText = 'Low';
        }
        
        reflectionLevel.className = `alert ${levelClass}`;
        reflectionLevel.textContent = `Introspection Level: ${levelText} (${data.introspection_level}/10)`;
    } else {
        reflectionLevel.className = 'alert alert-info';
        reflectionLevel.textContent = 'Introspection level not available';
    }
    
    // Update summary
    if (data.summary) {
        reflectionSummary.innerHTML = `<div class="card-body"><h6>Summary</h6><p>${data.summary}</p></div>`;
    } else {
        reflectionSummary.innerHTML = '';
    }
    
    // Update reflections if available
    if (data.self_reflections && data.self_reflections.length > 0) {
        let reflectionsHtml = '<div class="card mt-3"><div class="card-header">Reflections</div><ul class="list-group list-group-flush">';
        
        data.self_reflections.forEach(reflection => {
            reflectionsHtml += `
                <li class="list-group-item">
                    <p class="mb-1">${reflection.reflection}</p>
                    ${reflection.insight ? `<small class="text-muted">Insight: ${reflection.insight}</small>` : ''}
                </li>
            `;
        });
        
        reflectionsHtml += '</ul></div>';
        reflectionSummary.innerHTML += reflectionsHtml;
    }
}

/**
 * Reset analysis results
 */
function resetAnalysisResults() {
    // Reset analysis flag and current analysis
    analysisDone = false;
    currentAnalysis = null;
    
    // Reset sliders
    Object.values(sliders).forEach(slider => slider.value = 0);
    
    // Reset triggers
    document.getElementById('triggers').innerHTML = '<em class="text-muted">Analysis results will appear here...</em>';
    
    // Reset themes
    document.getElementById('themesList').innerHTML = '<li class="list-group-item text-muted">Run analysis to see themes...</li>';
    
    // Reset reflections
    document.getElementById('reflectionLevel').textContent = 'Run analysis to see insights...';
    document.getElementById('reflectionSummary').innerHTML = '';
    
    // Show emotion results as default
    document.getElementById('emotionResults').classList.remove('d-none');
    document.getElementById('themeResults').classList.add('d-none');
    document.getElementById('reflectionResults').classList.add('d-none');
}

/**
 * Show activity suggestion in notification
 * @param {Object} activity - The suggested activity object
 */
function showActivitySuggestion(activity) {
    // Create a custom notification
    const activityNotification = document.createElement('div');
    activityNotification.className = 'toast activity-suggestion-toast';
    activityNotification.setAttribute('role', 'alert');
    activityNotification.setAttribute('aria-live', 'assertive');
    activityNotification.setAttribute('aria-atomic', 'true');
    
    const categoryName = activity.activity_category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    activityNotification.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Activity Suggestion</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body bg-light">
            <div class="d-flex align-items-start">
                <div class="activity-icon p-2 me-3 rounded bg-warning bg-opacity-25">
                    <i class="bi bi-lightbulb-fill fs-3 text-warning"></i>
                </div>
                <div>
                    <h5>${activity.activity_name}</h5>
                    <div class="badge bg-info mb-2">${categoryName}</div>
                    <p>${activity.activity_description}</p>
                    <div class="text-muted small mb-2 p-2 bg-light rounded border">
                        <i class="bi bi-quote me-1"></i>
                        <em>${activity.reason || 'Based on your journal content'}</em>
                    </div>
                    <div class="d-flex mt-3">
                        <div class="btn-group me-2" role="group">
                            <button class="btn btn-sm btn-success mark-complete-btn" data-id="${activity.activity_id}">
                                <i class="bi bi-check-circle me-1"></i> Mark Complete
                            </button>
                        </div>
                        <a href="#" class="btn btn-sm btn-primary go-to-activities-btn">
                            <i class="bi bi-list-check me-1"></i> View All Activities
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to notification container
    const toastContainer = document.querySelector('.toast-container');
    toastContainer.appendChild(activityNotification);
    
    // Show the toast
    const toast = new bootstrap.Toast(activityNotification, {
        autohide: false
    });
    toast.show();
    
    // Add event listeners
    const markCompleteBtn = activityNotification.querySelector('.mark-complete-btn');
    markCompleteBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            // Get username
            const username = usernameInput.value;
            
            // Call API to mark activity as complete
            const response = await fetch(`/activities/${username}/${activity.activity_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    completed: true
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update activity status');
            }
            
            // Show success message
            showNotification("Activity marked as complete!", "success");
            
            // Update button to show completion
            markCompleteBtn.classList.remove('btn-success');
            markCompleteBtn.classList.add('btn-outline-success');
            markCompleteBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Completed';
            markCompleteBtn.disabled = true;
            
            // Notify the activities module if it exists
            if (window.activities && window.activities.load) {
                window.activities.load(username, true);
            }
        } catch (error) {
            console.error('Error updating activity status:', error);
            showNotification('Failed to mark activity as complete', 'error');
        }
    });
    
    const goToActivitiesBtn = activityNotification.querySelector('.go-to-activities-btn');
    goToActivitiesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toast.hide();
        
        // Switch to activities tab if it exists
        const activitiesTab = document.getElementById('navActivities');
        if (activitiesTab) {
            activitiesTab.click();
        } else {
            showNotification('Activities view is not available', 'info');
        }
    });
}

// Initialize form validation
function initFormValidation() {
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            return;
        }
        
        // If valid, proceed with submission
        submitJournal();
    });
    
    // Enable submit button when all required fields are filled
    form.addEventListener('input', function() {
        submitButton.classList.toggle('disabled', !form.checkValidity());
    });
}

// Add event listeners
function addEventListeners() {
    // Analyze button
    analyzeButton.addEventListener('click', function(event) {
        // Check if Shift key is pressed for analyze-and-save
        if (event.shiftKey) {
            analyzeAndSaveJournal();
        } else {
            analyzeJournal();
        }
    });
    
    // Add tooltip for Analyze button
    if (analyzeButton && typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        new bootstrap.Tooltip(analyzeButton, {
            title: 'Tip: Hold Shift while clicking to analyze and save in one step',
            placement: 'top'
        });
    }
    
    // Submit button
    submitButton.addEventListener('click', submitJournal);
    
    // Template selector
    templateSelector.addEventListener('change', function() {
        // Reset all result sections
        resetAnalysisResults();
        
        // Enable analyze button
        analyzeButton.disabled = false;
        
        // Disable submit button
        submitButton.classList.add('disabled');
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initFormValidation();
    
    // Add event listeners
    addEventListeners();
    
    // Initialize with disabled submit button
    submitButton.classList.add('disabled');
});
