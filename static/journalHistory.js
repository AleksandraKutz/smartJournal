const currentYear = new Date().getFullYear(); // Current year by default
let currentMonth = new Date().getMonth(); // Current month by default (0-11)
// Store three months (current, previous, next)
let displayMonths = [
    (currentMonth === 0) ? 11 : currentMonth - 1,
    currentMonth,
    (currentMonth === 11) ? 0 : currentMonth + 1
];


let userJson = {};
let userJournalHistory = [];
let selectedColorMetric = "combined"; // Default to combined view
let dailyMoodAverages = {}; // Cache for calculated mood/urge averages


// Check if showNotification exists, if not, create a fallback
if (typeof showNotification !== 'function') {
    function showNotification(message, type = "info") {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message);
    }
}

/**
 * Get month name from month number (0-11)
 * @param {number} month - Month number (0-11)
 * @returns {string} - Month name
 */
function getMonthName(month) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    return monthNames[month];
}

/**
 * Update calendar title with current months and year
 */
function updateCalendarTitle() {
    const calendarTitle = d3.select("#calendarTitle");
    if (!calendarTitle.empty()) {
        // For spanning multiple years (December-January-February)
        if (displayMonths[0] > displayMonths[2]) {
            calendarTitle.html(
                `${getMonthName(displayMonths[0])} ${currentYear}<br/>` +
                `${getMonthName(displayMonths[1])} ${currentYear}<br/>` +
                `${getMonthName(displayMonths[2])} ${currentYear + 1}`
            );
        } 
        // For spanning multiple years (November-December-January)
        else if (displayMonths[0] === 11 && displayMonths[2] === 1) {
            calendarTitle.html(
                `${getMonthName(displayMonths[0])} ${currentYear}<br/>` +
                `${getMonthName(displayMonths[1])} ${currentYear}<br/>` +
                `${getMonthName(displayMonths[2])} ${currentYear + 1}`
            );
        } 
        // For normal cases within the same year
        else {
            calendarTitle.html(
                `${getMonthName(displayMonths[0])} - ${getMonthName(displayMonths[2])} ${currentYear}`
            );
        }
    }
}

/**
 * Navigate to previous three months
 */
function previousMonth() {
    // Move back three months
    currentMonth = (currentMonth + 9) % 12; // +9 is the same as -3 but ensures positive result
    
    // Update the display months
    displayMonths = [
        (currentMonth === 0) ? 11 : currentMonth - 1,
        currentMonth,
        (currentMonth === 11) ? 0 : currentMonth + 1
    ];
    
    // Adjust year if we crossed year boundary
    if (currentMonth === 9 && displayMonths[0] === 8) { // When moving from Dec to Oct as middle month
        currentYear--;
    }
    
    updateCalendarTitle();
    refreshCalendar();
}

/**
 * Navigate to next three months
 */
function nextMonth() {
    // Move forward three months
    currentMonth = (currentMonth + 3) % 12;
    
    // Update the display months
    displayMonths = [
        (currentMonth === 0) ? 11 : currentMonth - 1,
        currentMonth,
        (currentMonth === 11) ? 0 : currentMonth + 1
    ];
    
    // Adjust year if we crossed year boundary
    if (currentMonth === 0 && displayMonths[0] === 11) { // When moving from Oct to Jan as middle month
        currentYear++;
    }
    
    updateCalendarTitle();
    refreshCalendar();
}

/**
 * Navigate to previous year
 */
function previousYear() {
    currentYear--;
    updateCalendarTitle();
    refreshCalendar();
}

/**
 * Navigate to next year
 */
function nextYear() {
    currentYear++;
    updateCalendarTitle();
    refreshCalendar();
}

/**
 * Refresh the calendar view
 */
function refreshCalendar() {
    console.log("Refreshing calendar...");
    
    try {
        // Check if displayType dropdown exists, create it if needed
        let displayTypeDropdown = document.getElementById('displayType');
        if (!displayTypeDropdown) {
            console.warn("Display type dropdown not found, creating one");
            
            // Look for a container element
            const mainContainer = document.querySelector('.container') || document.body;
            
            // Create display type controls
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'form-group mb-3';
            
            const label = document.createElement('label');
            label.htmlFor = 'displayType';
            label.textContent = 'Display:';
            label.className = 'me-2';
            
            displayTypeDropdown = document.createElement('select');
            displayTypeDropdown.id = 'displayType';
            displayTypeDropdown.className = 'form-select form-select-sm d-inline-block';
            displayTypeDropdown.style.width = 'auto';
            
            // Add options
            const emotionsOption = document.createElement('option');
            emotionsOption.value = 'emotions';
            emotionsOption.textContent = 'Emotions';
            emotionsOption.selected = true;
            
            const urgesOption = document.createElement('option');
            urgesOption.value = 'urges';
            urgesOption.textContent = 'Urges';
            
            displayTypeDropdown.appendChild(emotionsOption);
            displayTypeDropdown.appendChild(urgesOption);
            
            controlsDiv.appendChild(label);
            controlsDiv.appendChild(displayTypeDropdown);
            
            // Add to the page
            const existingControls = document.querySelector('.calendar-controls');
            if (existingControls) {
                existingControls.appendChild(controlsDiv);
            } else {
                mainContainer.insertBefore(controlsDiv, mainContainer.firstChild);
            }
            
            // Add event listener for the display type dropdown
            displayTypeDropdown.addEventListener('change', function() {
                // This will be handled by the existing event listener in initHistory
                console.log("Display type changed to:", this.value);
                // Mark that the user has manually selected this option
                this.dataset.userSelected = 'true';
            });
        }
        
        // Get the current display type
        const displayType = displayTypeDropdown.value;
        console.log("Current display type for refresh:", displayType);
        
        // Check if the calendar container exists, create it if it doesn't
        let calendarContainer = document.getElementById('calendar');
        if (!calendarContainer) {
            console.warn("Calendar container not found, creating one");
            
            // Look for a container element where we should add the calendar
            const mainContainer = document.querySelector('.container') || document.body;
            
            calendarContainer = document.createElement('div');
            calendarContainer.id = 'calendar';
            calendarContainer.className = 'calendar-container mt-4';
            
            // Find where to insert the calendar in the DOM
            const weekOverview = document.getElementById('week-overview');
            if (weekOverview) {
                // Insert before the week overview
                weekOverview.parentNode.insertBefore(calendarContainer, weekOverview);
            } else {
                // Just append to the main container
                mainContainer.appendChild(calendarContainer);
            }
        }
        
        // Clear the calendar container
        calendarContainer.innerHTML = '';
        
        // Force data recalculation by clearing the cache
        dailyMoodAverages = {}; // Reset cached data
        
        // Rebuild the calendar from scratch
        buildCalenderWithD3();
        
        console.log("Calendar refresh complete for display type:", displayType);
    } catch (error) {
        console.error("Error refreshing calendar:", error);
        showNotification("Error refreshing calendar: " + error.message, "error");
    }
}

/**
 * Handle color metric selection change
 */
function handleColorMetricChange() {
    selectedColorMetric = d3.select("#colorMetricSelect").property("value");
    refreshCalendar();
}

/**
 * Fetch journal history for the specified user
 * @param {string} username - The username to fetch history for
 * @returns {Promise} - Promise that resolves when history is loaded
 */
