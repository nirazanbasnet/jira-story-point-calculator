// Popup JavaScript for JIRA Story Point Calculator
document.addEventListener('DOMContentLoaded', function() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const recalculateBtn = document.getElementById('recalculateBtn');
    
    // Check if we're on a JIRA page
    checkJIRAStatus();
    
    // Set up event listeners
    recalculateBtn.addEventListener('click', function() {
        recalculateStoryPoints();
    });
    
    function checkJIRAStatus() {
        // Check if we're on a JIRA page
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            const isJIRA = currentTab.url.includes('atlassian.net') || currentTab.url.includes('jira.com');
            
            if (isJIRA) {
                statusIndicator.className = 'status-indicator status-active';
                statusText.textContent = 'Active on JIRA';
                recalculateBtn.disabled = false;
            } else {
                statusIndicator.className = 'status-indicator status-inactive';
                statusText.textContent = 'Not on JIRA page';
                recalculateBtn.disabled = true;
            }
        });
    }
    
    function recalculateStoryPoints() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            
            // Execute the calculation in the content script
            chrome.scripting.executeScript({
                target: {tabId: currentTab.id},
                function: triggerRecalculation
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
});

// Function to be executed in the content script context
function triggerRecalculation() {
    // Check if our calculator is available
    if (window.calculator && typeof window.calculator.calculateStoryPoints === 'function') {
        window.calculator.calculateStoryPoints();
        return 'Calculation triggered successfully';
    } else {
        // If calculator isn't available, try to find and trigger it manually
        const event = new CustomEvent('jira-story-point-recalculate');
        document.dispatchEvent(event);
        return 'Manual recalculation event dispatched';
    }
}
