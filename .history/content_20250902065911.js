// JIRA Story Point Calculator - Content Script

class JIRAStoryPointCalculator {
    constructor() {
        this.complexityValues = [0.1, 0.2, 0.3, 0.6, 1, 1.5, 2];
        this.isInitialized = false;
        this.isActive = false;
        this.debounceTimer = null;
        this.monitoringInterval = null;
        this.floatingPanel = null;
        this.init();
    }

    init() {
        if (this.isJIRAIssuePage()) {
            this.autoActivate();
        } else {
            this.checkActivationStatus();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCalculator();
            });
        } else {
            this.setupCalculator();
        }
    }

    checkActivationStatus() {
        this.isActive = sessionStorage.getItem('jiraStoryPointCalculatorActive') === 'true';
    }

    setupCalculator() {
        if (this.isInitialized) return;

        this.setupActivationListener();

        if (this.isActive) {
            this.setupFieldObserver();
        }

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

        this.createFloatingPanel();
        this.setupFieldObserver();
        this.startContinuousMonitoring();
        this.showNotification('Story Point Calculator Activated', 'success');
    }

    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'false');

        this.stopContinuousMonitoring();
        this.removeFloatingPanel();
        this.showNotification('❌ Story Point Calculator DEACTIVATED', 'info');
    }

    showNotification(message, type = 'info') {
        const existing = document.getElementById('jira-calculator-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'jira-calculator-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

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

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);

        document.body.appendChild(notification);
    }

    setupFieldObserver() {
        document.addEventListener('input', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.calculateStoryPoints();
                }, 200);
            }
        }, true);

        document.addEventListener('change', (e) => {
            if (!this.isActive) return;
            if (this.isRelevantInput(e.target)) {
                this.calculateStoryPoints();
            }
        }, true);
    }

    isRelevantInput(element) {
        if (!element || !element.tagName) return false;

        const tagName = element.tagName.toLowerCase();
        if (tagName !== 'input' && tagName !== 'select' && tagName !== 'textarea') return false;

        const isInModal = element.closest('[data-testid*="modal"], [data-testid*="dialog"], .modal, .dialog');
        if (isInModal) {
            const testId = element.getAttribute('data-testid') || '';
            const name = element.name || '';

            return testId.includes('timelog-textfield') ||
                testId.includes('time-spent') ||
                testId.includes('time-remaining') ||
                name.includes('time-spent') ||
                name.includes('time-remaining');
        }

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
        const timeModal = document.querySelector('[data-testid*="log-time-modal"], [data-testid*="time-modal"]');
        return timeModal &&
            timeModal.style.display !== 'none' &&
            timeModal.style.visibility !== 'hidden' &&
            document.body.contains(timeModal);
    }

    calculateStoryPoints() {
        if (!this.isActive || this.isModalOpen()) return;

        try {
            const timeTracking = this.extractTimeTracking();
            const complexity = this.extractComplexity();

            if (timeTracking === null || complexity === null) return;

            const storyPoints = this.calculateTW(timeTracking, complexity);
            this.updateStoryPointField(storyPoints);
            this.updateFloatingPanel(timeTracking, complexity, storyPoints);
        } catch (error) {
            // Silent error handling
        }
    }

    startContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(() => {
            if (!this.isActive || this.isModalOpen()) return;

            const currentTime = this.extractTimeTracking();
            const currentComplexity = this.extractComplexity();

            if (this.lastTimeTracking !== currentTime || this.lastComplexity !== currentComplexity) {
                this.lastTimeTracking = currentTime;
                this.lastComplexity = currentComplexity;
                this.calculateStoryPoints();
            }
        }, 2000);
    }

    stopContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    extractTimeTracking() {
        const selectors = [
            '[data-testid="issue.issue-view.common.logged-time.value"]',
            '[data-testid="issue.component.logged-time.remaining-time"]',
            '[data-testid="issue.views.issue-base.context.time-tracking.value"]',
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

        return this.extractJIRATimeTracking();
    }

    extractJIRATimeTracking() {
        const loggedTimeElement = document.querySelector('[data-testid="issue.issue-view.common.logged-time.value"]');
        const remainingTimeElement = document.querySelector('[data-testid="issue.component.logged-time.remaining-time"]');

        if (loggedTimeElement && remainingTimeElement) {
            const loggedText = loggedTimeElement.textContent.trim();
            const remainingText = remainingTimeElement.textContent.trim();

            const loggedHours = this.parseTimeToHours(loggedText);
            const remainingHours = this.parseTimeToHours(remainingText);

            if (loggedHours !== null && remainingHours !== null) {
                return loggedHours + remainingHours;
            } else if (loggedHours !== null) {
                return loggedHours;
            }
        }

        const timeElements = document.querySelectorAll('*');
        for (const element of timeElements) {
            if (element.textContent && (element.textContent.includes('h logged') || element.textContent.includes('m remaining'))) {
                const timeText = element.textContent;
                const loggedMatch = timeText.match(/(\d+(?:\.\d+)?)h logged/);
                const remainingMatch = timeText.match(/(\d+(?:\.\d+)?)m remaining/);

                if (loggedMatch && remainingMatch) {
                    const loggedHours = parseFloat(loggedMatch[1]);
                    const remainingHours = parseFloat(remainingMatch[1]) / 60;
                    return loggedHours + remainingHours;
                } else if (loggedMatch) {
                    return parseFloat(loggedMatch[1]);
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
        const selectors = [
            '[data-testid="issue-field-number-readview-full.ui.number.span"]',
            '[data-testid="issue.issue-view-layout.issue-view-number-field.customfield_10055"]',
            '[data-testid*="customfield_10055"]',
            '[data-testid*="Complexity"]',
            '[data-testid*="complexity"]',
            'label[for*="complexity"]',
            'label[for*="Complexity"]',
            '.complexity-field',
            '#complexity',
            '[data-field-id*="complexity"]',
            '[data-field-id*="Complexity"]',
            'input[name*="complexity"]',
            'input[name*="Complexity"]',
            'select[name*="complexity"]',
            'select[name*="Complexity"]'
        ];

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
                // Silent error handling
            }
        }

        return this.extractJIRAComplexity();
    }

    extractJIRAComplexity() {
        const complexityElement = document.querySelector('[data-testid="issue-field-number-readview-full.ui.number.span"]');

        if (complexityElement) {
            const complexityText = complexityElement.textContent.trim();
            const complexityValue = parseFloat(complexityText);
            if (!isNaN(complexityValue) && this.complexityValues.includes(complexityValue)) {
                return complexityValue;
            }
        }

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

        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            if (element.textContent && element.textContent.toLowerCase().includes('complexity')) {
                const nearbyValue = this.findValueNearElement(element);
                if (nearbyValue !== null) {
                    return nearbyValue;
                }
            }
        }

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
        const parent = element.parentElement;
        if (parent) {
            const numberElements = parent.querySelectorAll('[data-testid*="number"], [data-testid*="Number"], .number, .value');
            for (const numElement of numberElements) {
                const text = numElement.textContent.trim();
                const value = parseFloat(text);
                if (!isNaN(value) && this.complexityValues.includes(value)) {
                    return value;
                }
            }

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
        const product = timeTracking * complexity;
        const rootResult = Math.sqrt(product);
        return Math.round(rootResult * 100) / 100;
    }

    findElementByText(text, tagName = '*') {
        const elements = document.querySelectorAll(tagName);
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(text)) {
                return element;
            }
        }
        return null;
    }

    updateStoryPointField(storyPoints) {
        const storyPointContainer = document.querySelector('[data-testid="issue-field-number.ui.issue-field-story-point-estimate--container"]');

        if (storyPointContainer) {
            let inputField = storyPointContainer.querySelector('input[type="number"], input[type="text"]');

            if (inputField) {
                inputField.value = storyPoints;
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                return true;
            } else {
                const editButton = storyPointContainer.querySelector('button[aria-label="Edit Story Points"]');
                if (editButton) {
                    editButton.click();

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

        const alternativeSelectors = [
            '[data-testid="issue-field-story-point-estimate-readview-full.ui.story-point-estimate"]',
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
                if (element.textContent.includes('Add story points')) {
                    const parentContainer = element.closest('[data-testid*="story-point"]') ||
                        element.closest('[data-testid*="container"]') ||
                        element.parentElement;

                    if (parentContainer) {
                        const editButton = parentContainer.querySelector('button[aria-label*="Edit"]');
                        if (editButton) {
                            editButton.click();

                            setTimeout(() => {
                                const inputField = parentContainer.querySelector('input[type="number"], input[type="text"]');
                                if (inputField) {
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

                this.setFieldValue(element, storyPoints);
                return true;
            }
        }

        const storyPointElement = this.findElementByText('Add story points');
        if (storyPointElement) {
            const parentContainer = storyPointElement.closest('[data-testid*="container"]') ||
                storyPointElement.closest('[data-testid*="story-point"]') ||
                storyPointElement.parentElement;

            if (parentContainer) {
                const editButton = parentContainer.querySelector('button[aria-label*="Edit"]');
                if (editButton) {
                    editButton.click();

                    setTimeout(() => {
                        const inputField = parentContainer.querySelector('input[type="number"], input[type="text"]');
                        if (inputField) {
                            inputField.value = storyPoints;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                        }
                    }, 300);
                    return true;
                }
            }
        }

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

    createFloatingPanel() {
        this.removeFloatingPanel();

        this.floatingPanel = document.createElement('div');
        this.floatingPanel.id = 'jira-story-point-panel';
        this.floatingPanel.className = 'jira-story-point-panel';
        this.floatingPanel.innerHTML = `
            <div class="panel-content">
                <div class="status-indicator">
                    <span class="status-icon">🚀</span>
                    <span class="status-text">Active</span>
                </div>
            </div>
        `;

        this.addPanelStyles();

        document.body.appendChild(this.floatingPanel);

        this.floatingPanel.style.opacity = '0';
        this.floatingPanel.style.transform = 'translateY(-20px) scale(0.95)';
        this.floatingPanel.style.display = 'flex';
        this.floatingPanel.style.visibility = 'visible';
        this.floatingPanel.style.zIndex = '10000';

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

    addPanelStyles() {
        const styleId = 'jira-story-point-panel-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .jira-story-point-panel {
                position: fixed;
                top: 68px;
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
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 8px 12px;
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

            .jira-story-point-panel .close-btn:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #EF4444;
                transform: scale(1.1);
            }

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

    isJIRAIssuePage() {
        const url = window.location.href;
        const isJIRA = url.includes('atlassian.net') || url.includes('jira.com');
        const isIssuePage = url.includes('/browse/') || url.includes('/issues/') || url.includes('/secure/');

        const hasIssueElements = document.querySelector('[data-testid*="issue"]') ||
            document.querySelector('[data-testid*="Issue"]') ||
            document.querySelector('.issue-view') ||
            document.querySelector('#issue-content');
        return isJIRA && (isIssuePage || hasIssueElements);
    }

    autoActivate() {
        this.isActive = true;
        sessionStorage.setItem('jiraStoryPointCalculatorActive', 'true');

        this.setupFieldObserver();
        this.startContinuousMonitoring();
        this.createFloatingPanel();
        this.showNotification('✅ Story Point Calculator Auto-Activated', 'success');
        this.calculateStoryPoints();
    }
}

// Initialize the calculator
try {
    const calculator = new JIRAStoryPointCalculator();
    window.jiraStoryPointCalculator = calculator;
} catch (error) {
    console.error('JIRA Story Point Calculator: ❌ Error during initialization:', error);
}

// Essential global functions
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (window.activateStoryPointCalculator) {
            window.activateStoryPointCalculator();
        }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (window.deactivateStoryPointCalculator) {
            window.deactivateStoryPointCalculator();
        }
    }
});
