class AuthService {
    constructor() {
        this.googleToken = null;
        this.isLoggedIn = false;
    }

    async checkIfTokenExists() {
        try {
            const info = await chrome.identity.getAuthToken({ interactive: false });
            const token = info?.token;
            if (token) {
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async checkTokenValidity() {
        try {
            const { token } = await chrome.identity.getAuthToken({ interactive: false });
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
            const data = await response.json();
            if (data.error) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    async handleGoogleLoginFlow() {
        try {
            const tokenExists = await this.checkIfTokenExists();

            if (!tokenExists) {
                return { success: false, page: 'login' };
            }
            const tokenIsValid = await this.checkTokenValidity();
            const { token } = await chrome.identity.getAuthToken({ interactive: false });

            if (!tokenIsValid) {
                await chrome.identity.removeCachedAuthToken({ token: token });
                this.googleToken = null;
                return { success: false, page: 'login' };
            }

            this.googleToken = token;
            this.isLoggedIn = true;
            return { success: true, page: 'landing' };

        } catch (error) {
            return { success: false, page: 'login' };
        }
    }

    async handleGoogleLoginClick() {
        try {
            const info = await chrome.identity.getAuthToken({ interactive: true });
            const token = info.token;

            if (!info.grantedScopes.includes("https://www.googleapis.com/auth/calendar")) {
                await chrome.identity.removeCachedAuthToken({ token: token });
                return { success: false, page: 'login', error: 'Missing required permissions, please login again' };
            }
            this.googleToken = token;
            this.isLoggedIn = true;
            return { success: true, page: 'landing' };
        } catch (error) {
            return { success: false, page: 'login', error: 'Login failed, please try again' };
        }
    }

    getToken() {
        return this.googleToken;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }
}

class EventService {
    constructor() {
        this.eventCounter = 0;
        this.eventMap = new Map();
    }

    generateSampleEventData() {
        const current_now = new Date();
        const current_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const current_start_time = new Date(current_now.getTime()).toLocaleString('sv-SE', { 
            timeZone: current_timezone 
        }).slice(0, 16).replace(' ', 'T');
        const current_end_time = new Date(current_now.getTime() + 1000 * 60 * 60).toLocaleString('sv-SE', { 
            timeZone: current_timezone 
        }).slice(0, 16).replace(' ', 'T');

        const sampleEvent =
            {
                title: 'Enter Title',
                description: 'Enter Description',
                startDateTime: current_start_time,
                endDateTime: current_end_time,
                location: 'Enter Location'
            };

        return sampleEvent;
    }

    addEvent(eventData = null) {
        this.eventCounter++;
        const finalEventData = eventData || this.generateSampleEventData();
        this.eventMap.set(this.eventCounter, finalEventData);
        return { eventData: finalEventData, eventId: this.eventCounter };
    }

    updateEvent(eventId, updatedData) {
        if (this.eventMap.has(eventId)) {
            this.eventMap.set(eventId, { ...this.eventMap.get(eventId), ...updatedData });
            return true;
        }
        return false;
    }

    getEvent(eventId) {
        return this.eventMap.get(eventId);
    }
    
    deleteEvent(eventId) {
        if (this.eventMap.has(eventId)) {
            this.eventMap.delete(eventId);
            return true;
        }
        return false;
    }

    getAllEvents() {
        return this.eventMap;
    }

    resetEvents() {
        this.eventMap = new Map();
        this.eventCounter = 0;
    }
}

class UIService {
    constructor() {
        this.currentPage = 'login';
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');
        this.currentPage = pageId;
    }

    createEventElement(eventData, eventId) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.setAttribute('data-event-id', eventId);
        
        eventElement.innerHTML = `
            <div class="event-header">
                <span class="event-title">${eventData.title}</span>
                <div class="event-header-actions">
                    <svg class="edit-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="delete-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="event-toggle" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="event-content">
                <div class="event-details">
                    <div class="detail-group">
                        <div class="detail-label">Title</div>
                        <div class="detail-value" data-field="title">${eventData.title}</div>
                        <input type="text" class="detail-input" data-field="title" value="${eventData.title}" style="display: none;">
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Description</div>
                        <div class="detail-value" data-field="description">${eventData.description}</div>
                        <textarea class="detail-input" data-field="description" style="display: none;">${eventData.description}</textarea>
                    </div>
                    <div class="detail-group datetime-group">
                        <div class="datetime-fields">
                            <div class="datetime-field">
                                <div class="detail-label">Start Date & Time</div>
                                <div class="detail-value" data-field="startDateTime">${this.formatDateTimeForDisplay(eventData.startDateTime)}</div>
                                <input type="datetime-local" class="detail-input" data-field="startDateTime" value="${eventData.startDateTime}" 
                                    min="${new Date().getFullYear() - 100}-01-01T00:00" 
                                    max="${new Date().getFullYear() + 100}-12-31T23:59" 
                                    style="display: none;">
                            </div>
                            <div class="datetime-field">
                                <div class="detail-label">End Date & Time</div>
                                <div class="detail-value" data-field="endDateTime">${this.formatDateTimeForDisplay(eventData.endDateTime)}</div>
                                <input type="datetime-local" class="detail-input" data-field="endDateTime" value="${eventData.endDateTime}" 
                                    min="${new Date().getFullYear() - 100}-01-01T00:00" 
                                    max="${new Date().getFullYear() + 100}-12-31T23:59" 
                                    style="display: none;">
                            </div>
                        </div>
                    </div>
                    <div class="detail-group">
                        <div class="detail-label">Location</div>
                        <div class="detail-value" data-field="location">${eventData.location}</div>
                        <input type="text" class="detail-input" data-field="location" value="${eventData.location}" style="display: none;">
                    </div>
                </div>
                <div class="edit-actions" style="display: none;">
                    <button class="save-btn">Save</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        return eventElement;
    }

    formatDateTimeForDisplay(dateTimeLocalStr) {

        const [datePart, timePart] = dateTimeLocalStr.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        
        return `${month}-${day}-${year} ${hours12}:${minutes} ${ampm}`;
    }


    toggleEditMode(eventItem, isEditing) {
        const detailValues = eventItem.querySelectorAll('.detail-value');
        const detailInputs = eventItem.querySelectorAll('.detail-input');
        const editActions = eventItem.querySelector('.edit-actions');
        const editIcon = eventItem.querySelector('.edit-icon');

        if (isEditing) {
            detailValues.forEach(value => value.style.display = 'none');
            detailInputs.forEach(input => input.style.display = 'block');
            editActions.style.display = 'flex';
            editIcon.style.opacity = '0.5';
            eventItem.classList.add('editing');
            
            const firstInput = eventItem.querySelector('.detail-input');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                    firstInput.select();
                }, 100);
            }
        } else {
            detailValues.forEach(value => value.style.display = 'block');
            detailInputs.forEach(input => input.style.display = 'none');
            editActions.style.display = 'none';
            editIcon.style.opacity = '1';
            eventItem.classList.remove('editing');
        }
    }

    collapseAllEventsExcept(exceptEventId) {
        const eventElements = document.querySelectorAll('.event-item');
        eventElements.forEach((eventElement) => {
            const eventId = parseInt(eventElement.dataset.eventId);
            if (eventId !== exceptEventId) {
                eventElement.classList.remove('expanded');
                if (eventElement.classList.contains('editing')) {
                    this.toggleEditMode(eventElement, false);
                }
            }
        });
    }

    removeEventFromUI(eventItem) {
        eventItem.style.transition = 'opacity 0.5s ease-out';
        eventItem.style.opacity = '0';
        eventItem.style.pointerEvents = 'none';
        setTimeout(() => {
            eventItem.remove();
        }, 500);
    }

    getCurrentPage() {
        return this.currentPage;
    }

    toast(message, type = 'success', duration = 5000) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = `
                <div class="toast-header">
                    <span class="toast-title"></span>
                    <button class="toast-close">×</button>
                </div>
                <div class="toast-message"></div>
            `;
            document.body.appendChild(toast);

            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.hideToast(toast));
        }

        const title = toast.querySelector('.toast-title');
        const messageEl = toast.querySelector('.toast-message');

        toast.classList.remove('success', 'error', 'warning');
        toast.classList.add(type);

        switch(type) {
            case 'success':
                title.textContent = 'Success!';
                break;
            case 'error':
                title.textContent = 'Error!';
                break;
            case 'warning':
                title.textContent = 'Warning!';
                break;
        }
        messageEl.textContent = message;

        toast.classList.add('show');

        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        this.toastTimeout = setTimeout(() => {
            this.hideToast(toast);
        }, duration);
    }

    hideToast(toast) {
        toast.classList.remove('show');
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
    }
}

class EventSyncApp {
    constructor() {
        this.authService = new AuthService();
        this.eventService = new EventService();
        this.uiService = new UIService();
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.handleGoogleLoginFlow();
    }

    bindEvents() {
        document.getElementById('google-login-btn').addEventListener('click', () => {
            this.handleGoogleLoginClick();
        });

        document.getElementById('add-event-btn').addEventListener('click', () => {
            this.handleInitAddEvent();
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.uiService.showPage('landing');
        });

        document.getElementById('add-another-event').addEventListener('click', () => {
            this.addEventItem();
        });

        document.getElementById('confirm-events').addEventListener('click', () => {
            this.confirmEvents();
        });

        document.getElementById('events-container').addEventListener('click', (e) => {
            const eventHeader = e.target.closest('.event-header');
            const editIcon = e.target.closest('.edit-icon');
            const saveBtn = e.target.closest('.save-btn');
            const cancelBtn = e.target.closest('.cancel-btn');
            const deleteBtn = e.target.closest('.delete-icon');
            if (editIcon) {
                const eventItem = editIcon.closest('.event-item');
                const eventId = parseInt(eventItem.dataset.eventId);
                
                this.uiService.collapseAllEventsExcept(eventId);
                
                setTimeout(() => {
                    if (!eventItem.classList.contains('expanded')) {
                        eventItem.classList.add('expanded');
                    }
                    
                    setTimeout(() => {
                        this.uiService.toggleEditMode(eventItem, true);
                    }, 100);
                }, 50);
                
                e.stopPropagation();
            } else if (saveBtn) {
                const eventItem = saveBtn.closest('.event-item');
                this.saveEventChanges(eventItem);
            } else if (cancelBtn) {
                const eventItem = cancelBtn.closest('.event-item');
                this.handleEventCancel(eventItem);
            } else if (deleteBtn) {
                const eventItem = deleteBtn.closest('.event-item');
                this.handleDeleteEvent(eventItem);
            } else if (eventHeader && !editIcon) {
                const eventItem = eventHeader.closest('.event-item');
                const eventId = parseInt(eventItem.dataset.eventId);
                
                if (eventItem.classList.contains('editing') && eventItem.classList.contains('expanded')) {
                    eventItem.classList.remove('expanded');
                    this.handleEventCancel(eventItem);
                } else if (!eventItem.classList.contains('editing')) {
                    this.toggleEvent(eventId);
                }
            }
        });
    }

    async handleGoogleLoginFlow() {
        const result = await this.authService.handleGoogleLoginFlow();
        this.uiService.showPage(result.page);
    }

    async handleGoogleLoginClick() {
        this.uiService.showPage('loading');
        const result = await this.authService.handleGoogleLoginClick();
        this.uiService.showPage(result.page);
        if (result.error && result.page === 'login') {
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('error-text').textContent = result.error;
        } else {
            document.getElementById('login-error').style.display = 'none';
            document.getElementById('error-text').textContent = '';
        }
    }

    async handleInitAddEvent() {
        this.uiService.showPage('loading');
        document.getElementById('loading-text').textContent = 'Processing your event...';

        const response = await chrome.runtime.sendMessage({action: "get-events-from-image"});
        this.initializeStagingPage();

        if (response.reply !== "success") {
            this.uiService.showPage('staging');
            setTimeout(() => {
                this.uiService.toast(
                    "There was an error processing your request. Please try again.",
                    "error",
                    2000
                );
            }, 500);
            return;
        }

        const data = response.data;
        const events = data.result;
    
        events.forEach(eventData => {
            const { eventData: formattedEvent, eventId } = this.eventService.addEvent(eventData);
            const eventElement = this.uiService.createEventElement(formattedEvent, eventId);
            document.getElementById('events-container').appendChild(eventElement);
        });

        if (events.length > 0) {
            const firstEvent = document.querySelector('.event-item');
            if (firstEvent) {
                firstEvent.classList.add('expanded');
                setTimeout(() => {
                    const firstInput = firstEvent.querySelector('.detail-input');
                    if (firstInput) {
                        firstInput.focus();
                        firstInput.select();
                    }
                }, 100);
            }
            this.uiService.showPage('staging');
            return;
        }

        if (events.length === 0) {
            this.uiService.showPage('staging');
            setTimeout(() => {
                this.uiService.toast(
                    "We couldn't find any events in the current screen. Please try a different screen or image.",
                    "warning",
                    2000
                );
            }, 500);
            return;
        }
    }

    initializeStagingPage() {
        this.eventService.resetEvents();
        document.getElementById('events-container').innerHTML = '';
    }

    addEventItem() {
        const { eventData, eventId } = this.eventService.addEvent();
        const eventElement = this.uiService.createEventElement(eventData, eventId);
        document.getElementById('events-container').appendChild(eventElement);

        if (eventId === 1) {
            setTimeout(() => {
                eventElement.classList.add('expanded');
            }, 100);
        }

    }

    toggleEvent(eventId) {
        const targetEvent = document.querySelector(`.event-item[data-event-id="${eventId}"]`);
        if (targetEvent) {
            targetEvent.classList.toggle('expanded');
        }
    }

    async confirmEvents() {
        this.uiService.showPage('loading');
        const events = Array.from(this.eventService.getAllEvents().values());
        let successCount = 0;
        let failedEvents = [];
        
        for (const event of events) {
            try {
                const response = await chrome.runtime.sendMessage({action: "add-event-to-calendar", eventData: event});
                
                if (response.reply === "success") {
                    successCount++;
                } else {
                    failedEvents.push({ event, error: response.data });
                }
            } catch (error) {
                failedEvents.push({ event, error: error.message });
            }
        }

        setTimeout(() => {
            this.eventService.resetEvents();
            this.uiService.showPage('landing');
            
            if (successCount === 0) {
                this.uiService.toast(
                    "There was an error adding events to your calendar. Please try again.",
                    "error",
                    2000
                );
            } else if (failedEvents.length > 0) {
                this.uiService.toast(
                    `${successCount} events added, ${failedEvents.length} failed`,
                    "warning",
                    2000
                );
            } else {
                this.uiService.toast(
                    `${successCount} events added to calendar`,
                    "success",
                    2000
                );
            }
        }, 2000);
    }

    saveEventChanges(eventItem) {
        const eventId = parseInt(eventItem.dataset.eventId);
        const inputs = eventItem.querySelectorAll('.detail-input');
        const updatedData = {};
        
        inputs.forEach(input => {
            const field = input.dataset.field;
            updatedData[field] = input.value;
        });
        
        if (this.eventService.updateEvent(eventId, updatedData)) {
            const inputs = eventItem.querySelectorAll('.detail-input');
            inputs.forEach(input => {
                const field = input.dataset.field;
                input.value = updatedData[field];
            });
            
            const eventTitle = eventItem.querySelector('.event-title');
            eventTitle.textContent = updatedData.title;

            const detailValues = eventItem.querySelectorAll('.detail-value');
            detailValues.forEach(value => {
                const field = value.dataset.field;
                value.textContent = (field === 'startDateTime' || field === 'endDateTime') 
                    ? this.uiService.formatDateTimeForDisplay(updatedData[field])
                    : updatedData[field];
            });
        }
        
        eventItem.classList.remove('expanded');
        this.uiService.toggleEditMode(eventItem, false);
    }

    handleEventCancel(eventItem) {
        const eventId = parseInt(eventItem.dataset.eventId);
        const originalData = this.eventService.getEvent(eventId);
        
        const detailValues = eventItem.querySelectorAll('.detail-value');
        detailValues.forEach(value => {
            const field = value.dataset.field;
            value.textContent = (field === 'startDateTime' || field === 'endDateTime') 
                ? this.uiService.formatDateTimeForDisplay(originalData[field])
                : originalData[field];
        });

        const inputs = eventItem.querySelectorAll('.detail-input');
        inputs.forEach(input => {
            const field = input.dataset.field;
            input.value = originalData[field];
        });

        this.uiService.toggleEditMode(eventItem, false);
    }

    handleDeleteEvent(eventItem) {
        const eventId = parseInt(eventItem.dataset.eventId);
        if (eventItem.classList.contains('expanded')) {
            eventItem.classList.remove('expanded');
        }
        if (this.eventService.deleteEvent(eventId)) {
            this.uiService.removeEventFromUI(eventItem);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new EventSyncApp();
});