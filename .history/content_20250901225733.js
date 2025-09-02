// JIRA Story Point Calculator - Content Script


class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.isActive = false;
        this.observer = null;
        this.modalObserver = null;
        this.debounceTimer = null;
        this.infoTooltip = null;
        this.init();
    }

    init() {
        // Check if we're on a JIRA issue page
        if (this.isJIRAIssuePage()) {
            // Auto-activate on JIRA issue pages
            this.autoActivate();
        } else {
            // Check if extension was previously activated
            this.checkActivationStatus();
        }

        // Wait for JIRA to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCalculator();
            });
        } else {
            this.setupCalculator();
        }
    }

    checkActivationStatus() {
        // Check if extension was activated in this session
        this.isActive = sessionStorage.getItem('jiraStoryPointCalculatorActive') === 'true';
    }

    setupCalculator() {
        if (this.isInitialized) return;

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
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'true');

        // Create floating panel
        this.createFloatingPanel();

        // Setup field observer
        this.setupFieldObserver();

        // Start continuous monitoring
        this.startContinuousMonitoring();

        // Show activation notification
        this.showNotification('Story Point Calculator Activated', 'success');
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

        // Remove modal observer
        if (this.modalObserver) {
            this.modalObserver.disconnect();
            this.modalObserver = null;
        }

        // Stop continuous monitoring
        this.stopContinuousMonitoring();

        // Remove floating panel
        this.removeFloatingPanel();

        // Show deactivation notification
        this.showNotification('❌ Story Point Calculator DEACTIVATED', 'info');
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

        // Watch for direct input events with better targeting
        document.addEventListener('input', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 200);
            }
        }, true); // Use capture phase to catch all input events

        document.addEventListener('change', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                this.calculateStoryPoints();
            }
        }, true); // Use capture phase to catch all change events

        // Watch for JIRA-specific field updates
        document.addEventListener('DOMSubtreeModified', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantFieldUpdate(e.target)) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 500);
            }
        }, true);

        // Watch for modal dialog state changes
        this.setupModalObserver();
    }

    setupModalObserver() {
        // Create a mutation observer to watch for modal dialog changes
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if a time logging modal was added
                            if (node.matches && node.matches('[data-testid*="log-time-modal"], [data-testid*="time-modal"]')) {
                                // Modal opened, wait for it to close
                                this.watchModalClose(node);
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        modalObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.modalObserver = modalObserver;
    }

    watchModalClose(modalElement) {
        // Watch for when the modal closes
        const checkModalClosed = () => {
            if (!document.body.contains(modalElement) ||
                modalElement.style.display === 'none' ||
                modalElement.style.visibility === 'hidden') {

                // Modal closed, wait a bit for DOM to settle, then recalculate
                setTimeout(() => {
                    this.calculateStoryPoints();
                }, 1000);
            } else {
                // Modal still open, check again in 500ms
                setTimeout(checkModalClosed, 500);
            }
        };

        // Start checking
        setTimeout(checkModalClosed, 500);
    }

    isRelevantFieldUpdate(element) {
        // Check if the element or its children contain relevant field content
        const hasTimeContent = element.textContent && (
            element.textContent.includes('h logged') ||
            element.textContent.includes('m remaining') ||
            element.textContent.includes('time') ||
            element.textContent.includes('Time')
        );

        const hasComplexityContent = element.textContent && (
            element.textContent.includes('complexity') ||
            element.textContent.includes('Complexity') ||
            element.textContent.match(/[0-9]+\.?[0-9]*/)
        );

        return hasTimeContent || hasComplexityContent;
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

        // Check if we're in a modal dialog - if so, be more careful about field detection
        const isInModal = element.closest('[data-testid*="modal"], [data-testid*="dialog"], .modal, .dialog');
        if (isInModal) {
            // In modal context, only target specific time tracking fields
            const testId = element.getAttribute('data-testid') || '';
            const name = element.name || '';
            const id = element.id || '';

            // Only target the specific time tracking input fields in the modal
            return testId.includes('timelog-textfield') ||
                testId.includes('time-spent') ||
                testId.includes('time-remaining') ||
                name.includes('time-spent') ||
                name.includes('time-remaining');
        }

        // Outside modal context, use broader detection
        const name = element.name || '';
        const id = element.id || '';
        const className = element.className || '';
        const testId = element.getAttribute('data-testid') || '';

        return name.includes('time') || name.includes('complexity') || name.includes('story') ||
            id.includes('time') || id.includes('complexity') || id.includes('story') ||
            className.includes('time') || className.includes('complexity') || className.includes('story') ||
            testId.includes('time') || testId.includes('complexity') || testId.includes('story');
    }

    isModalOpen() {
        // Check if any time logging modal is currently open
        const timeModal = document.querySelector('[data-testid*="log-time-modal"], [data-testid*="time-modal"]');
        return timeModal &&
            timeModal.style.display !== 'none' &&
            timeModal.style.visibility !== 'hidden' &&
            document.body.contains(timeModal);
    }

    calculateStoryPoints() {
        if (!this.isActive) return;

        // Don't calculate if modal is open
        if (this.isModalOpen()) {
            return;
        }

        try {
            const timeTracking = this.extractTimeTracking();
            const complexity = this.extractComplexity();

            if (timeTracking === null || complexity === null) {
                return;
            }

            const storyPoints = this.calculateTW(timeTracking, complexity);

            const success = this.updateStoryPointField(storyPoints);

            // Update floating panel
            this.updateFloatingPanel(timeTracking, complexity, storyPoints);

            if (success) {
                // Don't show notification for every update to avoid spam
                // this.showNotification(`📊 Story Points: ${storyPoints}`, 'success');
            }
        } catch (error) {
            // Silent error handling
        }
    }

    // Add continuous monitoring for field changes
    startContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        // Check for field changes every 2 seconds
        this.monitoringInterval = setInterval(() => {
            if (!this.isActive) return;

            // Don't monitor if modal is open
            if (this.isModalOpen()) return;

            // Check if fields have changed by comparing current values with stored values
            const currentTime = this.extractTimeTracking();
            const currentComplexity = this.extractComplexity();

            if (this.lastTimeTracking !== currentTime || this.lastComplexity !== currentComplexity) {
                this.lastTimeTracking = currentTime;
                this.lastComplexity = currentComplexity;
                this.calculateStoryPoints();
            }
        }, 2000);
    }

    // Enhanced method to handle immediate field updates
    handleImmediateFieldUpdate() {
        if (!this.isActive) return;

        // Force immediate calculation
        this.calculateStoryPoints();

        // Update the floating panel with current values
        const timeTracking = this.extractTimeTracking();
        const complexity = this.extractComplexity();
        if (timeTracking !== null && complexity !== null) {
            const storyPoints = this.calculateTW(timeTracking, complexity);
            this.updateFloatingPanel(timeTracking, complexity, storyPoints);
        }
    }

    // Test the new formula with sample values
    testFormula() {

        const testCases = [
            { time: 2.0, complexity: 0.2, expected: 0.63 },
            { time: 1.5, complexity: 0.3, expected: 0.67 },
            { time: 3.0, complexity: 1.0, expected: 1.73 },
            { time: 0.5, complexity: 0.1, expected: 0.22 }
        ];

        testCases.forEach(testCase => {
            const result = this.calculateTW(testCase.time, testCase.complexity);
            const passed = Math.abs(result - testCase.expected) < 0.01;
        });
    }

    stopContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
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
                    return timeValue;
                }
            }
        }

        // Special handling for JIRA time tracking format
        return this.extractJIRATimeTracking();
    }

    extractJIRATimeTracking() {


        // Look for logged time
        const loggedTimeElement = document.querySelector('[data-testid="issue.issue-view.common.logged-time.value"]');
        const remainingTimeElement = document.querySelector('[data-testid="issue.component.logged-time.remaining-time"]');

        if (loggedTimeElement && remainingTimeElement) {
            const loggedText = loggedTimeElement.textContent.trim();
            const remainingText = remainingTimeElement.textContent.trim();



            // Parse logged time (e.g., "2h")
            const loggedHours = this.parseTimeToHours(loggedText);

            // Parse remaining time (e.g., "30m")
            const remainingHours = this.parseTimeToHours(remainingText);

            if (loggedHours !== null && remainingHours !== null) {
                const totalHours = loggedHours + remainingHours;
                return totalHours;
            } else if (loggedHours !== null) {
                return loggedHours;
            }
        }

        // Fallback: look for any element containing time information
        const timeElements = document.querySelectorAll('*');
        for (const element of timeElements) {
            if (element.textContent && (element.textContent.includes('h logged') || element.textContent.includes('m remaining'))) {
                const timeText = element.textContent;

                // Extract logged time
                const loggedMatch = timeText.match(/(\d+(?:\.\d+)?)h logged/);
                const remainingMatch = timeText.match(/(\d+(?:\.\d+)?)m remaining/);

                if (loggedMatch && remainingMatch) {
                    const loggedHours = parseFloat(loggedMatch[1]);
                    const remainingHours = parseFloat(remainingMatch[1]) / 60;
                    const totalHours = loggedHours + remainingHours;
                    return totalHours;
                } else if (loggedMatch) {
                    const loggedHours = parseFloat(loggedMatch[1]);
                    return loggedHours;
                }
            }
        }

        
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
        console.log('JIRA Story Point Calculator: Extracting complexity...');

        // Use the exact selector from the user's JIRA HTML
        const selectors = [
            // Primary selector for complexity value
            '[data-testid="issue-field-number-readview-full.ui.number.span"]',
            // Container for complexity field
            '[data-testid="issue.issue-view-layout.issue-view-number-field.customfield_10055"]',
            // Look for complexity in field headings
            '[data-testid*="customfield_10055"]',
            // Look for complexity by field name
            '[data-testid*="Complexity"]',
            '[data-testid*="complexity"]',
            // Look for complexity in field labels
            'label[for*="complexity"]',
            'label[for*="Complexity"]',
            // Look for complexity in field containers
            '.complexity-field',
            '#complexity',
            '[data-field-id*="complexity"]',
            '[data-field-id*="Complexity"]',
            // Look for complexity in input fields
            'input[name*="complexity"]',
            'input[name*="Complexity"]',
            'select[name*="complexity"]',
            'select[name*="Complexity"]',
            // Look for complexity in any element with complexity text
            '[data-testid*="Complexity"]',
            '[data-testid*="complexity"]'
        ];

        console.log('JIRA Story Point Calculator: Testing complexity selectors...');

        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const complexityValue = this.extractComplexityValue(element);
                    if (complexityValue !== null) {
                        return complexityValue;
                    }
                }
            } catch (error) {
                console.error('JIRA Story Point Calculator: Error with selector:', selector, error);
            }
        }

        // Special handling for JIRA complexity field
        return this.extractJIRAComplexity();
    }

    extractJIRAComplexity() {
        // Look for the specific complexity field
        const complexityElement = document.querySelector('[data-testid="issue-field-number-readview-full.ui.number.span"]');

        if (complexityElement) {
            const complexityText = complexityElement.textContent.trim();

            const complexityValue = parseFloat(complexityText);
            if (!isNaN(complexityValue) && this.complexityValues.includes(complexityValue)) {
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

                    const complexityValue = parseFloat(complexityText);
                    if (!isNaN(complexityValue) && this.complexityValues.includes(complexityValue)) {
                        return complexityValue;
                    }
                }
            }
        }

        // Look for complexity by searching all elements with complexity-related text
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            if (element.textContent && element.textContent.toLowerCase().includes('complexity')) {
                // Look for a value near this element
                const nearbyValue = this.findValueNearElement(element);
                if (nearbyValue !== null) {
                    return nearbyValue;
                }
            }
        }

        // Look for complexity values in any number fields
        const numberElements = document.querySelectorAll('[data-testid*="number"], [data-testid*="Number"]');
        for (const element of numberElements) {
            const text = element.textContent.trim();
            const value = parseFloat(text);
            if (!isNaN(value) && this.complexityValues.includes(value)) {
                return value;
            }
        }

        return null;
    }

    findValueNearElement(element) {
        // Look for a value near the complexity element
        const parent = element.parentElement;
        if (parent) {
            // Look for number values in the parent
            const numberElements = parent.querySelectorAll('[data-testid*="number"], [data-testid*="Number"], .number, .value');
            for (const numElement of numberElements) {
                const text = numElement.textContent.trim();
                const value = parseFloat(text);
                if (!isNaN(value) && this.complexityValues.includes(value)) {
                    return value;
                }
            }

            // Look in siblings
            const siblings = Array.from(parent.children);
            for (const sibling of siblings) {
                if (sibling !== element) {
                    const text = sibling.textContent.trim();
                    const value = parseFloat(text);
                    if (!isNaN(value) && this.complexityValues.includes(value)) {
                        return value;
                    }
                }
            }
        }
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
        // New formula: TW = Round(Root(Time × Complexity), 2)
        const product = timeTracking * complexity;
        const rootResult = Math.sqrt(product);
        const roundedResult = Math.round(rootResult * 100) / 100;

        return roundedResult;
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
        // Use the exact selector from your HTML
        const storyPointContainer = document.querySelector('[data-testid="issue-field-number.ui.issue-field-story-point-estimate--container"]');

        if (storyPointContainer) {

            // Try to find existing input field
            let inputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');

            if (inputField) {
                // Update existing field
                inputField.value = storyPoints;
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
            } else {
                // Try to enter edit mode
                const editButton = storyPointContainer.querySelector('button[aria-label="Edit Story Points"]');
                if (editButton) {
                    editButton.click();

                    // Wait for input to appear and set value
                    setTimeout(() => {
                        const newInputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');
                        if (newInputField) {
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

            // Find the parent container that has the edit button
            const parentContainer = storyPointElement.closest('[data-testid*="container"]') ||
                storyPointElement.closest('[data-testid*="story-point"]') ||
                storyPointElement.parentElement;

            if (parentContainer) {

                // Look for edit button
                const editButton = parentContainer.querySelector('button[aria-label*="Edit"]');
                if (editButton) {
                    editButton.click();

                    // Wait for input to appear and set value
                    setTimeout(() => {
                        const inputField = parentContainer.querySelector('input[type="number"], input[type="text"]');
                        if (inputField) {
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
    }

    // Enhanced debugging method for complexity fields
    debugComplexityFields() {
        console.log('=== COMPLEXITY FIELD DEBUG ===');

        // Look for all elements with complexity-related text
        const complexityElements = [];
        const allElements = document.querySelectorAll('*');

        allElements.forEach(element => {
            if (element.textContent && element.textContent.toLowerCase().includes('complexity')) {
                complexityElements.push({
                    element: element,
                    text: element.textContent.trim(),
                    tagName: element.tagName,
                    className: element.className,
                    id: element.id,
                    dataTestId: element.getAttribute('data-testid'),
                    parentTestId: element.parentElement?.getAttribute('data-testid'),
                    html: element.outerHTML.substring(0, 200) + '...'
                });
            }
        });

        // Look for custom field containers
        const customFieldContainers = document.querySelectorAll('[data-testid*="customfield"]');

        // Look for number fields
        const numberFields = document.querySelectorAll('[data-testid*="number"], [data-testid*="Number"]');

        // Look for field labels
        const labels = document.querySelectorAll('label');
        const complexityLabels = Array.from(labels).filter(label =>
            label.textContent.toLowerCase().includes('complexity')
        );
    }

    // Debug method for floating panel
    debugFloatingPanel() {

        if (!this.floatingPanel) {
            return;
        }

        // Check if panel is in viewport
        const rect = this.floatingPanel.getBoundingClientRect();

        // Check if panel is in DOM
        const panelInDOM = document.body.contains(this.floatingPanel);

        // Check if panel is hidden by parent elements
        let parent = this.floatingPanel.parentNode;
        let depth = 0;
        while (parent && parent !== document.body && depth < 10) {
            const parentStyle = window.getComputedStyle(parent);
            console.log(`Parent ${depth} display:`, parentStyle.display, 'visibility:', parentStyle.visibility, 'opacity:', parentStyle.opacity);
            if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.opacity === '0') {
                console.log(`❌ Panel hidden by parent ${depth}:`, parent);
            }
            parent = parent.parentNode;
            depth++;
        }

        // Force show panel
        this.floatingPanel.style.display = 'flex';
        this.floatingPanel.style.visibility = 'visible';
        this.floatingPanel.style.opacity = '1';
        this.floatingPanel.style.zIndex = '10000';
    }

    createFloatingPanel() {
        // Remove existing panel if any
        this.removeFloatingPanel();

        // Create floating panel
        this.floatingPanel = document.createElement('div');
        this.floatingPanel.id = 'jira-story-point-panel';
        this.floatingPanel.className = 'jira-story-point-panel';
        this.floatingPanel.innerHTML = `
            <div class="panel-content">
                <div class="status-indicator">
                    <span class="status-icon">🚀</span>
                    <span class="status-text">Active</span>
                </div>
                <div class="panel-actions">
                    <button class="info-btn" title="Show extension information">ℹ️</button>
                    <button class="close-btn" title="Close panel">✕</button>
                </div>
            </div>
        `;

        // Add styles
        this.addPanelStyles();

        // Add event listeners
        this.floatingPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.hideFloatingPanel();
        });

        this.floatingPanel.querySelector('.info-btn').addEventListener('click', () => {
            this.showInfoTooltip();
        });

        // Make panel draggable
        this.makePanelDraggable();

        // Add to page
        document.body.appendChild(this.floatingPanel);

        // Add entrance animation
        this.floatingPanel.style.opacity = '0';
        this.floatingPanel.style.transform = 'translateY(-20px) scale(0.95)';

        // Force panel to be visible
        this.floatingPanel.style.display = 'flex';
        this.floatingPanel.style.visibility = 'visible';
        this.floatingPanel.style.zIndex = '10000';

        // Animate in
        setTimeout(() => {
            this.floatingPanel.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            this.floatingPanel.style.opacity = '1';
            this.floatingPanel.style.transform = 'translateY(0) scale(1)';
        }, 50);
    }

    removeFloatingPanel() {
        if (this.floatingPanel && this.floatingPanel.parentNode) {
            this.floatingPanel.parentNode.removeChild(this.floatingPanel);
            this.floatingPanel = null;
        }
    }

    updateFloatingPanel(timeTracking, complexity, storyPoints) {
        if (this.floatingPanel) {
            const timeDisplay = this.floatingPanel.querySelector('#current-time-display');
            const complexityDisplay = this.floatingPanel.querySelector('#current-complexity-display');
            const storyPointsDisplay = this.floatingPanel.querySelector('#current-story-points-display');

            if (timeDisplay) timeDisplay.textContent = timeTracking !== null ? `${timeTracking}h` : 'Not found';
            if (complexityDisplay) complexityDisplay.textContent = complexity !== null ? complexity : 'Not found';
            if (storyPointsDisplay) storyPointsDisplay.textContent = storyPoints !== null ? storyPoints : 'Not calculated';
        }
    }

    showFloatingPanel() {
        if (this.floatingPanel) {
            this.floatingPanel.style.display = 'flex';
            this.floatingPanel.style.opacity = '1';
            this.floatingPanel.style.transform = 'translateY(0) scale(1)';
        }
    }

    hideFloatingPanel() {
        if (this.floatingPanel) {
            this.floatingPanel.style.opacity = '0';
            this.floatingPanel.style.transform = 'translateY(-20px) scale(0.95)';

            setTimeout(() => {
                this.floatingPanel.style.display = 'none';
            }, 300);
        }
    }

    removeInfoTooltip() {
        if (this.infoTooltip && this.infoTooltip.parentNode) {
            this.infoTooltip.parentNode.removeChild(this.infoTooltip);
            this.infoTooltip = null;
        }
    }

    positionInfoTooltip() {
        if (this.floatingPanel && this.infoTooltip) {
            const panelRect = this.floatingPanel.getBoundingClientRect();
            this.infoTooltip.style.position = 'fixed';
            this.infoTooltip.style.top = `${panelRect.bottom + 10}px`;
            this.infoTooltip.style.left = `${panelRect.left}px`;
            this.infoTooltip.style.zIndex = '10001';
        }
    }

    showInfoTooltip() {
        // Remove existing tooltip
        this.removeInfoTooltip();

        // Get current values
        const timeTracking = this.extractTimeTracking();
        const complexity = this.extractComplexity();
        const storyPoints = timeTracking !== null && complexity !== null ?
            this.calculateTW(timeTracking, complexity) : null;

        // Create tooltip
        this.infoTooltip = document.createElement('div');
        this.infoTooltip.className = 'jira-story-point-info-tooltip';
        this.infoTooltip.innerHTML = `
            <div class="tooltip-header">
                <span class="tooltip-icon">ℹ️</span>
                <span class="tooltip-title">Story Point Calculator</span>
                <button class="tooltip-close" title="Close">✕</button>
            </div>
            <div class="tooltip-content">
                <div class="info-section">
                    <h4>📊 Current Values</h4>
                    <div class="value-row">
                        <span class="label">Time Tracking:</span>
                        <span class="value ${timeTracking !== null ? 'has-value' : 'no-value'}">
                            ${timeTracking !== null ? `${timeTracking}h` : 'Not detected'}
                        </span>
                    </div>
                    <div class="value-row">
                        <span class="label">Complexity:</span>
                        <span class="value ${complexity !== null ? 'has-value' : 'no-value'}">
                            ${complexity !== null ? complexity : 'Not detected'}
                        </span>
                    </div>
                    <div class="value-row">
                        <span class="label">Story Points:</span>
                        <span class="value ${storyPoints !== null ? 'has-value' : 'no-value'}">
                            ${storyPoints !== null ? storyPoints : 'Not calculated'}
                        </span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>🧮 Formula</h4>
                    <div class="formula">
                        TW = Round(√(Time × Complexity), 2)
                    </div>
                    <div class="example">
                        Example: Time 2h × Complexity 0.2 = √(2 × 0.2) = √0.4 = 0.63
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>⌨️ Keyboard Shortcuts</h4>
                    <div class="shortcut-row">
                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>
                        <span class="shortcut-desc">Activate extension</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd>
                        <span class="shortcut-desc">Deactivate extension</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h4>🔧 Features</h4>
                    <ul class="features-list">
                        <li>✅ Auto-detects time tracking and complexity fields</li>
                        <li>✅ Calculates story points automatically</li>
                        <li>✅ Updates in real-time when fields change</li>
                        <li>✅ Handles JIRA modal dialogs</li>
                        <li>✅ Draggable floating panel</li>
                    </ul>
                </div>
            </div>
        `;

        // Add event listeners
        this.infoTooltip.querySelector('.tooltip-close').addEventListener('click', () => {
            this.removeInfoTooltip();
        });

        // Close tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.infoTooltip.contains(e.target) && !e.target.closest('.info-btn')) {
                this.removeInfoTooltip();
            }
        });

        // Add to DOM
        document.body.appendChild(this.infoTooltip);

        // Add tooltip styles
        this.addTooltipStyles();

        // Position tooltip near the info button
        this.positionInfoTooltip();

        // Auto-remove after 30 seconds
        setTimeout(() => {
            this.removeInfoTooltip();
        }, 30000);
    }

    addPanelStyles() {
        const styleId = 'jira-story-point-panel-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .jira-story-point-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                pointer-events: auto;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .jira-story-point-panel .panel-content {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 8px 12px;
                box-shadow: 
                    0 4px 20px rgba(0, 0, 0, 0.08),
                    0 2px 8px rgba(0, 0, 0, 0.04),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
                min-width: 120px;
                max-width: 200px;
            }

            .jira-story-point-panel .status-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
            }

            .jira-story-point-panel .status-icon {
                font-size: 14px;
                animation: float 3s ease-in-out infinite;
            }

            .jira-story-point-panel .status-text {
                color: #374151;
                font-weight: 500;
                letter-spacing: 0.025em;
            }

            .jira-story-point-panel .panel-actions {
                display: flex;
                gap: 4px;
            }

            .jira-story-point-panel .info-btn,
            .jira-story-point-panel .close-btn {
                background: none;
                border: none;
                border-radius: 6px;
                padding: 4px;
                cursor: pointer;
                font-size: 12px;
                color: #6B7280;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }

            .jira-story-point-panel .info-btn:hover {
                background: rgba(59, 130, 246, 0.1);
                color: #3B82F6;
                transform: scale(1.1);
            }

            .jira-story-point-panel .close-btn:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #EF4444;
                transform: scale(1.1);
            }

            .jira-story-point-panel .info-btn:active,
            .jira-story-point-panel .close-btn:active {
                transform: scale(0.95);
            }

            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
            }

            .jira-story-point-panel:hover {
                transform: translateY(-2px);
                box-shadow: 
                    0 8px 25px rgba(0, 0, 0, 0.12),
                    0 4px 12px rgba(0, 0, 0, 0.06),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4);
            }
        `;

        document.head.appendChild(style);
    }

    addTooltipStyles() {
        const styleId = 'jira-story-point-tooltip-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .jira-story-point-info-tooltip {
                position: fixed;
                z-index: 10001;
                background: rgba(255, 255, 255, 0.98);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 16px;
                box-shadow: 
                    0 20px 60px rgba(0, 0, 0, 0.15),
                    0 8px 25px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6);
                padding: 0;
                max-width: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                color: #374151;
                overflow: hidden;
                animation: tooltipSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes tooltipSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .jira-story-point-info-tooltip .tooltip-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 16px 20px 12px 20px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
                border-bottom: 1px solid rgba(59, 130, 246, 0.1);
            }

            .jira-story-point-info-tooltip .tooltip-icon {
                font-size: 16px;
            }

            .jira-story-point-info-tooltip .tooltip-title {
                font-weight: 600;
                color: #1f2937;
                font-size: 14px;
                flex: 1;
            }

            .jira-story-point-info-tooltip .tooltip-close {
                background: none;
                border: none;
                border-radius: 6px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 12px;
                color: #6B7280;
                transition: all 0.2s ease;
            }

            .jira-story-point-info-tooltip .tooltip-close:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #EF4444;
            }

            .jira-story-point-info-tooltip .tooltip-content {
                padding: 16px 20px 20px 20px;
            }

            .jira-story-point-info-tooltip .info-section {
                margin-bottom: 20px;
            }

            .jira-story-point-info-tooltip .info-section:last-child {
                margin-bottom: 0;
            }

            .jira-story-point-info-tooltip .info-section h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                font-weight: 600;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .jira-story-point-info-tooltip .value-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            }

            .jira-story-point-info-tooltip .value-row:last-child {
                border-bottom: none;
            }

            .jira-story-point-info-tooltip .label {
                font-weight: 500;
                color: #6B7280;
            }

            .jira-story-point-info-tooltip .value {
                font-weight: 600;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
            }

            .jira-story-point-info-tooltip .value.has-value {
                background: rgba(16, 185, 129, 0.1);
                color: #059669;
            }

            .jira-story-point-info-tooltip .value.no-value {
                background: rgba(156, 163, 175, 0.1);
                color: #6B7280;
            }

            .jira-story-point-info-tooltip .formula {
                background: rgba(59, 130, 246, 0.1);
                color: #1d4ed8;
                padding: 12px;
                border-radius: 8px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                margin-bottom: 8px;
            }

            .jira-story-point-info-tooltip .example {
                font-size: 11px;
                color: #6B7280;
                text-align: center;
                font-style: italic;
            }

            .jira-story-point-info-tooltip .shortcut-row {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            }

            .jira-story-point-info-tooltip .shortcut-row:last-child {
                border-bottom: none;
            }

            .jira-story-point-info-tooltip kbd {
                background: rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 10px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                color: #374151;
                min-width: 20px;
                text-align: center;
            }

            .jira-story-point-info-tooltip .shortcut-desc {
                color: #6B7280;
                font-size: 12px;
            }

            .jira-story-point-info-tooltip .features-list {
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .jira-story-point-info-tooltip .features-list li {
                padding: 6px 0;
                color: #6B7280;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .jira-story-point-info-tooltip .features-list li::before {
                content: '';
                width: 6px;
                height: 6px;
                background: #10b981;
                border-radius: 50%;
                flex-shrink: 0;
            }
        `;

        document.head.appendChild(style);
    }

    makePanelDraggable() {
        if (this.floatingPanel) {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            this.floatingPanel.addEventListener('mousedown', dragStart);
            this.floatingPanel.addEventListener('mousemove', drag);
            this.floatingPanel.addEventListener('mouseup', dragEnd);
            this.floatingPanel.addEventListener('mouseleave', dragEnd);

            function dragStart(e) {
                if (e.target.classList.contains('panel-header')) {
                    isDragging = true;
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                    this.style.cursor = 'grabbing';
                }
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    setTranslate(currentX, currentY, this);
                }
            }

            function dragEnd() {
                isDragging = false;
                this.style.cursor = 'grab';
            }

            function setTranslate(xPos, yPos, el) {
                el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
            }
        }
    }

    isJIRAIssuePage() {
        // Check if we're on a JIRA issue page
        const url = window.location.href;
        const isJIRA = url.includes('atlassian.net') || url.includes('jira.com');
        const isIssuePage = url.includes('/browse/') || url.includes('/issues/') || url.includes('/secure/');

        // Also check for JIRA issue elements on the page
        const hasIssueElements = document.querySelector('[data-testid*="issue"]') ||
            document.querySelector('[data-testid*="Issue"]') ||
            document.querySelector('.issue-view') ||
            document.querySelector('#issue-content');
        return isJIRA && (isIssuePage || hasIssueElements);
    }

    autoActivate() {
        this.isActive = true;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'true');

        // Set up field observer immediately
        this.setupFieldObserver();

        // Start continuous monitoring
        this.startContinuousMonitoring();

        // Create floating panel
        this.createFloatingPanel();

        // Show activation notification
        this.showNotification('✅ Story Point Calculator Auto-Activated', 'success');

        // Initial calculation
        this.calculateStoryPoints();
    }
}

