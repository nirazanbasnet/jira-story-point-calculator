// JIRA Story Point Calculator - Content Script
console.log('JIRA Story Point Calculator: Content script loaded!');
console.log('JIRA Story Point Calculator: Current URL:', window.location.href);
console.log('JIRA Story Point Calculator: Document ready state:', document.readyState);

class JIRAStoryPointCalculator {
    constructor() {
        console.log('JIRA Story Point Calculator: Constructor called');
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.isActive = false;
        this.observer = null;
        this.debounceTimer = null;
        this.init();
    }

    init() {
        console.log('JIRA Story Point Calculator: init() method called');
        console.log('JIRA Story Point Calculator: Document ready state:', document.readyState);
        console.log('JIRA Story Point Calculator: Current URL:', window.location.href);

        // Check if we're on a JIRA issue page
        if (this.isJIRAIssuePage()) {
            console.log('JIRA Story Point Calculator: JIRA issue page detected, auto-activating...');
            // Auto-activate on JIRA issue pages
            this.autoActivate();
        } else {
            console.log('JIRA Story Point Calculator: Not a JIRA issue page, checking previous activation status');
            // Check if extension was previously activated
            this.checkActivationStatus();
        }

        // Wait for JIRA to fully load
        if (document.readyState === 'loading') {
            console.log('JIRA Story Point Calculator: Document still loading, waiting for DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('JIRA Story Point Calculator: DOMContentLoaded event fired');
                this.setupCalculator();
            });
        } else {
            console.log('JIRA Story Point Calculator: Document already loaded, setting up calculator immediately');
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
        console.log('JIRA Story Point Calculator: activate() method called');

        if (this.isActive) {
            console.log('JIRA Story Point Calculator: Extension already active, returning');
            return;
        }

        console.log('JIRA Story Point Calculator: Setting extension to active state');
        this.isActive = true;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'true');

        // Set up field observer
        console.log('JIRA Story Point Calculator: Setting up field observer');
        this.setupFieldObserver();

        // Create persistent floating panel
        console.log('JIRA Story Point Calculator: Creating floating panel');
        this.createFloatingPanel();

        // Show activation notification
        console.log('JIRA Story Point Calculator: Showing activation notification');
        this.showNotification('✅ Story Point Calculator ACTIVATED', 'success');

        // Initial calculation
        console.log('JIRA Story Point Calculator: Performing initial calculation');
        this.calculateStoryPoints();

        console.log('JIRA Story Point Calculator: Extension ACTIVATED successfully');
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

        // Stop continuous monitoring
        this.stopContinuousMonitoring();

        // Remove floating panel
        this.removeFloatingPanel();

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

        console.log('JIRA Story Point Calculator: Setting up field observer...');