async function getJournalHistoryForUser(username) {
    // Get username from input field if not provided
    if (!username) {
        username = document.getElementById('historyUsername').value;
    }
    
    if (!username) {
        showNotification("Please enter a username to view history.", "error");
        document.getElementById('loadingIndicator').style.display = 'none';
        return Promise.reject("No username provided");
    }
    
    console.log("Fetching journal history for user:", username);

    try {
        // Make sure to use the correct API endpoint
        const response = await fetch(`http://127.0.0.1:8800/history/${username}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server returned ${response.status}: ${response.statusText}`, errorText);
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        let data;
        try {
            data = await response.json();
            console.log("Journal history data received:", data);
        } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError);
            throw new Error("Invalid response format from server");
        }
        
        // If data is null or undefined, handle gracefully
        if (!data) {
            console.warn("Server returned empty or null data");
            userJson = {};
            userJournalHistory = [];
            return [];
        }
        
        // Store both in userJson and userJournalHistory
        userJson = data;
        
        // Make sure we have an array of entries
        if (Array.isArray(data)) {
        userJournalHistory = data;
            console.log("Data is an array with", data.length, "entries");
        } else if (data.entries && Array.isArray(data.entries)) {
            userJournalHistory = data.entries;
            console.log("Data has entries array with", data.entries.length, "entries");
        } else {
            console.warn("Unexpected data format, entries not found", data);
            userJournalHistory = [];
        }
        
        // Ensure all timestamps are properly formatted as Date objects
        userJournalHistory.forEach((entry, index) => {
            if (!entry) {
                console.warn(`Entry at index ${index} is null or undefined`);
                return;
            }
            
            if (entry.timestamp && typeof entry.timestamp === 'string') {
                try {
                    entry.timestamp = new Date(entry.timestamp);
                } catch (e) {
                    console.warn(`Failed to parse timestamp for entry ${index}:`, e);
                }
            }
            
            // Log entry format for debugging
            if (index === 0) {
                console.log("First entry format:", JSON.stringify(entry, null, 2));
            }
        });
        
        // Filter out any invalid entries
        const validEntries = userJournalHistory.filter(entry => entry && entry.timestamp);
        if (validEntries.length !== userJournalHistory.length) {
            console.warn(`Filtered out ${userJournalHistory.length - validEntries.length} invalid entries`);
            userJournalHistory = validEntries;
        }
        
        console.log("Processed journal entries:", userJournalHistory.length);
        
        // Check for urges and emotions in the data
        let hasUrges = false;
        let hasEmotions = false;
        
        for (const entry of userJournalHistory) {
            if (entry.classification) {
                if (entry.classification.urges && entry.classification.urges.urges) {
                    hasUrges = true;
                }
                
                const emotionData = entry.classification.emotion || entry.classification;
                if (emotionData && (emotionData.Joy || emotionData.joy || 
                    emotionData.Sadness || emotionData.sadness ||
                    emotionData.Anger || emotionData.anger)) {
                    hasEmotions = true;
                }
                
                if (hasUrges && hasEmotions) break;
            }
        }
        
        console.log("Data contains urges:", hasUrges, "emotions:", hasEmotions);
        
        // Set the display type dropdown based on available data
        const displayTypeDropdown = document.getElementById('displayType');
        if (displayTypeDropdown) {
            // Don't change if user has explicitly selected an option
            if (!displayTypeDropdown.dataset.userSelected) {
                if (hasUrges && !hasEmotions) {
                    displayTypeDropdown.value = 'urges';
                } else {
                    displayTypeDropdown.value = 'emotions';
                }
                console.log("Set display type to:", displayTypeDropdown.value);
            }
        }
        
        return userJournalHistory;
    } catch (error) {
        console.error("Error fetching journal history:", error);
        showNotification(`Failed to load history: ${error.message}`, "error");
        document.getElementById('loadingIndicator').style.display = 'none';
        throw error;
    }
}

/**
 * Shows an overview of journal entries for the selected week
 * @param {Date} startDate The start date of the week
 * @param {Date} endDate The end date of the week
 */
function showWeekOverview(startDate, endDate) {
    console.log(`Showing week overview from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Check if overview container exists, create it if needed
    let chartContainer = document.getElementById('week-overview');
    if (!chartContainer) {
        console.warn("Week overview container not found, creating one");
        
        // Look for containers to position the overview
        const calendarContainer = document.getElementById('calendar');
        const mainContainer = document.querySelector('.container') || document.body;
        
        // Create the week overview container
        chartContainer = document.createElement('div');
        chartContainer.id = 'week-overview';
        chartContainer.className = 'week-overview-container mt-4';
        
        // Create a container for journal entries
        const entriesContainer = document.createElement('div');
        entriesContainer.id = 'journalEntryList';
        entriesContainer.className = 'list-group mt-3';
        
        // Create a heading for the week range
        const weekRangeInfo = document.createElement('h5');
        weekRangeInfo.id = 'weekRangeInfo';
        weekRangeInfo.className = 'mb-3';
        weekRangeInfo.textContent = 'Selected Week';
        
        // Add the components to the page
        if (calendarContainer) {
            const parent = calendarContainer.parentNode;
            parent.insertBefore(chartContainer, calendarContainer.nextSibling);
            parent.insertBefore(weekRangeInfo, chartContainer);
            parent.insertBefore(entriesContainer, chartContainer.nextSibling);
        } else {
            mainContainer.appendChild(weekRangeInfo);
            mainContainer.appendChild(chartContainer);
            mainContainer.appendChild(entriesContainer);
        }
    }
    
    chartContainer.innerHTML = 'Loading weekly overview...';
    
    // Check if we have journal history data, if not, show a message
    if (!userJournalHistory || userJournalHistory.length === 0) {
        chartContainer.textContent = 'No journal entries available. Please load a user\'s history first.';
        return;
    }
    
    try {
        // Ensure startDate and endDate are valid Date objects
        startDate = new Date(startDate);
        endDate = new Date(endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid date range provided");
        }
        
        console.log(`Confirmed dates: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // Use the already loaded data instead of making a new API call
        // Create the line chart with the journal entries
        createLineChart(userJournalHistory, startDate, endDate, chartContainer);
        
        // Build the journal entries list
        buildJournalTimesliceList(startDate, endDate, userJournalHistory);
        
        // Update UI to indicate current selected week
        const weekRangeInfo = document.getElementById('weekRangeInfo');
        if (weekRangeInfo) {
            weekRangeInfo.textContent = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        }
    } catch (error) {
        console.error("Error showing week overview:", error);
        chartContainer.innerHTML = `<div class="alert alert-danger">Error loading week overview: ${error.message}</div>`;
    }
}

/**
 * Builds a list of journal entries for the selected time period
 * @param {Date} startDate Start date for filtering entries
 * @param {Date} endDate End date for filtering entries
 * @param {Array} entries Journal entries
 */
