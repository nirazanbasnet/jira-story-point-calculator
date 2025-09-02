// JIRA Story Point Calculator - Content Script
class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.observer = null;
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
        
        // Initial calculation
        this.calculateStoryPoints();
        
        // Set up mutation observer to watch for field changes
        this.setupFieldObserver();
        
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
            const fieldId = target.id || target.getAttribute('data-field-id') || '';
            return fieldId.includes('time') || 
                   fieldId.includes('complexity') || 
                   fieldId.includes('storypoint') ||
                   target.classList.contains('time-tracking') ||
                   target.classList.contains('complexity-field');
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
            '.time-tracking',
            '#time-tracking',
            '[data-field-id*="time"]',
            'input[name*="time"]'
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
            '.complexity-field',
            '#complexity',
            '[data-field-id*="complexity"]',
            'input[name*="complexity"]',
            'select[name*="complexity"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const complexityValue = this.extractComplexityValue(element);
                if (complexityValue !== null) {
                    return complexityValue;
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
        // Try multiple selectors to find story point field
        const selectors = [
            '[data-testid*="story-point"]',
            '[data-testid*="storypoint"]',
            '.story-point-field',
            '#story-point',
            '[data-field-id*="story"]',
            'input[name*="story"]',
            'input[name*="point"]'
        ];

        for (const selector of selectors) {
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
}

// Initialize the calculator when the script loads
const calculator = new JIRAStoryPointCalculator();
