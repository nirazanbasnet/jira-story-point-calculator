// JIRA Story Point Calculator - Content Script
class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.observer = null;
        this.debounceTimer = null;
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
                    }
                }
            });

            if (shouldRecalculate) {
                // Debounce the calculation to avoid excessive calls
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 500);
            }
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'data-value']
        });
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
        } else {
            // Look for time display elements
            const timeDisplay = element.querySelector('.time-tracking-display, .time-value, [data-testid*="time"]');
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
        // Use the exact selector from the HTML you provided
        const storyPointContainer = document.querySelector('[data-testid="issue-field-number.ui.issue-field-story-point-estimate--container"]');

        if (storyPointContainer) {
            // Find the input field within the container
            const inputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');

            if (inputField) {
                // Set the value
                inputField.value = storyPoints;

                // Trigger change events
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));

                console.log('JIRA Story Point Calculator: Updated story point field with value:', storyPoints);
                return true;
            } else {
                // If no input field found, try to click the edit button and then set the value
                const editButton = storyPointContainer.querySelector('button[aria-label="Edit Story Points"]');
                if (editButton) {
                    editButton.click();

                    // Wait a bit for the input to appear, then set the value
                    setTimeout(() => {
                        const newInputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');
                        if (newInputField) {
                            newInputField.value = storyPoints;
                            newInputField.dispatchEvent(new Event('input', { bubbles: true }));
                            newInputField.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('JIRA Story Point Calculator: Updated story point field after edit mode with value:', storyPoints);
                        }
                    }, 100);
                    return true;
                }
            }
        }

        // Fallback to old selectors
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
                this.setFieldValue(element, storyPoints);
                return true;
            }
        }

        console.warn('JIRA Story Point Calculator: Could not find story point field');
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