function buildJournalTimesliceList(startDate, endDate, entries) {
    console.log(`Building journal entries list from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Check if journal entry list container exists, create it if needed
    let container = document.getElementById('journalEntryList');
    if (!container) {
        console.warn("Journal entry list container not found, creating one");
        
        // Look for containers to position the list
        const weekOverview = document.getElementById('week-overview');
        const mainContainer = document.querySelector('.container') || document.body;
        
        // Create the journal entries container
        container = document.createElement('div');
        container.id = 'journalEntryList';
        container.className = 'list-group mt-3';
        
        // Add the container to the page
        if (weekOverview) {
            weekOverview.parentNode.insertBefore(container, weekOverview.nextSibling);
        } else {
            mainContainer.appendChild(container);
        }
    }
    
    container.innerHTML = '';

    // Get the display type from dropdown
    const displayType = document.getElementById('displayType').value;
    const showUrges = displayType === "urges";
    
    try {
        // Ensure we have valid date objects
        startDate = new Date(startDate);
        endDate = new Date(endDate);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid date range:", startDate, endDate);
            container.innerHTML = '<div class="list-group-item text-danger">Error: Invalid date range</div>';
            return;
        }
        
        // Set hours to ensure we capture the full days
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Filter entries for the selected date range
        const filteredEntries = entries.filter(entry => {
            if (!entry || !entry.timestamp) return false;
            const entryDate = new Date(entry.timestamp);
            
            // Ensure we have a valid date
            if (isNaN(entryDate.getTime())) return false;
            
            return entryDate >= startDate && entryDate <= endDate;
        });
        
        console.log(`Found ${filteredEntries.length} entries in date range`);
        
        // If no entries, show a message
        if (!filteredEntries.length) {
            container.innerHTML = '<div class="list-group-item">No journal entries for this period</div>';
            return;
        }
        
        // Sort entries by date (newest first)
        filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // For each entry, create a list item
        filteredEntries.forEach((entry, index) => {
            // Create entry container
            const entryEl = document.createElement('div');
            entryEl.className = 'list-group-item journal-entry';
            
            // Add date and title
            const titleEl = document.createElement('h6');
            titleEl.className = 'mb-1';
            
            // Format the date (assuming timestamp is ISO string)
            const entryDate = new Date(entry.timestamp);
            const dateStr = entryDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            titleEl.textContent = `${dateStr} - ${entry.title || 'Untitled'}`;
            entryEl.appendChild(titleEl);
            
            // Add a snippet of the entry text
            if (entry.text) {
                const snippetEl = document.createElement('p');
                snippetEl.className = 'mb-1 small';
                snippetEl.textContent = entry.text.length > 100 
                    ? entry.text.substring(0, 100) + '...' 
                    : entry.text;
                entryEl.appendChild(snippetEl);
            }
            
            // Create emotion/urge indicator boxes
            const boxesEl = document.createElement('div');
            boxesEl.className = 'emotion-boxes d-flex flex-wrap gap-1 mt-2';
            
            if (showUrges) {
                // Show urges
                if (entry.classification && entry.classification.urges && entry.classification.urges.urges) {
                    const urges = entry.classification.urges.urges;
                    
                    // Show urges with sized boxes
                    const urgeCategories = [
                        'Shopping', 'Social_Media', 'Food', 'Exercise', 
                        'Work', 'Isolation', 'Substance', 'Procrastination'
                    ];
                    
                    // Show only significant urges (threshold of 30%)
                    let hasSignificantUrge = false;
                    const primaryUrge = entry.classification.urges.primary_urge;
                    
                    urgeCategories.forEach(category => {
                        const value = urges[category] || 0;
                        if (value >= 30) {
                            hasSignificantUrge = true;
                            
                            // Create box for this urge
                            const boxEl = document.createElement('div');
                            boxEl.className = 'emotion-box';
                            
                            // Size based on intensity
                            const size = Math.max(20, Math.min(40, 20 + (value / 5)));
                            boxEl.style.width = `${size}px`;
                            boxEl.style.height = `${size}px`;
                            
                            // Color based on category
                            let color;
                            switch(category.toLowerCase()) {
                                case 'shopping': color = '#ff69b4'; break; // Hot Pink
                                case 'social_media': color = '#3b5998'; break; // Facebook Blue
                                case 'food': color = '#ffb347'; break; // Orange
                                case 'exercise': color = '#2ecc71'; break; // Green
                                case 'work': color = '#800080'; break; // Purple
                                case 'isolation': color = '#a9a9a9'; break; // Gray
                                case 'substance': color = '#a52a2a'; break; // Brown
                                case 'procrastination': color = '#ffa500'; break; // Orange
                                default: color = '#ccc';
                            }
                            boxEl.style.backgroundColor = color;
                            
                            // Add label
                            boxEl.setAttribute('title', `${category.replace('_', ' ')}: ${value}%`);
                            
                            // Highlight primary urge with a border
                            if (primaryUrge && category.toLowerCase() === primaryUrge.toLowerCase()) {
                                boxEl.style.border = '2px solid black';
                            }
                            
                            boxesEl.appendChild(boxEl);
                        }
                    });
                    
                    if (!hasSignificantUrge) {
                        const msgEl = document.createElement('em');
                        msgEl.className = 'text-muted small';
                        msgEl.textContent = 'No significant urges reported';
                        boxesEl.appendChild(msgEl);
                    }
                    
                    // Show triggers if present
                    if (entry.classification.urges.triggers && Object.keys(entry.classification.urges.triggers).length > 0) {
                        const triggersContainer = document.createElement('div');
                        triggersContainer.className = 'mt-2 triggers-container';
                        
                        // Create trigger toggle button
                        const toggleBtn = document.createElement('button');
                        toggleBtn.className = 'btn btn-sm btn-outline-secondary mb-1';
                        toggleBtn.textContent = 'Show Triggers';
                        
                        // Create triggers content (initially hidden)
                        const triggersContent = document.createElement('div');
                        triggersContent.className = 'd-none';
                        triggersContent.innerHTML = '<strong>Triggers:</strong>';
                        
                        // Add each trigger
                        const triggersList = document.createElement('ul');
                        triggersList.className = 'mb-0 ps-3';
                        
                        Object.entries(entry.classification.urges.triggers).forEach(([urge, triggers]) => {
                            const li = document.createElement('li');
                            li.innerHTML = `<strong>${urge.replace('_', ' ')}:</strong> ${triggers.join(', ')}`;
                            triggersList.appendChild(li);
                        });
                        
                        triggersContent.appendChild(triggersList);
                        
                        // Toggle visibility on click
                        toggleBtn.addEventListener('click', () => {
                            if (triggersContent.classList.contains('d-none')) {
                                triggersContent.classList.remove('d-none');
                                toggleBtn.textContent = 'Hide Triggers';
                            } else {
                                triggersContent.classList.add('d-none');
                                toggleBtn.textContent = 'Show Triggers';
                            }
                        });
                        
                        triggersContainer.appendChild(toggleBtn);
                        triggersContainer.appendChild(triggersContent);
                        boxesEl.appendChild(triggersContainer);
                    }
                } else {
                    const msgEl = document.createElement('em');
                    msgEl.className = 'text-muted small';
                    msgEl.textContent = 'No urge data available';
                    boxesEl.appendChild(msgEl);
                }
            } else {
                // Show emotions
                if (entry.classification) {
                    // Extract emotion data
                    const emotionData = entry.classification.emotion || entry.classification;
                    
                    if (emotionData) {
                        // Create boxes for emotions with values > 0
                        const emotions = [
                            {name: 'Joy', key: 'joy', color: '#ffc107'},
                            {name: 'Sadness', key: 'sadness', color: '#0d6efd'},
                            {name: 'Anger', key: 'anger', color: '#dc3545'},
                            {name: 'Fear', key: 'fear', color: '#6610f2'},
                            {name: 'Surprise', key: 'surprise', color: '#fd7e14'},
                            {name: 'Disgust', key: 'disgust', color: '#198754'}
                        ];
                        
                        let hasEmotions = false;
                        
                        emotions.forEach(emotion => {
                            // Check both capitalization options (Joy/joy)
                            const value = emotionData[emotion.key] || emotionData[emotion.name] || 0;
                            
                            if (value > 0) {
                                hasEmotions = true;
                                
                                // Create a box for this emotion
                                const boxEl = document.createElement('div');
                                boxEl.className = 'emotion-box';
                                
                                // Size based on intensity
                                const size = Math.max(20, Math.min(40, 20 + (value / 5)));
                                boxEl.style.width = `${size}px`;
                                boxEl.style.height = `${size}px`;
                                
                                // Color based on emotion
                                boxEl.style.backgroundColor = emotion.color;
                                
                                // Add tooltip
                                boxEl.setAttribute('title', `${emotion.name}: ${value}%`);
                                
                                boxesEl.appendChild(boxEl);
                            }
                        });
                        
                        if (!hasEmotions) {
                            const msgEl = document.createElement('em');
                            msgEl.className = 'text-muted small';
                            msgEl.textContent = 'No emotional data available';
                            boxesEl.appendChild(msgEl);
                        }
                    }
                } else {
                    const msgEl = document.createElement('em');
                    msgEl.className = 'text-muted small';
                    msgEl.textContent = 'No emotional data available';
                    boxesEl.appendChild(msgEl);
                }
            }
            
            entryEl.appendChild(boxesEl);
            
            // Add gratitude section if available
            if (entry.classification && 
                (entry.classification.gratitude || 
                (entry.classification.emotion && entry.classification.emotion.gratitude))) {
                
                const gratitudeItems = entry.classification.gratitude || 
                                    entry.classification.emotion.gratitude;
                
                if (gratitudeItems && gratitudeItems.length > 0) {
                    const gratitudeContainer = document.createElement('div');
                    gratitudeContainer.className = 'mt-2 gratitude-container';
                    
                    // Create gratitude toggle button
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'btn btn-sm btn-outline-success mb-1';
                    toggleBtn.textContent = 'Show Gratitude';
                    
                    // Create gratitude content (initially hidden)
                    const gratitudeContent = document.createElement('div');
                    gratitudeContent.className = 'd-none';
                    
                    // Add each gratitude item
                    const gratitudeList = document.createElement('ul');
                    gratitudeList.className = 'mb-0 ps-3';
                    
                    gratitudeItems.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        gratitudeList.appendChild(li);
                    });
                    
                    gratitudeContent.appendChild(gratitudeList);
                    
                    // Toggle visibility on click
                    toggleBtn.addEventListener('click', () => {
                        if (gratitudeContent.classList.contains('d-none')) {
                            gratitudeContent.classList.remove('d-none');
                            toggleBtn.textContent = 'Hide Gratitude';
                        } else {
                            gratitudeContent.classList.add('d-none');
                            toggleBtn.textContent = 'Show Gratitude';
                        }
                    });
                    
                    gratitudeContainer.appendChild(toggleBtn);
                    gratitudeContainer.appendChild(gratitudeContent);
                    boxesEl.appendChild(gratitudeContainer);
                }
            }
            
            // Make entry clickable to show full details
            entryEl.style.cursor = 'pointer';
            entryEl.addEventListener('click', (event) => {
                // Don't trigger if clicking on a button or its children
                if (event.target.closest('button') || event.target.closest('.triggers-container') || 
                    event.target.closest('.gratitude-container')) {
                    return;
                }
                
                showEntryDetail(entry);
            });
            
            // Add entry element to the container
            container.appendChild(entryEl);
            
            // Log first entry for debugging
            if (index === 0) {
                console.log("First entry timestamp:", entry.timestamp, new Date(entry.timestamp).toISOString());
            }
        });
        
        console.log(`Displayed ${filteredEntries.length} journal entries`);
    } catch (error) {
        console.error("Error building journal entry list:", error);
        container.innerHTML = '<div class="list-group-item text-danger">Error building journal entry list: ' + error.message + '</div>';
    }
}

/**
 * Creates a D3 line chart visualizing emotion or urge scores over time
 * @param {Array} entries Journal entries
 * @param {Date} startDate Start date for filtering entries
 * @param {Date} endDate End date for filtering entries
 * @param {HTMLElement} container Container element for the chart
 */
function createLineChart(entries, startDate, endDate, container) {
    // Get the display type from the dropdown
    const displayType = document.getElementById('displayType').value;
    const showUrges = displayType === "urges";

    // Filter entries for the selected date range
    const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
    });

    // If no entries, show a message
    if (!filteredEntries.length) {
        container.textContent = 'No journal entries for the selected week.';
        return;
    }

    // Sort entries by date (ascending)
    filteredEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Extract data and dates based on display type
    const chartData = {};
    const dates = [];

    if (showUrges) {
        // Initialize urge data
        chartData.shopping = [];
        chartData.social_media = [];
        chartData.food = [];
        chartData.exercise = [];
        chartData.work = [];
        chartData.isolation = [];
        chartData.substance = [];
        chartData.procrastination = [];

        filteredEntries.forEach(entry => {
            const date = new Date(entry.timestamp);
            dates.push(date);
            
            if (entry.classification && entry.classification.urges && entry.classification.urges.urges) {
                // Map urge values to the chart data
                const urges = {
                    shopping: entry.classification.urges.urges.Shopping || 0,
                    social_media: entry.classification.urges.urges.Social_Media || 0,
                    food: entry.classification.urges.urges.Food || 0,
                    exercise: entry.classification.urges.urges.Exercise || 0,
                    work: entry.classification.urges.urges.Work || 0,
                    isolation: entry.classification.urges.urges.Isolation || 0,
                    substance: entry.classification.urges.urges.Substance || 0,
                    procrastination: entry.classification.urges.urges.Procrastination || 0
                };
                
                Object.keys(chartData).forEach(urge => {
                    chartData[urge].push({
                        date: date,
                        value: urges[urge]
                    });
                });
            }
        });
    } else {
        // Initialize emotion data
        chartData.joy = [];
        chartData.sadness = [];
        chartData.anger = [];
        chartData.fear = [];
        chartData.surprise = [];
        chartData.disgust = [];

        filteredEntries.forEach(entry => {
            const date = new Date(entry.timestamp);
            dates.push(date);
            
            if (entry.classification) {
                // Map emotion values to the chart data, handling both cases (Joy/joy)
                const emotionData = entry.classification.emotion || entry.classification;
                
                if (emotionData) {
                    const emotions = {
                        joy: emotionData.joy || emotionData.Joy || 0,
                        sadness: emotionData.sadness || emotionData.Sadness || 0,
                        anger: emotionData.anger || emotionData.Anger || 0,
                        fear: emotionData.fear || emotionData.Fear || 0,
                        surprise: emotionData.surprise || emotionData.Surprise || 0,
                        disgust: emotionData.disgust || emotionData.Disgust || 0
                    };
                    
                    Object.keys(chartData).forEach(emotion => {
                        chartData[emotion].push({
                            date: date,
                            value: emotions[emotion]
                        });
                    });
                }
            }
        });
    }

    // Set up chart dimensions
    const margin = { top: 20, right: 80, bottom: 30, left: 50 };
    const width = 650 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Clear previous chart if any
    container.innerHTML = '';

    // Create SVG container
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define scales
    const x = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(x)
        .ticks(Math.min(dates.length, 7))
        .tickFormat(d3.timeFormat('%m/%d'));

    const yAxis = d3.axisLeft(y)
        .ticks(5);

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis.tickSize(-height).tickFormat(''));

    svg.append('g')
        .attr('class', 'grid')
        .call(yAxis.tickSize(-width).tickFormat(''));

    // Define line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

    // Define colors based on type
    const colors = showUrges ? {
        shopping: '#ff69b4',      // Hot Pink
        social_media: '#3b5998',  // Facebook Blue
        food: '#ffb347',          // Orange
        exercise: '#2ecc71',      // Green
        work: '#800080',          // Purple
        isolation: '#a9a9a9',     // Gray
        substance: '#a52a2a',     // Brown
        procrastination: '#ffa500' // Orange
    } : {
        joy: '#ffc107',     // yellow
        sadness: '#0d6efd', // blue
        anger: '#dc3545',   // red
        fear: '#6610f2',    // purple
        surprise: '#fd7e14', // orange
        disgust: '#198754'  // green
    };

    // Add lines for each data series
    Object.keys(chartData).forEach(key => {
        if (chartData[key].length) {
            svg.append('path')
                .datum(chartData[key])
                .attr('class', 'line')
                .attr('d', line)
                .style('stroke', colors[key]);
                
            // Add dots for data points
            svg.selectAll(`dot-${key}`)
                .data(chartData[key])
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('cx', d => x(d.date))
                .attr('cy', d => y(d.value))
                .attr('r', 3)
                .style('fill', colors[key]);
        }
    });

    // Add x-axis
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

    // Add y-axis
    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(showUrges ? 'Urge Intensity' : 'Emotion Intensity');

    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 5}, 0)`);

    Object.keys(colors).forEach((key, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', colors[key]);

        legendRow.append('text')
            .attr('x', 15)
            .attr('y', 10)
            .text(key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '))
            .style('font-size', '10px');
    });
}

/**
 * Format a date as MM/DD/YYYY
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Count journal entries on a specific date
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {number} - Number of entries on that date
 */
function countEntriesOnDate(dateStr) {
    if (!userJournalHistory) return 0;
    
    return userJournalHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split("T")[0];
        return entryDate === dateStr;
    }).length;
}