        // Watch for direct input events with better targeting
        document.addEventListener('input', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                console.log('JIRA Story Point Calculator: Input event detected on relevant field:', e.target);
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 200);
            }
        }, true); // Use capture phase to catch all input events

        document.addEventListener('change', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                console.log('JIRA Story Point Calculator: Change event detected on relevant field:', e.target);
                this.calculateStoryPoints();
            }
        }, true); // Use capture phase to catch all change events

        // Watch for JIRA-specific field updates
        document.addEventListener('DOMSubtreeModified', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantFieldUpdate(e.target)) {
                console.log('JIRA Story Point Calculator: DOM subtree modification detected on relevant field');
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 500);
            }
        }, true);

        console.log('JIRA Story Point Calculator: Field observer active');
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
            console.log('JIRA Story Point Calculator: Calculating story points...');

            const timeTracking = this.extractTimeTracking();
            const complexity = this.extractComplexity();

            console.log('JIRA Story Point Calculator: Extracted values - Time:', timeTracking, 'Complexity:', complexity);

            if (timeTracking === null || complexity === null) {
                console.log('JIRA Story Point Calculator: Missing required fields, skipping calculation');
                return;
            }

            const storyPoints = this.calculateTW(timeTracking, complexity);
            console.log('JIRA Story Point Calculator: Calculated story points:', storyPoints);

            const success = this.updateStoryPointField(storyPoints);

            // Update floating panel
            this.updateFloatingPanel(timeTracking, complexity, storyPoints);

            if (success) {
                console.log(`JIRA Story Point Calculator: ✅ Updated story points to ${storyPoints}`);
                // Don't show notification for every update to avoid spam
                // this.showNotification(`📊 Story Points: ${storyPoints}`, 'success');
            } else {
                console.log('JIRA Story Point Calculator: ❌ Failed to update story points');
            }
        } catch (error) {
            console.error('JIRA Story Point Calculator: Error calculating story points:', error);
        }
    }

    // Add continuous monitoring for field changes
    startContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        console.log('JIRA Story Point Calculator: Starting continuous monitoring...');

        // Check for field changes every 2 seconds
        this.monitoringInterval = setInterval(() => {
            if (!this.isActive) return;

            // Check if fields have changed by comparing current values with stored values
            const currentTime = this.extractTimeTracking();
            const currentComplexity = this.extractComplexity();

            if (this.lastTimeTracking !== currentTime || this.lastComplexity !== currentComplexity) {
                console.log('JIRA Story Point Calculator: Field values changed, recalculating...');
                this.lastTimeTracking = currentTime;
                this.lastComplexity = currentComplexity;
                this.calculateStoryPoints();
            }
        }, 2000);

        console.log('JIRA Story Point Calculator: Continuous monitoring started');
    }

    // Enhanced method to handle immediate field updates
    handleImmediateFieldUpdate() {
        if (!this.isActive) return;

        console.log('JIRA Story Point Calculator: Handling immediate field update...');

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
        console.log('JIRA Story Point Calculator: Testing new formula...');

        const testCases = [
            { time: 2.0, complexity: 0.2, expected: 0.63 },
            { time: 1.5, complexity: 0.3, expected: 0.67 },
            { time: 3.0, complexity: 1.0, expected: 1.73 },
            { time: 0.5, complexity: 0.1, expected: 0.22 }
        ];

        testCases.forEach(testCase => {
            const result = this.calculateTW(testCase.time, testCase.complexity);
            const passed = Math.abs(result - testCase.expected) < 0.01;
            console.log(`Test: Time=${testCase.time}h, Complexity=${testCase.complexity} → Result=${result}, Expected=${testCase.expected}, ${passed ? '✅ PASS' : '❌ FAIL'}`);
        });
    }

    stopContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('JIRA Story Point Calculator: Continuous monitoring stopped');
        }
    }

    // Enhanced method to handle immediate field updates
    handleImmediateFieldUpdate() {
        if (!this.isActive) return;

        console.log('JIRA Story Point Calculator: Handling immediate field update...');

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
                    console.log('JIRA Story Point Calculator: Found element with selector:', selector);
                    console.log('JIRA Story Point Calculator: Element:', element);
                    console.log('JIRA Story Point Calculator: Element text content:', element.textContent);
                    console.log('JIRA Story Point Calculator: Element HTML:', element.outerHTML);

                    const complexityValue = this.extractComplexityValue(element);
                    if (complexityValue !== null) {
                        console.log('JIRA Story Point Calculator: Found complexity field with selector:', selector);
                        console.log('JIRA Story Point Calculator: Complexity value:', complexityValue);
                        return complexityValue;
                    }
                }
            } catch (error) {
                console.log('JIRA Story Point Calculator: Error with selector:', selector, error);
            }
        }

        // Special handling for JIRA complexity field
        console.log('JIRA Story Point Calculator: Trying special JIRA complexity extraction...');
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

        // Look for complexity by searching all elements with complexity-related text
        console.log('JIRA Story Point Calculator: Searching for complexity in all elements...');
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            if (element.textContent && element.textContent.toLowerCase().includes('complexity')) {
                console.log('JIRA Story Point Calculator: Found element with complexity text:', element);
                console.log('JIRA Story Point Calculator: Element text:', element.textContent);
                console.log('JIRA Story Point Calculator: Element HTML:', element.outerHTML);
                
                // Look for a value near this element
                const nearbyValue = this.findValueNearElement(element);
                if (nearbyValue !== null) {
                    console.log('JIRA Story Point Calculator: Found nearby value:', nearbyValue);
                    return nearbyValue;
                }
            }
        }

        // Look for complexity values in any number fields
        console.log('JIRA Story Point Calculator: Looking for complexity values in number fields...');
        const numberElements = document.querySelectorAll('[data-testid*="number"], [data-testid*="Number"]');
        for (const element of numberElements) {
            const text = element.textContent.trim();
            const value = parseFloat(text);
            if (!isNaN(value) && this.complexityValues.includes(value)) {
                console.log('JIRA Story Point Calculator: Found potential complexity value in number field:', value);
                console.log('JIRA Story Point Calculator: Element:', element);
                return value;
            }
        }

        console.warn('JIRA Story Point Calculator: Could not extract complexity information');
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

        console.log('JIRA Story Point Calculator: Formula calculation:', {
            timeTracking: timeTracking,
            complexity: complexity,
            product: product,
            rootResult: rootResult,
            roundedResult: roundedResult
        });

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

        console.log('All elements containing "complexity":', complexityElements);

        // Look for custom field containers
        const customFieldContainers = document.querySelectorAll('[data-testid*="customfield"]');
        console.log('Custom field containers:', customFieldContainers);

        // Look for number fields
        const numberFields = document.querySelectorAll('[data-testid*="number"], [data-testid*="Number"]');
        console.log('Number fields:', numberFields);

        // Look for field labels
        const labels = document.querySelectorAll('label');
        const complexityLabels = Array.from(labels).filter(label =>
            label.textContent.toLowerCase().includes('complexity')
        );
        console.log('Complexity labels:', complexityLabels);

        console.log('=== END COMPLEXITY DEBUG ===');
    }

    // Debug method for floating panel
    debugFloatingPanel() {
        console.log('JIRA Story Point Calculator: Debugging floating panel...');

        if (!this.floatingPanel) {
            console.log('❌ No floating panel exists');
            return;
        }

        console.log('✅ Floating panel exists:', this.floatingPanel);
        console.log('Panel ID:', this.floatingPanel.id);
        console.log('Panel parent:', this.floatingPanel.parentNode);
        console.log('Panel display style:', this.floatingPanel.style.display);
        console.log('Panel computed display:', window.getComputedStyle(this.floatingPanel).display);
        console.log('Panel visibility:', this.floatingPanel.style.visibility);
        console.log('Panel opacity:', this.floatingPanel.style.opacity);
        console.log('Panel z-index:', this.floatingPanel.style.zIndex);
        console.log('Panel position:', this.floatingPanel.style.position);
        console.log('Panel top:', this.floatingPanel.style.top);
        console.log('Panel right:', this.floatingPanel.style.right);

        // Check if panel is in viewport
        const rect = this.floatingPanel.getBoundingClientRect();
        console.log('Panel bounding rect:', rect);
        console.log('Panel is visible in viewport:', rect.width > 0 && rect.height > 0);

        // Check if panel is in DOM
        const panelInDOM = document.body.contains(this.floatingPanel);
        console.log('Panel is in DOM:', panelInDOM);

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
        console.log('Forcing panel to be visible...');
        this.floatingPanel.style.display = 'flex';
        this.floatingPanel.style.visibility = 'visible';
        this.floatingPanel.style.opacity = '1';
        this.floatingPanel.style.zIndex = '10000';

        console.log('Panel should now be visible');
    }

    createFloatingPanel() {
        // Remove existing panel if any
        this.removeFloatingPanel();

        // Create floating panel
        this.floatingPanel = document.createElement('div');
        this.floatingPanel.id = 'jira-story-point-calculator-panel';
        this.floatingPanel.innerHTML = `
            <div class="panel-header">
                <span>📊 Story Point Calculator</span>
                <div class="panel-controls">
                    <button class="minimize-btn" title="Minimize Panel">−</button>
                    <button class="close-btn" title="Hide Panel">×</button>
                </div>
            </div>
            <div class="panel-content">
                <div class="status-section">
                    <div class="status-item">
                        <span class="status-label">Status:</span>
                        <span class="status-value active">✅ ACTIVE</span>
                    </div>
                </div>
                <div class="field-info">
                    <div class="field-row">
                        <label>Time Tracking:</label>
                        <span id="current-time-display">-</span>
                    </div>
                    <div class="field-row">
                        <label>Complexity:</label>
                        <span id="current-complexity-display">-</span>
                    </div>
                    <div class="field-row">
                        <label>Story Points:</label>
                        <span id="current-story-points-display">-</span>
                    </div>
                </div>
                <div class="panel-actions">
                    <button id="recalculate-btn" class="action-btn primary">🔄 Recalculate</button>
                    <button id="debug-btn" class="action-btn secondary">🐛 Debug</button>
                    <button id="debug-panel-btn" class="action-btn secondary">🔍 Debug Panel</button>
                </div>
                <div class="panel-footer">
                    <small>Extension is monitoring field changes</small>
                </div>
            </div>
        `;

        // Add styles
        this.addPanelStyles();

        // Add event listeners
        this.floatingPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.floatingPanel.style.display = 'none';
        });

        this.floatingPanel.querySelector('.minimize-btn').addEventListener('click', () => {
            this.togglePanelMinimized();
        });

        this.floatingPanel.querySelector('#recalculate-btn').addEventListener('click', () => {
            this.calculateStoryPoints();
        });

        this.floatingPanel.querySelector('#debug-btn').addEventListener('click', () => {
            this.debugAvailableFields();
        });

        this.floatingPanel.querySelector('#debug-panel-btn').addEventListener('click', () => {
            console.log('JIRA Story Point Calculator: Debug panel button clicked');
            this.debugFloatingPanel();
        });

        // Make panel draggable
        this.makePanelDraggable();

        // Add to page
        document.body.appendChild(this.floatingPanel);

        console.log('JIRA Story Point Calculator: Floating panel created and added to DOM');
        console.log('JIRA Story Point Calculator: Panel element:', this.floatingPanel);
        console.log('JIRA Story Point Calculator: Panel display style:', this.floatingPanel.style.display);
        console.log('JIRA Story Point Calculator: Panel computed style:', window.getComputedStyle(this.floatingPanel).display);

        // Force panel to be visible
        this.floatingPanel.style.display = 'flex';
        this.floatingPanel.style.visibility = 'visible';
        this.floatingPanel.style.opacity = '1';

        // Ensure panel is on top
        this.floatingPanel.style.zIndex = '10000';

        console.log('JIRA Story Point Calculator: Panel visibility forced to visible');
    }

    removeFloatingPanel() {
        if (this.floatingPanel && this.floatingPanel.parentNode) {
            this.floatingPanel.remove();
            this.floatingPanel = null;
        }
    }

    togglePanelMinimized() {
        if (this.floatingPanel) {
            const content = this.floatingPanel.querySelector('.panel-content');
            const minimizeBtn = this.floatingPanel.querySelector('.minimize-btn');

            if (content.style.display === 'none') {
                content.style.display = 'block';
                minimizeBtn.textContent = '−';
                minimizeBtn.title = 'Minimize Panel';
            } else {
                content.style.display = 'none';
                minimizeBtn.textContent = '+';
                minimizeBtn.title = 'Expand Panel';
            }
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
        }
    }

    hideFloatingPanel() {
        if (this.floatingPanel) {
            this.floatingPanel.style.display = 'none';
        }
    }

    toggleFloatingPanel() {
        if (this.floatingPanel) {
            if (this.floatingPanel.style.display === 'none') {
                this.showFloatingPanel();
            } else {
                this.hideFloatingPanel();
            }
        }
    }

    addPanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #jira-story-point-calculator-panel {
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                background-color: #fff !important;
                border: 1px solid #ccc !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
                z-index: 10000 !important;
                display: flex !important;
                flex-direction: column !important;
                width: 300px !important;
                height: 200px !important;
                overflow: hidden !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 14px !important;
                color: #333 !important;
                box-sizing: border-box !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: #f0f0f0;
                border-bottom: 1px solid #eee;
                font-weight: bold;
                font-size: 16px;
            }
            .panel-header span {
                flex-grow: 1;
                text-align: center;
            }
            .panel-controls {
                display: flex;
                gap: 5px;
            }
            .minimize-btn, .close-btn {
                background-color: #e0e0e0;
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                color: #555;
                transition: background-color 0.2s ease;
            }
            .minimize-btn:hover, .close-btn:hover {
                background-color: #d0d0d0;
            }
            .panel-content {
                flex-grow: 1;
                padding: 15px;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
            }
            .status-section {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            .status-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .status-label {
                font-weight: bold;
                color: #666;
            }
            .status-value {
                font-weight: bold;
                color: #28a745; /* Green for active */
            }
            .field-info {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            .field-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .field-row label {
                font-weight: bold;
                color: #555;
            }
            .field-row span {
                font-weight: bold;
                color: #007bff; /* Blue for values */
            }
            .panel-actions {
                display: flex;
                justify-content: space-around;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #eee;
            }
            .action-btn {
                padding: 8px 15px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: background-color 0.2s ease;
            }
            .action-btn.primary {
                background-color: #007bff;
                color: white;
            }
            .action-btn.primary:hover {
                background-color: #0056b3;
            }
            .action-btn.secondary {
                background-color: #6c757d;
                color: white;
            }
            .action-btn.secondary:hover {
                background-color: #5a6268;
            }
            .panel-footer {
                text-align: center;
                padding-top: 10px;
                color: #888;
                font-size: 12px;
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

        console.log('JIRA Story Point Calculator: Page analysis:', {
            url: url,
            isJIRA: isJIRA,
            isIssuePage: isIssuePage,
            hasIssueElements: hasIssueElements
        });

        return isJIRA && (isIssuePage || hasIssueElements);
    }

    autoActivate() {
        console.log('JIRA Story Point Calculator: Auto-activating extension...');
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

        console.log('JIRA Story Point Calculator: Extension auto-activated successfully');
    }
}

// Initialize the calculator
console.log('JIRA Story Point Calculator: About to create calculator instance...');
try {
    const calculator = new JIRAStoryPointCalculator();
    console.log('JIRA Story Point Calculator: Calculator instance created:', calculator);

    // Expose to window for debugging
    console.log('JIRA Story Point Calculator: Assigning calculator to window.jiraStoryPointCalculator...');
    window.jiraStoryPointCalculator = calculator;
    console.log('JIRA Story Point Calculator: Calculator assigned to window:', window.jiraStoryPointCalculator);
    console.log('JIRA Story Point Calculator: ✅ Initialization successful!');
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

window.toggleStoryPointPanel = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.toggleFloatingPanel();
        return 'Panel toggled';
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
    // Ctrl+Shift+P to toggle panel
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (window.toggleStoryPointPanel) {
            window.toggleStoryPointPanel();
        }
    }

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
console.log('- toggleStoryPointPanel() - Toggle panel visibility');
console.log('- debugStoryPointPanel() - Debug the floating panel');
console.log('- forceShowStoryPointPanel() - Force the panel to be visible');
console.log('- testStoryPointFormula() - Test the new formula with sample values');
console.log('- debugComplexityFields() - Debug complexity field detection');
console.log('- Keyboard shortcuts:');
console.log('  Ctrl+Shift+P: Toggle floating panel');
console.log('  Ctrl+Shift+A: Activate extension');
console.log('  Ctrl+Shift+D: Deactivate extension');

