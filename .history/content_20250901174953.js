// JIRA Story Point Calculator - Content Script
class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.observer = null;
        this.debounceTimer = null;
        this.floatingPanel = null;
        this.init();
    }

    init() {
        // Wait for JIRA to fully load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCalculator());
        } else {
            this.setupCalculator();
        }
    }

    setupCalculator() {
        if (this.isInitialized) return;

        console.log('JIRA Story Point Calculator: Initializing...');

        // Create persistent floating panel
        this.createFloatingPanel();

        // Debug: Log all available fields to help identify the correct selectors
        this.debugAvailableFields();

        // Initial calculation
        this.calculateStoryPoints();

        // Set up mutation observer to watch for field changes
        this.setupFieldObserver();

        // Also listen for custom events
        document.addEventListener('jira-story-point-recalculate', () => {
            this.calculateStoryPoints();
        });

        this.isInitialized = true;
        console.log('JIRA Story Point Calculator: Ready!');
    }

    createFloatingPanel() {
        // Remove existing panel if any
        if (this.floatingPanel) {
            this.floatingPanel.remove();
        }

        // Create floating panel
        this.floatingPanel = document.createElement('div');
        this.floatingPanel.id = 'jira-story-point-calculator-panel';
        this.floatingPanel.innerHTML = `
            <div class="panel-header">
                <span>📊 Story Point Calculator</span>
                <button class="close-btn" title="Hide Panel">×</button>
            </div>
            <div class="panel-content">
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
                    <button id="recalculate-btn" class="action-btn">🔄 Recalculate</button>
                    <button id="debug-btn" class="action-btn">🐛 Debug Fields</button>
                </div>
            </div>
        `;

        // Add styles
        this.addPanelStyles();

        // Add event listeners
        this.floatingPanel.querySelector('.close-btn').addEventListener('click', () => {
            this.floatingPanel.style.display = 'none';
        });

        this.floatingPanel.querySelector('#recalculate-btn').addEventListener('click', () => {
            this.calculateStoryPoints();
        });

        this.floatingPanel.querySelector('#debug-btn').addEventListener('click', () => {
            this.debugAvailableFields();
        });

        // Make panel draggable
        this.makePanelDraggable();

        // Add to page
        document.body.appendChild(this.floatingPanel);

        console.log('JIRA Story Point Calculator: Floating panel created');
    }

    addPanelStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #jira-story-point-calculator-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: white;
                border: 2px solid #007bff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
            }
            #jira-story-point-calculator-panel .panel-header {
                background: #007bff;
                color: white;
                padding: 10px 15px;
                border-radius: 6px 6px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            #jira-story-point-calculator-panel .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #jira-story-point-calculator-panel .close-btn:hover {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
            #jira-story-point-calculator-panel .panel-content {
                padding: 15px;
            }
            #jira-story-point-calculator-panel .field-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px solid #eee;
            }
            #jira-story-point-calculator-panel .field-row label {
                font-weight: 600;
                color: #333;
            }
            #jira-story-point-calculator-panel .field-row span {
                color: #007bff;
                font-weight: 500;
            }
            #jira-story-point-calculator-panel .panel-actions {
                margin-top: 15px;
                display: flex;
                gap: 10px;
            }
            #jira-story-point-calculator-panel .action-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                flex: 1;
            }
            #jira-story-point-calculator-panel .action-btn:hover {
                background: #0056b3;
            }
            #jira-story-point-calculator-panel .action-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }

    makePanelDraggable() {
        const header = this.floatingPanel.querySelector('.panel-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close-btn')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;

                this.floatingPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    updatePanelDisplay(timeTracking, complexity, storyPoints) {
        if (this.floatingPanel) {
            const timeDisplay = this.floatingPanel.querySelector('#current-time-display');
            const complexityDisplay = this.floatingPanel.querySelector('#current-complexity-display');
            const storyPointsDisplay = this.floatingPanel.querySelector('#current-story-points-display');

            if (timeDisplay) timeDisplay.textContent = timeTracking !== null ? `${timeTracking}h` : 'Not found';
            if (complexityDisplay) complexityDisplay.textContent = complexity !== null ? complexity : 'Not found';
            if (storyPointsDisplay) storyPointsDisplay.textContent = storyPoints !== null ? storyPoints : 'Not calculated';
        }
    }

    setupFieldObserver() {
        // Watch for changes in the JIRA issue form
        const targetNode = document.querySelector('[data-testid="issue.views.issue-base.content.content"]') ||
            document.querySelector('#issue-content') ||
            document.body;

        this.observer = new MutationObserver((mutations) => {
            let shouldRecalculate = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Check if relevant fields have changed
                    if (this.hasRelevantFieldChanged(mutation)) {
                        shouldRecalculate = true;
                        console.log('JIRA Story Point Calculator: Field change detected, will recalculate');
                    }
                }
            });

            if (shouldRecalculate) {
                // Debounce the calculation to avoid excessive calls
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    console.log('JIRA Story Point Calculator: Triggering recalculation after field change');
                    this.calculateStoryPoints();
                }, 300); // Reduced debounce time for better responsiveness
            }
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'data-value', 'class', 'style', 'selected', 'checked']
        });

        // Also watch for input events on form fields
        document.addEventListener('input', (e) => {
            if (this.isRelevantInput(e.target)) {
                console.log('JIRA Story Point Calculator: Input event detected on relevant field');
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 200);
            }
        });

        document.addEventListener('change', (e) => {
            if (this.isRelevantInput(e.target)) {
                console.log('JIRA Story Point Calculator: Change event detected on relevant field');
                this.calculateStoryPoints();
            }
        });

        console.log('JIRA Story Point Calculator: Field observer set up with enhanced detection');
    }

        hasRelevantFieldChanged(mutation) {
        // Check if the mutation involves time tracking or complexity fields
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
            
            // Check for story point fields
            if (target.closest('[data-testid*="story-point"]') ||
                target.closest('[data-testid*="storypoint"]')) {
                return true;
            }
        }
        return false;
    }

    isRelevantInput(element) {
        if (!element || !element.tagName) return false;
        
        const tagName = element.tagName.toLowerCase();
        if (tagName !== 'input' && tagName !== 'select' && tagName !== 'textarea') return false;
        
        // Check if it's a relevant field
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
        try {
            const timeTracking = this.extractTimeTracking();
            const complexity = this.extractComplexity();

            if (timeTracking === null || complexity === null) {
                console.log('JIRA Story Point Calculator: Missing required fields');
                return;
            }

            const storyPoints = this.calculateTW(timeTracking, complexity);
            this.updateStoryPointField(storyPoints);
            this.updatePanelDisplay(timeTracking, complexity, storyPoints);

            console.log(`JIRA Story Point Calculator: Calculated ${storyPoints} story points`);
        } catch (error) {
            console.error('JIRA Story Point Calculator: Error calculating story points:', error);
        }
    }

    extractTimeTracking() {
        // Try multiple selectors to find time tracking field
        const selectors = [
            '[data-testid="issue.views.issue-base.fields.time-tracking"]',
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
                    console.log('JIRA Story Point Calculator: Found time tracking field:', selector);
                    return timeValue;
                }
            }
        }

        console.warn('JIRA Story Point Calculator: Could not find time tracking field');
        return null;
    }

    extractTimeValue(element) {
        // Try to get time value from various sources
        let timeText = '';

        if (element.tagName === 'INPUT') {
            timeText = element.value;
        } else if (element.tagName === 'SELECT') {
            timeText = element.value || element.options[element.selectedIndex]?.text;
        } else {
            // Look for time display elements
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

        // Remove extra whitespace and normalize
        timeString = timeString.replace(/\s+/g, ' ').trim();

        // Handle various time formats
        const patterns = [
            // "25m" -> 0.42 hours
            /^(\d+(?:\.\d+)?)m$/i,
            // "1h 15m" -> 1.25 hours
            /^(\d+(?:\.\d+)?)h\s+(\d+(?:\.\d+)?)m$/i,
            // "2.5h" -> 2.5 hours
            /^(\d+(?:\.\d+)?)h$/i,
            // "90m" -> 1.5 hours
            /^(\d+(?:\.\d+)?)m$/i
        ];

        for (let i = 0; i < patterns.length; i++) {
            const match = timeString.match(patterns[i]);
            if (match) {
                switch (i) {
                    case 0: // "25m"
                        return parseFloat(match[1]) / 60;
                    case 1: // "1h 15m"
                        const hours = parseFloat(match[1]);
                        const minutes = parseFloat(match[2]);
                        return hours + (minutes / 60);
                    case 2: // "2.5h"
                        return parseFloat(match[1]);
                    case 3: // "90m" (same as case 0 but for larger minute values)
                        return parseFloat(match[1]) / 60;
                }
            }
        }

        // Try to parse as decimal hours
        const decimalMatch = timeString.match(/^(\d+(?:\.\d+)?)$/);
        if (decimalMatch) {
            return parseFloat(decimalMatch[1]);
        }

        console.warn('JIRA Story Point Calculator: Could not parse time format:', timeString);
        return null;
    }

    extractComplexity() {
        // Try multiple selectors to find complexity field
        const selectors = [
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
                    console.log('JIRA Story Point Calculator: Found complexity field:', selector);
                    return complexityValue;
                }
            }
        }

        console.warn('JIRA Story Point Calculator: Could not find complexity field');
        return null;
    }

    extractComplexityValue(element) {
        let value = null;

        if (element.tagName === 'INPUT') {
            value = element.value;
        } else if (element.tagName === 'SELECT') {
            value = element.value || element.options[element.selectedIndex]?.text;
        } else {
            // Look for display elements
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
        // TW = Round((Time tracking * Complexity), 2) + 0
        const result = timeTracking * complexity;
        return Math.round(result * 100) / 100; // Round to 2 decimal places
    }

        updateStoryPointField(storyPoints) {
        console.log('JIRA Story Point Calculator: Attempting to update story point field with value:', storyPoints);
        
        // Use the exact selector from the HTML you provided
        const storyPointContainer = document.querySelector('[data-testid="issue-field-number.ui.issue-field-story-point-estimate--container"]');
        
        if (storyPointContainer) {
            console.log('JIRA Story Point Calculator: Found story point container');
            
            // Find the input field within the container
            let inputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');
            
            if (inputField) {
                console.log('JIRA Story Point Calculator: Found existing input field, updating value');
                // Set the value
                inputField.value = storyPoints;
                
                // Trigger change events
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Also try to trigger JIRA's internal update mechanism
                inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                
                console.log('JIRA Story Point Calculator: Updated story point field with value:', storyPoints);
                return true;
            } else {
                console.log('JIRA Story Point Calculator: No input field found, trying to enter edit mode');
                // If no input field found, try to click the edit button and then set the value
                const editButton = storyPointContainer.querySelector('button[aria-label="Edit Story Points"]');
                if (editButton) {
                    console.log('JIRA Story Point Calculator: Clicking edit button');
                    editButton.click();
                    
                    // Wait a bit for the input to appear, then set the value
                    setTimeout(() => {
                        const newInputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');
                        if (newInputField) {
                            console.log('JIRA Story Point Calculator: Found new input field after edit mode, setting value');
                            newInputField.value = storyPoints;
                            newInputField.dispatchEvent(new Event('input', { bubbles: true }));
                            newInputField.dispatchEvent(new Event('change', { bubbles: true }));
                            newInputField.dispatchEvent(new Event('blur', { bubbles: true }));
                            console.log('JIRA Story Point Calculator: Updated story point field after edit mode with value:', storyPoints);
                        } else {
                            console.warn('JIRA Story Point Calculator: Still no input field found after edit mode');
                        }
                    }, 200); // Increased timeout for better reliability
                    return true;
                } else {
                    console.warn('JIRA Story Point Calculator: No edit button found');
                }
            }
        } else {
            console.warn('JIRA Story Point Calculator: Story point container not found');
        }

        // Fallback to old selectors
        console.log('JIRA Story Point Calculator: Trying fallback selectors');
        const fallbackSelectors = [
            '[data-testid*="story-point"]',
            '[data-testid*="storypoint"]',
            '.story-point-field',
            '#story-point',
            '[data-field-id*="story"]',
            'input[name*="story"]',
            'input[name*="point"]'
        ];

        for (const selector of fallbackSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('JIRA Story Point Calculator: Found fallback element with selector:', selector);
                this.setFieldValue(element, storyPoints);
                return true;
            }
        }

        console.warn('JIRA Story Point Calculator: Could not find story point field with any selector');
        return false;
    }

    setFieldValue(element, value) {
        if (element.tagName === 'INPUT') {
            element.value = value;
            // Trigger change event
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // For non-input elements, try to find an input within
            const input = element.querySelector('input');
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    debugAvailableFields() {
        console.log('JIRA Story Point Calculator: Debugging available fields...');

        // Find all elements with data-testid attributes
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

        // Also look for form fields
        const formInputs = document.querySelectorAll('input, select, textarea');
        const formFields = [];
        formInputs.forEach(input => {
            const name = input.name || '';
            const id = input.id || '';
            const placeholder = input.placeholder || '';
            if (name.includes('time') || name.includes('complexity') || name.includes('story') ||
                id.includes('time') || id.includes('complexity') || id.includes('story') ||
                placeholder.includes('time') || placeholder.includes('complexity') || placeholder.includes('story')) {
                formFields.push({ name, id, placeholder, element: input });
            }
        });

        console.log('Form fields:', formFields);
    }
}

// Initialize the calculator when the script loads
const calculator = new JIRAStoryPointCalculator();

// Expose calculator to window for debugging
window.jiraStoryPointCalculator = calculator;

// Add a global function to manually trigger calculation
window.triggerStoryPointCalculation = () => {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.calculateStoryPoints();
        return 'Calculation triggered manually';
    }
    return 'Calculator not found';
};