/**
 * Calculate calendar data for a given year and month
 * @param {number} year - Year to calculate calendar for
 * @param {number} month - Month to calculate calendar for (0-11)
 * @returns {Array} - Array of weeks, each containing 7 days
 */
function calculateCalendar(year, month = null) {
    // If month is null, show full year
    if (month === null) {
    const firstDay = new Date(year, 0, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOffset = dayOfWeek; // Days to subtract to reach previous Sunday

    const lastDay = new Date(year, 11, 31);
    const endDayOfWeek = lastDay.getDay();
    const endOffset = 6 - endDayOfWeek; // Days to add to reach next Saturday

    // Total days including offsets
    const daysInYear = (lastDay - firstDay) / (1000 * 60 * 60 * 24) + 1;
    const totalDays = daysInYear + startOffset + endOffset;

    // Start date is first Sunday on or before January 1
    const startDate = new Date(year, 0, 1 - startOffset);

    // Generate all dates
    const dates = [];
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date);
    }

    // Group into weeks
    const weeks = [];
    for (let i = 0; i < dates.length; i += 7) {
        weeks.push(dates.slice(i, i + 7));
    }

        return weeks;
    } else {
        // For month view
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        // Start from the last Sunday before the first day of the month
        const startOffset = firstDayOfMonth.getDay();
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(1 - startOffset);
        
        // End with the first Saturday after the last day of the month
        const endOffset = 6 - lastDayOfMonth.getDay();
        
        // Calculate total days to show (including days from adjacent months)
        const totalDays = lastDayOfMonth.getDate() + startOffset + endOffset;
        
        // Generate all dates
        const dates = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
        }
        
        // Group into weeks
        const weeks = [];
        for (let i = 0; i < dates.length; i += 7) {
            weeks.push(dates.slice(i, i + 7));
        }

    return weeks;
}
}

