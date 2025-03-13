// Global variables
let currentUsername = '';
let activities = [];

// Toast notification helper
function showActivityNotification(message, type = "info") {
    const toast = document.getElementById('notificationToast');
    const toastBody = document.getElementById('toastMessage');
    const toastTitle = document.getElementById('toastTitle');
    
    // Set toast content
    toastBody.textContent = message;
    
    // Set toast title based on type
    if (type === "error") {
        toastTitle.textContent = "Error";
        toast.classList.add('bg-danger', 'text-white');
    } else if (type === "success") {
        toastTitle.textContent = "Success";
        toast.classList.add('bg-success', 'text-white');
    } else {
        toastTitle.textContent = "Notification";
        toast.classList.remove('bg-danger', 'bg-success', 'text-white');
    }
    
    // Show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Load activities for a user
async function loadActivities(username, includeCompleted = false) {
    try {
        currentUsername = username;
        
        // Show loading state
        const activitiesContainer = document.getElementById('activitiesContainer');
        if (activitiesContainer) {
            activitiesContainer.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2">Loading activities...</p>
                </div>
            `;
        }
        
        // Make API request
        const response = await fetch(`/activities/${username}/?include_completed=${includeCompleted}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load activities: ${response.statusText}`);
        }
        
        const data = await response.json();
        activities = data.activities || [];
        
        // Render activities
        renderActivities();
        
        return activities;
    } catch (error) {
        console.error('Error loading activities:', error);
        showActivityNotification(`Failed to load activities: ${error.message}`, 'error');
        
        // Show error state
        const activitiesContainer = document.getElementById('activitiesContainer');
        if (activitiesContainer) {
            activitiesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load activities. Please try again.
                </div>
            `;
        }
        
        return [];
    }
}

// Render activities list
function renderActivities() {
    const activitiesContainer = document.getElementById('activitiesContainer');
    
    if (!activitiesContainer) {
        console.warn('Activities container not found');
        return;
    }
    
    // Clear container
    activitiesContainer.innerHTML = '';
    
    // Create activities list
    if (activities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle-fill me-2"></i>
                No suggested activities found. Journal entries with strong emotions might trigger activity suggestions.
            </div>
        `;
        return;
    }
    
    // Create activities list
    const list = document.createElement('div');
    list.className = 'list-group';
    
    // Add activities to list
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = `list-group-item ${activity.completed ? 'list-group-item-success' : ''}`;
        
        // Create category badge
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'badge rounded-pill float-end';
        
        // Set badge color based on category
        switch (activity.activity_category) {
            case 'stress_relief':
                categoryBadge.classList.add('bg-info');
                break;
            case 'mood_boosting':
                categoryBadge.classList.add('bg-warning', 'text-dark');
                break;
            case 'anger_management':
                categoryBadge.classList.add('bg-danger');
                break;
            default:
                categoryBadge.classList.add('bg-secondary');
        }
        
        categoryBadge.textContent = formatCategoryName(activity.activity_category);
        
        // Create difficulty indicators
        const difficultyStars = document.createElement('div');
        difficultyStars.className = 'small text-muted mb-1';
        difficultyStars.innerHTML = `Difficulty: ${renderDifficultyStars(activity.difficulty || 1)}`;
        
        // Create duration badge
        const durationBadge = document.createElement('span');
        durationBadge.className = 'badge bg-light text-dark me-2';
        durationBadge.innerHTML = `<i class="bi bi-clock"></i> ${activity.duration_minutes || 15}m`;
        
        // Create activity content
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5 class="mb-1">${activity.activity_name}</h5>
                    <p class="mb-1">${activity.activity_description || ''}</p>
                    <div class="text-muted small mb-2">
                        ${formatDate(activity.suggested_at)}
                    </div>
                    <div class="mb-2">
                        ${durationBadge.outerHTML}
                        ${activity.mood_benefits && activity.mood_benefits.length > 0 
                          ? activity.mood_benefits.map(benefit => 
                              `<span class="badge bg-light text-dark me-1">${benefit}</span>`).join('') 
                          : ''}
                    </div>
                    <div class="text-muted small quote-box p-2 bg-light rounded">
                        <i class="bi bi-quote me-1"></i>
                        <em>${activity.reason || 'Suggested based on your journal content'}</em>
                    </div>
                    ${difficultyStars.outerHTML}
                </div>
                ${categoryBadge.outerHTML}
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div>
                    ${activity.completed 
                      ? `<div class="text-success"><i class="bi bi-check-circle-fill"></i> Completed</div>` 
                      : ''}
                </div>
                <div class="btn-group" role="group">
                    ${!activity.completed 
                      ? `<button class="btn btn-sm btn-success complete-activity" data-id="${activity.activity_id}">
                            Mark Complete
                        </button>` 
                      : `<button class="btn btn-sm btn-outline-secondary uncomplete-activity" data-id="${activity.activity_id}">
                            Mark Incomplete
                        </button>`}
                </div>
            </div>
            
            ${activity.completed && activity.user_rating 
              ? `<div class="mt-2">
                    <small class="text-muted">Your rating: ${renderRatingStars(activity.user_rating)}</small>
                </div>` 
              : ''}
            
            ${activity.completed && !activity.user_rating 
              ? `<div class="mt-2">
                    <div class="d-flex align-items-center">
                        <small class="text-muted me-2">Rate this activity:</small>
                        <div class="rating-stars" data-id="${activity.activity_id}">
                            ${renderRatingInput(activity.activity_id)}
                        </div>
                    </div>
                </div>` 
              : ''}
        `;
        
        list.appendChild(item);
    });
    
    activitiesContainer.appendChild(list);
    
    // Add event listeners
    addActivityEventListeners();
}