// Initialize the calculator
try {
    const calculator = new JIRAStoryPointCalculator();

    // Expose to window for debugging
    window.jiraStoryPointCalculator = calculator;
} catch (error) {
    console.error('JIRA Story Point Calculator: ❌ Error during initialization:', error);
    console.error('JIRA Story Point Calculator: Error stack:', error.stack);
}

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
        return 'Calculator not found';
    }
    return 'Calculator not found';
};

// Panel control functions
window.showStoryPointPanel = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.showFloatingPanel();
        return 'Panel shown';
    }
    return 'Calculator not found';
};

window.hideStoryPointPanel = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.hideFloatingPanel();
        return 'Panel hidden';
    }
    return 'Calculator not found';
};

// Debug functions
window.debugStoryPointPanel = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.debugFloatingPanel();
        return 'Panel debug executed';
    }
    return 'Calculator not found';
};

window.forceShowStoryPointPanel = () => {
    if (window.jiraStoryPointCalculator && window.jiraStoryPointCalculator.floatingPanel) {
        const panel = window.jiraStoryPointCalculator.floatingPanel;
        panel.style.display = 'flex';
        panel.style.visibility = 'visible';
        panel.style.opacity = '1';
        panel.style.zIndex = '10000';
        return 'Panel forced to visible';
    }
    return 'Calculator or panel not found';
};