/**
 * Checks the mood/urge score for a specific date
 * @param {Date} date The date to check
 * @returns {string} The RGB color value 
 */
function checkMoodScore(date) {
    // Always get the most current display type from the dropdown
    const displayType = document.getElementById('displayType').value;
    const showUrges = displayType === "urges";
    
    // Get the current color metric
    const colorMetric = document.getElementById('colorMetric').value || 'combined';
    
    // Find entries for this date
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    // Format date string for cache key
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Check if we have this date in our cache
    if (!dailyMoodAverages[dateStr]) {
        // Not in cache, calculate averages for this date
        
        if (!userJournalHistory || userJournalHistory.length === 0) {
            return 'rgb(240, 240, 240)'; // Light gray for no data
        }
        
        const entriesForDate = userJournalHistory.filter(entry => {
            if (!entry || !entry.timestamp) return false;
            const entryDate = new Date(entry.timestamp);
            if (isNaN(entryDate.getTime())) return false; // Skip invalid dates
            return entryDate >= dateStart && entryDate <= dateEnd;
        });
        
        if (entriesForDate.length === 0) {
            return 'rgb(240, 240, 240)'; // Light gray for no data
        }
        
        // Initialize data objects
        let emotionValues = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0
        };
        
        let urgeValues = {
            shopping: 0,
            socialmedia: 0, // Note: using camelCase here to match our color keys
            food: 0,
            exercise: 0,
            work: 0,
            isolation: 0,
            substance: 0,
            procrastination: 0
        };
        
        let emotionCount = 0;
        let urgeCount = 0;
        
        // Calculate averages
        entriesForDate.forEach(entry => {
            if (entry.classification) {
                // Process emotions
                const emotionData = entry.classification.emotion || entry.classification;
                
                if (emotionData) {
                    emotionCount++;
                    
                    // Add up emotion values, checking both cases (Joy/joy)
                    emotionValues.joy += emotionData.joy || emotionData.Joy || 0;
                    emotionValues.sadness += emotionData.sadness || emotionData.Sadness || 0;
                    emotionValues.anger += emotionData.anger || emotionData.Anger || 0;
                    emotionValues.fear += emotionData.fear || emotionData.Fear || 0;
                    emotionValues.surprise += emotionData.surprise || emotionData.Surprise || 0;
                    emotionValues.disgust += emotionData.disgust || emotionData.Disgust || 0;
                }
                
                // Process urges
                if (entry.classification.urges && entry.classification.urges.urges) {
                    urgeCount++;
                    const urges = entry.classification.urges.urges;
                    
                    // Map urge values
                    urgeValues.shopping += urges.Shopping || 0;
                    urgeValues.socialmedia += urges.Social_Media || 0; // Note: different naming format
                    urgeValues.food += urges.Food || 0;
                    urgeValues.exercise += urges.Exercise || 0;
                    urgeValues.work += urges.Work || 0;
                    urgeValues.isolation += urges.Isolation || 0;
                    urgeValues.substance += urges.Substance || 0;
                    urgeValues.procrastination += urges.Procrastination || 0;
                }
            }
        });
        
        // Calculate averages for emotions
        if (emotionCount > 0) {
            Object.keys(emotionValues).forEach(key => {
                emotionValues[key] = emotionValues[key] / emotionCount;
            });
        }
        
        // Calculate averages for urges
        if (urgeCount > 0) {
            Object.keys(urgeValues).forEach(key => {
                urgeValues[key] = urgeValues[key] / urgeCount;
            });
        }
        
        // Store in cache
        dailyMoodAverages[dateStr] = {
            emotions: emotionValues,
            urges: urgeValues
        };
    }
    
    // Get values from cache
    const moodData = dailyMoodAverages[dateStr];
    
    // Define colors
    const emotionColors = {
        joy: 'rgb(255, 193, 7)', // Yellow
        sadness: 'rgb(13, 110, 253)', // Blue
        anger: 'rgb(220, 53, 69)', // Red
        fear: 'rgb(102, 16, 242)', // Purple
        surprise: 'rgb(253, 126, 20)', // Orange
        disgust: 'rgb(25, 135, 84)' // Green
    };
    
    const urgeColors = {
        shopping: 'rgb(255, 105, 180)', // Hot Pink
        socialmedia: 'rgb(59, 89, 152)', // Facebook Blue
        food: 'rgb(255, 179, 71)', // Orange
        exercise: 'rgb(46, 204, 113)', // Green
        work: 'rgb(128, 0, 128)', // Purple
        isolation: 'rgb(169, 169, 169)', // Gray
        substance: 'rgb(165, 42, 42)', // Brown
        procrastination: 'rgb(255, 165, 0)' // Orange
    };
    
    // Use the appropriate data set based on the display type
    const values = showUrges ? moodData.urges : moodData.emotions;
    const colors = showUrges ? urgeColors : emotionColors;
    
    // Determine color based on selected metric
    if (colorMetric === "combined") {
        // Find the highest emotion/urge
        let highest = null;
        let highestValue = 0;
        
        Object.entries(values).forEach(([key, value]) => {
            if (value > highestValue) {
                highestValue = value;
                highest = key;
            }
        });
        
        // If no significant value, return light gray
        if (!highest || highestValue < 5) {
            return 'rgb(240, 240, 240)';
        }
        
        // Return color based on the highest value with opacity based on intensity
        const opacity = Math.max(0.1, Math.min(0.9, highestValue / 100));
        const baseColor = colors[highest];
        if (!baseColor) {
            console.error(`No color found for ${highest} in ${showUrges ? 'urges' : 'emotions'}`);
            return 'rgb(240, 240, 240)';
        }
        
        const rgbColor = baseColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        return rgbColor;
    } else {
        // Check if the selected metric is valid for this display type
        if (!colors[colorMetric]) {
            // This shouldn't happen since we reset metric on type change, but just in case
            console.warn(`Invalid color metric ${colorMetric} for ${showUrges ? 'urges' : 'emotions'}`);
            return 'rgb(240, 240, 240)';
        }
        
        // Return color for specific emotion/urge with opacity based on intensity
        const value = values[colorMetric] || 0;
        const opacity = Math.max(0.1, Math.min(0.9, value / 100));
        const rgbColor = colors[colorMetric].replace('rgb', 'rgba').replace(')', `, ${opacity})`);
        return rgbColor;
    }
}

/**
 * Build calendar visualization with D3
 */
