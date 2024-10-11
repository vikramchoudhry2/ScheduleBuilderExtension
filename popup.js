// DOM elements
const loginBtn = document.getElementById('loginBtn');
const startScrapingBtn = document.getElementById('startScraping');

// Function to get the OAuth token
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

        // Enable the scraping button once the user is authenticated
        startScrapingBtn.disabled = false;
        alert('Login successful! You can now start scraping.');
    });
}

// Event listener for the login button
loginBtn.addEventListener('click', () => {
    authenticate();  // Authenticate when the login button is clicked
});

// Event listener for the scraping button
startScrapingBtn.addEventListener('click', () => {
    // Send message to start scraping
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'start_scraping' });
    });
});