// Format category name
function formatCategoryName(category) {
    if (!category) return 'Other';
    
    return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Render difficulty stars
function renderDifficultyStars(difficulty) {
    const maxDifficulty = 5;
    let html = '';
    
    for (let i = 1; i <= maxDifficulty; i++) {
        if (i <= difficulty) {
            html += '<i class="bi bi-star-fill text-warning"></i>';
        } else {
            html += '<i class="bi bi-star text-muted"></i>';
        }
    }
    
    return html;
}

// Render rating stars (display only)
function renderRatingStars(rating) {
    const maxRating = 5;
    let html = '';
    
    for (let i = 1; i <= maxRating; i++) {
        if (i <= rating) {
            html += '<i class="bi bi-star-fill text-warning"></i>';
        } else {
            html += '<i class="bi bi-star text-muted"></i>';
        }
    }
    
    return html;
}

// Render rating input stars
function renderRatingInput(activityId) {
    const maxRating = 5;
    let html = '';
    
    for (let i = 1; i <= maxRating; i++) {
        html += `<i class="bi bi-star text-muted rating-star" data-rating="${i}" data-id="${activityId}"></i>`;
    }
    
    return html;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (isNaN(date.getTime())) {
        return '';
    }
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Add event listeners to activity elements
function addActivityEventListeners() {
    // Complete activity buttons
    document.querySelectorAll('.complete-activity').forEach(button => {
        button.addEventListener('click', async function() {
            const activityId = this.dataset.id;
            await updateActivityStatus(activityId, true);
        });
    });
    
    // Uncomplete activity buttons
    document.querySelectorAll('.uncomplete-activity').forEach(button => {
        button.addEventListener('click', async function() {
            const activityId = this.dataset.id;
            await updateActivityStatus(activityId, false);
        });
    });
    
    // Rating stars
    document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            const activityId = this.dataset.id;
            const stars = document.querySelectorAll(`.rating-star[data-id="${activityId}"]`);
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.remove('bi-star', 'text-muted');
                    s.classList.add('bi-star-fill', 'text-warning');
                } else {
                    s.classList.add('bi-star', 'text-muted');
                    s.classList.remove('bi-star-fill', 'text-warning');
                }
            });
        });
        
        star.addEventListener('mouseleave', function() {
            const activityId = this.dataset.id;
            const stars = document.querySelectorAll(`.rating-star[data-id="${activityId}"]`);
            
            stars.forEach(s => {
                s.classList.add('bi-star', 'text-muted');
                s.classList.remove('bi-star-fill', 'text-warning');
            });
        });
        
        star.addEventListener('click', async function() {
            const rating = parseInt(this.dataset.rating);
            const activityId = this.dataset.id;
            await updateActivityRating(activityId, rating);
        });
    });
}

// Update activity status (complete/incomplete)
async function updateActivityStatus(activityId, completed) {
    try {
        const response = await fetch(`/activities/${currentUsername}/${activityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed: completed
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update activity: ${response.statusText}`);
        }
        
        // Reload activities
        await loadActivities(currentUsername, true);
        
        // Show success message
        showActivityNotification(
            completed ? "Activity marked as complete!" : "Activity marked as incomplete", 
            "success"
        );
        
    } catch (error) {
        console.error('Error updating activity status:', error);
        showActivityNotification(`Failed to update activity: ${error.message}`, 'error');
    }
}

// Update activity rating
async function updateActivityRating(activityId, rating) {
    try {
        const response = await fetch(`/activities/${currentUsername}/${activityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                completed: true,
                rating: rating
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to rate activity: ${response.statusText}`);
        }
        
        // Reload activities
        await loadActivities(currentUsername, true);
        
        // Show success message
        showActivityNotification("Thanks for rating this activity!", "success");
        
    } catch (error) {
        console.error('Error rating activity:', error);
        showActivityNotification(`Failed to rate activity: ${error.message}`, 'error');
    }
}

// Initialize activities view
function initActivities() {
    // Get username from input
    const usernameInput = document.getElementById('username') || document.getElementById('historyUsername');
    
    if (usernameInput && usernameInput.value) {
        loadActivities(usernameInput.value);
    } else {
        console.warn('Username not found, cannot load activities');
    }
}

// Add a new activity suggestion notification
function handleNewActivitySuggestion(activity) {
    // Update activities list
    if (currentUsername) {
        loadActivities(currentUsername);
    }
    
    // Show notification
    showActivityNotification(
        `New activity suggested: ${activity.activity_name}`, 
        "info"
    );
    
    // If activities tab isn't active, add notification badge
    const activitiesTab = document.getElementById('navActivities');
    if (activitiesTab && !activitiesTab.classList.contains('active')) {
        const badge = document.createElement('span');
        badge.className = 'position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle';
        badge.innerHTML = '<span class="visually-hidden">New suggestion</span>';
        
        // Add badge if it doesn't exist
        if (!activitiesTab.querySelector('.position-absolute')) {
            activitiesTab.style.position = 'relative';
            activitiesTab.appendChild(badge);
        }
    }
}

// Export functions
window.activities = {
    init: initActivities,
    load: loadActivities,
    handleNewSuggestion: handleNewActivitySuggestion
}; 