function buildCalenderWithD3() {
    console.log("Building calendar with D3...");
    
    try {
        // Check if displayType dropdown exists, create it if needed
        let displayTypeDropdown = document.getElementById('displayType');
        if (!displayTypeDropdown) {
            console.warn("Display type dropdown not found in buildCalenderWithD3, creating one");
            
            // Look for a container element
            const mainContainer = document.querySelector('.container') || document.body;
            
            // Create display type controls
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'form-group mb-3';
            
            const label = document.createElement('label');
            label.htmlFor = 'displayType';
            label.textContent = 'Display:';
            label.className = 'me-2';
            
            displayTypeDropdown = document.createElement('select');
            displayTypeDropdown.id = 'displayType';
            displayTypeDropdown.className = 'form-select form-select-sm d-inline-block';
            displayTypeDropdown.style.width = 'auto';
            
            // Add options
            const emotionsOption = document.createElement('option');
            emotionsOption.value = 'emotions';
            emotionsOption.textContent = 'Emotions';
            emotionsOption.selected = true;
            
            const urgesOption = document.createElement('option');
            urgesOption.value = 'urges';
            urgesOption.textContent = 'Urges';
            
            displayTypeDropdown.appendChild(emotionsOption);
            displayTypeDropdown.appendChild(urgesOption);
            
            controlsDiv.appendChild(label);
            controlsDiv.appendChild(displayTypeDropdown);
            
            // Add to the page
            mainContainer.insertBefore(controlsDiv, mainContainer.firstChild);
            
            // Add event listener for the display type dropdown
            displayTypeDropdown.addEventListener('change', function() {
                console.log("Display type changed to:", this.value);
                // Mark that the user has manually selected this option
                this.dataset.userSelected = 'true';
            });
        }
        
        // Check if the calendar container exists, create it if needed
        let calendarContainer = document.getElementById('calendar');
        if (!calendarContainer) {
            console.warn("Calendar container not found in buildCalenderWithD3, creating one");
            
            // Look for a container element where we should add the calendar
            const mainContainer = document.querySelector('.container') || document.body;
            
            calendarContainer = document.createElement('div');
            calendarContainer.id = 'calendar';
            calendarContainer.className = 'calendar-container mt-4';
            
            // Find where to insert the calendar in the DOM
            const weekOverview = document.getElementById('week-overview');
            if (weekOverview) {
                // Insert before the week overview
                weekOverview.parentNode.insertBefore(calendarContainer, weekOverview);
            } else {
                // Just append to the main container
                mainContainer.appendChild(calendarContainer);
            }
        }
        
        // Use d3 to select the container
        const calendar = d3.select("#calendar");
        calendar.html(""); // Clear previous content
        
        // Always get the current display type directly from the dropdown
        const displayType = displayTypeDropdown.value;
        const showUrges = displayType === "urges";
        console.log("Building calendar for display type:", displayType);
        
        // Calculate calendar data for the three months
        const allWeeks = [];
        
        // Calculate weeks for each of the three months
        for (let i = 0; i < 3; i++) {
            const month = displayMonths[i];
            
            // Handle year transition (Dec-Jan)
            let actualYear = currentYear;
            if (i === 2 && month === 0) actualYear++; // Next year for January when December is middle month
            if (i === 0 && month === 11) actualYear--; // Previous year for December when January is middle month
            
            const monthWeeks = calculateCalendar(actualYear, month);
            
            // Add month information to each week for rendering
            monthWeeks.forEach(week => {
                week.monthIndex = i;
                week.monthNumber = month;
                week.year = actualYear;
            });
            
            allWeeks.push(...monthWeeks);
        }
        
        // Create calendar controls
        const controlsDiv = calendar.append("div")
            .attr("class", "d-flex justify-content-between align-items-center mb-3");
        
        // Left controls (prev month/year)
        const leftControls = controlsDiv.append("div")
            .attr("class", "btn-group");
        
        leftControls.append("button")
            .attr("class", "btn btn-outline-secondary btn-sm")
            .attr("id", "prevYearBtn")
            .html('<i class="bi bi-chevron-double-left"></i>')
            .attr("title", "Previous Year")
            .on("click", previousYear);
            
        leftControls.append("button")
            .attr("class", "btn btn-outline-secondary btn-sm")
            .attr("id", "prevMonthBtn")
            .html('<i class="bi bi-chevron-left"></i>')
            .attr("title", "Previous Three Months")
            .on("click", previousMonth);
        
        // Center title
        controlsDiv.append("h5")
            .attr("class", "mb-0 text-center")
            .attr("id", "calendarTitle");
        
        // Set the calendar title with all three months
        updateCalendarTitle();
        
        // Right controls (next month/year)
        const rightControls = controlsDiv.append("div")
            .attr("class", "btn-group");
            
        rightControls.append("button")
            .attr("class", "btn btn-outline-secondary btn-sm")
            .attr("id", "nextMonthBtn")
            .html('<i class="bi bi-chevron-right"></i>')
            .attr("title", "Next Three Months")
            .on("click", nextMonth);
            
        rightControls.append("button")
            .attr("class", "btn btn-outline-secondary btn-sm")
            .attr("id", "nextYearBtn")
            .html('<i class="bi bi-chevron-double-right"></i>')
            .attr("title", "Next Year")
            .on("click", nextYear);
        
        // Create color metric selector
        const selectorDiv = calendar.append("div")
            .attr("class", "mb-3");
        
        selectorDiv.append("label")
            .attr("for", "colorMetricSelect")
            .attr("class", "form-label")
            .text(showUrges ? "Color calendar by urge:" : "Color calendar by emotion:");
        
        const select = selectorDiv.append("select")
            .attr("class", "form-select form-select-sm")
            .attr("id", "colorMetricSelect")
            .on("change", handleColorMetricChange);
        
        // Create a hidden input field to store the selected color metric
        // This allows us to preserve the selection when switching between emotions/urges
        if (!document.getElementById('colorMetric')) {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'colorMetric';
            hiddenInput.value = selectedColorMetric;
            document.body.appendChild(hiddenInput);
        } else {
            document.getElementById('colorMetric').value = selectedColorMetric;
        }
        
        // Add options based on display type
        let options = [];
        
        if (showUrges) {
            // Urge options
            options = [
                { value: "combined", text: "Combined Urges" },
                { value: "shopping", text: "Shopping" },
                { value: "socialmedia", text: "Social Media" }, // Note the change from social_media to socialmedia to match our key
                { value: "food", text: "Food" },
                { value: "exercise", text: "Exercise" },
                { value: "work", text: "Work" },
                { value: "isolation", text: "Isolation" },
                { value: "substance", text: "Substance" },
                { value: "procrastination", text: "Procrastination" }
            ];
        } else {
            // Emotion options
            options = [
                { value: "combined", text: "Combined Emotions" },
                { value: "joy", text: "Joy" },
                { value: "sadness", text: "Sadness" },
                { value: "anger", text: "Anger" },
                { value: "fear", text: "Fear" },
                { value: "surprise", text: "Surprise" },
                { value: "disgust", text: "Disgust" }
            ];
        }
        
        // Reset selectedColorMetric if it's not valid for the current display type
        let validMetric = false;
        for (const option of options) {
            if (option.value === selectedColorMetric) {
                validMetric = true;
                break;
            }
        }
        
        if (!validMetric) {
            console.log(`Color metric ${selectedColorMetric} invalid for ${displayType}, resetting to combined`);
            selectedColorMetric = "combined";
            document.getElementById('colorMetric').value = selectedColorMetric;
        }
        
        options.forEach(option => {
            select.append("option")
                .attr("value", option.value)
                .text(option.text)
                .property("selected", option.value === selectedColorMetric);
        });
        
        // Create a container for all three month calendars
        const threeMonthContainer = calendar.append("div")
            .attr("class", "three-month-container");
            
        // Group weeks by month
        const monthGroups = d3.group(allWeeks, d => d.monthIndex);
        
        // Create each month calendar
        monthGroups.forEach((monthWeeks, monthIndex) => {
            const monthContainer = threeMonthContainer.append("div")
                .attr("class", "month-container");
                
            // Add month header
            monthContainer.append("h6")
                .attr("class", "text-center mt-2 mb-2")
                .text(getMonthName(displayMonths[monthIndex]));
                
            // Create a calendar grid for this month
            const calendarContainer = monthContainer.append("div")
                .attr("class", "calendar-grid");
        
            // Add day labels (Sun-Sat)
            const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const headerRow = calendarContainer.append("div")
                .attr("class", "calendar-row calendar-header");
                
            dayLabels.forEach(day => {
                headerRow.append("div")
                    .attr("class", "calendar-cell calendar-header-cell")
                    .text(day);
            });

            // Create rows for each week
            const rows = calendarContainer.selectAll(".calendar-week")
                .data(monthWeeks)
                .enter()
                .append("div")
                .attr("class", "calendar-row d-flex")
                .on("click", function(event, d) {
                    // Clear any previously selected weeks across all calendars
                    d3.selectAll(".calendar-row").classed("selected-week", false);
                    
                    // Highlight the selected week
                    d3.select(this).classed("selected-week", true);
                    
                    // Show week overview
                    const startDate = d[0];  // First day of the week
                    const endDate = d[6];    // Last day of the week
                    showWeekOverview(startDate, endDate);
                    
                    // Log for debugging
                    console.log("Selected week from", formatDate(startDate), "to", formatDate(endDate));
                });

            // Create cells for each day within each row
            rows.each(function(week) {
                d3.select(this)
                    .selectAll(".calendar-cell")
                    .data(week)
                    .enter()
                    .append("div")
                    .attr("class", d => {
                        // Current month or outside month class
                        const inDisplayedMonth = d.getMonth() === displayMonths[monthIndex];
                        return `calendar-cell ${inDisplayedMonth ? "current-month" : "outside-month"}`;
                    })
                    .text(function(d) { return d.getDate(); })
                    .style("background-color", function(d) {
                        try {
                            // Double check we're using the current display type
                            return checkMoodScore(d);
                        } catch (e) {
                            console.error("Error getting color for date:", d, e);
                            return 'rgb(240, 240, 240)'; // Light gray as fallback on error
                        }
                    })
                    .attr("data-display-type", displayType) // Store the display type used
                    .on("mouseover", function(event, d) {
                        // Show date on hover
                        d3.select(this).attr("title", formatDate(d));
                    });
            });
        });
        
        // Add legend based on selected metric
        addColorLegend();
        
        // Show the first week by default if available
        if (allWeeks.length > 0) {
            // Get the first day and last day of the first week
            const startDate = allWeeks[0][0];
            const endDate = allWeeks[0][6];
            
            console.log("Showing default week overview:", 
                      startDate.toDateString(), "to", endDate.toDateString());
            
            // Use setTimeout to ensure the calendar is fully rendered before updating the overview
            setTimeout(() => {
                try {
                    showWeekOverview(startDate, endDate);
                } catch (error) {
                    console.error("Error showing week overview:", error);
                    showNotification("Error showing week overview: " + error.message, "error");
                }
            }, 100);
        } else {
            console.warn("No calendar weeks generated");
        }
        
        console.log("Calendar building complete");
    } catch (error) {
        console.error("Error building calendar:", error);
        const calendar = d3.select("#calendar");
        calendar.html(`<div class="alert alert-danger">Error building calendar: ${error.message}</div>`);
    }
}