// Formula testing function
window.testStoryPointFormula = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.testFormula();
        return 'Formula test executed';
    }
    return 'Calculator not found';
};

// Complexity debugging function
window.debugComplexityFields = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.debugComplexityFields();
        return 'Complexity debug executed';
    }
    return 'Calculator not found';
};

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {


    // Ctrl+Shift+A to activate extension
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (window.activateStoryPointCalculator) {
            window.activateStoryPointCalculator();
        }
    }

    // Ctrl+Shift+D to deactivate extension
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (window.deactivateStoryPointCalculator) {
            window.deactivateStoryPointCalculator();
        }
    }
});

console.log('JIRA Story Point Calculator: Global functions available:');
console.log('- activateStoryPointCalculator() - Activate the extension');
console.log('- deactivateStoryPointCalculator() - Deactivate the extension');
console.log('- triggerStoryPointCalculation() - Manually calculate story points');
console.log('- showStoryPointPanel() - Show the floating panel');
console.log('- hideStoryPointPanel() - Hide the floating panel');
console.log('- debugStoryPointPanel() - Debug the floating panel');
console.log('- forceShowStoryPointPanel() - Force the panel to be visible');
console.log('- testStoryPointFormula() - Test the new formula with sample values');
console.log('- debugComplexityFields() - Debug complexity field detection');
console.log('- Keyboard shortcuts:');
console.log('  Ctrl+Shift+A: Activate extension');
console.log('  Ctrl+Shift+D: Deactivate extension');

