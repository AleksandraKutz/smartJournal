// Flag to track whether analysis has been performed
let analysisDone = false;
let currentAnalysis = null;
let userTemplates = ["emotion"]; // Default template if none available
let availableTemplateResults = {}; // Store results for all available templates

// DOM elements
const form = document.getElementById('journalForm');
const usernameInput = document.getElementById('username');
const titleInput = document.getElementById('title');
const textInput = document.getElementById('text');
const analyzeButton = document.getElementById('analyzeButton');
const submitButton = document.getElementById('submitButton');
const analyzeSpinner = document.getElementById('analyzeSpinner');
const submitSpinner = document.getElementById('submitSpinner');
const templateVisualizer = document.getElementById('templateVisualizer');
const templateVisualizerContainer = document.getElementById('templateVisualizerContainer');

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
    
    // Update UI sliders with emotion values - using direct property access instead of d3
    sliders.anger.value = emotionData['Anger'] || 0;
    sliders.fear.value = emotionData['Fear'] || 0;
    sliders.joy.value = emotionData['Joy'] || 0;
    sliders.sadness.value = emotionData['Sadness'] || 0;
    sliders.surprise.value = emotionData['Surprise'] || 0;
    sliders.disgust.value = emotionData['Disgust'] || 0;

    // Update analysis flag and enable submit button
    analysisDone = true;
    submitButton.classList.remove('disabled');

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

    // Update triggers element directly instead of using d3
    const triggersElement = document.getElementById('triggers');
    if (triggersElement) {
        triggersElement.innerHTML = triggersText;
    }
    
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
                templates: userTemplates, // Use the templates from API
                action: 'analyze'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to analyze journal');
        }
        
        console.log("Received analysis result:", result);
        
        // Check for top-level error
        if (result.error) {
            throw new Error(result.message || result.error);
        }
        
        // Update UI with analysis results
        updateAnalysisResults(result, userTemplates);
        
        // Enable submit button (redundant as updateAnalysisResults also does this)
        // But explicitly set it here again to ensure it's enabled
        submitButton.classList.remove('disabled');
        
        // Show success message
        showNotification('Journal analyzed successfully!', 'success');
    } catch (error) {
        console.error('Error analyzing journal:', error);
        showNotification(`Failed to analyze journal: ${error.message}`, 'error');
        
        // Reset analysis state
        resetAnalysisResults();
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
                templates: userTemplates, // Use the templates from API
                action: 'analyze_and_save'
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to analyze and save journal');
        }
        
        // Check for top-level error
        if (result.error) {
            throw new Error(result.message || result.error);
        }
        
        // Update UI with analysis results if available
        if (result.analysis) {
            try {
                updateAnalysisResults(result.analysis, userTemplates);
            } catch (displayError) {
                console.error('Error updating analysis display:', displayError);
                // Display warning but continue with save
                showNotification('Journal saved, but there was an issue displaying the analysis results.', 'warning');
            }
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
        
        // Don't reset the form on error so user can try again
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
    
    // If we have analyzed data, get the triggers
    // First try to get from emotion template if we're using multiple templates
    if (availableTemplateResults && availableTemplateResults.emotion && availableTemplateResults.emotion.Triggers) {
        classification.Triggers = availableTemplateResults.emotion.Triggers;
    } 
    // Fall back to current analysis if it contains triggers (for single template case)
    else if (currentAnalysis && currentAnalysis.Triggers) {
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
 * Update analysis results based on templates
 * @param {Object} data - The analysis data from the server
 * @param {Array} templates - The templates used for analysis
 */
function updateAnalysisResults(data, templates) {
    // Store all template results for later visualization switching
    availableTemplateResults = data;
    
    // Check if we have a multi-template response
    const isMultiTemplate = templates.length > 1 && typeof data === 'object' && !Array.isArray(data);
    
    // Populate template visualizer dropdown
    updateTemplateVisualizerOptions(data, templates);
    
    // If we have multi-template data, use the selected template for display or first valid one
    if (isMultiTemplate) {
        // Get currently selected template from dropdown
        const selectedTemplate = templateVisualizer.value;
        
        // Check if the selected template has valid data
        if (data[selectedTemplate] && !data[selectedTemplate].error) {
            // Use the selected template
            updateDisplayForTemplate(selectedTemplate, data[selectedTemplate]);
        } else {
            // Find the first valid template data
            let displayTemplate = null;
            let templateData = null;
            
            // Look for the first available template data without errors
            for (const t of templates) {
                if (data[t] && !data[t].error) {
                    templateData = data[t];
                    displayTemplate = t;
                    break;
                }
            }
            
            // If all templates have errors, use emotion template if available
            if (!templateData && data.emotion) {
                templateData = data.emotion;
                displayTemplate = 'emotion';
            }
            
            // If still no data, show error
            if (!templateData) {
                showNotification('No valid template analysis available. Please try again.', 'error');
                return;
            }
            
            // Update the dropdown to match the displayed template
            if (templateVisualizer.querySelector(`option[value="${displayTemplate}"]`)) {
                templateVisualizer.value = displayTemplate;
            }
            
            // Update display with the first valid template
            updateDisplayForTemplate(displayTemplate, templateData);
        }
    } else {
        // Single template case - use the only template or the first one
        const template = templates[0] || 'emotion';
        
        // Direct data or template-specific data
        const displayData = data[template] || data;
        
        // Check for any errors in the data to display
        if (displayData && displayData.error) {
            showNotification(`Analysis error: ${displayData.error}`, 'error');
            return;
        }
        
        // Update display based on template
        updateDisplayForTemplate(template, displayData);
        
        // Update dropdown to match
        if (templateVisualizer.querySelector(`option[value="${template}"]`)) {
            templateVisualizer.value = template;
        }
    }
    
    // Set analysis flag
    analysisDone = true;
    
    // Enable submit button
    submitButton.classList.remove('disabled');
}

/**
 * Update the template visualizer dropdown with available templates
 * @param {Object} data - The analysis data from the server
 * @param {Array} templates - The templates used for analysis
 */
function updateTemplateVisualizerOptions(data, templates) {
    // Show the template visualizer container
    templateVisualizerContainer.classList.remove('d-none');
    
    // Get available templates that have valid data
    const availableTemplates = Object.keys(data).filter(key => 
        data[key] && !data[key].error
    );
    
    // If we have multiple valid templates, enable the visualizer
    if (availableTemplates.length > 1) {
        // Enable the selector
        templateVisualizer.disabled = false;
        
        // Update selected option if needed
        if (availableTemplates.includes(templateVisualizer.value)) {
            // Keep current selection
        } else if (availableTemplates.length > 0) {
            // Select first available
            templateVisualizer.value = availableTemplates[0];
        }
    } else if (availableTemplates.length === 1) {
        // If only one template is valid, select it but disable the dropdown
        templateVisualizer.value = availableTemplates[0];
        templateVisualizer.disabled = true;
    } else {
        // No valid templates, hide the visualizer
        templateVisualizerContainer.classList.add('d-none');
    }
}

/**
 * Update the display based on the template type
 * @param {string} template - The template type
 * @param {Object} data - The data to display
 */
function updateDisplayForTemplate(template, data) {
    // Store current template data for submission
    currentAnalysis = data;
    
    // Get result sections
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
    } else {
        // Default to emotion if template not recognized
        updateEmotionResults(data);
        emotionResults.classList.remove('d-none');
    }
}

/**
 * Update emotion analysis results
 * @param {Object} data - The analysis data from the server
 */
function updateEmotionResults(data) {
    // Update sliders directly without using d3
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
    availableTemplateResults = {};
    
    // Hide template visualizer
    templateVisualizerContainer.classList.add('d-none');
    
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
    // Use debouncing to avoid too many rapid calls that could stack up
    let inputTimeout = null;
    form.addEventListener('input', function() {
        // Clear any existing timeout
        if (inputTimeout) {
            clearTimeout(inputTimeout);
        }
        
        // Set a new timeout to update the button state
        inputTimeout = setTimeout(function() {
            const isValid = form.checkValidity();
            if (isValid) {
                submitButton.classList.remove('disabled');
            } else {
                submitButton.classList.add('disabled');
            }
        }, 100); // 100ms debounce
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
    
    // Template visualizer change handler
    templateVisualizer.addEventListener('change', function() {
        if (analysisDone && availableTemplateResults) {
            const selectedTemplate = this.value;
            const templateData = availableTemplateResults[selectedTemplate] || availableTemplateResults;
            
            if (templateData && !templateData.error) {
                updateDisplayForTemplate(selectedTemplate, templateData);
            } else {
                showNotification(`No valid data available for ${selectedTemplate} template`, 'error');
            }
        }
    });
    
    // Username input - update template preferences when username changes
    usernameInput.addEventListener('blur', function() {
        const username = usernameInput.value.trim();
        if (username) {
            fetchUserTemplatePreferences(username);
        }
    });
}

/**
 * Fetch the user's template preferences from the server
 * @param {string} username - The username to fetch preferences for
 */
function fetchUserTemplatePreferences(username) {
    // Don't fetch if username is empty
    if (!username) return;
    
    // Use a static flag to prevent multiple simultaneous calls
    if (fetchUserTemplatePreferences.isLoading) return;
    fetchUserTemplatePreferences.isLoading = true;
    
    fetch(`/templates/user/${username}`)
        .then(response => {
            if (!response.ok) {
                // If user not found, that's ok - we'll use defaults
                if (response.status === 404) {
                    return { templates: ["emotion"] };
                }
                throw new Error(`Error fetching template preferences: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.templates && Array.isArray(data.templates)) {
                // Store the user's templates
                userTemplates = data.templates;
                console.log("Loaded user templates:", userTemplates);
                
                // If we already have analysis results, we might need to update the display
                if (analysisDone && currentAnalysis) {
                    // Remove any current display and reset
                    resetAnalysisResults();
                }
            }
        })
        .catch(error => {
            console.error("Error fetching user template preferences:", error);
            // Fall back to default template
            userTemplates = ["emotion"];
        })
        .finally(() => {
            // Reset loading flag
            fetchUserTemplatePreferences.isLoading = false;
        });
}

// Initialize the static flag
fetchUserTemplatePreferences.isLoading = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initFormValidation();
    
    // Add event listeners
    addEventListeners();
    
    // Initialize with disabled submit button
    submitButton.classList.add('disabled');
    
    // Check if username is already filled (e.g. from localStorage)
    const username = usernameInput.value.trim();
    if (username) {
        fetchUserTemplatePreferences(username);
    }
});
