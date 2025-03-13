// Navigation link handler
document.addEventListener('DOMContentLoaded', function() {
    // Home navigation
    d3.select('#navHome').on('click', function(event) {
        event.preventDefault();
        d3.selectAll('.nav-link').classed('active', false);
        d3.select(this).classed('active', true);
        d3.select('#journalEntryContainer').classed('d-none', false);
        d3.select('#journalHistoryContainer').classed('d-none', true);
        d3.select('#activitiesContainer').classed('d-none', true);
        d3.select('#settingsContainer').classed('d-none', true);
    });

    // History navigation
    d3.select('#navHistory').on('click', function(event) {
        event.preventDefault();
        d3.selectAll('.nav-link').classed('active', false);
        d3.select(this).classed('active', true);
        
        // Show the history container first to avoid layout jump
        d3.select('#journalEntryContainer').classed('d-none', true);
        d3.select('#journalHistoryContainer').classed('d-none', false);
        d3.select('#activitiesContainer').classed('d-none', true);
        d3.select('#settingsContainer').classed('d-none', true);
        
        // Copy username from entry form to history form if it exists
        const username = d3.select('#username').property('value');
        if (username) {
            d3.select('#historyUsername').property('value', username);
        }
        
        // Initialize history view with loading indicators
        const calendarElement = d3.select('#calendar');
        const journalListElement = d3.select('#journalEntryList');
        
        // Show loading indicators
        calendarElement.html('<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">Loading calendar data...</p></div>');
        journalListElement.html('<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3">Loading entries...</p></div>');
        
        // Initialize history view if we have a username
        if (username) {
            initHistory()
                .catch(error => {
                    console.error("Error loading history:", error);
                    showNotification("Failed to load journal history. Please try again.", "error");
                });
        } else {
            // Clear loading indicators if no username
            calendarElement.html('<div class="alert alert-info m-3">Enter a username and click "Load History" to view journal entries.</div>');
            journalListElement.html('');
        }
    });
    
    // Activities navigation
    d3.select('#navActivities').on('click', function(event) {
        event.preventDefault();
        d3.selectAll('.nav-link').classed('active', false);
        d3.select(this).classed('active', true);
        
        // Show the activities container
        d3.select('#journalEntryContainer').classed('d-none', true);
        d3.select('#journalHistoryContainer').classed('d-none', true);
        d3.select('#activitiesContainer').classed('d-none', false);
        d3.select('#settingsContainer').classed('d-none', true);
        
        // Copy username from entry form to activities form if it exists
        const username = d3.select('#username').property('value');
        if (username) {
            d3.select('#activitiesUsername').property('value', username);
        }
        
        // Remove notification badge if present
        const badge = this.querySelector('.position-absolute');
        if (badge) {
            badge.remove();
        }
        
        // Initialize activities view if we have a username
        if (username && window.activities && window.activities.init) {
            window.activities.init();
        }
    });
    
    // Settings navigation
    d3.select('#navSettings').on('click', function(event) {
        event.preventDefault();
        d3.selectAll('.nav-link').classed('active', false);
        d3.select(this).classed('active', true);
        d3.select('#journalEntryContainer').classed('d-none', true);
        d3.select('#journalHistoryContainer').classed('d-none', true);
        d3.select('#activitiesContainer').classed('d-none', true);
        d3.select('#settingsContainer').classed('d-none', false);
        showNotification("Settings feature coming soon!", "info");
    });
    
    // Mobile menu toggle
    d3.select('#toggleSidebar').on('click', function() {
        d3.select('#sidebar').classed('d-none', !d3.select('#sidebar').classed('d-none'));
    });
});