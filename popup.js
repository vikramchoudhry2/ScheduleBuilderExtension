const loginBtn = document.getElementById('loginBtn');
const startScrapingBtn = document.getElementById('startScraping');

// auth and get token
function authenticate() {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
            console.error('Error during authentication:', chrome.runtime.lastError.message);
            alert('Authentication failed. Please try again.');
            return;
        }

        if (!token) {
            console.error('No token retrieved.');
            alert('Could not retrieve token. Please try again.');
            return;
        }

        console.log('Authenticated, token:', token);

        // enable scraping button after successful login
        startScrapingBtn.disabled = false;
        alert('Login successful! You can now start scraping.');
    });
}

// login button event listener
loginBtn.addEventListener('click', () => {
    authenticate();
});

// scrape button event listener
startScrapingBtn.addEventListener('click', () => {
    const startDateInput = document.getElementById('startDate').value;

    if (!startDateInput) {
        alert('Please enter a start date.');
        return;
    }

    const startDate = new Date(startDateInput);
    if (isNaN(startDate.getTime())) {
        alert('Invalid start date. Please enter a valid date.');
        return;
    }

    console.log("Sending startDate to content script:", startDate.toISOString());

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        const url = tabs[0].url;

        if (!url.includes("my.ucdavis.edu/schedulebuilder")) {
            alert('Please navigate to the Schedule Builder page and try again.');
            return;
        }

        chrome.scripting.executeScript(
            { target: { tabId: tabId }, files: ['content.js'] },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Content script injection failed:', chrome.runtime.lastError.message);
                    alert('Failed to inject content script. Ensure you are on the Schedule Builder page.');
                    return;
                }

                // delay message to ensure content script is ready
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { action: 'start_scraping', startDate: startDate.toISOString() }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Content script not available:', chrome.runtime.lastError.message);
                            alert('Content script is not available. Reload the Schedule Builder page and try again.');
                        } else {
                            console.log('Scraping started:', response);
                        }
                    });
                }, 100); // 100 ms delay to ensure the content script is fully loaded (NOT helping anything atm)
            }
        );
    });
});
