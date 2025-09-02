// Popup JavaScript for JIRA Story Point Calculator
document.addEventListener('DOMContentLoaded', function () {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const recalculateBtn = document.getElementById('recalculateBtn');
    const activateBtn = document.getElementById('activateBtn');
    const deactivateBtn = document.getElementById('deactivateBtn');

    // Check if we're on a JIRA page and get current status
    checkJIRAStatus();

    // Set up event listeners
    if (activateBtn) {
        activateBtn.addEventListener('click', function () {
            activateExtension();
        });
    }

    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', function () {
            deactivateExtension();
        });
    }

    if (recalculateBtn) {
        recalculateBtn.addEventListener('click', function () {
            recalculateStoryPoints();
        });
    }

    function checkJIRAStatus() {
        // Check if we're on a JIRA page
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];
            const isJIRA = currentTab.url.includes('atlassian.net') || currentTab.url.includes('jira.com');

            if (isJIRA) {
                statusIndicator.className = 'status-indicator status-active';
                statusText.textContent = 'On JIRA Page';

                // Get current extension status
                getExtensionStatus();
            } else {
                statusIndicator.className = 'status-indicator status-inactive';
                statusText.textContent = 'Not on JIRA page';
                recalculateBtn.disabled = true;
                if (activateBtn) activateBtn.disabled = true;
                if (deactivateBtn) deactivateBtn.disabled = true;
            }
        });
    }

    function getExtensionStatus() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: getStatus
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Error getting status:', chrome.runtime.lastError);
                    return;
                }

                const result = results[0]?.result;
                if (result && result.active) {
                    updateUIForActiveState();
                } else {
                    updateUIForInactiveState();
                }
            });
        });
    }

    function activateExtension() {
        console.log('Popup: Activate button clicked');
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];
            console.log('Popup: Current tab:', currentTab);

            // First, inject the content script to ensure it's loaded
            console.log('Popup: Injecting content script...');
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting content script:', chrome.runtime.lastError);
                    showMessage('❌ Failed to load extension', 'error');
                    return;
                }
                
                console.log('Popup: Content script injected successfully');
                
                // Wait a moment for the script to initialize, then activate
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: currentTab.id },
                        function: activate
                    }, (results) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error activating extension:', chrome.runtime.lastError);
                            return;
                        }

                        console.log('Popup: Activation script executed, results:', results);

                        // Update UI
                        updateUIForActiveState();

                        // Show success message
                        showMessage('✅ Extension ACTIVATED!', 'success');
                    });
                }, 1000);
            });
        });
    }

    function deactivateExtension() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: deactivate
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Error deactivating extension:', chrome.runtime.lastError);
                    return;
                }

                // Update UI
                updateUIForInactiveState();

                // Show success message
                showMessage('❌ Extension DEACTIVATED!', 'info');
            });
        });
    }

    function recalculateStoryPoints() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: calculate
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Error executing script:', chrome.runtime.lastError);
                    return;
                }

                // Show feedback
                recalculateBtn.textContent = '✅ Done!';
                recalculateBtn.disabled = true;

                setTimeout(() => {
                    recalculateBtn.textContent = '🔄 Recalculate Now';
                    recalculateBtn.disabled = false;
                }, 2000);
            });
        });
    }

    function updateUIForActiveState() {
        statusIndicator.className = 'status-indicator status-active';
        statusText.textContent = '✅ EXTENSION ACTIVE';
        statusText.style.color = '#28a745';
        statusText.style.fontWeight = 'bold';

        if (recalculateBtn) {
            recalculateBtn.disabled = false;
            recalculateBtn.style.display = 'block';
        }

        if (activateBtn) {
            activateBtn.style.display = 'none';
        }

        if (deactivateBtn) {
            deactivateBtn.style.display = 'block';
            deactivateBtn.disabled = false;
        }
    }

    function updateUIForInactiveState() {
        statusIndicator.className = 'status-indicator status-inactive';
        statusText.textContent = '❌ EXTENSION INACTIVE';
        statusText.style.color = '#dc3545';
        statusText.style.fontWeight = 'bold';

        if (recalculateBtn) {
            recalculateBtn.disabled = true;
            recalculateBtn.style.display = 'none';
        }

        if (activateBtn) {
            activateBtn.style.display = 'block';
            activateBtn.disabled = false;
        }

        if (deactivateBtn) {
            deactivateBtn.style.display = 'none';
        }
    }

    function showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#bee5eb'};
            border-radius: 4px;
            padding: 10px 15px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }
});

// Functions to be executed in the content script context
function getStatus() {
    if (window.jiraStoryPointCalculator) {
        return { active: window.jiraStoryPointCalculator.isActive };
    }
    return { active: false };
}

function activate() {
    console.log('Content script: activate() function called');
    if (window.jiraStoryPointCalculator) {
        console.log('Content script: Found calculator, calling activate()');
        window.jiraStoryPointCalculator.activate();
        return 'Extension activated successfully';
    }
    console.log('Content script: Calculator not found');
    return 'Extension not found';
}

function deactivate() {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.deactivate();
        return 'Extension deactivated successfully';
    }
    return 'Extension not found';
}

function calculate() {
    if (window.jiraStoryPointCalculator) {
        window.jiraStoryPointCalculator.calculateStoryPoints();
        return 'Calculation triggered successfully';
    }
    return 'Extension not found';
}