/**
 * Adds the color legend to explain what colors mean in the calendar
 */
function addColorLegend() {
    // Check if legend container exists, create it if needed
    let legendContainer = document.getElementById('colorLegend');
    if (!legendContainer) {
        console.warn("Legend container not found, creating one");
        
        // Look for a container to add the legend to
        const calendarContainer = document.getElementById('calendar');
        const mainContainer = document.querySelector('.container') || document.body;
        
        legendContainer = document.createElement('div');
        legendContainer.id = 'colorLegend';
        legendContainer.className = 'color-legend-container mt-3';
        
        // Add the legend near the calendar
        if (calendarContainer) {
            calendarContainer.parentNode.insertBefore(legendContainer, calendarContainer.nextSibling);
        } else {
            mainContainer.appendChild(legendContainer);
        }
    }
    
    legendContainer.innerHTML = '';
    
    // Get the display type from the dropdown
    const displayType = document.getElementById('displayType').value;
    const showUrges = displayType === "urges";
    
    // Get current color metric
    const colorMetric = document.getElementById('colorMetric').value;
    
    // Create legend title
    const title = document.createElement('h6');
    title.textContent = 'Color Legend';
    title.className = 'mt-2 mb-3';
    legendContainer.appendChild(title);
    
    // Create color items container
    const colorItems = document.createElement('div');
    colorItems.className = 'color-legend-items';
    
    // Define color data based on display type
    const colorData = showUrges ? [
        { label: 'Shopping', key: 'shopping', color: 'rgb(255, 105, 180)' },
        { label: 'Social Media', key: 'socialmedia', color: 'rgb(59, 89, 152)' },
        { label: 'Food', key: 'food', color: 'rgb(255, 179, 71)' },
        { label: 'Exercise', key: 'exercise', color: 'rgb(46, 204, 113)' },
        { label: 'Work', key: 'work', color: 'rgb(128, 0, 128)' },
        { label: 'Isolation', key: 'isolation', color: 'rgb(169, 169, 169)' },
        { label: 'Substance', key: 'substance', color: 'rgb(165, 42, 42)' },
        { label: 'Procrastination', key: 'procrastination', color: 'rgb(255, 165, 0)' }
    ] : [
        { label: 'Joy', key: 'joy', color: 'rgb(255, 193, 7)' },
        { label: 'Sadness', key: 'sadness', color: 'rgb(13, 110, 253)' },
        { label: 'Anger', key: 'anger', color: 'rgb(220, 53, 69)' },
        { label: 'Fear', key: 'fear', color: 'rgb(102, 16, 242)' },
        { label: 'Surprise', key: 'surprise', color: 'rgb(253, 126, 20)' },
        { label: 'Disgust', key: 'disgust', color: 'rgb(25, 135, 84)' }
    ];
    
    // Add "No Data" option to the end of the array
    colorData.push({ label: 'No Data', key: 'no_data', color: 'rgb(240, 240, 240)' });
    
    // Add color items to the legend
    colorData.forEach(item => {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        
        // Mark the currently selected metric
        if (colorMetric === item.key) {
            colorBox.style.border = '2px solid #333';
        }
        
        // Set the color
        colorBox.style.backgroundColor = item.color;
        
        const label = document.createElement('span');
        label.textContent = item.label;
        
        // Make items clickable to select that color metric (except "No Data")
        if (item.key !== 'no_data') {
            colorItem.style.cursor = 'pointer';
            colorItem.addEventListener('click', () => {
                // Update hidden input
                document.getElementById('colorMetric').value = item.key;
                // Update dropdown
                document.getElementById('colorMetricSelect').value = item.key;
                // Update selected color metric
                selectedColorMetric = item.key;
                // Refresh calendar
                refreshCalendar();
            });
        }
        
        colorItem.appendChild(colorBox);
        colorItem.appendChild(label);
        colorItems.appendChild(colorItem);
    });
    
    legendContainer.appendChild(colorItems);
    
    // Add "Combined View" button at the bottom if not already selected
    if (colorMetric !== 'combined') {
        const showAllButton = document.createElement('button');
        showAllButton.className = 'btn btn-sm btn-outline-secondary mt-2';
        showAllButton.textContent = 'Show Combined View';
        showAllButton.addEventListener('click', () => {
            // Update hidden input
            document.getElementById('colorMetric').value = 'combined';
            // Update dropdown
            document.getElementById('colorMetricSelect').value = 'combined';
            // Update selected color metric
            selectedColorMetric = 'combined';
            // Refresh calendar
            refreshCalendar();
        });
        legendContainer.appendChild(showAllButton);
    }
    
    // Add CSS for the legend elements
    if (!document.getElementById('legendStyles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'legendStyles';
        styleEl.textContent = `
            .color-legend-items {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 15px;
            }
            .color-legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 3px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .color-legend-item:hover {
                background-color: rgba(0,0,0,0.05);
            }
            .color-box {
                width: 16px;
                height: 16px;
                border-radius: 3px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
        `;
        document.head.appendChild(styleEl);
    }
}

/**
 * Show detailed view of an entry (placeholder for future implementation)
 * @param {Object} entry - The journal entry to display
 */
function showEntryDetail(entry) {
    // This would typically show a modal with the full entry
    // For now, we'll just show a notification
    showNotification(`Viewing: ${entry.title}`, "info");
    
    // Future implementation could include a modal dialog
    // or a redirection to a detail page
}

/**
 * Initializes the journal history view
 */
function initHistory() {
    // Show loading indicator
    document.getElementById('loadingIndicator').style.display = 'block';
    
    // Get username
    const username = document.getElementById('historyUsername').value;
    
    if (!username) {
        showNotification('Please enter a username', 'error');
        document.getElementById('loadingIndicator').style.display = 'none';
        return;
    }
    
    // Load journal history for the user
    getJournalHistoryForUser(username)
        .then(() => {
            // Initialize the three-month calendar
            initThreeMonthCalendar();
            
            // Add event listeners for the metrics dropdown
            document.getElementById('colorMetric').addEventListener('change', function() {
                // Update the selected color metric
                selectedColorMetric = this.value;
                
                // Refresh the calendar with the new metric
                refreshCalendar();
                
                // Update the color legend
                addColorLegend();
            });
            
            // Add event listener for the display type dropdown
            const displayTypeDropdown = document.getElementById('displayType');
            displayTypeDropdown.addEventListener('change', function() {
                // Mark that the user has manually selected this option
                this.dataset.userSelected = 'true';
                const newDisplayType = this.value;
                console.log("User selected display type:", newDisplayType);
                
                try {
                    // Reset the daily mood averages cache - IMPORTANT!
                    dailyMoodAverages = {};
                    console.log("Cleared daily mood averages cache for new display type");
                    
                    // Show a loading message in the calendar area
                    const calendarEl = document.getElementById('calendar');
                    if (calendarEl) {
                        calendarEl.innerHTML = '<div class="text-center p-3">Updating calendar for ' + 
                            (newDisplayType === 'urges' ? 'urges' : 'emotions') + '...</div>';
                    }
                    
                    // Store current selected week dates before refreshing calendar
                    let startDate, endDate;
                    const selectedDates = document.querySelectorAll('.calendar-row.selected-week');
                    
                    if (selectedDates.length > 0) {
                        // Get all cell dates from the selected week row
                        const allDates = [];
                        selectedDates.forEach(row => {
                            const cells = row.querySelectorAll('.calendar-cell');
                            cells.forEach(cell => {
                                if (cell.title) {
                                    const cellDate = new Date(cell.title);
                                    if (!isNaN(cellDate.getTime())) { // Ensure it's a valid date
                                        allDates.push(cellDate);
                                    }
                                }
                            });
                        });
                        
                        if (allDates.length > 0) {
                            // Sort dates and take first and last
                            allDates.sort((a, b) => a - b);
                            startDate = allDates[0];
                            endDate = allDates[allDates.length - 1];
                            console.log("Saved selected week:", startDate.toDateString(), "to", endDate.toDateString());
                        }
                    }
                    
                    // Reset color metric to "combined" when switching display types to ensure it's valid
                    document.getElementById('colorMetric').value = "combined";
                    selectedColorMetric = "combined";
                    
                    // Force a complete rebuild - clear all caches and reconstructed data
                    console.log("Forcing complete calendar rebuild for display type:", newDisplayType);
                    
                    // Use a small delay to ensure the DOM updates before rebuilding
                    setTimeout(() => {
                        try {
                            // Completely refresh the calendar
                            refreshCalendar();
                            
                            // Update the color legend
                            addColorLegend();
                            
                            // If we had a selected week, restore it after calendar is rebuilt
                            if (startDate && endDate) {
                                console.log("Restoring selected week:", startDate.toDateString(), "to", endDate.toDateString());
                                
                                // Find and select the week that contains our start date
                                setTimeout(() => {
                                    try {
                                        const weekRows = document.querySelectorAll('.calendar-row:not(.calendar-header)');
                                        let foundRow = false;
                                        
                                        // Try to find the exact week
                                        weekRows.forEach(row => {
                                            if (foundRow) return;
                                            
                                            const cells = row.querySelectorAll('.calendar-cell');
                                            for (let i = 0; i < cells.length; i++) {
                                                const cell = cells[i];
                                                if (cell.title) {
                                                    const cellDate = new Date(cell.title);
                                                    if (cellDate.toDateString() === startDate.toDateString()) {
                                                        // Found our week - select it
                                                        row.classList.add('selected-week');
                                                        foundRow = true;
                                                        
                                                        // Now show the week overview for this week
                                                        showWeekOverview(startDate, endDate);
                                                        break;
                                                    }
                                                }
                                            }
                                        });
                                        
                                        // If we couldn't find the exact week, just use the saved dates
                                        if (!foundRow && startDate && endDate) {
                                            console.log("Could not find exact week row, using saved dates directly");
                                            showWeekOverview(startDate, endDate);
                                        }
                                    } catch (innerError) {
                                        console.error("Error restoring week selection:", innerError);
                                        // Use saved dates as fallback
                                        if (startDate && endDate) {
                                            showWeekOverview(startDate, endDate);
                                        }
                                    }
                                }, 200); // Delay to ensure calendar is fully rendered
                            }
                        } catch (refreshError) {
                            console.error("Error during calendar refresh:", refreshError);
                            showNotification("Error updating calendar: " + refreshError.message, "error");
                        }
                    }, 50); // Short delay to ensure DOM updates
                } catch (error) {
                    console.error("Error updating view after display type change:", error);
                    showNotification("Error updating view: " + error.message, "error");
                }
            });
            
            // Hide loading indicator
            document.getElementById('loadingIndicator').style.display = 'none';
        })
        .catch(error => {
            console.error('Error initializing history:', error);
            showNotification('Failed to load journal history: ' + error.message, 'error');
            document.getElementById('loadingIndicator').style.display = 'none';
    });
}

/**
 * Initialize the three-month calendar view
 * @returns {Promise} - Promise that resolves when the calendar is created
 */
function initThreeMonthCalendar() {
    console.log("Initializing three-month calendar");
    
    // Get calendar container
    const container = d3.select("#three-month-calendar");
    container.html("");
    
    if (!userJournalHistory) {
        console.log("No user journal history available for calendar");
        return Promise.reject("No user journal history");
    }
    
    // Calculate calendar size based on available space
    const containerWidth = document.getElementById("three-month-calendar").clientWidth;
    const calendarWidth = Math.min(containerWidth / 3 - 10, 300);
    
    // Create start of current month date
    const now = new Date();
    
    // For demo purposes, if the URL has a date parameter, use that
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    let currentDate;
    if (dateParam) {
        currentDate = new Date(dateParam);
    } else {
        currentDate = now;
    }
    
    // For March 2025 bipolar demo
    if (currentDate.getFullYear() === 2025 && currentDate.getMonth() === 2) {
        console.log("Using March 2025 for bipolar demo");
    }
    
    // Create a date for the start of the month (1st)
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Create calendars for previous, current, and next month
    const prevMonth = new Date(startOfMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    
    const nextMonth = new Date(startOfMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Store the calendar start date for reference (for week selection)
    calendarStartDate = new Date(prevMonth);
    
    // Create three month calendars
    createCalendarMonth(container, prevMonth, calendarWidth, "Previous Month");
    createCalendarMonth(container, startOfMonth, calendarWidth, "Current Month");
    createCalendarMonth(container, nextMonth, calendarWidth, "Next Month");
    
    // Add color legend outside the three-month calendar
    addColorLegend();
    
    // Select the first week of the current month by default
    const firstDayOfMonth = new Date(startOfMonth);
    const lastDayOfWeek = new Date(firstDayOfMonth);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + (6 - firstDayOfMonth.getDay()));
    
    // Initially show the first week of the current month
    showWeekOverview(startOfMonth, lastDayOfWeek);
        
        return Promise.resolve();
}

/**
 * Create a calendar for a specific month
 * @param {Object} container - D3 selection of the container
 * @param {Date} monthDate - Date object for the month to display
 * @param {number} width - Width of the calendar
 * @param {string} title - Optional title for the month
 */
function createCalendarMonth(container, monthDate, width, title) {
    // Create a container for this month
    const monthContainer = container.append("div")
        .attr("class", "calendar-container")
        .style("width", `${width}px`);
    
    // Add month title
    monthContainer.append("h5")
        .attr("class", "text-center my-2")
        .text(getMonthName(monthDate.getMonth()) + ' ' + monthDate.getFullYear());
    
    // Calculate calendar data for this month
    const weeks = calculateCalendar(monthDate.getFullYear(), monthDate.getMonth());
    
    // Create calendar grid
    const calendarGrid = monthContainer.append("div")
        .attr("class", "calendar-grid");
    
    // Add day labels (Sun-Sat)
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const headerRow = calendarGrid.append("div")
        .attr("class", "calendar-row calendar-header");
        
    dayLabels.forEach(day => {
        headerRow.append("div")
            .attr("class", "calendar-cell calendar-header-cell")
            .text(day);
    });
    
    // Create calendar rows for each week
    const calendarRows = calendarGrid.selectAll(".calendar-week")
        .data(weeks)
        .enter()
        .append("div")
        .attr("class", "calendar-row")
        .on("click", function(event, d) {
            // Clear any previously selected weeks across all calendars
            d3.selectAll(".calendar-row").classed("selected-week", false);
            
            // Highlight the selected week
            d3.select(this).classed("selected-week", true);
            
            // Show week overview
            showWeekOverview(d[0], d[6]);
            
            // Log for debugging
            console.log("Selected week from", formatDate(d[0]), "to", formatDate(d[6]));
        });
    
    // Create cells for each day
    calendarRows.each(function(week) {
        const row = d3.select(this);
        
        week.forEach(day => {
            // Is this day in the displayed month?
            const inCurrentMonth = day.getMonth() === monthDate.getMonth();
            
            row.append("div")
                .attr("class", `calendar-cell ${inCurrentMonth ? "current-month" : "outside-month"}`)
                .text(day.getDate())
                .style("background-color", checkMoodScore(day))
                .attr("title", formatDate(day));
        });
    });
    
    return monthContainer;
}