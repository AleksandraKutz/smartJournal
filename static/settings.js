// DOM elements
const templatePreferencesForm = document.getElementById('templatePreferencesForm');
const settingsUsername = document.getElementById('settingsUsername');
const templateCheckboxes = document.getElementById('templateCheckboxes');
const saveTemplatePreferencesBtn = document.getElementById('saveTemplatePreferencesBtn');
const saveTemplatesSpinner = document.getElementById('saveTemplatesSpinner');

// Track available templates
let availableTemplates = [];

/**
 * Initialize the settings page
 */
function initSettings() {
    // Load available templates
    loadAvailableTemplates();
    
    // Copy username from other forms if available
    const journalUsername = document.getElementById('username');
    if (journalUsername && journalUsername.value) {
        settingsUsername.value = journalUsername.value;
        // Load user preferences
        loadUserTemplatePreferences(journalUsername.value);
    }
    
    // Add form submit handler
    templatePreferencesForm.addEventListener('submit', function(event) {
        event.preventDefault();
        saveTemplatePreferences();
    });
}

/**
 * Load the list of available templates from the server
 */
function loadAvailableTemplates() {
    fetch('/templates')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load templates: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            availableTemplates = data.templates || [];
            renderTemplateCheckboxes();
        })
        .catch(error => {
            console.error('Error loading templates:', error);
            showNotification('Failed to load available templates', 'error');
            // Show error state
            templateCheckboxes.innerHTML = '<div class="alert alert-danger">Failed to load templates. Please try again.</div>';
        });
}

/**
 * Render checkboxes for each available template
 */
function renderTemplateCheckboxes() {
    // Clear loading indicators
    templateCheckboxes.innerHTML = '';
    
    if (availableTemplates.length === 0) {
        templateCheckboxes.innerHTML = '<div class="alert alert-info">No templates available.</div>';
        return;
    }
    
    // Create a checkbox for each template
    availableTemplates.forEach(template => {
        // Format template name for display
        const displayName = template
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        // Create the checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'form-check';
        
        // Create the checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        checkbox.id = `template-${template}`;
        checkbox.value = template;
        checkbox.name = 'templates';
        
        // Create the label
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `template-${template}`;
        label.textContent = displayName;
        
        // Add elements to container
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        
        // Add to DOM
        templateCheckboxes.appendChild(checkboxContainer);
    });
}

/**
 * Load a user's template preferences
 * @param {string} username - The username to load preferences for
 */
function loadUserTemplatePreferences(username) {
    if (!username) return;
    
    fetch(`/templates/user/${username}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // User not found, use default preferences
                    return { templates: ['emotion'] };
                }
                throw new Error(`Failed to load preferences: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const templates = data.templates || ['emotion'];
            
            // Wait for template checkboxes to be rendered
            if (availableTemplates.length === 0) {
                // Check periodically until templates are loaded
                const checkInterval = setInterval(() => {
                    if (availableTemplates.length > 0) {
                        clearInterval(checkInterval);
                        updateCheckboxes(templates);
                    }
                }, 100);
            } else {
                updateCheckboxes(templates);
            }
        })
        .catch(error => {
            console.error('Error loading user preferences:', error);
            showNotification('Failed to load user preferences', 'error');
        });
}

/**
 * Update checkbox selections based on user preferences
 * @param {Array} templates - Array of template names to select
 */
function updateCheckboxes(templates) {
    // Reset all checkboxes
    document.querySelectorAll('input[name="templates"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Check the ones in the user's preferences
    templates.forEach(template => {
        const checkbox = document.getElementById(`template-${template}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

/**
 * Save the user's template preferences
 */
function saveTemplatePreferences() {
    const username = settingsUsername.value.trim();
    
    if (!username) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    // Get selected templates
    const selectedTemplates = Array.from(
        document.querySelectorAll('input[name="templates"]:checked')
    ).map(checkbox => checkbox.value);
    
    if (selectedTemplates.length === 0) {
        showNotification('Please select at least one template', 'error');
        return;
    }
    
    // Show loading state
    saveTemplatePreferencesBtn.disabled = true;
    saveTemplatesSpinner.classList.remove('d-none');
    
    // Save preferences
    fetch(`/templates/user/${username}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            templates: selectedTemplates
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to save preferences: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            showNotification('Template preferences saved successfully', 'success');
            
            // If we have a username field in the journal form, update the templates there as well
            const journalUsername = document.getElementById('username');
            if (journalUsername && journalUsername.value === username && window.fetchUserTemplatePreferences) {
                window.fetchUserTemplatePreferences(username);
            }
        })
        .catch(error => {
            console.error('Error saving template preferences:', error);
            showNotification(`Failed to save preferences: ${error.message}`, 'error');
        })
        .finally(() => {
            // Reset loading state
            saveTemplatePreferencesBtn.disabled = false;
            saveTemplatesSpinner.classList.add('d-none');
        });
}

// Display a notification if there's no existing function
function showNotification(message, type = 'info') {
    // We need to avoid recursion, so check specifically for the journal notification function
    // instead of window.showNotification (which would be this function itself)
    const journalNotifier = document.getElementById('notificationToast');
    
    if (journalNotifier) {
        // If we have the toast element, we can use the journal's notification system
        const toastBody = document.getElementById('toastMessage');
        const toastTitle = document.getElementById('toastTitle');
        
        if (toastBody && toastTitle) {
            // Set content and styling based on type
            toastBody.textContent = message;
            
            // Set appropriate title and background color
            if (type === "error") {
                toastTitle.textContent = "Error";
                journalNotifier.classList.remove("bg-success", "bg-info");
                journalNotifier.classList.add("bg-danger", "text-white");
            } else if (type === "success") {
                toastTitle.textContent = "Success";
                journalNotifier.classList.remove("bg-danger", "bg-info");
                journalNotifier.classList.add("bg-success", "text-white");
            } else {
                toastTitle.textContent = "Information";
                journalNotifier.classList.remove("bg-danger", "bg-success");
                journalNotifier.classList.add("bg-info", "text-white");
            }
            
            // Create and show the Bootstrap toast
            try {
                const bsToast = new bootstrap.Toast(journalNotifier, {
                    autohide: true,
                    delay: type === "error" ? 5000 : 3000
                });
                bsToast.show();
            } catch (error) {
                // Fallback if bootstrap toast fails
                console.log(`${type.toUpperCase()}: ${message}`);
                // Don't use alert as it's disruptive
            }
        } else {
            // Simple fallback if elements not found
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    } else {
        // Simple fallback
        console.log(`${type.toUpperCase()}: ${message}`);
        // Don't use alert as it's disruptive - only log to console
    }
}

// Initialize settings when the settings tab is shown
document.addEventListener('DOMContentLoaded', function() {
    const navSettings = document.getElementById('navSettings');
    if (navSettings) {
        navSettings.addEventListener('click', function() {
            initSettings();
        });
    }
}); 