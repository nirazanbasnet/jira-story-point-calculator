// Popup script for Jira Story Point Calculator
document.addEventListener('DOMContentLoaded', function () {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const statusIndicator = document.getElementById('statusIndicator');
    const toggleBtn = document.getElementById('toggleBtn');

    // Check initial status
    checkStatus();

    // Add event listener to toggle button
    toggleBtn.addEventListener('click', function () {
        toggleCalculator();
    });

    // Function to check calculator status
    function checkStatus() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, function (response) {
                    if (chrome.runtime.lastError) {
                        // Extension not active on this page
                        updateStatus(false, 'Not Available', 'Extension not active on this page');
                    } else if (response && response.active) {
                        updateStatus(true, 'Active', 'Monitoring Jira fields for changes');
                    } else {
                        updateStatus(false, 'Inactive', 'Ready to activate on Jira pages');
                    }
                });
            } else {
                updateStatus(false, 'No Active Tab', 'Please open a Jira page to use the calculator');
            }
        });
    }

    // Function to update status display
    function updateStatus(isActive, text, subtitle = '') {
        if (isActive) {
            statusDot.classList.remove('inactive');
            statusIndicator.classList.remove('inactive');
            statusIndicator.classList.add('active');
            statusText.textContent = text;
            statusSubtitle.textContent = subtitle || 'Calculator is monitoring Jira fields';
            toggleBtn.textContent = 'Deactivate';
            toggleBtn.classList.add('deactivate');
        } else {
            statusDot.classList.add('inactive');
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            statusText.textContent = text;
            statusSubtitle.textContent = subtitle || 'Click activate to start monitoring';
            toggleBtn.textContent = 'Activate';
            toggleBtn.classList.remove('deactivate');
        }
    }

    // Function to toggle calculator
    function toggleCalculator() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                const action = toggleBtn.classList.contains('deactivate') ? 'deactivate' : 'activate';

                chrome.tabs.sendMessage(tabs[0].id, { action: action }, function (response) {
                    if (chrome.runtime.lastError) {
                        // Extension not available on this page
                        updateStatus(false, 'Not Available', 'Extension not active on this page');
                    } else if (response && response.success) {
                        // Toggle successful, check new status
                        setTimeout(checkStatus, 100);
                    }
                });
            }
        });
    }

    // Add keyboard shortcut for calculate
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'calculate' }, function (response) {
                        if (response && response.success) {
                            showNotification('Calculation triggered!');
                        }
                    });
                }
            });
        }
    });

    // Function to show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInScale 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 300px;
        `;
        notification.textContent = message;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInScale {
                from { 
                    transform: translateX(100%) scale(0.9); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0) scale(1); 
                    opacity: 1; 
                }
            }
            @keyframes slideOut {
                from { 
                    transform: translateX(0) scale(1); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%) scale(0.9); 
                    opacity: 0; 
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove notification after 3 seconds with smooth animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    // Add some interactive features
    addInteractiveFeatures();
});

// Add interactive features to the popup
function addInteractiveFeatures() {
    // Add hover effects to feature items
    const featureItems = document.querySelectorAll('.feature-list li');
    featureItems.forEach(item => {
        item.addEventListener('mouseenter', function () {
            this.style.background = '#f9fafb';
            this.style.transform = 'translateX(4px)';
            this.style.transition = 'all 0.2s ease';
        });

        item.addEventListener('mouseleave', function () {
            this.style.background = 'transparent';
            this.style.transform = 'translateX(0)';
        });
    });

    // Add click effects to shortcut items
    const shortcutItems = document.querySelectorAll('.shortcut-item');
    shortcutItems.forEach(item => {
        item.addEventListener('click', function () {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });

    // Add copy functionality to formula
    const formula = document.querySelector('.formula');
    if (formula) {
        formula.style.cursor = 'pointer';
        formula.title = 'Click to copy formula';

        formula.addEventListener('click', function () {
            navigator.clipboard.writeText('SP = √(T × C) + B').then(() => {
                showCopyNotification();
            });
        });
    }
}

// Function to show copy notification
function showCopyNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
        padding: 20px 32px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 20px 60px rgba(79, 70, 229, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: fadeInOut 1.8s ease-in-out;
        text-align: center;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📋</span>
            <span>Formula copied to clipboard!</span>
        </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0%, 100% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.8); 
            }
            15%, 85% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1); 
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove notification after animation
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 1800);
}

// Add some additional keyboard shortcuts for better UX
document.addEventListener('keydown', function (e) {
    // Escape key to close popup (if possible)
    if (e.key === 'Escape') {
        // Note: Chrome extensions can't close their own popup via JavaScript
        // This is just for user experience indication
        document.body.style.opacity = '0.7';
        setTimeout(() => {
            document.body.style.opacity = '1';
        }, 200);
    }

    // Enter key to toggle calculator
    if (e.key === 'Enter') {
        const toggleBtn = document.getElementById('toggleBtn');
        if (toggleBtn) {
            toggleBtn.click();
        }
    }
});

// Add some visual feedback for better UX
document.addEventListener('DOMContentLoaded', function () {
    // Add loading animation to status dot
    const statusDot = document.getElementById('statusDot');
    if (statusDot) {
        statusDot.style.transition = 'all 0.3s ease';
    }

    // Add hover effects to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });

        button.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });
});
