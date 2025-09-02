// JIRA Story Point Calculator - Content Script
class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.isActive = false;
        this.observer = null;
        this.debounceTimer = null;
        this.init();
    }

    init() {
        // Check if extension was previously activated
        this.checkActivationStatus();

        // Wait for JIRA to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCalculator());
        } else {
            this.setupCalculator();
        }
    }

    checkActivationStatus() {
        // Check if extension was activated in this session
        this.isActive = sessionStorage.getItem('jiraStoryPointCalculatorActive') === 'true';
        if (this.isActive) {
            console.log('JIRA Story Point Calculator: Extension was previously activated, resuming...');
        }
    }

    setupCalculator() {
        if (this.isInitialized) return;

        console.log('JIRA Story Point Calculator: Initializing...');

        // Set up activation listener
        this.setupActivationListener();

        // Set up field observer only if active
        if (this.isActive) {
            this.setupFieldObserver();
        }

        // Listen for activation messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'activate') {
                this.activate();
                sendResponse({ success: true, message: 'Extension activated' });
            } else if (request.action === 'deactivate') {
                this.deactivate();
                sendResponse({ success: true, message: 'Extension deactivated' });
            } else if (request.action === 'getStatus') {
                sendResponse({ active: this.isActive });
            } else if (request.action === 'calculate') {
                this.calculateStoryPoints();
                sendResponse({ success: true, message: 'Calculation triggered' });
            }
        });

        this.isInitialized = true;
        console.log('JIRA Story Point Calculator: Ready! (Active:', this.isActive, ')');
    }

    setupActivationListener() {
        // Listen for custom activation events
        document.addEventListener('jira-story-point-activate', () => {
            this.activate();
        });

        document.addEventListener('jira-story-point-deactivate', () => {
            this.deactivate();
        });
    }

    activate() {
        if (this.isActive) return;

        this.isActive = true;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'true');

        // Set up field observer
        this.setupFieldObserver();

        // Show activation notification
        this.showNotification('✅ Story Point Calculator ACTIVATED', 'success');

        // Initial calculation
        this.calculateStoryPoints();

        console.log('JIRA Story Point Calculator: Extension ACTIVATED');
    }

    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'false');

        // Remove observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Show deactivation notification
        this.showNotification('❌ Story Point Calculator DEACTIVATED', 'info');

        console.log('JIRA Story Point Calculator: Extension DEACTIVATED');
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.getElementById('jira-calculator-notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.id = 'jira-calculator-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #jira-calculator-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
                color: ${type === 'success' ? '#155724' : '#0c5460'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#bee5eb'};
                border-radius: 4px;
                padding: 12px 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                animation: slideIn 0.3s ease-out;
            }
            #jira-calculator-notification .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #jira-calculator-notification .notification-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);

        document.body.appendChild(notification);
    }

    setupFieldObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        // Watch for changes in the JIRA issue form
        const targetNode = document.querySelector('[data-testid="issue.views.issue-base.content.content"]') ||
            document.querySelector('#issue-content') ||
            document.body;

        this.observer = new MutationObserver((mutations) => {
            if (!this.isActive) return;

            let shouldRecalculate = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    if (this.hasRelevantFieldChanged(mutation)) {
                        shouldRecalculate = true;
                    }
                }
            });

            if (shouldRecalculate) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 200);
            }
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'data-value', 'class', 'style', 'selected', 'checked']
        });

        // Also watch for direct input events
        document.addEventListener('input', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 100);
            }
        });

        document.addEventListener('change', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                this.calculateStoryPoints();
            }
        });

        console.log('JIRA Story Point Calculator: Field observer active');
    }

    hasRelevantFieldChanged(mutation) {
        const target = mutation.target;
        if (target.nodeType === Node.ELEMENT_NODE) {
            // Check for time tracking fields
            if (target.closest('[data-testid*="time-tracking"]') ||
                target.closest('[data-testid*="time"]') ||
                target.closest('.time-tracking') ||
                target.closest('[data-field-id*="time"]')) {
                return true;
            }

            // Check for complexity fields
            if (target.closest('[data-testid*="complexity"]') ||
                target.closest('.complexity-field') ||
                target.closest('[data-field-id*="complexity"]')) {
                return true;
            }
        }
        return false;
    }

    isRelevantInput(element) {
        if (!element || !element.tagName) return false;

        const tagName = element.tagName.toLowerCase();
        if (tagName !== 'input' && tagName !== 'select' && tagName !== 'textarea') return false;

        const name = element.name || '';
        const id = element.id || '';
        const className = element.className || '';
        const testId = element.getAttribute('data-testid') || '';

        return name.includes('time') || name.includes('complexity') || name.includes('story') ||
            id.includes('time') || id.includes('complexity') || id.includes('story') ||
            className.includes('time') || className.includes('complexity') || className.includes('story') ||
            testId.includes('time') || testId.includes('complexity') || testId.includes('story');
    }

    calculateStoryPoints() {
        if (!this.isActive) return;

        try {
            const timeTracking = this.extractTimeTracking();
            const complexity = this.extractComplexity();

            if (timeTracking === null || complexity === null) {
                console.log('JIRA Story Point Calculator: Missing required fields');
                return;
            }

            const storyPoints = this.calculateTW(timeTracking, complexity);
            const success = this.updateStoryPointField(storyPoints);

            if (success) {
                console.log(`JIRA Story Point Calculator: ✅ Updated story points to ${storyPoints}`);
                this.showNotification(`📊 Story Points: ${storyPoints}`, 'success');
            } else {
                console.log('JIRA Story Point Calculator: ❌ Failed to update story points');
            }
        } catch (error) {
            console.error('JIRA Story Point Calculator: Error calculating story points:', error);
        }
    }

    extractTimeTracking() {
        // Use the exact selectors from the user's JIRA HTML
        const selectors = [
            // Primary selector for logged time
            '[data-testid="issue.issue-view.common.logged-time.value"]',
            // Primary selector for remaining time
            '[data-testid="issue.component.logged-time.remaining-time"]',
            // Container for time tracking
            '[data-testid="issue.views.issue-base.context.time-tracking.value"]',
            // Fallback selectors
            '[data-testid*="time-tracking"]',
            '[data-testid*="time"]',
            '.time-tracking',
            '#time-tracking',
            '[data-field-id*="time"]',
            'input[name*="time"]',
            'select[name*="time"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const timeValue = this.extractTimeValue(element);
                if (timeValue !== null) {
                    console.log('JIRA Story Point Calculator: Found time tracking field with selector:', selector);
                    return timeValue;
                }
            }
        }

        // Special handling for JIRA time tracking format
        return this.extractJIRATimeTracking();
    }

    extractJIRATimeTracking() {
        console.log('JIRA Story Point Calculator: Attempting to extract JIRA time tracking...');

        // Look for logged time
        const loggedTimeElement = document.querySelector('[data-testid="issue.issue-view.common.logged-time.value"]');
        const remainingTimeElement = document.querySelector('[data-testid="issue.component.logged-time.remaining-time"]');

        if (loggedTimeElement && remainingTimeElement) {
            const loggedText = loggedTimeElement.textContent.trim();
            const remainingText = remainingTimeElement.textContent.trim();

            console.log('JIRA Story Point Calculator: Logged time:', loggedText, 'Remaining time:', remainingText);

            // Parse logged time (e.g., "2h")
            const loggedHours = this.parseTimeToHours(loggedText);

            // Parse remaining time (e.g., "30m")
            const remainingHours = this.parseTimeToHours(remainingText);

            if (loggedHours !== null && remainingHours !== null) {
                const totalHours = loggedHours + remainingHours;
                console.log('JIRA Story Point Calculator: Total time calculated:', totalHours, 'hours');
                return totalHours;
            } else if (loggedHours !== null) {
                console.log('JIRA Story Point Calculator: Using logged time only:', loggedHours, 'hours');
                return loggedHours;
            }
        }

        // Fallback: look for any element containing time information
        const timeElements = document.querySelectorAll('*');
        for (const element of timeElements) {
            if (element.textContent && (element.textContent.includes('h logged') || element.textContent.includes('m remaining'))) {
                const timeText = element.textContent;
                console.log('JIRA Story Point Calculator: Found time text in element:', timeText);

                // Extract logged time
                const loggedMatch = timeText.match(/(\d+(?:\.\d+)?)h logged/);
                const remainingMatch = timeText.match(/(\d+(?:\.\d+)?)m remaining/);

                if (loggedMatch && remainingMatch) {
                    const loggedHours = parseFloat(loggedMatch[1]);
                    const remainingHours = parseFloat(remainingMatch[1]) / 60;
                    const totalHours = loggedHours + remainingHours;
                    console.log('JIRA Story Point Calculator: Calculated total from text:', totalHours, 'hours');
                    return totalHours;
                } else if (loggedMatch) {
                    const loggedHours = parseFloat(loggedMatch[1]);
                    console.log('JIRA Story Point Calculator: Using logged time from text:', loggedHours, 'hours');
                    return loggedHours;
                }
            }
        }

        console.warn('JIRA Story Point Calculator: Could not extract time tracking information');
        return null;
    }

    extractTimeValue(element) {
        let timeText = '';

        if (element.tagName === 'INPUT') {
            timeText = element.value;
        } else if (element.tagName === 'SELECT') {
            timeText = element.value || element.options[element.selectedIndex]?.text;
        } else {
            const timeDisplay = element.querySelector('.time-tracking-display, .time-value, [data-testid*="time"], .field-value');
            if (timeDisplay) {
                timeText = timeDisplay.textContent || timeDisplay.innerText;
            } else {
                timeText = element.textContent || element.innerText;
            }
        }

        return this.parseTimeToHours(timeText.trim());
    }

    parseTimeToHours(timeString) {
        if (!timeString) return null;

        timeString = timeString.replace(/\s+/g, ' ').trim();

        const patterns = [
            /^(\d+(?:\.\d+)?)m$/i,
            /^(\d+(?:\.\d+)?)h\s+(\d+(?:\.\d+)?)m$/i,
            /^(\d+(?:\.\d+)?)h$/i,
            /^(\d+(?:\.\d+)?)m$/i
        ];

        for (let i = 0; i < patterns.length; i++) {
            const match = timeString.match(patterns[i]);
            if (match) {
                switch (i) {
                    case 0: return parseFloat(match[1]) / 60;
                    case 1:
                        const hours = parseFloat(match[1]);
                        const minutes = parseFloat(match[2]);
                        return hours + (minutes / 60);
                    case 2: return parseFloat(match[1]);
                    case 3: return parseFloat(match[1]) / 60;
                }
            }
        }

        const decimalMatch = timeString.match(/^(\d+(?:\.\d+)?)$/);
        if (decimalMatch) {
            return parseFloat(decimalMatch[1]);
        }

        return null;
    }

    extractComplexity() {
        // Use the exact selector from the user's JIRA HTML
        const selectors = [
            // Primary selector for complexity value
            '[data-testid="issue-field-number-readview-full.ui.number.span"]',
            // Container for complexity field
            '[data-testid="issue.issue-view-layout.issue-view-number-field.customfield_10055"]',
            // Fallback selectors
            '[data-testid*="complexity"]',
            '[data-testid*="Complexity"]',
            '.complexity-field',
            '#complexity',
            '[data-field-id*="complexity"]',
            'input[name*="complexity"]',
            'select[name*="complexity"]',
            'input[name*="Complexity"]',
            'select[name*="Complexity"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const complexityValue = this.extractComplexityValue(element);
                if (complexityValue !== null) {
                    console.log('JIRA Story Point Calculator: Found complexity field with selector:', selector);
                    return complexityValue;
                }
            }
        }

        // Special handling for JIRA complexity field
        return this.extractJIRAComplexity();
    }

    extractJIRAComplexity() {
        console.log('JIRA Story Point Calculator: Attempting to extract JIRA complexity...');

        // Look for the specific complexity field
        const complexityElement = document.querySelector('[data-testid="issue-field-number-readview-full.ui.number.span"]');

        if (complexityElement) {
            const complexityText = complexityElement.textContent.trim();
            console.log('JIRA Story Point Calculator: Found complexity text:', complexityText);

            const complexityValue = parseFloat(complexityText);
            if (!isNaN(complexityValue) && this.complexityValues.includes(complexityValue)) {
                console.log('JIRA Story Point Calculator: Valid complexity value:', complexityValue);
                return complexityValue;
            }
        }

        // Look for complexity in the field heading area
        const complexityHeading = this.findElementByText('Complexity', 'h3');
        if (complexityHeading) {
            const parentContainer = complexityHeading.closest('[data-testid*="customfield"]');
            if (parentContainer) {
                const valueElement = parentContainer.querySelector('[data-testid*="number-readview"]');
                if (valueElement) {
                    const complexityText = valueElement.textContent.trim();
                    console.log('JIRA Story Point Calculator: Found complexity in heading area:', complexityText);

                    const complexityValue = parseFloat(complexityText);
                    if (!isNaN(complexityValue) && this.complexityValues.includes(complexityValue)) {
                        return complexityValue;
                    }
                }
            }
        }

        console.warn('JIRA Story Point Calculator: Could not extract complexity information');
        return null;
    }

    extractComplexityValue(element) {
        let value = null;

        if (element.tagName === 'INPUT') {
            value = element.value;
        } else if (element.tagName === 'SELECT') {
            value = element.value || element.options[element.selectedIndex]?.text;
        } else {
            const displayElement = element.querySelector('.field-value, .value, [data-testid*="value"]');
            if (displayElement) {
                value = displayElement.textContent || displayElement.innerText;
            } else {
                value = element.textContent || element.innerText;
            }
        }

        if (value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && this.complexityValues.includes(numValue)) {
                return numValue;
            }
        }

        return null;
    }

    calculateTW(timeTracking, complexity) {
        const result = timeTracking * complexity;
        return Math.round(result * 100) / 100;
    }

    // Helper method to find elements by text content
    findElementByText(text, tagName = '*') {
        const elements = document.querySelectorAll(tagName);
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(text)) {
                return element;
            }
        }
        return null;
    }

    // Helper method to find elements by partial text content
    findElementsByPartialText(partialText, tagName = '*') {
        const elements = document.querySelectorAll(tagName);
        const matches = [];
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(partialText)) {
                matches.push(element);
            }
        }
        return matches;
    }

    updateStoryPointField(storyPoints) {
        console.log('JIRA Story Point Calculator: Attempting to update story point field with value:', storyPoints);

        // Use the exact selector from your HTML
        const storyPointContainer = document.querySelector('[data-testid="issue-field-number.ui.issue-field-story-point-estimate--container"]');

        if (storyPointContainer) {
            console.log('JIRA Story Point Calculator: Found story point container');

            // Try to find existing input field
            let inputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');

            if (inputField) {
                console.log('JIRA Story Point Calculator: Found existing input field, updating value');
                // Update existing field
                inputField.value = storyPoints;
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
            } else {
                console.log('JIRA Story Point Calculator: No input field found, trying to enter edit mode');
                // Try to enter edit mode
                const editButton = storyPointContainer.querySelector('button[aria-label="Edit Story Points"]');
                if (editButton) {
                    console.log('JIRA Story Point Calculator: Clicking edit button');
                    editButton.click();

                    // Wait for input to appear and set value
                    setTimeout(() => {
                        const newInputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');
                        if (newInputField) {
                            console.log('JIRA Story Point Calculator: Found new input field after edit mode, setting value');
                            newInputField.value = storyPoints;
                            newInputField.dispatchEvent(new Event('input', { bubbles: true }));
                            newInputField.dispatchEvent(new Event('change', { bubbles: true }));
                            newInputField.dispatchEvent(new Event('blur', { bubbles: true }));
                        }
                    }, 200);
                    return true;
                }
            }
        }

        // Try alternative story point field selectors
        const alternativeSelectors = [
            // Look for the story point field in the pinned fields section
            '[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"]',
            // Look for story point field containers
            '[data-testid*="story-point"]',
            '[data-testid*="storypoint"]',
            '.story-point-field',
            '#story-point',
            '[data-field-id*="story"]',
            'input[name*="story"]',
            'input[name*="point"]'
        ];

        for (const selector of alternativeSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('JIRA Story Point Calculator: Found alternative story point element with selector:', selector);

                // If it's a span with "Add story points", try to find the parent container
                if (element.textContent.includes('Add story points')) {
                    const parentContainer = element.closest('[data-testid*="story-point"]') ||
                        element.closest('[data-testid*="container"]') ||
                        element.parentElement;

                    if (parentContainer) {
                        console.log('JIRA Story Point Calculator: Found parent container, looking for edit button');

                        // Look for edit button in the parent container
                        const editButton = parentContainer.querySelector('button[aria-label*="Edit"]');
                        if (editButton) {
                            console.log('JIRA Story Point Calculator: Clicking edit button in parent container');
                            editButton.click();

                            // Wait for input to appear and set value
                            setTimeout(() => {
                                const inputField = parentContainer.querySelector('input[type="number"], input[type="text"]');
                                if (inputField) {
                                    console.log('JIRA Story Point Calculator: Found input field, setting value');
                                    inputField.value = storyPoints;
                                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                    inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                                }
                            }, 200);
                            return true;
                        }
                    }
                }

                // Try to set value directly
                this.setFieldValue(element, storyPoints);
                return true;
            }
        }

        // Try to find story point field by text content
        const storyPointElement = this.findElementByText('Add story points');
        if (storyPointElement) {
            console.log('JIRA Story Point Calculator: Found story point field by text content');

            // Find the parent container that has the edit button
            const parentContainer = storyPointElement.closest('[data-testid*="container"]') ||
                storyPointElement.closest('[data-testid*="story-point"]') ||
                storyPointElement.parentElement;

            if (parentContainer) {
                console.log('JIRA Story Point Calculator: Looking for edit button in parent container');

                // Look for edit button
                const editButton = parentContainer.querySelector('button[aria-label*="Edit"]');
                if (editButton) {
                    console.log('JIRA Story Point Calculator: Found edit button, clicking to enter edit mode');
                    editButton.click();

                    // Wait for input to appear and set value
                    setTimeout(() => {
                        const inputField = parentContainer.querySelector('input[type="number"], input[type="text"]');
                        if (inputField) {
                            console.log('JIRA Story Point Calculator: Found input field after edit mode, setting value');
                            inputField.value = storyPoints;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                        } else {
                            console.warn('JIRA Story Point Calculator: No input field found after edit mode');
                        }
                    }, 300);
                    return true;
                } else {
                    console.warn('JIRA Story Point Calculator: No edit button found in parent container');
                }
            }
        }

        console.warn('JIRA Story Point Calculator: Could not find story point field with any selector');
        return false;
    }

    setFieldValue(element, value) {
        if (element.tagName === 'INPUT') {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
        } else {
            const input = element.querySelector('input');
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        }
    }

    // Debug method
    debugAvailableFields() {
        console.log('JIRA Story Point Calculator: Debugging available fields...');

        const testIdElements = document.querySelectorAll('[data-testid]');
        const timeFields = [];
        const complexityFields = [];
        const storyPointFields = [];

        testIdElements.forEach(element => {
            const testId = element.getAttribute('data-testid');
            if (testId.includes('time') || testId.includes('Time')) {
                timeFields.push({ testId, element });
            }
            if (testId.includes('complexity') || testId.includes('Complexity')) {
                complexityFields.push({ testId, element });
            }
            if (testId.includes('story') || testId.includes('point') || testId.includes('estimate')) {
                storyPointFields.push({ testId, element });
            }
        });

        console.log('Time-related fields:', timeFields);
        console.log('Complexity-related fields:', complexityFields);
        console.log('Story point-related fields:', storyPointFields);
    }
}

// Initialize the calculator
const calculator = new JIRAStoryPointCalculator();

// Expose to window for debugging
window.jiraStoryPointCalculator = calculator;

// Global functions for debugging
window.triggerStoryPointCalculation = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.calculateStoryPoints();
        return 'Calculation triggered';
    }
    return 'Calculator not found';
};

window.activateStoryPointCalculator = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.activate();
        return 'Calculator activated';
    }
    return 'Calculator not found';
};

window.deactivateStoryPointCalculator = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.deactivate();
        return 'Calculator deactivated';
    }
    return 'Calculator not found';
};
